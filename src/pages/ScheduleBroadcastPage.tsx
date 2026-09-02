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
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Pencil, 
  Users, 
  User, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FolderOpen, 
  FileText, 
  Paperclip, 
  AlertCircle, 
  X, 
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  PlusCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import type { UserDocument } from "@/lib/documentService";

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
  user_id?: string;
  clinic_id?: string;
  created_at?: string;
}

interface ScheduledBroadcast {
  id: string;
  title: string;
  scheduled_time: string;
  status: "pending" | "processing" | "completed" | "failed";
  user_id: string;
  clinic_id?: string;
  created_at: string;
  task_count?: number;
}

interface CustomRecipient {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  templateId: string;
  templateTitle: string;
  templateContent: string;
  customValue: string;
  fileUrl?: string | null;
  fileName?: string | null;
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: id });
};

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
  const [currentClinicId, setCurrentClinicId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [recipientMode, setRecipientMode] = useState<"group" | "custom">("group");
  
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMessage, setGroupMessage] = useState("");
  const [selectedGroupTemplateTitle, setSelectedGroupTemplateTitle] = useState("Pilih Template");
  const [isLoadingGroupMembers, setIsLoadingGroupMembers] = useState(false);
  
  // State File Lampiran Grup
  const [selectedGroupDocument, setSelectedGroupDocument] = useState<UserDocument | null>(null);

  const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  const [schedules, setSchedules] = useState<ScheduledBroadcast[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [searchPatient, setSearchPatient] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [activeTemplateTarget, setActiveTemplateTarget] = useState<"group" | string>("group"); 
  
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [editTemplateTitle, setEditTemplateTitle] = useState("");
  const [editTemplateContent, setEditTemplateContent] = useState("");
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDocumentPickerOpen, setIsDocumentPickerOpen] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<UserDocument[]>([]);
  const [isLoadingSavedDocs, setIsLoadingSavedDocs] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [activePickerTarget, setActivePickerTarget] = useState<"group" | string>("group");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledBroadcast | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper Mendapatkan Clinic ID User Aktif (Dengan Fallback)
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

    // 2. Fallback: Cek dari tabel user_clinics
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

  // Helper Simpan Ke Log Pesan
  // const saveMessageLog = async (
  //   patientId: string,
  //   messageType: string,
  //   messageContent: string,
  //   status: string,
  //   fallbackClinicId?: string,
  //   fileUrl: string | null = null
  // ) => {
  //   try {
  //     const clinicId = (await getUserClinicId()) || fallbackClinicId;

  //     if (!clinicId) {
  //       console.error("Gagal menyimpan log: clinic_id tidak ditemukan!");
  //       return;
  //     }

  //     await supabase.from('message_logs').insert({
  //       clinic_id: clinicId,
  //       patient_id: patientId,
  //       message_type: messageType,
  //       message_content: messageContent,
  //       status: status,
  //       delivery_time: new Date().toISOString(),
  //       file_url: fileUrl
  //     });
  //   } catch (error) {
  //     console.error('Error saving scheduled message log:', error);
  //   }
  // };

  useEffect(() => {
    fetchSchedules();
    fetchGroups();
    fetchPatients();
    fetchTemplates();
  }, []);

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
    if (selectedGroup && recipientMode === "group") {
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup, recipientMode]);

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

  const handleOpenDocumentPicker = (target: "group" | string) => {
    setActivePickerTarget(target);
    fetchSavedDocuments();
    setIsDocumentPickerOpen(true);
  };

  const handleSelectDocument = (doc: UserDocument) => {
    if (activePickerTarget === "group") {
      setSelectedGroupDocument(doc);
    } else {
      setCustomRecipients((prev) =>
        prev.map((r) =>
          r.id === activePickerTarget
            ? { ...r, fileUrl: doc.file_url, fileName: doc.document_name }
            : r
        )
      );
    }
    setIsDocumentPickerOpen(false);
  };

  const fetchSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setSchedules([]);
        setIsLoadingSchedules(false);
        return;
      }

      const { data, error } = await supabase
        .from('scheduled_broadcasts')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      const schedulesWithCount = await Promise.all(
        (data || []).map(async (schedule) => {
          const { count } = await supabase
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

  const fetchGroups = async () => {
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setGroups([]);
        return;
      }

      const { data, error } = await supabase
        .from('patient_groups')
        .select('*')
        .eq('clinic_id', clinicId)
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

  const fetchPatients = async () => {
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setPatients([]);
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone_number')
        .eq('clinic_id', clinicId)
        .eq('status', 'Aktif')
        .order('name', { ascending: true });

      if (error) throw error;

      setPatients(data || []);
    } catch (error: any) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) {
        setIsLoadingTemplates(false);
        return;
      }

      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleOpenTemplatePicker = (target: "group" | string) => {
    setActiveTemplateTarget(target);
    setIsTemplateDialogOpen(true);
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    if (activeTemplateTarget === "group") {
      setGroupMessage(template.content);
      setSelectedGroupTemplateTitle(template.title);
    } else {
      setCustomRecipients((prev) =>
        prev.map((r) =>
          r.id === activeTemplateTarget
            ? {
                ...r,
                templateId: template.id,
                templateTitle: template.title,
                templateContent: template.content,
              }
            : r
        )
      );
    }
    setIsTemplateDialogOpen(false);
  };

  const downloadSampleTemplate = (fileType: "excel" | "txt") => {
    if (fileType === "excel") {
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
    } else if (fileType === "txt") {
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
      if (!userId || !clinicId) throw new Error("User atau klinik tidak terautentikasi");

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
      } else if (fileExt === "txt") {
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
        alert("Format file tidak didukung!");
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

  const handleCreateTemplate = async () => {
    if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
      alert("Judul dan Isi template harus diisi!");
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
          clinic_id: clinicId,
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setTemplates(prev => [...prev, data[0]]);
        if (activeTemplateTarget === "group") {
          setGroupMessage(data[0].content);
          setSelectedGroupTemplateTitle(data[0].title);
        } else {
          setCustomRecipients((prev) =>
            prev.map((r) =>
              r.id === activeTemplateTarget
                ? {
                    ...r,
                    templateId: data[0].id,
                    templateTitle: data[0].title,
                    templateContent: data[0].content,
                  }
                : r
            )
          );
        }
      }

      setNewTemplateTitle("");
      setNewTemplateContent("");
      setIsCreateTemplateOpen(false);
      setIsTemplateDialogOpen(false);
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
    if (!editingTemplate || !editTemplateTitle.trim() || !editTemplateContent.trim()) return;

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

      setTemplates(prev => prev.filter(t => t.id !== templateId));
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
        file_url: selectedGroupDocument?.file_url || null,
        file_name: selectedGroupDocument?.document_name || null,
        status: "pending",
        error_message: null,
      });
    }
    return tasks;
  };

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
        file_url: recipient.fileUrl || null,
        file_name: recipient.fileName || null,
        status: "pending",
        error_message: null,
      });
    }
    return tasks;
  };

  const handleSaveSchedule = async () => {
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
      alert("Waktu pelaksanaan harus yang akan datang");
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
      if (!groupMessage.trim() && !selectedGroupDocument) {
        alert("Pesan atau berkas lampiran harus diisi!");
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
      const clinicId = await getUserClinicId();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId || !clinicId) throw new Error("User atau Klinik tidak terautentikasi");

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('scheduled_broadcasts')
        .insert({
          title: title.trim(),
          scheduled_time: new Date(scheduledTime).toISOString(),
          status: "pending",
          user_id: userId,
          clinic_id: clinicId,
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

        // Simpan Log Pesan ke Tabel message_logs
        // for (const task of tasks) {
        //   await saveMessageLog(
        //     task.patient_id,
        //     "Scheduled Broadcast",
        //     task.message_content,
        //     "pending",
        //     clinicId,
        //     task.file_url
        //   );
        // }
      }

      setTitle("");
      setScheduledTime("");
      setSelectedGroup(null);
      setGroupMessage("");
      setSelectedGroupTemplateTitle("Pilih Template");
      setSelectedGroupDocument(null);
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

  const handleOpenEdit = (schedule: ScheduledBroadcast) => {
    setSelectedSchedule(schedule);
    setEditTitle(schedule.title);
    
    const dt = new Date(schedule.scheduled_time);
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditScheduledTime(localIso);
    
    setIsEditDialogOpen(true);
  };

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return;

    if (!editTitle.trim()) {
      alert("Judul jadwal harus diisi!");
      return;
    }

    if (!editScheduledTime) {
      alert("Waktu pelaksanaan harus diisi!");
      return;
    }

    const scheduleDate = new Date(editScheduledTime);
    if (scheduleDate <= new Date()) {
      alert("Waktu pelaksanaan harus di masa depan!");
      return;
    }

    setIsUpdating(true);
    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) throw new Error("Clinic ID tidak ditemukan");

      const { error } = await supabase
        .from('scheduled_broadcasts')
        .update({
          title: editTitle.trim(),
          scheduled_time: new Date(editScheduledTime).toISOString(),
        })
        .eq('id', selectedSchedule.id)
        .eq('clinic_id', clinicId);

      if (error) throw error;

      await fetchSchedules();

      setSuccessMessage(`Jadwal "${editTitle}" berhasil diperbarui!`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setIsEditDialogOpen(false);
      setSelectedSchedule(null);
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      setErrorMessage(error.message || "Gagal memperbarui jadwal");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const clinicId = await getUserClinicId();
      if (!clinicId) throw new Error("Clinic ID tidak ditemukan");

      const { error } = await supabase
        .from('scheduled_broadcasts')
        .delete()
        .eq('id', selectedSchedule.id)
        .eq('clinic_id', clinicId);

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

  const addCustomRecipient = () => {
    const newId = Date.now().toString();
    const defaultTemplate = templates[0];
    setCustomRecipients([
      ...customRecipients,
      {
        id: newId,
        patientId: "",
        patientName: "",
        patientPhone: "",
        templateId: defaultTemplate?.id || "",
        templateTitle: defaultTemplate?.title || "Pilih Template",
        templateContent: defaultTemplate?.content || "",
        customValue: "",
        fileUrl: null,
        fileName: null,
      },
    ]);
  };

  const removeCustomRecipient = (id: string) => {
    setCustomRecipients(customRecipients.filter((r) => r.id !== id));
  };

  const updateCustomRecipient = (id: string, field: keyof CustomRecipient, value: string | null) => {
    setCustomRecipients(
      customRecipients.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
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

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
    patient.phone_number.includes(searchPatient)
  );

  const filteredSavedDocs = savedDocuments.filter((doc) =>
    doc.document_name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const insertVariable = (variable: string) => {
    setGroupMessage((prev) => prev + variable);
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

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Penjadwalan Pesan Siaran</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur pengiriman pesan otomatis berdasarkan pengaturan yang sudah disimpan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buat Jadwal Baru</CardTitle>
          <CardDescription>Atur pesan yang akan dikirim secara otomatis di waktu yang ditentukan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul Jadwal</label>
            <Input
              placeholder="Contoh: Reminder Kontrol Pasien Juni"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
          </div>

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
                    <label className="text-sm font-medium text-foreground">Template Pesan (Opsional)</label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleOpenTemplatePicker("group")}
                    >
                      <span>{selectedGroupTemplateTitle}</span>
                      <span className="text-muted-foreground">▼</span>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Isi Pesan</label>
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

                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="h-4 w-4 text-primary" /> Berkas Lampiran Grup (Opsional)
                      </span>
                    </label>

                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 shadow-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-950">Catatan Pengiriman Lampiran :</p>
                          <p className="mt-0.5 text-amber-800">
                            Fitur pengiriman berkas langsung ke WhatsApp membutuhkan paket <span className="font-semibold underline">Advanced, Super, atau Ultra</span> pada Layanan kami. Jika Anda menggunakan paket <strong>Freemium</strong>, file tetap akan terunggah ke penyimpanan kami tetapi tidak akan ikut terkirim di pesan WA.
                          </p>
                        </div>
                      </div>
                    </div>

                    {!selectedGroupDocument ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenDocumentPicker("group")}
                        className="w-full border-dashed gap-2 text-xs text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <FolderOpen className="h-4 w-4" /> Pilih Dokumen / Lampiran File
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 bg-muted/60 border border-border rounded-lg text-sm">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate text-foreground">{selectedGroupDocument.document_name}</p>
                            <p className="text-[10px] text-muted-foreground">{selectedGroupDocument.document_type}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedGroupDocument(null)}
                          className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Template</label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleOpenTemplatePicker(recipient.id)}
                    >
                      <span className="truncate">{recipient.templateTitle || "Pilih Template..."}</span>
                      <span className="text-muted-foreground shrink-0 ml-1">▼</span>
                    </Button>
                  </div>

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

                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5 text-primary" /> Lampiran Dokumen untuk Pasien ini (Opsional)
                      </span>
                    </label>

                    {!recipient.fileName ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDocumentPicker(recipient.id)}
                        className="w-full border-dashed gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <FolderOpen className="h-3.5 w-3.5" /> Pilih Berkas dari Storage
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between p-2 bg-muted/60 border border-border rounded-lg text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium truncate text-foreground">{recipient.fileName}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            updateCustomRecipient(recipient.id, "fileUrl", null);
                            updateCustomRecipient(recipient.id, "fileName", null);
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-red-600 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

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

          <Button onClick={handleSaveSchedule} disabled={isSaving} className="w-full gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
            {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Jadwal Pesan Siaran</CardTitle>
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
                  {schedules.map((schedule) => {
                    const isCompleted = schedule.status === "completed";

                    return (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.title}</TableCell>
                        <TableCell>{formatDateTime(schedule.scheduled_time)}</TableCell>
                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        <TableCell>{schedule.task_count || 0} pesan</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isCompleted && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-blue-600"
                                onClick={() => handleOpenEdit(schedule)}
                                title="Edit Jadwal"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-red-600"
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setIsDeleteDialogOpen(true);
                              }}
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

      <Dialog open={isDocumentPickerOpen} onOpenChange={setIsDocumentPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" /> Pilih Berkas dari Pustaka
            </DialogTitle>
            <DialogDescription>
              Gunakan berkas dokumen yang tersimpan di Pustaka Lampiran
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
                <p className="text-sm">Tidak ada dokumen ditemukan di storage</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredSavedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectDocument(doc)}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Jadwal Pesan Siaran</DialogTitle>
            <DialogDescription>
              Ubah judul atau waktu pelaksanaan untuk jadwal ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Jadwal</label>
              <Input
                value={editTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                placeholder="Judul jadwal..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Waktu Pelaksanaan</label>
              <Input
                type="datetime-local"
                value={editScheduledTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditScheduledTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateSchedule} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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