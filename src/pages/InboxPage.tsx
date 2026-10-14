import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Search,
  User,
  Phone,
  RefreshCw,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface ChatItem {
  id: string;
  sender_type: "inbound" | "outbound";
  message_content: string;
  created_at: string;
}

interface ContactConversation {
  sender_number: string;
  sender_name: string | null;
  patient_id: string | null;
  patient_name: string | null;
  last_message: string;
  last_message_time: string;
}

export function InboxPage() {
  const [conversations, setConversations] = useState<ContactConversation[]>([]);
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [activeChatHistory, setActiveChatHistory] = useState<ChatItem[]>([]);
  const [currentClinicId, setCurrentClinicId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State Balas Pesan
  const [replyText, setReplyText] = useState<string>("");
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatHistory]);

  // Helper Mendapatkan Clinic ID User Aktif
  const getUserClinicId = async (): Promise<string | null> => {
    if (currentClinicId) return currentClinicId;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.clinic_id) {
      setCurrentClinicId(profile.clinic_id);
      return profile.clinic_id;
    }
    return null;
  };

  const formatDateDivider = (dateString: string) => {
    const msgDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = msgDate.toDateString() === today.toDateString();
    const isYesterday = msgDate.toDateString() === yesterday.toDateString();

    if (isToday) return "Hari ini";
    if (isYesterday) return "Kemarin";

    return msgDate.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const fetchConversations = async (showRefreshLoader = false) => {
    if (showRefreshLoader) setIsRefreshing(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setConversations([]);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from("incoming_message_logs")
        .select(`
          id,
          patient_id,
          sender_number,
          sender_name,
          message_content,
          created_at,
          patients ( name, phone_number )
        `)
        .eq("clinic_id", clinicId) 
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const conversationMap = new Map<string, ContactConversation>();

        data.forEach((msg: any) => {
          const number = msg.sender_number;
          if (!conversationMap.has(number)) {
            conversationMap.set(number, {
              sender_number: number,
              sender_name: msg.sender_name,
              patient_id: msg.patient_id,
              patient_name: msg.patients?.name || null,
              last_message: msg.message_content,
              last_message_time: msg.created_at,
            });
          }
        });

        const conversationList = Array.from(conversationMap.values());
        setConversations(conversationList);

        if (conversationList.length > 0 && !activeNumber) {
          setActiveNumber(conversationList[0].sender_number);
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchChatHistory = async (phone: string) => {
    setLoadingChat(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) return;

      const cleanPhone = phone.replace(/\D/g, "");
      const searchPattern = cleanPhone.startsWith("62") ? cleanPhone.slice(2) : cleanPhone;

      // PERBAIKAN: Gunakan .or() agar inbound message ber-clinic_id NULL ikut tampil di chat thread
      const { data: inboundData } = await supabase
        .from("incoming_message_logs")
        .select("id, message_content, created_at")
        .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
        .eq("sender_number", phone);

      // Filter Pasien
      const { data: patientData } = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinicId)
        .ilike("phone_number", `%${searchPattern}%`)
        .maybeSingle();

      let outboundData: any[] = [];
      if (patientData) {
        // Filter Outbound Log
        const { data: logs } = await supabase
          .from("message_logs")
          .select("id, message_content, created_at, delivery_time")
          .eq("clinic_id", clinicId)
          .eq("patient_id", patientData.id);
        
        if (logs) outboundData = logs;
      }

      const formattedInbound: ChatItem[] = (inboundData || []).map((item) => ({
        id: `in-${item.id}`,
        sender_type: "inbound",
        message_content: item.message_content,
        created_at: item.created_at,
      }));

      const formattedOutbound: ChatItem[] = outboundData.map((item) => ({
        id: `out-${item.id}`,
        sender_type: "outbound",
        message_content: item.message_content,
        created_at: item.delivery_time || item.created_at,
      }));

      const combinedHistory = [...formattedInbound, ...formattedOutbound].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setActiveChatHistory(combinedHistory);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  // FUNGSI KIRIM BALASAN PESAN
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeContact || isSendingReply) return;

    const clinicId = await getUserClinicId();
    if (!clinicId) {
      alert("Clinic ID tidak terdeteksi!");
      return;
    }

    setIsSendingReply(true);
    const messageToSend = replyText.trim();

    try {
      const { data: configData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "fonnte_token")
        .maybeSingle();

      const fonnteToken = configData?.value || import.meta.env.VITE_FONNTE_TOKEN;

      if (!fonnteToken) {
        alert("Token Fonnte belum dikonfigurasi di Pengaturan!");
        setIsSendingReply(false);
        return;
      }

      // 1. Kirim Pesan via Fonnte API
      const formData = new FormData();
      formData.append("target", activeContact.sender_number);
      formData.append("message", messageToSend);

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.status) {
        if (activeContact.patient_id) {
          const { data: userData } = await supabase.auth.getUser();

          // Catat Outbound Log lengkap dengan clinic_id
          await supabase.from("message_logs").insert({
            user_id: userData?.user?.id || null,
            clinic_id: clinicId,
            patient_id: activeContact.patient_id,
            recipient_phone: activeContact.sender_number,
            message_content: messageToSend,
            status: "delivered",
            delivery_time: new Date().toISOString(),
          });
        }

        // Update UI Chat History
        const newChatItem: ChatItem = {
          id: `out-${Date.now()}`,
          sender_type: "outbound",
          message_content: messageToSend,
          created_at: new Date().toISOString(),
        };

        setActiveChatHistory((prev) => [...prev, newChatItem]);
        setReplyText("");
      } else {
        alert(`Gagal mengirim pesan: ${result.reason || "Terjadi kesalahan di Fonnte"}`);
      }
    } catch (err: any) {
      console.error("Error sending reply:", err);
      alert("Terjadi kesalahan saat mengirim balasan.");
    } finally {
      setIsSendingReply(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("realtime_inbox_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incoming_message_logs" },
        () => {
          fetchConversations();
          if (activeNumber) {
            fetchChatHistory(activeNumber);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeNumber) {
      fetchChatHistory(activeNumber);
    }
  }, [activeNumber]);

  const filteredConversations = conversations.filter((c) => {
    const displayName = c.patient_name || c.sender_name || c.sender_number;
    const query = searchQuery.toLowerCase();
    return (
      displayName.toLowerCase().includes(query) ||
      c.sender_number.includes(query) ||
      c.last_message.toLowerCase().includes(query)
    );
  });

  const activeContact = conversations.find((c) => c.sender_number === activeNumber);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Kotak Masuk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar pesan masuk yang diterima pada nomor pengiriman
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchConversations(true);
            if (activeNumber) fetchChatHistory(activeNumber);
          }}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <Card className="h-[calc(100vh-220px)] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, nomor WA, atau isi pesan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-4 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Belum ada percakapan</p>
                  <p className="text-xs mt-1">
                    Pesan balasan dari nomor kontak pasien akan otomatis muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredConversations.map((item) => {
                    const isSelected = activeNumber === item.sender_number;
                    const displayName = item.patient_name || item.sender_name || "Pasien Baru";
                    const isRegistered = !!item.patient_name;

                    return (
                      <button
                        key={item.sender_number}
                        onClick={() => setActiveNumber(item.sender_number)}
                        className={`w-full text-left p-4 transition-colors flex items-start gap-3 hover:bg-muted/50 ${
                          isSelected ? "bg-muted border-l-4 border-l-primary" : ""
                        }`}
                      >
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                            isRegistered
                              ? "bg-primary/10 text-primary"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm truncate text-foreground">
                              {displayName}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                              {new Date(item.last_message_time).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 break-words">
                            {item.last_message}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PANEL KANAN: CHAT THREAD DENGAN FORM BALAS PESAN */}
        <div className="lg:col-span-7">
          <Card className="h-[calc(100vh-220px)] flex flex-col overflow-hidden">
            {activeContact ? (
              <>
                <CardHeader className="border-b pb-4 shadow-xs bg-white rounded-t-xl shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {activeContact.patient_name ||
                            activeContact.sender_name ||
                            "Pasien Belum Terdaftar"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3" />
                            {activeContact.sender_number}
                          </span>
                        </CardDescription>
                      </div>
                    </div>

                    {activeContact.patient_name ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> Kontak Terdaftar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-200">
                        <HelpCircle className="h-3 w-3" /> Kontak Baru
                      </span>
                    )}
                  </div>
                </CardHeader>

                {/* AREA REKAP CHAT */}
                <CardContent className="flex-1 p-6 overflow-y-auto bg-[#efeae2]/30 space-y-3">
                  {loadingChat ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : activeChatHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">Belum ada riwayat pesan</p>
                    </div>
                  ) : (
                    activeChatHistory.map((chat, index) => {
                      const isInbound = chat.sender_type === "inbound";
                      
                      const currentDateStr = new Date(chat.created_at).toDateString();
                      const previousDateStr =
                        index > 0
                          ? new Date(activeChatHistory[index - 1].created_at).toDateString()
                          : null;
                      const showDateDivider = currentDateStr !== previousDateStr;

                      return (
                        <div key={chat.id} className="space-y-3">
                          {showDateDivider && (
                            <div className="flex justify-center my-3">
                              <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-md shadow-xs border border-slate-200/60 uppercase tracking-wider">
                                {formatDateDivider(chat.created_at)}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex ${
                              isInbound ? "justify-start" : "justify-end"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs border text-sm space-y-1 ${
                                isInbound
                                  ? "bg-white text-slate-800 rounded-tl-none border-gray-200"
                                  : "bg-[#d9fdd3] text-slate-900 rounded-tr-none border-green-200"
                              }`}
                            >
                              {!isInbound && (
                                <div className="text-[10px] font-semibold text-green-800 flex items-center gap-1 justify-end">
                                  <Send className="h-3 w-3" /> Anda (Klinik)
                                </div>
                              )}
                              {isInbound && (
                                <div className="text-[10px] font-semibold text-primary">
                                  {activeContact.patient_name || activeContact.sender_name || "Pasien"}
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {chat.message_content}
                              </p>
                              <div
                                className={`text-[10px] ${
                                  isInbound ? "text-gray-400 text-left" : "text-green-700 text-right"
                                }`}
                              >
                                {new Date(chat.created_at).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </CardContent>

                {/* FORM BALAS PESAN DI KAKI CHAT */}
                <div className="p-3 bg-white border-t border-border shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendReply();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      placeholder="Ketik pesan..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={isSendingReply}
                      className="flex-1 text-sm bg-muted/30 focus-visible:ring-primary"
                    />
                    <Button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
                      className="gap-2 shrink-0"
                    >
                      {isSendingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Kirim
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
                <div>
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium">Pilih percakapan di sebelah kiri</p>
                  <p className="text-xs mt-1">
                    Riwayat pesan WhatsApp akan ditampilkan di sini.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}