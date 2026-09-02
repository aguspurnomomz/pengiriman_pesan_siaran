import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Send, 
  Smartphone, 
  User, 
  Clock, 
  FileText, 
  AlertCircle, 
  Search, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Shield, 
  Users, 
  Loader2, 
  Plus, 
  Settings, 
  Trash2, 
  Pencil,           
  MinusCircle, 
  UserPlus, 
  Variable, 
  PlusCircle,
  Activity,
  MessageCircle,
  Calendar,
  Download,
  Filter,
  Upload,
  FileSpreadsheet,
  Paperclip,
  X,
  File,
  FolderOpen
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import { uploadAndSaveDocument, type UserDocument } from "@/lib/documentService";

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

interface GroupMemberForManage {
  id: string;
  patient_id: string;
  name: string;
  phone_number: string;
  custom_value_1: string | null;
}

interface ClinicSettings {
  fonteApiKey: string;
  signature: string;
  clinicName: string;
}

interface SendProgress {
  current: number;
  total: number;
  success: number;
  failed: number;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface RecentDelivery {
  id: string;
  patientName: string;
  messageType: string;
  messageContent: string;
  status: "sent" | "failed";
  timestamp: string;
  created_at: string;
}

type SendMode = "single" | "group";
type ManageTab = "create" | "members";
type DateFilterType = "today" | "weekly" | "monthly" | "custom";

export function BroadcastPage() {
  const [sendMode, setSendMode] = useState<SendMode>("single");
  const [currentClinicId, setCurrentClinicId] = useState<string | null>(null);
  
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  
  // State Nilai Kustom untuk Kirim Satuan
  const [singleCustomValue, setSingleCustomValue] = useState<string>("");

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [manageTab, setManageTab] = useState<ManageTab>("create");
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedManageGroup, setSelectedManageGroup] = useState<GroupOption | null>(null);
  const [groupMembersForManage, setGroupMembersForManage] = useState<GroupMemberForManage[]>([]);
  const [isLoadingManageMembers, setIsLoadingManageMembers] = useState(false);
  const [searchNewMember, setSearchNewMember] = useState("");
  const [newMemberCustomValue, setNewMemberCustomValue] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string>("Invoice");
  const [message, setMessage] = useState<string>("");
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [editTemplateTitle, setEditTemplateTitle] = useState("");
  const [editTemplateContent, setEditTemplateContent] = useState("");
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  // State Lampiran / Attachment
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [selectedExistingDocument, setSelectedExistingDocument] = useState<UserDocument | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // State Modal Pustaka Dokumen
  const [isDocumentPickerOpen, setIsDocumentPickerOpen] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<UserDocument[]>([]);
  const [isLoadingSavedDocs, setIsLoadingSavedDocs] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // State Modal Konfirmasi Kirim
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("weekly");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress>({ current: 0, total: 0, success: 0, failed: 0 });
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);

  // Helper Mendapatkan Clinic ID User Aktif
  const getUserClinicId = async (): Promise<string | null> => {
    if (currentClinicId) return currentClinicId;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return null;

    // 1. Cek dari tabel profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.clinic_id) {
      setCurrentClinicId(profile.clinic_id);
      return profile.clinic_id;
    }

    // 2. Fallback: Cek dari tabel user_clinics jika profiles.clinic_id kosong
    const { data: userClinic } = await supabase
      .from("user_clinics")
      .select("clinic_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (userClinic?.clinic_id) {
      setCurrentClinicId(userClinic.clinic_id);
      return userClinic.clinic_id;
    }

    return null;
  };

  useEffect(() => {
    fetchPatients();
    fetchGroups();
    fetchClinicSettings();
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchRecentDeliveries();
  }, [dateFilter, startDate, endDate]);

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

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup.id);
    } else {
      setGroupMembers([]);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedManageGroup && manageTab === "members") {
      fetchGroupMembersForManage(selectedManageGroup.id);
    } else {
      setGroupMembersForManage([]);
    }
  }, [selectedManageGroup, manageTab]);
  
  const fetchSavedDocuments = async () => {
    setIsLoadingSavedDocs(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setSavedDocuments([]);
        setIsLoadingSavedDocs(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedDocuments(data || []);
    } catch (err) {
      console.error("Gagal mengambil dokumen:", err);
    } finally {
      setIsLoadingSavedDocs(false);
    }
  };

  const handleOpenDocumentPicker = () => {
    fetchSavedDocuments();
    setIsDocumentPickerOpen(true);
  };

  const handleSelectExistingDocument = (doc: UserDocument) => {
    setSelectedAttachment(null); // Reset local file
    setSelectedExistingDocument(doc);
    setIsDocumentPickerOpen(false);
  };

  // Handler Pilih Lampiran File Lokal
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file maksimal adalah 10 MB!");
      return;
    }

    setSelectedExistingDocument(null); // Reset file storage
    setSelectedAttachment(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setAttachmentPreviewUrl(url);
    } else {
      setAttachmentPreviewUrl(null);
    }
  };

  // Handler Hapus Lampiran File
  const handleRemoveAttachment = () => {
    setSelectedAttachment(null);
    setSelectedExistingDocument(null);
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
      setAttachmentPreviewUrl(null);
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const downloadSampleTemplate = (format: "excel" | "txt") => {
    if (format === "excel") {
      const sampleData = [
        {
          Judul: "Pengambilan Obat",
          Isi: "Halo {{name}},\nObat Anda sudah siap diambil di apotek klinik.\nTotal tagihan: {{value1}}.\n\nTerima kasih.",
        },
        {
          Judul: "Pengingat Kontrol",
          Isi: "Yth. Pasien {{name}},\nMengingatkan jadwal kontrol ulang Anda pada {{value1}}.\nNomor antrian: {{queueNo}}.\n\nSemoga sehat selalu.",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      worksheet["!cols"] = [{ wch: 25 }, { wch: 60 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contoh Template");
      XLSX.writeFile(workbook, "Contoh_Template_Pesan.xlsx");
    } else if (format === "txt") {
      const txtContent = `Pengingat Janji Temu\nYth. {{name}},\n\nKami mengingatkan jadwal janji temu Anda besok.\nCatatan: {{value1}}\n\nTerima kasih.`;
      const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Contoh_Template_Pesan.txt";
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const clinicId = await getUserClinicId();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId || !clinicId) throw new Error("User atau Klinik tidak terautentikasi");

      const fileExt = file.name.split(".").pop()?.toLowerCase();
      let importedTemplates: { title: string; content: string; user_id: string; clinic_id: string }[] = [];

      if (fileExt === "xlsx" || fileExt === "xls") {
        const dataBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(dataBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        importedTemplates = rawData
          .map((row) => {
            const title = row["Judul"] || row["title"] || row["Title"] || "";
            const content = row["Isi"] || row["content"] || row["Content"] || row["Pesan"] || "";
            return {
              title: String(title).trim(),
              content: String(content).trim(),
              user_id: userId,
              clinic_id: clinicId,
            };
          })
          .filter((t) => t.title !== "" && t.content !== "");
      }
      else if (fileExt === "txt") {
        const fullText = await file.text();
        const lines = fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length > 0) {
          const title = lines[0] || file.name.replace(".txt", "");
          const content = lines.slice(1).join("\n").trim() || title;

          importedTemplates.push({
            title: title.substring(0, 50),
            content: content,
            user_id: userId,
            clinic_id: clinicId,
          });
        }
      } else {
        alert("Format file tidak didukung! Gunakan file Excel (.xlsx) atau Teks (.txt)");
        setIsImporting(false);
        return;
      }

      if (importedTemplates.length === 0) {
        alert("File kosong atau format data tidak valid!");
        setIsImporting(false);
        return;
      }

      const { error } = await supabase.from("message_templates").insert(importedTemplates);

      if (error) throw error;

      await fetchTemplates();
      setSuccessMessage(`Berhasil mengimpor ${importedTemplates.length} template baru!`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error("Error importing template file:", err);
      setErrorMessage(err.message || "Gagal mengimpor file template");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchRecentDeliveries = async () => {
    setIsLoadingDeliveries(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setRecentDeliveries([]);
        setIsLoadingDeliveries(false);
        return;
      }

      let query = supabase
        .from('message_logs')
        .select(`
          id,
          message_type,
          message_content,
          status,
          created_at,
          patient_id,
          patients (
            name
          )
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      const now = new Date();

      if (dateFilter === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', startOfDay);
      } else if (dateFilter === "weekly") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      } else if (dateFilter === "monthly") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('created_at', startOfMonth);
      } else if (dateFilter === "custom") {
        if (startDate) {
          query = query.gte('created_at', new Date(startDate).toISOString());
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const deliveries: RecentDelivery[] = (data || []).map((item: any) => ({
        id: item.id,
        patientName: item.patients?.name || 'Pasien Umum / Kustom',
        messageType: item.message_type,
        messageContent: item.message_content,
        status: item.status,
        timestamp: item.created_at,
        created_at: item.created_at
      }));

      setRecentDeliveries(deliveries);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching recent deliveries:', error);
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  const exportToExcel = () => {
    if (recentDeliveries.length === 0) {
      alert("Tidak ada data riwayat untuk diexport!");
      return;
    }

    const exportData = recentDeliveries.map((item, index) => ({
      No: index + 1,
      "Nama Pasien": item.patientName,
      "Tipe Pesan": item.messageType,
      "Isi Pesan": item.messageContent,
      Status: item.status === "sent" ? "Terkirim" : "Gagal",
      "Waktu Pengiriman": new Date(item.created_at).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Broadcast");

    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 20 },
      { wch: 50 },
      { wch: 12 },
      { wch: 22 },
    ];

    const fileName = `Riwayat_Pengiriman_Pesan_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days < 7) return `${days} hari yang lalu`;
    return new Date(timestamp).toLocaleDateString('id-ID');
  };

  const getMessageTypeDisplay = (type: string) => {
    const mapping: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      Invoice: { icon: <FileText className="h-3 w-3" />, label: "Invoice", color: "text-blue-600 bg-blue-50" },
      "Lab Result": { icon: <Activity className="h-3 w-3" />, label: "Hasil Lab", color: "text-purple-600 bg-purple-50" },
      Queue: { icon: <Clock className="h-3 w-3" />, label: "Antrian", color: "text-yellow-600 bg-yellow-50" },
      Birthday: { icon: <Calendar className="h-3 w-3" />, label: "Ulang Tahun", color: "text-pink-600 bg-pink-50" }
    };
    return mapping[type] || { icon: <MessageCircle className="h-3 w-3" />, label: type, color: "text-gray-600 bg-gray-50" };
  };

  const totalPages = Math.ceil(recentDeliveries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDeliveries = recentDeliveries.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const clinicId = await getUserClinicId();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId || !clinicId) {
        console.error("User or clinic not authenticated");
        setIsLoadingTemplates(false);
        return;
      }

      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setTemplates(data);
        setSelectedTemplateId(data[0].id);
        setSelectedTemplateTitle(data[0].title);
        setMessage(data[0].content);
      } else {
        await createDefaultTemplates(userId, clinicId);
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const createDefaultTemplates = async (userId: string, clinicId: string) => {
    const defaultTemplates = [
      {
        title: "Hasil Lab",
        content: "Yth. {{name}},\n\nHasil laboratorium Anda sudah keluar.\n{{value1}}\nSilakan datang ke klinik untuk konsultasi lebih lanjut.\n\nTerima kasih.",
        user_id: userId,
        clinic_id: clinicId
      },
      {
        title: "Antrian",
        content: "Halo {{name}},\n\nNomor antrian Anda: {{queueNo}}\nCatatan: {{value1}}\nPerkiraan waktu tunggu: 30 menit.\n\nTerima kasih.",
        user_id: userId,
        clinic_id: clinicId
      }
    ];

    const { error } = await supabase
      .from('message_templates')
      .insert(defaultTemplates);

    if (error) {
      console.error('Error creating default templates:', error);
    } else {
      await fetchTemplates();
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateTitle.trim()) {
      alert("Judul template harus diisi!");
      return;
    }

    if (!newTemplateContent.trim()) {
      alert("Isi template harus diisi!");
      return;
    }

    setIsCreatingTemplate(true);
    try {
      const clinicId = await getUserClinicId();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId || !clinicId) throw new Error("User or clinic not authenticated");

      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          title: newTemplateTitle,
          content: newTemplateContent,
          user_id: userId,
          clinic_id: clinicId
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setTemplates(prev => [...prev, data[0]]);
        setSelectedTemplateId(data[0].id);
        setSelectedTemplateTitle(data[0].title);
        setMessage(data[0].content);
      }

      setNewTemplateTitle("");
      setNewTemplateContent("");
      setIsCreateTemplateOpen(false);
      setShowSuccessToast(true);
      setSuccessMessage("Template berhasil dibuat!");
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error creating template:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleOpenEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setEditTemplateTitle(template.title);
    setEditTemplateContent(template.content);
    setIsEditTemplateOpen(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    if (!editTemplateTitle.trim()) {
      alert("Judul template harus diisi!");
      return;
    }

    if (!editTemplateContent.trim()) {
      alert("Isi template harus diisi!");
      return;
    }

    setIsUpdatingTemplate(true);
    try {
      const { error } = await supabase
        .from('message_templates')
        .update({
          title: editTemplateTitle,
          content: editTemplateContent,
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t =>
          t.id === editingTemplate.id
            ? { ...t, title: editTemplateTitle, content: editTemplateContent }
            : t
        )
      );

      if (selectedTemplateId === editingTemplate.id) {
        setSelectedTemplateTitle(editTemplateTitle);
        setMessage(editTemplateContent);
      }

      setIsEditTemplateOpen(false);
      setEditingTemplate(null);
      setShowSuccessToast(true);
      setSuccessMessage("Template berhasil diperbarui!");
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error updating template:', error);
      setErrorMessage(error.message || "Gagal memperbarui template");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateTitle: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus template "${templateTitle}"?`)) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);

      if (selectedTemplateId === templateId) {
        if (updatedTemplates.length > 0) {
          setSelectedTemplateId(updatedTemplates[0].id);
          setSelectedTemplateTitle(updatedTemplates[0].title);
          setMessage(updatedTemplates[0].content);
        } else {
          setSelectedTemplateId(null);
          setSelectedTemplateTitle("");
          setMessage("");
        }
      }

      setShowSuccessToast(true);
      setSuccessMessage(`Template "${templateTitle}" berhasil dihapus!`);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error deleting template:', error);
      setErrorMessage(error.message || "Gagal menghapus template");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplateId(template.id);
    setSelectedTemplateTitle(template.title);
    setMessage(template.content);
    setIsTemplateDialogOpen(false);
  };

  const fetchPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setPatients([]);
        setIsLoadingPatients(false);
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone_number')
        .eq('clinic_id', clinicId)
        .eq('status', 'Aktif')
        .order('name', { ascending: true });

      if (error) throw error;
      
      const patientOptions: PatientOption[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone_number: item.phone_number
      }));
      
      setPatients(patientOptions);
    } catch (error: any) {
      console.error('Error fetching patients:', error);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setGroups([]);
        setIsLoadingGroups(false);
        return;
      }

      const { data, error } = await supabase
        .from('patient_groups')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name', { ascending: true });

      if (error) throw error;

      const groupsWithCount: GroupOption[] = await Promise.all(
        (data || []).map(async (group: any) => {
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
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    setIsLoadingMembers(true);
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
      setIsLoadingMembers(false);
    }
  };

  const fetchGroupMembersForManage = async (groupId: string) => {
    setIsLoadingManageMembers(true);
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

      const members: GroupMemberForManage[] = (data || []).map((item: any) => ({
        id: item.id,
        patient_id: item.patient_id,
        name: item.patients.name,
        phone_number: item.patients.phone_number,
        custom_value_1: item.custom_value_1 || null
      }));
      
      setGroupMembersForManage(members);
    } catch (error: any) {
      console.error('Error fetching group members for manage:', error);
    } finally {
      setIsLoadingManageMembers(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Nama grup harus diisi!");
      return;
    }

    setIsSavingGroup(true);
    try {
      const clinicId = await getUserClinicId();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId || !clinicId) throw new Error("User or clinic not authenticated");

      const { error } = await supabase
        .from('patient_groups')
        .insert({
          name: newGroupName,
          description: newGroupDesc || null,
          user_id: userId,
          clinic_id: clinicId
        });

      if (error) throw error;

      setNewGroupName("");
      setNewGroupDesc("");
      await fetchGroups();
      setShowSuccessToast(true);
      setSuccessMessage("Grup berhasil dibuat!");
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error creating group:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus grup "${groupName}"?`)) return;

    setIsDeletingGroup(true);
    try {
      const { error } = await supabase
        .from('patient_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await fetchGroups();
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      setShowSuccessToast(true);
      setSuccessMessage("Grup berhasil dihapus!");
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error deleting group:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleAddMember = async (patientId: string, patientName: string) => {
    if (!selectedManageGroup) return;

    setIsAddingMember(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: selectedManageGroup.id,
          patient_id: patientId,
          custom_value_1: newMemberCustomValue || null
        });

      if (error) throw error;

      await fetchGroupMembersForManage(selectedManageGroup.id);
      await fetchGroups();
      setSearchNewMember("");
      setNewMemberCustomValue("");
      setShowSuccessToast(true);
      setSuccessMessage(`${patientName} berhasil ditambahkan ke grup!`);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error adding member:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Hapus ${memberName} dari grup?`)) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchGroupMembersForManage(selectedManageGroup!.id);
      await fetchGroups();
      setShowSuccessToast(true);
      setSuccessMessage(`${memberName} berhasil dihapus dari grup!`);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error: any) {
      console.error('Error removing member:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }
  };

  const handleUpdateCustomValue = async (memberId: string, customValue: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ custom_value_1: customValue || null })
        .eq('id', memberId);

      if (error) throw error;

      setGroupMembersForManage(prev =>
        prev.map(m => m.id === memberId ? { ...m, custom_value_1: customValue || null } : m)
      );
      
      if (selectedGroup && selectedGroup.id === selectedManageGroup?.id) {
        setGroupMembers(prev =>
          prev.map(m => m.id === memberId ? { ...m, custom_value_1: customValue || null } : m)
        );
      }
    } catch (error: any) {
      console.error('Error updating custom value:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }
  };

  const getAvailablePatients = () => {
    const memberIds = groupMembersForManage.map(m => m.patient_id);
    return patients.filter(p => !memberIds.includes(p.id));
  };

  const availablePatients = getAvailablePatients();
  const filteredAvailablePatients = availablePatients.filter(p =>
    p.name.toLowerCase().includes(searchNewMember.toLowerCase()) ||
    p.phone_number.includes(searchNewMember)
  );

  const fetchClinicSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const clinicId = await getUserClinicId();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId || !clinicId) {
        console.error("User or clinic not authenticated");
        setIsLoadingSettings(false);
        return;
      }

      const { data, error } = await supabase
        .from('clinic_settings')
        .select('fonte_api_key, signature, clinic_name')
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setClinicSettings({
          fonteApiKey: data.fonte_api_key || "",
          signature: data.signature || "",
          clinicName: data.clinic_name || "",
        });
      }
    } catch (error: any) {
      console.error('Error fetching clinic settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const formatPhoneToInternational = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    } else if (cleaned.startsWith("62")) {
      cleaned = cleaned;
    } else if (cleaned.startsWith("8")) {
      cleaned = "62" + cleaned;
    }
    return cleaned;
  };

  const getPersonalizedMessage = (patientName: string, baseMessage: string, customValue?: string | null, queueNumber?: string): string => {
    let personalized = baseMessage;
    personalized = personalized.replace(/{{name}}/g, patientName);
    personalized = personalized.replace(/{{value1}}/g, customValue || "");
    if (queueNumber) {
      personalized = personalized.replace(/{{queueNo}}/g, queueNumber);
    }
    
    if (clinicSettings?.signature) {
      let signature = clinicSettings.signature;
      signature = signature.replace(/{clinic_name}/g, clinicSettings.clinicName || "Klinik");
      personalized += "\n\n" + signature;
    }
    
    return personalized;
  };

  // Nembak API Fonnte dengan Dukungan Parameter File URL & Filename
  const sendToFonnte = async (
    phoneNumber: string, 
    messageText: string, 
    fileUrl?: string | null,
    fileName?: string | null
  ): Promise<any> => {
    if (!clinicSettings?.fonteApiKey) {
      throw new Error("API Key Fonnte tidak ditemukan.");
    }

    const formattedPhone = formatPhoneToInternational(phoneNumber);
    const formData = new FormData();
    formData.append('target', formattedPhone);
    formData.append('message', messageText);

    if (fileUrl) {
      formData.append('url', fileUrl);
      formData.append('file', fileUrl);

      if (fileName) {
        formData.append('filename', fileName);
      }
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': clinicSettings.fonteApiKey },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok || data.status === false) {
      throw new Error(data.message || "Gagal mengirim pesan");
    }
    
    return data;
  };

  const saveMessageLog = async (
    patientId: string,
    messageType: string,
    messageContent: string,
    status: string,
    fonteResponseId: string | null = null,
    fileUrl: string | null = null
  ) => {
    try {
      const clinicId = await getUserClinicId();

      if (!clinicId) {
        console.error("Gagal menyimpan log: clinic_id tidak ditemukan!");
        return;
      }

      // Hapus 'user_id' karena kolom tersebut tidak ada di tabel message_logs
      const { data, error } = await supabase
        .from('message_logs')
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          message_type: messageType,
          message_content: messageContent,
          status: status,
          delivery_time: new Date().toISOString(),
          fonte_response_id: fonteResponseId,
          file_url: fileUrl
        })
        .select();

      if (error) {
        console.error('Error insert message_logs:', error.message);
      } else {
        console.log('Berhasil menyimpan message_log:', data);
      }

      fetchRecentDeliveries();
    } catch (error: any) {
      console.error('Error saving message log:', error);
    }
  };

  const handleSendSingle = async () => {
    if (!selectedPatient) {
      alert("Silakan pilih pasien terlebih dahulu!");
      return;
    }

    if (!message.trim() && !selectedAttachment && !selectedExistingDocument) {
      alert("Pesan atau lampiran file tidak boleh kosong!");
      return;
    }

    if (!clinicSettings?.fonteApiKey) {
      alert("API Key Fonnte belum dikonfigurasi.");
      return;
    }

    setIsSending(true);
    setIsConfirmSendOpen(false); // Tutup Dialog Konfirmasi

    const fullMessage = getPersonalizedMessage(selectedPatient.name, message, singleCustomValue);
    const messageType = selectedTemplateTitle;

    try {
      let uploadedUrl: string | null = null;
      let fileName: string | undefined = undefined;

      // 1. Upload File Lampiran baru jika ada
      if (selectedAttachment) {
        const { publicUrl } = await uploadAndSaveDocument(
          selectedAttachment,
          selectedPatient.id,
          selectedTemplateTitle
        );
        uploadedUrl = publicUrl;
        fileName = selectedAttachment.name;
      } 
      // Atau gunakan file dari pustaka storage yang dipilih
      else if (selectedExistingDocument) {
        uploadedUrl = selectedExistingDocument.file_url;
        fileName = selectedExistingDocument.document_name;
      }

      const result = await sendToFonnte(
        selectedPatient.phone_number, 
        fullMessage, 
        uploadedUrl, 
        fileName
      );
      
      // 3. Simpan Log
      await saveMessageLog(selectedPatient.id, messageType, fullMessage, 'sent', result.id || null, uploadedUrl);
      
      setSuccessMessage(`Pesan berhasil dikirim ke ${selectedPatient.name}`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
      resetForm();
    } catch (error: any) {
      await saveMessageLog(selectedPatient.id, messageType, fullMessage, 'failed', null);
      setErrorMessage(error.message || "Gagal mengirim pesan");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendGroup = async () => {
    if (!selectedGroup) {
      alert("Silakan pilih grup terlebih dahulu!");
      return;
    }

    if (groupMembers.length === 0) {
      alert("Grup ini tidak memiliki anggota!");
      return;
    }

    if (!message.trim() && !selectedAttachment && !selectedExistingDocument) {
      alert("Pesan atau lampiran file tidak boleh kosong!");
      return;
    }

    if (!clinicSettings?.fonteApiKey) {
      alert("API Key Fonnte belum dikonfigurasi.");
      return;
    }

    setIsSending(true);
    setIsConfirmSendOpen(false); // Tutup Dialog Konfirmasi
    setSendProgress({ current: 0, total: groupMembers.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;
    let uploadedUrl: string | null = null;
    let fileName: string | undefined = undefined;

    try {
      // 1. Upload File Lampiran Sekali untuk Broadcast Grup (jika ada file baru)
      if (selectedAttachment) {
        const { publicUrl } = await uploadAndSaveDocument(
          selectedAttachment,
          null, // Broadcast grup
          selectedTemplateTitle
        );
        uploadedUrl = publicUrl;
        fileName = selectedAttachment.name;
      } 
      // Atau pakai file yang dipilih dari pustaka Storage
      else if (selectedExistingDocument) {
        uploadedUrl = selectedExistingDocument.file_url;
        fileName = selectedExistingDocument.document_name;
      }

      // 2. Kirim Iteratif ke Setiap Anggota Grup
      for (let i = 0; i < groupMembers.length; i++) {
        const member = groupMembers[i];
        const personalizedMessage = getPersonalizedMessage(member.name, message, member.custom_value_1);
        const messageType = selectedTemplateTitle;

        setSendProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          const result = await sendToFonnte(member.phone_number, personalizedMessage, uploadedUrl, fileName);
          await saveMessageLog(member.patient_id, messageType, personalizedMessage, 'sent', result.id || null, uploadedUrl);
          successCount++;
          setSendProgress(prev => ({ ...prev, success: successCount }));
        } catch (error: any) {
          await saveMessageLog(member.patient_id, messageType, personalizedMessage, 'failed', null, uploadedUrl);
          failedCount++;
          setSendProgress(prev => ({ ...prev, failed: failedCount }));
          console.error(`Failed to send to ${member.name}:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const summary = `Berhasil mengirim ${successCount} pesan, ${failedCount} gagal.`;
      if (failedCount === 0) {
        setSuccessMessage(summary);
        setShowSuccessToast(true);
        resetForm();
      } else {
        setErrorMessage(summary);
        setShowErrorToast(true);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Gagal mengunggah file lampiran broadcast");
      setShowErrorToast(true);
    } finally {
      setTimeout(() => {
        setShowSuccessToast(false);
        setShowErrorToast(false);
      }, 5000);
      
      setIsSending(false);
      setSelectedGroup(null);
      setGroupMembers([]);
    }
  };

  const handleConfirmAndSend = () => {
    if (sendMode === "single") {
      handleSendSingle();
    } else {
      handleSendGroup();
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSingleCustomValue("");
    setSelectedGroup(null);
    setGroupMembers([]);
    handleRemoveAttachment();
    if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
      setSelectedTemplateTitle(templates[0].title);
      setMessage(templates[0].content);
    }
    setSearchQuery("");
    setGroupSearchQuery("");
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = message.substring(0, start);
    const after = message.substring(end);
    const newText = before + variable + after;
    
    setMessage(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handlePatientSelect = (patient: PatientOption) => {
    setSelectedPatient(patient);
    setSearchQuery("");
    setIsPatientDropdownOpen(false);
  };

  const handleGroupSelect = (group: GroupOption) => {
    setSelectedGroup(group);
    setGroupSearchQuery("");
    setIsGroupDropdownOpen(false);
  };

  const getPreviewCustomValue = () => {
    if (sendMode === "single") {
      return singleCustomValue || "";
    } else {
      return groupMembers.length > 0 ? groupMembers[0].custom_value_1 || "" : "";
    }
  };

  const getPreviewPatientName = () => {
    if (sendMode === "single") {
      return selectedPatient ? selectedPatient.name : "Belum dipilih";
    } else {
      return groupMembers.length > 0 ? groupMembers[0].name : "Belum dipilih";
    }
  };

  const getPreviewMessage = () => {
    let previewText = message;
    previewText = previewText.replace(/{{name}}/g, getPreviewPatientName());
    previewText = previewText.replace(/{{value1}}/g, getPreviewCustomValue());
    previewText = previewText.replace(/{{queueNo}}/g, "000");
    return previewText;
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone_number.includes(searchQuery)
  );

  const filteredSavedDocs = savedDocuments.filter((doc) =>
    doc.document_name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const isSendDisabled = () => {
    const hasAttachment = Boolean(selectedAttachment || selectedExistingDocument);
    if (sendMode === "single") {
      return isSending || !selectedPatient || (!message.trim() && !hasAttachment) || !clinicSettings?.fonteApiKey;
    } else {
      return isSending || !selectedGroup || groupMembers.length === 0 || (!message.trim() && !hasAttachment) || !clinicSettings?.fonteApiKey;
    }
  };

  const getSendButtonText = () => {
    if (isSending && sendMode === "group") {
      return `Mengirim ${sendProgress.current} dari ${sendProgress.total} pesan... (${sendProgress.success} berhasil, ${sendProgress.failed} gagal)`;
    }
    if (isSending) {
      return "Mengunggah file & mengirim...";
    }
    return "Kirim Pesan";
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportTemplateFile}
        accept=".xlsx, .xls, .txt"
        className="hidden"
      />

      <input
        type="file"
        ref={attachmentInputRef}
        onChange={handleAttachmentChange}
        accept=".pdf, .png, .jpg, .jpeg, .xlsx, .docx"
        className="hidden"
      />

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pusat Pengiriman Pesan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat dan kirim pesan WhatsApp dengan variabel dinamis &amp; lampiran berkas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Komposer Pesan</CardTitle>
              <CardDescription>
                Buat pesan siaran dengan variabel dinamis &amp; lampiran dokumen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Template Pesan</label>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setIsTemplateDialogOpen(true)}
                >
                  <span>{selectedTemplateTitle}</span>
                  <span className="text-muted-foreground">▼</span>
                </Button>
              </div>

              <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setSendMode("single")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    sendMode === "single"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <User className="h-4 w-4" />
                    Kirim Satuan
                  </div>
                </button>
                <button
                  onClick={() => setSendMode("group")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    sendMode === "group"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    Kirim Grup
                  </div>
                </button>
              </div>

              {sendMode === "single" && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Penerima Pesan</label>
                    <div className="relative" ref={patientDropdownRef}>
                      <div 
                        className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {selectedPatient ? (
                            <div className="flex-1">
                              <span className="text-sm font-medium">{selectedPatient.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {selectedPatient.phone_number.slice(0, 4)}...{selectedPatient.phone_number.slice(-4)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Cari dan pilih pasien...</span>
                          )}
                        </div>
                        <span className="text-muted-foreground">{isPatientDropdownOpen ? "▲" : "▼"}</span>
                      </div>

                      {isPatientDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-white shadow-lg">
                          <div className="p-2 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Cari nama atau nomor WhatsApp..."
                                value={searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                className="pl-9"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {isLoadingPatients ? (
                              <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            ) : filteredPatients.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Tidak ada pasien ditemukan</p>
                              </div>
                            ) : (
                              filteredPatients.map((patient) => (
                                <button
                                  key={patient.id}
                                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                  onClick={() => handlePatientSelect(patient)}
                                >
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{patient.name}</div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {patient.phone_number}
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedPatient && (
                      <p className="text-xs text-green-600">✓ Terpilih: {selectedPatient.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Variable className="h-4 w-4 text-primary" />
                      Nilai Kustom <span className="text-xs text-muted-foreground font-normal">({"{{value1}}"})</span>
                    </label>
                    <Input
                      placeholder="Contoh: Rp 150.000, 30 November 2026, atau Hasil Normal"
                      value={singleCustomValue}
                      onChange={(e) => setSingleCustomValue(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nilai ini akan otomatis menggantikan variabel {"{{value1}}"} pada isi pesan.
                    </p>
                  </div>
                </div>
              )}

              {sendMode === "group" && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-foreground flex-1">Pilih Grup</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedManageGroup(null);
                          setNewGroupName("");
                          setNewGroupDesc("");
                          setSearchNewMember("");
                          setNewMemberCustomValue("");
                          setManageTab("create");
                          setIsManageGroupsOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Settings className="h-3 w-3" />
                        Kelola Grup
                      </Button>
                    </div>
                    <div className="relative" ref={groupDropdownRef}>
                      <div 
                        className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {selectedGroup ? (
                            <div className="flex-1">
                              <span className="text-sm font-medium">{selectedGroup.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({selectedGroup.memberCount} anggota)
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Pilih grup...</span>
                          )}
                        </div>
                        <span className="text-muted-foreground">{isGroupDropdownOpen ? "▲" : "▼"}</span>
                      </div>

                      {isGroupDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-white shadow-lg">
                          <div className="p-2 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Cari grup..."
                                value={groupSearchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroupSearchQuery(e.target.value)}
                                className="pl-9"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {isLoadingGroups ? (
                              <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            ) : filteredGroups.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Tidak ada grup ditemukan</p>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => {
                                    setIsGroupDropdownOpen(false);
                                    setSelectedManageGroup(null);
                                    setNewGroupName("");
                                    setNewGroupDesc("");
                                    setSearchNewMember("");
                                    setNewMemberCustomValue("");
                                    setManageTab("create");
                                    setIsManageGroupsOpen(true);
                                  }}
                                  className="mt-2"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Buat grup baru
                                </Button>
                              </div>
                            ) : (
                              filteredGroups.map((group) => (
                                <button
                                  key={group.id}
                                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                  onClick={() => handleGroupSelect(group)}
                                >
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{group.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {group.memberCount} anggota
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedGroup && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Anggota Grup</label>
                      <div className="rounded-md border border-border max-h-48 overflow-y-auto">
                        {isLoadingMembers ? (
                          <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : groupMembers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">Grup ini tidak memiliki anggota</p>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setSelectedManageGroup(selectedGroup);
                                setManageTab("members");
                                setIsManageGroupsOpen(true);
                              }}
                              className="mt-2"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Tambah anggota
                            </Button>
                          </div>
                        ) : (
                          groupMembers.map((member, idx) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-0"
                            >
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium">{member.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {member.phone_number}
                                </span>
                                {member.custom_value_1 && (
                                  <div className="text-xs text-primary mt-0.5">
                                    Nilai: {member.custom_value_1}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total {groupMembers.length} penerima
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Sisipkan Variabel</label>
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable("{{name}}")} className="gap-2">
                    <User className="h-3 w-3" /> + Nama
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable("{{queueNo}}")} className="gap-2">
                    <Clock className="h-3 w-3" /> + No. Antrian
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable("{{value1}}")} className="gap-2">
                    <Variable className="h-3 w-3" /> + Nilai Kustom
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Klik tombol untuk menyisipkan variabel di posisi kursor
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Isi Pesan</label>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  placeholder="Tulis pesan Anda di sini... Gunakan {{value1}} untuk nilai kustom"
                  className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Tips: Gunakan {"{{name}}"}, {"{{value1}}"} (nilai kustom), dan {"{{queueNo}}"} sebagai variabel dinamis
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 shadow-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-950">Catatan Pengiriman Lampiran :</p>
                    <p className="mt-0.5 text-amber-800">
                      Fitur pengiriman berkas langsung ke WhatsApp membutuhkan paket <span className="font-semibold underline">Advanced, Super, atau Ultra</span>pada Layanan kami. Jika Anda menggunakan paket <strong>Freemium</strong>, file tetap akan terunggah ke penyimpanan kami tetapi tidak akan ikut terkirim di pesan WA.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-sm font-medium text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-primary" /> Lampirkan Berkas / File
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">PDF, Gambar, Docx (Maks. 10MB)</span>
                </label>

                {!selectedAttachment && !selectedExistingDocument ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="border-dashed gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="h-3.5 w-3.5" /> Unggah File Baru
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenDocumentPicker}
                      className="border-dashed gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                    >
                      <FolderOpen className="h-3.5 w-3.5" /> Pilih dari Pustaka
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-muted/60 border border-border rounded-lg text-sm">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {selectedAttachment?.type.startsWith("image/") ? (
                        <img
                          src={attachmentPreviewUrl || ""}
                          alt="preview"
                          className="h-9 w-9 object-cover rounded border"
                        />
                      ) : (
                        <div className="h-9 w-9 bg-primary/10 rounded flex items-center justify-center shrink-0">
                          <File className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate text-foreground">
                          {selectedAttachment ? selectedAttachment.name : selectedExistingDocument?.document_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedAttachment
                            ? `${(selectedAttachment.size / (1024 * 1024)).toFixed(2)} MB (Lokal)`
                            : `Tersimpan di Storage (${selectedExistingDocument?.document_type})`}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveAttachment}
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div className="text-xs text-gray-700">
                    <span className="font-semibold">Status API Key:</span>{" "}
                    {isLoadingSettings ? "Memuat..." : clinicSettings?.fonteApiKey ? (
                      <span className="text-green-600">✓ Terkonfigurasi</span>
                    ) : (
                      <span className="text-red-600">✗ Belum dikonfigurasi</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TOMBOL PICU MODAL KONFIRMASI */}
              <Button 
                onClick={() => setIsConfirmSendOpen(true)} 
                disabled={isSendDisabled()} 
                className="w-full gap-2"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {getSendButtonText()}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* PANEL PRATINJAU LANGSUNG (WHATSAPP PREVIEW) */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pratinjau Pesan</CardTitle>
                </div>
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-[380px] rounded-3xl border-8 border-gray-800 bg-gray-800 shadow-xl">
                <div className="bg-white rounded-t-2xl">
                  <div className="bg-[#075E54] px-4 py-3 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{getPreviewPatientName()}</div>
                        <div className="text-[#D9F0EC] text-xs">
                          {sendMode === "single" && selectedPatient ? "Online" : sendMode === "group" && groupMembers.length > 0 ? "Grup" : "Belum dipilih"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#ECE5DD] min-h-[500px] px-3 py-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-[#DCF8C6] rounded-lg p-2.5 shadow-sm space-y-2">
                      
                      {/* PREVIEW GAMBAR ATAU DOKUMEN DALAM BALON WA */}
                      {(selectedAttachment || selectedExistingDocument) && (
                        <div className="rounded bg-black/5 p-2 overflow-hidden border border-black/10">
                          {selectedAttachment?.type.startsWith("image/") && attachmentPreviewUrl ? (
                            <img
                              src={attachmentPreviewUrl}
                              alt="Attachment preview"
                              className="w-full h-36 object-cover rounded mb-1"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-1">
                              <FileText className="h-6 w-6 text-primary shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate text-gray-800">
                                  {selectedAttachment ? selectedAttachment.name : selectedExistingDocument?.document_name}
                                </p>
                                <p className="text-[10px] text-gray-500">Dokumen Lampiran</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-sm whitespace-pre-wrap break-words text-gray-800">
                        {getPreviewMessage() || (selectedAttachment || selectedExistingDocument ? "" : "Pesan Anda akan muncul di sini...")}
                      </div>

                      <div className="text-[10px] text-gray-500 text-right mt-1">
                        {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {getPreviewCustomValue() && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-[#DCF8C6] rounded-lg px-3 py-2 shadow-sm opacity-70">
                        <div className="text-xs whitespace-pre-wrap break-words text-gray-600">
                          💡 Nilai Kustom: {getPreviewCustomValue()}
                        </div>
                      </div>
                    </div>
                  )}

                  {clinicSettings?.signature && getPreviewMessage() && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-[#DCF8C6] rounded-lg px-3 py-2 shadow-sm opacity-70">
                        <div className="text-xs whitespace-pre-wrap break-words text-gray-600">
                          {clinicSettings.signature.replace(/{clinic_name}/g, clinicSettings.clinicName || "Klinik")}
                        </div>
                      </div>
                    </div>
                  )}

                  {!getPreviewMessage() && !selectedAttachment && !selectedExistingDocument && (
                    <div className="flex justify-center items-center h-64">
                      <div className="text-center text-gray-400">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Pratinjau akan muncul di sini</p>
                        <p className="text-xs">Mulai mengetik di editor</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#F0F0F0] px-3 py-2 rounded-b-2xl">
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                    <div className="flex-1 text-sm text-gray-400">Ketik pesan...</div>
                    <Send className="h-4 w-4 text-[#075E54]" />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <span className="font-semibold">Injeksi Variabel:</span> {"{{name}}"} →{" "}
                    <span className="font-mono bg-blue-100 px-1 rounded">{getPreviewPatientName()}</span>
                    {" | "}
                    {"{{value1}}"} →{" "}
                    <span className="font-mono bg-blue-100 px-1 rounded">{getPreviewCustomValue() || "(kosong)"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION AKTIVITAS TERBARU */}
      <Card className="border-border/80 shadow-sm mt-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Aktivitas Terbaru
              </CardTitle>
              <CardDescription>
                Riwayat pengiriman pesan terbaru
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                >
                  <option value="today">Hari Ini</option>
                  <option value="weekly">Mingguan (7 Hari)</option>
                  <option value="monthly">Bulan Ini</option>
                  <option value="custom">Kustom Tanggal</option>
                </select>
              </div>

              {dateFilter === "custom" && (
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs w-32"
                  />
                  <span className="text-xs text-muted-foreground">s/d</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs w-32"
                  />
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="h-8 gap-1.5 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingDeliveries ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">Tidak ada riwayat pengiriman pesan</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Coba ubah filter tanggal untuk melihat riwayat lainnya
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedDeliveries.map((delivery) => {
                    const typeDisplay = getMessageTypeDisplay(delivery.messageType);
                    return (
                      <div 
                        key={delivery.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {delivery.status === "sent" ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate text-foreground">
                                {delivery.patientName}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeDisplay.color}`}>
                                {typeDisplay.icon}
                                {typeDisplay.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {delivery.messageContent}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(delivery.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 ml-2">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              delivery.status === "sent" 
                                ? "bg-green-100 text-green-700 border border-green-200" 
                                : "bg-red-100 text-red-700 border border-red-200"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                delivery.status === "sent" ? "bg-green-500" : "bg-red-500"
                              }`} />
                              {delivery.status === "sent" ? "Terkirim" : "Gagal"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
                    <span>
                      Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, recentDeliveries.length)} dari {recentDeliveries.length} riwayat
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 px-3 text-xs"
                      >
                        Sebelumnya
                      </Button>
                      <span className="font-medium text-foreground px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 px-3 text-xs"
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDocumentPickerOpen} onOpenChange={setIsDocumentPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" /> Pilih Berkas dari Pustaka
            </DialogTitle>
            <DialogDescription>
              Gunakan file yang sudah pernah diunggah sebelumnya
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama dokumen..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {isLoadingSavedDocs ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredSavedDocs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Tidak ada dokumen di pustaka</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredSavedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectExistingDocument(doc)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-foreground">{doc.document_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.document_type} • {new Date(doc.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs text-primary">
                      Pilih
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI PENGIRIMAN PESAN */}
      <Dialog open={isConfirmSendOpen} onOpenChange={setIsConfirmSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Konfirmasi Pengiriman
            </DialogTitle>
            <DialogDescription>
              Periksa kembali rincian pengiriman pesan Anda sebelum memproses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/60 rounded-lg space-y-1.5 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode Kirim:</span>
                <span className="font-semibold text-foreground uppercase">{sendMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penerima:</span>
                <span className="font-semibold text-foreground">
                  {sendMode === "single"
                    ? selectedPatient?.name
                    : `${selectedGroup?.name} (${groupMembers.length} Pasien)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template:</span>
                <span className="font-medium text-foreground">{selectedTemplateTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lampiran:</span>
                <span className="font-medium text-primary">
                  {selectedAttachment
                    ? selectedAttachment.name
                    : selectedExistingDocument
                    ? selectedExistingDocument.document_name
                    : "Tanpa File"}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
              <p className="font-medium">Pratinjau Ringkas Pesan:</p>
              <p className="mt-1 font-mono text-[11px] line-clamp-3 opacity-90">
                "{getPreviewMessage()}"
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmSendOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleConfirmAndSend} disabled={isSending} className="gap-1.5">
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Ya, Kirim Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG TEMPLATE PESAN */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilih Template Pesan</DialogTitle>
            <DialogDescription>Pilih template atau impor dari file (Excel / TXT)</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/60 rounded-lg border border-border">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Unduh Contoh Format File Template:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSampleTemplate("excel")}
                  className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <Download className="h-3 w-3" /> Contoh Excel (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSampleTemplate("txt")}
                  className="h-7 text-xs gap-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <Download className="h-3 w-3" /> Contoh Teks (.txt)
                </Button>
              </div>
            </div>

            {isLoadingTemplates ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <button
                        className="flex-1 flex items-center gap-3 text-left p-2 rounded-md"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{template.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {template.content.substring(0, 80)}...
                          </div>
                        </div>
                      </button>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => handleOpenEditTemplate(template)}
                          title="Edit Template"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => handleDeleteTemplate(template.id, template.title)}
                          title="Hapus Template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada template pesan</p>
                    <p className="text-sm">Buat manual atau impor file di bawah</p>
                  </div>
                )}

                <div className="border-t pt-4 mt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-emerald-600" />}
                    Impor File (.xlsx, .txt)
                  </Button>

                  <Button
                    variant="default"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setIsTemplateDialogOpen(false);
                      setIsCreateTemplateOpen(true);
                    }}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Buat Template Baru
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG BUAT TEMPLATE MANUAL */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Template Baru</DialogTitle>
            <DialogDescription>Buat template pesan baru untuk digunakan nanti</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Template</label>
              <Input
                placeholder="Contoh: Pengambilan Obat, Kontrol Ulang, dll"
                value={newTemplateTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTemplateTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Isi Pesan</label>
              <textarea
                placeholder="Tulis isi pesan template di sini...&#10;&#10;Gunakan variabel:&#10;{{name}} - Nama pasien&#10;{{value1}} - Nilai kustom per anggota&#10;{{queueNo}} - Nomor antrian"
                value={newTemplateContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTemplateContent(e.target.value)}
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Tips: Gunakan {"{{name}}"}, {"{{value1}}"}, dan {"{{queueNo}}"} sebagai variabel dinamis
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateTemplate} disabled={isCreatingTemplate}>
              {isCreatingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Simpan Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT TEMPLATE */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template Pesan</DialogTitle>
            <DialogDescription>Perbarui judul atau isi pesan template</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Template</label>
              <Input
                placeholder="Judul template..."
                value={editTemplateTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTemplateTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Isi Pesan</label>
              <textarea
                placeholder="Isi pesan template..."
                value={editTemplateContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditTemplateContent(e.target.value)}
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Tips: Gunakan {"{{name}}"}, {"{{value1}}"}, dan {"{{queueNo}}"} sebagai variabel dinamis
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsEditTemplateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateTemplate} disabled={isUpdatingTemplate}>
              {isUpdatingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Simpan Perubahan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG KELOLA GRUP */}
      <Dialog open={isManageGroupsOpen} onOpenChange={setIsManageGroupsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Grup</DialogTitle>
            <DialogDescription>Buat grup baru atau kelola anggota grup</DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg mb-4">
            <button
              onClick={() => setManageTab("create")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                manageTab === "create"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Buat/Hapus Grup
              </div>
            </button>
            <button
              onClick={() => setManageTab("members")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                manageTab === "members"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Anggota Grup
              </div>
            </button>
          </div>

          {manageTab === "create" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Buat Grup Baru</h3>
                <Input
                  placeholder="Nama Grup"
                  value={newGroupName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGroupName(e.target.value)}
                />
                <Input
                  placeholder="Deskripsi (opsional)"
                  value={newGroupDesc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGroupDesc(e.target.value)}
                />
                <Button onClick={handleCreateGroup} disabled={isSavingGroup}>
                  {isSavingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Simpan Grup
                </Button>
              </div>

              <div className="border-t my-4" />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Daftar Grup</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada grup</p>
                  ) : (
                    groups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.memberCount} anggota</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          disabled={isDeletingGroup}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {manageTab === "members" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Grup</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedManageGroup?.id || ""}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const group = groups.find(g => g.id === e.target.value);
                    setSelectedManageGroup(group || null);
                  }}
                >
                  <option value="">-- Pilih grup --</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.memberCount} anggota)
                    </option>
                  ))}
                </select>
              </div>

              {selectedManageGroup && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Anggota Saat Ini</label>
                    <div className="rounded-md border border-border max-h-48 overflow-y-auto">
                      {isLoadingManageMembers ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : groupMembersForManage.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">Belum ada anggota</p>
                        </div>
                      ) : (
                        groupMembersForManage.map((member) => (
                          <div
                            key={member.id}
                            className="flex flex-col px-3 py-2 border-b border-border/50 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium">{member.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {member.phone_number}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Nilai Kustom:</span>
                              <Input
                                placeholder="Contoh: Rp 120,000 atau Antrian 12"
                                value={member.custom_value_1 || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateCustomValue(member.id, e.target.value)}
                                className="h-8 text-xs flex-1"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tambah Anggota Baru</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Cari pasien..."
                        value={searchNewMember}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchNewMember(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Input
                      placeholder="Nilai Kustom (opsional) - Contoh: Rp 120,000"
                      value={newMemberCustomValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMemberCustomValue(e.target.value)}
                      className="mt-2"
                    />
                    <div className="rounded-md border border-border max-h-32 overflow-y-auto mt-2">
                      {filteredAvailablePatients.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">Tidak ada pasien tersedia</p>
                        </div>
                      ) : (
                        filteredAvailablePatients.map((patient) => (
                          <div
                            key={patient.id}
                            className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-0"
                          >
                            <div>
                              <span className="text-sm font-medium">{patient.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {patient.phone_number}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddMember(patient.id, patient.name)}
                              disabled={isAddingMember}
                              className="text-green-500 hover:text-green-700"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50 mt-4">
            <Button variant="outline" onClick={() => setIsManageGroupsOpen(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TOAST SUKSES */}
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

      {/* TOAST GAGAL */}
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