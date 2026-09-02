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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, UserPlus, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Users, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

// Interface untuk data pasien dari Supabase
interface Patient {
  id: string;
  name: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  status: string;
}

// Interface untuk log import
interface ImportLog {
  row: number;
  name: string;
  phone_number: string;
  status: "success" | "updated" | "failed";
  message: string;
}

// Interface untuk data Excel
interface ExcelRow {
  "Nama Lengkap": string;
  "Jenis Kelamin": string;
  "Nomor WhatsApp": string;
  "Tanggal Lahir": string;
}

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportResultDialogOpen, setIsImportResultDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [importSummary, setImportSummary] = useState({ success: 0, updated: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    date_of_birth: "",
    gender: "Laki-laki",
  });

  // Ambil data pasien dari Supabase
  useEffect(() => {
    fetchPatients();
  }, []);

  // Fungsi untuk mengambil data pasien
  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPatients(data || []);
    } catch (error: any) {
      console.error('Error fetching patients:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Download template Excel dengan Auto-Formatting
  const handleDownloadTemplate = () => {
    // Buat data template
    const templateData = [
      {
        "Nama Lengkap": "nama lengkap",
        "Jenis Kelamin": "Laki-laki / Perempuan",
        "Nomor WhatsApp": "081234567890",
        "Tanggal Lahir": "1990-01-12"
      }
    ];
    
    // Konversi ke worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Atur lebar kolom
    ws['!cols'] = [
      { wch: 25 }, // Nama Lengkap
      { wch: 20 }, // Jenis Kelamin
      { wch: 20 }, // Nomor WhatsApp
      { wch: 15 }  // Tanggal Lahir
    ];
    
    // Set format untuk kolom Nomor WhatsApp (kolom C, index 2) sebagai teks
    // dan kolom Tanggal Lahir (kolom D, index 3) sebagai tanggal
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D2');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        // Set format untuk kolom Nomor WhatsApp (kolom C)
        if (col === 2 && row > 0) {
          ws[cellAddress].t = 's'; // Force text format
          ws[cellAddress].z = '@'; // Text format
        }
        // Set format untuk kolom Tanggal Lahir (kolom D)
        if (col === 3 && row > 0) {
          ws[cellAddress].z = 'yyyy-mm-dd'; // Date format
        }
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Pasien");
    XLSX.writeFile(wb, "template_pasien.xlsx");
  };

  // Sanitasi nomor WhatsApp (tambah 0 di depan jika hilang)
  const sanitizePhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, "");
    // Jika nomor dimulai dengan 8 (setelah 0 hilang) dan panjang 10-12 digit
    if (cleaned.startsWith("8") && cleaned.length >= 10 && cleaned.length <= 12) {
      cleaned = "0" + cleaned;
    }
    return cleaned;
  };

  // Sanitasi tanggal lahir (konversi / ke -)
  const sanitizeDateOfBirth = (dateStr: string): string => {
    // Jika menggunakan slash, konversi ke strip
    let sanitized = dateStr.replace(/\//g, "-");
    return sanitized;
  };

  // Format nomor WhatsApp ke format Indonesia
  const formatWhatsAppNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.startsWith("0") && cleaned.length >= 10) {
      return cleaned;
    }
    if (cleaned.startsWith("62") && cleaned.length >= 11) {
      return "0" + cleaned.slice(2);
    }
    return cleaned;
  };

  // Validasi nomor WhatsApp
  const validateWhatsApp = (number: string): boolean => {
    const cleaned = number.replace(/\D/g, "");
    return /^(08|62)[0-9]{8,12}$/.test(cleaned);
  };

  // Validasi gender
  const validateGender = (gender: string): boolean => {
    return gender === "Laki-laki" || gender === "Perempuan";
  };

  // Validasi tanggal lahir
  const validateDateOfBirth = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date < new Date();
  };

  // Cek duplikasi pasien
  const checkDuplicatePatient = async (name: string, phoneNumber: string, excludeId?: string): Promise<Patient | null> => {
    try {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('name', name)
        .eq('phone_number', phoneNumber);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error: any) {
      console.error('Error checking duplicate:', error);
      return null;
    }
  };

  // Proses Import Excel (Bulk Upsert)
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportLogs([]);
    const logs: ImportLog[] = [];
    let successCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    try {
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

      if (rows.length === 0) {
        throw new Error("File Excel kosong!");
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 karena baris 1 adalah header
        
        const name = row["Nama Lengkap"]?.trim();
        let gender = row["Jenis Kelamin"]?.trim();
        let phoneNumberRaw = row["Nomor WhatsApp"]?.trim();
        let dateOfBirth = row["Tanggal Lahir"]?.trim();

        // Validasi data
        if (!name) {
          logs.push({
            row: rowNumber,
            name: "-",
            phone_number: "-",
            status: "failed",
            message: "Nama lengkap tidak boleh kosong"
          });
          failedCount++;
          continue;
        }

        // Validasi gender
        if (!gender || !validateGender(gender)) {
          logs.push({
            row: rowNumber,
            name: name,
            phone_number: phoneNumberRaw || "-",
            status: "failed",
            message: "Jenis kelamin harus 'Laki-laki' atau 'Perempuan'"
          });
          failedCount++;
          continue;
        }

        if (!phoneNumberRaw) {
          logs.push({
            row: rowNumber,
            name: name,
            phone_number: "-",
            status: "failed",
            message: "Nomor WhatsApp tidak boleh kosong"
          });
          failedCount++;
          continue;
        }

        // Sanitasi nomor WhatsApp (tambah 0 di depan jika hilang)
        phoneNumberRaw = sanitizePhoneNumber(phoneNumberRaw);
        const formattedPhone = formatWhatsAppNumber(phoneNumberRaw);

        if (!validateWhatsApp(phoneNumberRaw)) {
          logs.push({
            row: rowNumber,
            name: name,
            phone_number: phoneNumberRaw,
            status: "failed",
            message: "Format nomor WhatsApp tidak valid (gunakan 08xxx atau 628xxx)"
          });
          failedCount++;
          continue;
        }

        if (!dateOfBirth) {
          logs.push({
            row: rowNumber,
            name: name,
            phone_number: phoneNumberRaw,
            status: "failed",
            message: "Tanggal lahir tidak boleh kosong"
          });
          failedCount++;
          continue;
        }

        // Sanitasi tanggal lahir (konversi / ke -)
        dateOfBirth = sanitizeDateOfBirth(dateOfBirth);

        if (!validateDateOfBirth(dateOfBirth)) {
          logs.push({
            row: rowNumber,
            name: name,
            phone_number: phoneNumberRaw,
            status: "failed",
            message: "Tanggal lahir tidak valid (format: YYYY-MM-DD)"
          });
          failedCount++;
          continue;
        }

        // Cek apakah data sudah ada berdasarkan Nama + Nomor WhatsApp
        const existingPatient = await checkDuplicatePatient(name, formattedPhone);

        if (existingPatient) {
          // Update existing patient
          const { error } = await supabase
            .from('patients')
            .update({
              gender: gender,
              date_of_birth: dateOfBirth,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPatient.id);

          if (error) {
            logs.push({
              row: rowNumber,
              name: name,
              phone_number: formattedPhone,
              status: "failed",
              message: `Gagal update: ${error.message}`
            });
            failedCount++;
          } else {
            logs.push({
              row: rowNumber,
              name: name,
              phone_number: formattedPhone,
              status: "updated",
              message: "Data berhasil diperbarui (Menimpa data lama)"
            });
            updatedCount++;
          }
        } else {
          // Insert new patient
          const newPatient = {
            name: name,
            phone_number: formattedPhone,
            date_of_birth: dateOfBirth,
            gender: gender,
            status: 'Aktif',
            created_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('patients')
            .insert([newPatient]);

          if (error) {
            logs.push({
              row: rowNumber,
              name: name,
              phone_number: formattedPhone,
              status: "failed",
              message: `Gagal insert: ${error.message}`
            });
            failedCount++;
          } else {
            logs.push({
              row: rowNumber,
              name: name,
              phone_number: formattedPhone,
              status: "success",
              message: "Data berhasil ditambahkan"
            });
            successCount++;
          }
        }
      }

      setImportLogs(logs);
      setImportSummary({ success: successCount, updated: updatedCount, failed: failedCount });
      
      // Refresh data
      await fetchPatients();
      
      // Close import dialog and open result dialog
      setIsImportDialogOpen(false);
      setIsImportResultDialogOpen(true);
      
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      setErrorMessage(error.message || "Gagal mengimpor file Excel");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle tambah pasien ke Supabase
  const handleAddPatient = async () => {
    if (!formData.name || !formData.phone_number || !formData.date_of_birth || !formData.gender) {
      alert("Mohon isi semua field!");
      return;
    }

    if (!validateWhatsApp(formData.phone_number)) {
      alert("Nomor WhatsApp tidak valid! Gunakan format Indonesia (contoh: 081234567890)");
      return;
    }

    setIsSaving(true);

    try {
      const formattedPhone = formatWhatsAppNumber(formData.phone_number);
      
      const existingPatient = await checkDuplicatePatient(formData.name, formattedPhone);
      
      if (existingPatient) {
        setErrorMessage(`Kontak dengan nama "${formData.name}" dan nomor HP "${formattedPhone}" sudah terdaftar!`);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 3000);
        setIsSaving(false);
        return;
      }

      const newPatient = {
        name: formData.name,
        phone_number: formattedPhone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        status: 'Aktif',
      };

      const { error } = await supabase
        .from('patients')
        .insert([newPatient]);

      if (error) throw error;

      await fetchPatients();
      
      setSuccessMessage("Kontak berhasil ditambahkan!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      resetForm();
      setIsAddDialogOpen(false);
      
    } catch (error: any) {
      console.error('Error adding patient:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit pasien
  const handleEditPatient = async () => {
    if (!selectedPatient) {
      console.error("Tidak ada kontak yang dipilih untuk diedit");
      return;
    }

    if (!formData.name || !formData.phone_number || !formData.date_of_birth || !formData.gender) {
      alert("Mohon isi semua field!");
      return;
    }

    if (!validateWhatsApp(formData.phone_number)) {
      alert("Nomor WhatsApp tidak valid! Gunakan format Indonesia (contoh: 081234567890)");
      return;
    }

    setIsSaving(true);

    try {
      const formattedPhone = formatWhatsAppNumber(formData.phone_number);
      
      const existingPatient = await checkDuplicatePatient(formData.name, formattedPhone, selectedPatient.id);
      
      if (existingPatient) {
        setErrorMessage(`Kontak dengan nama "${formData.name}" dan nomor HP "${formattedPhone}" sudah terdaftar!`);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 3000);
        setIsSaving(false);
        return;
      }

      const updatedPatient = {
        name: formData.name,
        phone_number: formattedPhone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
      };

      const { error } = await supabase
        .from('patients')
        .update(updatedPatient)
        .eq('id', selectedPatient.id);

      if (error) throw error;

      await fetchPatients();
      
      setSuccessMessage("Data kontak berhasil diperbarui!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedPatient(null);
      
    } catch (error: any) {
      console.error('Error updating patient:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle hapus pasien
  const handleDeletePatient = async () => {
    if (!selectedPatient) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', selectedPatient.id);

      if (error) throw error;

      await fetchPatients();
      
      setSuccessMessage("kontak berhasil dihapus!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      setIsDeleteDialogOpen(false);
      setSelectedPatient(null);
      
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Buka dialog edit dengan data pasien
  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      phone_number: patient.phone_number,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender || "Laki-laki",
    });
    setIsEditDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      phone_number: "",
      date_of_birth: "",
      gender: "Laki-laki",
    });
  };

  // Format tanggal untuk ditampilkan
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Tampilan jenis kelamin dengan icon
  const getGenderDisplay = (gender: string) => {
    if (gender === "Laki-laki") {
      return { icon: "♂️", label: "Laki-laki", color: "text-blue-600" };
    } else if (gender === "Perempuan") {
      return { icon: "♀️", label: "Perempuan", color: "text-pink-600" };
    }
    return { icon: "👤", label: gender, color: "text-gray-600" };
  };

  // Warna badge status
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Aktif: "bg-green-100 text-green-800",
      Selesai: "bg-blue-100 text-blue-800",
      Antrian: "bg-yellow-100 text-yellow-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  // Filter pasien berdasarkan pencarian
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Data Kontak Penerima Pesan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola data kontak penerima pesan, untuk pengiriman pesan Whatsapp.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Direktori Kontak</CardTitle>
              <CardDescription>
                Lihat dan kelola semua data kontak yang terdaftar
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Tombol Import Excel */}
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Import Excel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Data Kontak dari Excel</DialogTitle>
                    <DialogDescription>
                      Unggah file Excel dengan format yang sesuai. Data akan di-import secara massal.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">📥 Download Template</div>
                      <Button 
                        variant="outline" 
                        onClick={handleDownloadTemplate}
                        className="w-full gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Template Excel
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Template sudah memiliki format khusus: Nomor WhatsApp sebagai teks, Tanggal Lahir format YYYY-MM-DD
                      </p>
                    </div>
                    <div className="border-t my-2" />
                    <div className="space-y-2">
                      <div className="text-sm font-medium">📤 Upload File Excel</div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleImportExcel}
                        disabled={isImporting}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format file: .xlsx, .xls, atau .csv. Maksimal 1000 baris.
                      </p>
                      <p className="text-xs text-blue-600">
                        💡 Tips: Sistem akan otomatis memperbaiki nomor HP yang kehilangan angka 0 di depan.
                      </p>
                    </div>
                    {isImporting && (
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Memproses data...</span>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Tombol Tambah Pasien */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Tambah Kontak
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Kontak Baru</DialogTitle>
                    <DialogDescription>
                      Isi informasi Kontak di bawah ini
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Nama Lengkap</div>
                      <Input
                        placeholder="Nama Lengkap"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Jenis Kelamin
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Laki-laki"
                            checked={formData.gender === "Laki-laki"}
                            onChange={(e) =>
                              setFormData({ ...formData, gender: e.target.value })
                            }
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">♂️ Laki-laki</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Perempuan"
                            checked={formData.gender === "Perempuan"}
                            onChange={(e) =>
                              setFormData({ ...formData, gender: e.target.value })
                            }
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">♀️ Perempuan</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Nomor WhatsApp</div>
                      <Input
                        placeholder="Contoh: 081234567890"
                        value={formData.phone_number}
                        onChange={(e) =>
                          setFormData({ ...formData, phone_number: e.target.value })
                        }
                      />
                      <div className="text-xs text-muted-foreground">
                        Format Indonesia: 08xxxxxxxxxx atau 628xxxxxxxxxx
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Tanggal Lahir</div>
                      <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            date_of_birth: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSaving}
                    >
                      Batal
                    </Button>
                    <Button 
                      onClick={handleAddPatient}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                          Menyimpan...
                        </>
                      ) : (
                        'Simpan'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pencarian */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari data kontak berdasarkan nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* State Loading */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {/* Tabel Pasien */}
          {!isLoading && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jenis Kelamin</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Tanggal Lahir</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-32">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Search className="h-8 w-8" />
                          <p>Tidak ada data kontak</p>
                          <p className="text-sm">
                            {searchQuery
                              ? "Coba dengan kata kunci pencarian yang berbeda"
                              : "Klik 'Tambah Kontak' untuk mulai menambahkan data"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => {
                      const genderDisplay = getGenderDisplay(patient.gender);
                      return (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">
                            {patient.name}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 ${genderDisplay.color}`}>
                              <span>{genderDisplay.icon}</span>
                              <span className="text-sm">{genderDisplay.label}</span>
                            </span>
                          </TableCell>
                          <TableCell>{patient.phone_number}</TableCell>
                          <TableCell>{formatDate(patient.date_of_birth)}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(
                                patient.status
                              )}`}
                            >
                              {patient.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(patient)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Import Result */}
      <Dialog open={isImportResultDialogOpen} onOpenChange={setIsImportResultDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📊 Ringkasan Import Data</DialogTitle>
            <DialogDescription>
              Berikut adalah hasil import data kontak dari file Excel
            </DialogDescription>
          </DialogHeader>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{importSummary.success}</div>
              <div className="text-xs text-green-700">Data Baru</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
              <FileSpreadsheet className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{importSummary.updated}</div>
              <div className="text-xs text-yellow-700">Data Diperbarui</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
              <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{importSummary.failed}</div>
              <div className="text-xs text-red-700">Data Gagal</div>
            </div>
          </div>

          {/* Log Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Baris</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Nomor HP</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importLogs.map((log, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs">{log.row}</TableCell>
                    <TableCell className="font-medium">{log.name}</TableCell>
                    <TableCell className="font-mono text-xs">{log.phone_number}</TableCell>
                    <TableCell>
                      {log.status === "success" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Ditambahkan
                        </span>
                      )}
                      {log.status === "updated" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <FileSpreadsheet className="h-3 w-3" />
                          Diperbarui
                        </span>
                      )}
                      {log.status === "failed" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <XCircle className="h-3 w-3" />
                          Gagal
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{log.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setIsImportResultDialogOpen(false);
              fetchPatients();
            }}>
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Kontak</DialogTitle>
            <DialogDescription>
              Perbarui informasi kontak di bawah ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Nama Lengkap</div>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Jenis Kelamin
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="edit_gender"
                    value="Laki-laki"
                    checked={formData.gender === "Laki-laki"}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">♂️ Laki-laki</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="edit_gender"
                    value="Perempuan"
                    checked={formData.gender === "Perempuan"}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">♀️ Perempuan</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Nomor WhatsApp</div>
              <Input
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Tanggal Lahir</div>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) =>
                  setFormData({ ...formData, date_of_birth: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button 
              onClick={handleEditPatient}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hapus Data Kontak</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data{" "}
              <span className="font-semibold text-foreground">
                {selectedPatient?.name}
              </span>?
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePatient}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifikasi Sukses */}
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

      {/* Notifikasi Error */}
      {showErrorToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-red-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Error</p>
              <p className="text-xs opacity-90">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}