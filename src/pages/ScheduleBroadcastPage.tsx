import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Send, Users, User, FileText, Variable, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Interfaces
interface PatientOption {
  id: string;
  name: string;
  phone_number: string;
}

interface GroupOption {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

interface GroupMember {
  id: string;
  patient_id: string;
  name: string;
  phone_number: string;
  custom_value_1: string | null;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

interface ScheduledBroadcast {
  id: string;
  title: string;
  scheduled_time: string;
  status: "pending" | "processing" | "completed" | "failed";
  user_id: string;
  created_at: string;
  task_count?: number;
}

interface CustomRecipient {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  templateId: string;
  templateContent: string;
  customValue: string;
}


const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: id });
};

// TODO ambil status 6 Juni 2026
const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Menunggu</span>;
    case "processing":
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Memproses</span>;
    case "completed":
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Selesai</span>;
    case "failed":
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Gagal</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
  }
};

export function ScheduleBroadcastPage() {
  // State untuk form
  const [title, setTitle] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [recipientMode, setRecipientMode] = useState<"group" | "custom">("group");
  
  // State untuk mode grup
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMessage, setGroupMessage] = useState("");
  const [isLoadingGroupMembers, setIsLoadingGroupMembers] = useState(false);
  
  // State untuk mode custom
  const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  
  // State untuk tabel jadwal
  const [schedules, setSchedules] = useState<ScheduledBroadcast[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // State untuk dropdown
  const [searchPatient, setSearchPatient] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  
  // State untuk delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledBroadcast | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchSchedules();
    fetchGroups();
    fetchPatients();
    fetchTemplates();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch group members when group is selected
  useEffect(() => {
    if (selectedGroup && recipientMode === "group") {
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup, recipientMode]);

  // Fetch schedules
  const fetchSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from('scheduled_broadcasts')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      const schedulesWithCount = await Promise.all(
        (data || []).map(async (schedule) => {
          const { count, error: countError } = await supabase
            .from('scheduled_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('broadcast_id', schedule.id);

          return {
            ...schedule,
            task_count: count || 0
          };
        })
      );

      setSchedules(schedulesWithCount);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  // Fetch groups
  const fetchGroups = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from('patient_groups')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;

      const groupsWithCount = await Promise.all(
        (data || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: count || 0
          };
        })
      );

      setGroups(groupsWithCount);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
    }
  };

  // Fetch group members
  const fetchGroupMembers = async (groupId: string) => {
    setIsLoadingGroupMembers(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          patient_id,
          custom_value_1,
          patients!inner (
            name,
            phone_number
          )
        `)
        .eq('group_id', groupId);

      if (error) throw error;

      const members: GroupMember[] = (data || []).map((item: any) => ({
        id: item.id,
        patient_id: item.patient_id,
        name: item.patients.name,
        phone_number: item.patients.phone_number,
        custom_value_1: item.custom_value_1 || null
      }));

      setGroupMembers(members);
    } catch (error: any) {
      console.error('Error fetching group members:', error);
    } finally {
      setIsLoadingGroupMembers(false);
    }
  };

  // Fetch patients
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone_number')
        .eq('status', 'Aktif')
        .order('name', { ascending: true });

      if (error) throw error;

      setPatients(data || []);
    } catch (error: any) {
      console.error('Error fetching patients:', error);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from('message_templates')
        .select('id, title, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    }
  };

  // Format personal message - FIXED: No shorthand property issue
  const formatPersonalMessage = (
    messageTemplate: string,
    patientName: string,
    customValue?: string | null,
    queueNumber?: string
  ): string => {
    let formatted = messageTemplate;
    formatted = formatted.replace(/{{name}}/g, patientName);
    if (customValue) {
      formatted = formatted.replace(/{{value1}}/g, customValue);
    } else {
      formatted = formatted.replace(/{{value1}}/g, "");
    }
    if (queueNumber) {
      formatted = formatted.replace(/{{queueNo}}/g, queueNumber);
    } else {
      formatted = formatted.replace(/{{queueNo}}/g, "");
    }
    return formatted;
  };

  // Generate task for group mode
  const generateGroupTasks = async (broadcastId: string) => {
    const tasks = [];
    for (const member of groupMembers) {
      const personalizedMessage = formatPersonalMessage(
        groupMessage,
        member.name,
        member.custom_value_1
      );
      tasks.push({
        broadcast_id: broadcastId,
        patient_id: member.patient_id,
        phone_number: member.phone_number,
        message_content: personalizedMessage,
        status: "pending",
        error_message: null,
      });
    }
    return tasks;
  };

  // Generate tasks for custom mode
  const generateCustomTasks = async (broadcastId: string) => {
    const tasks = [];
    for (const recipient of customRecipients) {
      const personalizedMessage = formatPersonalMessage(
        recipient.templateContent,
        recipient.patientName,
        recipient.customValue
      );
      tasks.push({
        broadcast_id: broadcastId,
        patient_id: recipient.patientId,
        phone_number: recipient.patientPhone,
        message_content: personalizedMessage,
        status: "pending",
        error_message: null,
      });
    }
    return tasks;
  };

  // Save schedule
  const handleSaveSchedule = async () => {
    // Validasi
    if (!title.trim()) {
      alert("Judul jadwal harus diisi!");
      return;
    }

    if (!scheduledTime) {
      alert("Waktu pelaksanaan harus diisi!");
      return;
    }

    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      alert("Waktu pelaksanaan harus di masa depan!");
      return;
    }

    if (recipientMode === "group") {
      if (!selectedGroup) {
        alert("Silakan pilih grup!");
        return;
      }
      if (groupMembers.length === 0) {
        alert("Grup ini tidak memiliki anggota!");
        return;
      }
      if (!groupMessage.trim()) {
        alert("Pesan tidak boleh kosong!");
        return;
      }
    } else {
      if (customRecipients.length === 0) {
        alert("Minimal satu penerima harus ditambahkan!");
        return;
      }
      for (const recipient of customRecipients) {
        if (!recipient.patientId || !recipient.templateId) {
          alert("Semua field penerima harus diisi!");
          return;
        }
      }
    }

    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) throw new Error("User not authenticated");

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('scheduled_broadcasts')
        .insert({
          title: title.trim(),
          scheduled_time: new Date(scheduledTime).toISOString(),
          status: "pending",
          user_id: userId,
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      let tasks = [];
      if (recipientMode === "group") {
        tasks = await generateGroupTasks(scheduleData.id);
      } else {
        tasks = await generateCustomTasks(scheduleData.id);
      }

      if (tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('scheduled_tasks')
          .insert(tasks);

        if (tasksError) throw tasksError;
      }

      // Reset form
      setTitle("");
      setScheduledTime("");
      setSelectedGroup(null);
      setGroupMessage("");
      setCustomRecipients([]);
      setSearchPatient("");

      await fetchSchedules();

      setSuccessMessage(`Jadwal "${title}" berhasil disimpan! ${tasks.length} pesan akan dikirim.`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      setErrorMessage(error.message || "Gagal menyimpan jadwal");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const { error } = await supabase
        .from('scheduled_broadcasts')
        .delete()
        .eq('id', selectedSchedule.id);

      if (error) throw error;

      await fetchSchedules();

      setSuccessMessage(`Jadwal "${selectedSchedule.title}" berhasil dihapus!`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      setErrorMessage(error.message || "Gagal menghapus jadwal");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedSchedule(null);
    }
  };

  // Add custom recipient
  const addCustomRecipient = () => {
    const newId = Date.now().toString();
    setCustomRecipients([
      ...customRecipients,
      {
        id: newId,
        patientId: "",
        patientName: "",
        patientPhone: "",
        templateId: templates[0]?.id || "",
        templateContent: templates[0]?.content || "",
        customValue: "",
      },
    ]);
  };

  // Remove custom recipient
  const removeCustomRecipient = (id: string) => {
    setCustomRecipients(customRecipients.filter((r) => r.id !== id));
  };

  // Update custom recipient
  const updateCustomRecipient = (id: string, field: keyof CustomRecipient, value: string) => {
    setCustomRecipients(
      customRecipients.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === "templateId") {
            const template = templates.find((t) => t.id === value);
            if (template) {
              updated.templateContent = template.content;
            }
          }
          if (field === "patientId") {
            const patient = patients.find((p) => p.id === value);
            if (patient) {
              updated.patientName = patient.name;
              updated.patientPhone = patient.phone_number;
            }
          }
          return updated;
        }
        return r;
      })
    );
  };

  // Filter patients for dropdown
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
    patient.phone_number.includes(searchPatient)
  );

  // Insert variable to message
  const insertVariable = (variable: string) => {
    setGroupMessage((prev) => prev + variable);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Penjadwalan Broadcast</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur pengiriman pesan otomatis di waktu mendatang
        </p>
      </div>

      {/* Form Jadwal Baru */}
      <Card>
        <CardHeader>
          <CardTitle>Buat Jadwal Baru</CardTitle>
          <CardDescription>Atur pesan yang akan dikirim secara otomatis di waktu yang ditentukan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Judul Jadwal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul Jadwal</label>
            <Input
              placeholder="Contoh: Reminder Kontrol Pasien Juni"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
          </div>

          {/* Date & Time Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Waktu Pelaksanaan</label>
            <Input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledTime(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Pilih tanggal dan jam di masa depan
            </p>
          </div>

          {/* Mode Penerima */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Mode Penerima</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientMode"
                  value="group"
                  checked={recipientMode === "group"}
                  onChange={() => setRecipientMode("group")}
                  className="w-4 h-4 text-primary"
                />
                <span className="flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4" />
                  Grup Pasien
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientMode"
                  value="custom"
                  checked={recipientMode === "custom"}
                  onChange={() => setRecipientMode("custom")}
                  className="w-4 h-4 text-primary"
                />
                <span className="flex items-center gap-1 text-sm">
                  <User className="h-4 w-4" />
                  Kustom Individu
                </span>
              </label>
            </div>
          </div>

          {/* Mode Grup */}
          {recipientMode === "group" && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Grup</label>
                <div className="relative" ref={groupDropdownRef}>
                  <div
                    className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  >
                    <span className={selectedGroup ? "text-sm" : "text-sm text-muted-foreground"}>
                      {selectedGroup ? `${selectedGroup.name} (${selectedGroup.memberCount} anggota)` : "Pilih grup pasien..."}
                    </span>
                    <span className="text-muted-foreground">{isGroupDropdownOpen ? "▲" : "▼"}</span>
                  </div>

                  {isGroupDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-white shadow-lg">
                      <div className="max-h-64 overflow-y-auto">
                        {groups.length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            Tidak ada grup ditemukan
                          </div>
                        ) : (
                          groups.map((group) => (
                            <button
                              key={group.id}
                              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                              onClick={() => {
                                setSelectedGroup(group);
                                setIsGroupDropdownOpen(false);
                              }}
                            >
                              <div className="font-medium text-sm">{group.name}</div>
                              <div className="text-xs text-muted-foreground">{group.memberCount} anggota</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedGroup && (
                <>
                  <div className="text-sm text-muted-foreground">
                    <p>Anggota grup: {groupMembers.length} orang</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pesan</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable("{{name}}")}
                      >
                        + Nama
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable("{{value1}}")}
                      >
                        + Nilai Kustom
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable("{{queueNo}}")}
                      >
                        + No. Antrian
                      </Button>
                    </div>
                    <textarea
                      value={groupMessage}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGroupMessage(e.target.value)}
                      placeholder="Tulis pesan di sini... Gunakan {{name}}, {{value1}}, {{queueNo}} sebagai variabel"
                      className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    />
                  </div>

                  {isLoadingGroupMembers && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}

                  {!isLoadingGroupMembers && groupMembers.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Nomor HP</TableHead>
                            <TableHead>Nilai Kustom</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupMembers.slice(0, 5).map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>{member.name}</TableCell>
                              <TableCell>{member.phone_number}</TableCell>
                              <TableCell>{member.custom_value_1 || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {groupMembers.length > 5 && (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          +{groupMembers.length - 5} anggota lainnya
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mode Kustom Individu */}
          {recipientMode === "custom" && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Daftar Penerima</label>
                <Button type="button" variant="outline" size="sm" onClick={addCustomRecipient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Pasien
                </Button>
              </div>

              {customRecipients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada penerima</p>
                  <p className="text-sm">Klik tombol di atas untuk menambahkan pasien</p>
                </div>
              )}

              {customRecipients.map((recipient, index) => (
                <div key={recipient.id} className="border rounded-lg p-4 space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => removeCustomRecipient(recipient.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="font-medium text-sm text-muted-foreground">Penerima #{index + 1}</div>

                  {/* Pilih Pasien */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Pasien</label>
                    <div className="relative" ref={patientDropdownRef}>
                      <div
                        className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                      >
                        <span className={recipient.patientName ? "text-sm" : "text-sm text-muted-foreground"}>
                          {recipient.patientName || "Cari dan pilih pasien..."}
                        </span>
                        <span className="text-muted-foreground">▼</span>
                      </div>

                      {isPatientDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-white shadow-lg">
                          <div className="p-2 border-b border-border">
                            <Input
                              placeholder="Cari nama atau nomor WhatsApp..."
                              value={searchPatient}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchPatient(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredPatients.length === 0 ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                Tidak ada pasien ditemukan
                              </div>
                            ) : (
                              filteredPatients.map((patient) => (
                                <button
                                  key={patient.id}
                                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                                  onClick={() => {
                                    updateCustomRecipient(recipient.id, "patientId", patient.id);
                                    setSearchPatient("");
                                    setIsPatientDropdownOpen(false);
                                  }}
                                >
                                  <div className="font-medium text-sm">{patient.name}</div>
                                  <div className="text-xs text-muted-foreground">{patient.phone_number}</div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pilih Template */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Template</label>
                    <div className="relative">
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={recipient.templateId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCustomRecipient(recipient.id, "templateId", e.target.value)}
                      >
                        <option value="">-- Pilih template --</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nilai Kustom */}
                    <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Nilai Kustom ({`{{value1}}`})
                    </label>
                    <Input
                        placeholder="Contoh: Rp 500,000 atau Hasil Normal"
                        value={recipient.customValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCustomRecipient(recipient.id, "customValue", e.target.value)}
                    />
                    </div>
                  {/* Preview Pesan */}
                  {recipient.templateContent && recipient.patientName && (
                    <div className="rounded-lg bg-muted/30 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Preview Pesan:</div>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {formatPersonalMessage(
                          recipient.templateContent,
                          recipient.patientName,
                          recipient.customValue
                        ).substring(0, 150)}
                        {formatPersonalMessage(recipient.templateContent, recipient.patientName, recipient.customValue).length > 150 && "..."}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <Button onClick={handleSaveSchedule} disabled={isSaving} className="w-full gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
            {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
          </Button>
        </CardContent>
      </Card>

      {/* Tabel Monitoring Jadwal */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Jadwal Broadcast</CardTitle>
          <CardDescription>Monitoring antrian pesan yang telah dijadwalkan</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSchedules ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada jadwal broadcast</p>
              <p className="text-sm">Buat jadwal baru menggunakan form di atas</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul Jadwal</TableHead>
                    <TableHead>Waktu Pelaksanaan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jumlah Pesan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.title}</TableCell>
                      <TableCell>{formatDateTime(schedule.scheduled_time)}</TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>{schedule.task_count || 0} pesan</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Jadwal</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus jadwal "{selectedSchedule?.title}"?
              <br />
              Tindakan ini akan menghapus semua pesan yang terkait dan tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteSchedule}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-green-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Berhasil!</p>
              <p className="text-xs opacity-90">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {showErrorToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-red-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <XCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Gagal!</p>
              <p className="text-xs opacity-90">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}