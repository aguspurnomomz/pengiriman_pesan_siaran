import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  MessageSquare,
  Send,
  Calendar,
  FolderOpen,
  Users,
  Settings,
  HelpCircle,
  Variable,
  Paperclip,
  ChevronRight,
  AlertCircle
} from "lucide-react";

type DocSection = "overview" | "broadcast" | "scheduler" | "inbox" | "documents" | "contacts" | "settings" | "troubleshooting";

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const sections = [
    { id: "overview", label: "Pengenalan Sistem", icon: BookOpen },
    { id: "broadcast", label: "Pusat Siaran ", icon: Send },
    { id: "scheduler", label: "Penjadwalan Pesan", icon: Calendar },
    { id: "inbox", label: "Kotak Masuk", icon: MessageSquare },
    { id: "documents", label: "Pustaka Lampiran", icon: FolderOpen },
    { id: "contacts", label: "Data Kontak & Grup", icon: Users },
    { id: "settings", label: "Pengaturan & API Key", icon: Settings },
    { id: "troubleshooting", label: "Panduan Error / FAQ", icon: HelpCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Dokumentasi</h2>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Panduan lengkap penggunaan fitur-fitur pada platform HealthTech Message Hub
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari fitur atau panduan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Daftar Modul
          </p>
          {sections.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as DocSection)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`h-4 w-4 opacity-50 ${isActive ? "rotate-90" : ""}`} />
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-9 space-y-6">
          {/* 1. OVERVIEW */}
          {activeSection === "overview" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <BookOpen className="h-5 w-5" /> Selamat Datang di Message Hub
                </CardTitle>
                <CardDescription>
                  Platform pengiriman pesan atau notifikasi WhatsApp untuk fasilitas kesehatan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Sistem ini dirancang untuk memudahkan staf faskes/klinik dalam berkomunikasi dengan pasien, mulai dari pengiriman pengingat jadwal kontrol, penyampaian hasil laboratorium, invoice, hingga pengaturan otomatisasi pengiriman pesan <em>real time</em>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-foreground text-xs mb-1 flex items-center gap-1.5">
                      <Variable className="h-4 w-4 text-primary" /> Variabel Dinamis
                    </h4>
                    <p className="text-xs">
                      Pesan dapat dipersonalisasi secara otomatis menggunakan tag seperti <code className="bg-muted px-1 rounded text-primary font-mono">{`{{name}}`}</code> dan <code className="bg-muted px-1 rounded text-primary font-mono">{`{{value1}}`}</code>.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-foreground text-xs mb-1 flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-primary" /> Lampiran File
                    </h4>
                    <p className="text-xs">
                      Mendukung pengiriman berkas dokumen seperti PDF/Gambar langsung ke WhatsApp pasien melalui pustaka penyimpanan berbasis Cloud.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "broadcast" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Send className="h-5 w-5" /> Modul Siaran Pesan
                </CardTitle>
                <CardDescription>
                  Panduan mengirim pesan instan ke kontak individu maupun grup kontak pasien
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-base">Langkah-langkah Pengiriman Pesan:</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-xs">
                    <li>
                      <strong>Pilih Mode Kirim:</strong> Pilih <em>Kirim Satuan</em> (untuk 1 kontak pasien) atau <em>Kirim Grup</em> (untuk mengirim ke beberapa kontak dalam satu grup kontak).
                    </li>
                    <li>
                      <strong>Pilih Penerima:</strong> Pilih kontak pasien dari dropdown pencarian atau pilih salah satu grup pasien yang telah dibuat.
                    </li>
                    <li>
                      <strong>Isi Nilai Kustom (Opsional):</strong> Masukkan nilai kustom unik untuk tag <code className="bg-muted px-1 rounded text-primary font-mono">{`{{value1}}`}</code> (misal: "Rp 150.000" atau "Tanggal kontrol").
                    </li>
                    <li>
                      <strong>Gunakan Template:</strong> Klik tombol dropdown template untuk memilih draf pesan yang telah dibuat, atau tulis manual pada text editor yang tersedia.
                    </li>
                    <li>
                      <strong>Lampirkan Berkas (Opsional):</strong> Unggah file baru atau pilih dokumen yang tersimpan dari <em>Pustaka Lampiran</em>.
                    </li>
                    <li>
                      <strong>Cek Pratinjau:</strong> Periksa tampilan pesan pada layar simulasi pengiriman di sebelah kanan sebelum menekan tombol <strong>Kirim Pesan</strong>.
                    </li>
                    <li>
                      <strong>Log Pesan:</strong> Menampilkan log pengiriman pesan. Anda dapat mengunduh data log pengiriman pesan melalui tombol Export Excel.
                    </li>
                  </ol>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                  <p className="font-semibold">💡 Tips Impor Template:</p>
                  <p className="mt-0.5">
                    Anda dapat mengunggah daftar template sekaligus menggunakan file Excel (.xlsx) atau file teks (.txt) melalui dialog pemilih template.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "scheduler" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Calendar className="h-5 w-5" /> Modul Penjadwalan Pesan (Scheduler)
                </CardTitle>
                <CardDescription>
                  Panduan menjadwalkan pengiriman pesan otomatis di waktu yang telah ditentukan (mendatang)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p className="text-xs">
                  Modul ini berguna untuk menyiapkan pengingat kontrol pasien (reminder), pengingat minum obat, atau ucapan ulang tahun yang dikirimkan secara otomatis berdasarkan parameter tanggal dan waktu yang telah diatur.
                </p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-xs">Cara Membuat Jadwal Baru:</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    <li>Masukkan <strong>Judul Jadwal</strong> (contoh: "Reminder Kontrol Pasien Poli Gigi").</li>
                    <li>Tentukan <strong>Waktu Pelaksanaan</strong> (tanggal & jam pelaksanaan pengiriman siaran pesan).</li>
                    <li>Pilih <strong>Mode Penerima</strong> (Grup Pasien atau Kustom Individu).</li>
                    <li>Pilih template pesan atau tulis isi pesan beserta variabelnya.</li>
                    <li>Klik <strong>Simpan Jadwal</strong>, antrean jadwal pengiriman pesan otomatis akan dieksekusi sesuai dengan waktu yang telah ditentukan.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "inbox" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <MessageSquare className="h-5 w-5" /> Modul Kotak Masuk (Inbox)
                </CardTitle>
                <CardDescription>
                  Pantau balasan pasien dan membalas chat secara real time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p className="text-xs">
                  Setiap pesan balasan dari Whatsapp pasien akan otomatis tertangkap di panel sebelah kiri secara <em>real time</em>.
                </p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-xs">Cara Membalas Pesan:</h4>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs">
                    <li>Klik salah satu kontak pasien di daftar percakapan sebelah kiri.</li>
                    <li>Riwayat chat (termasuk pesan keluar dari klinik) akan tampil di panel sebelah kanan.</li>
                    <li>Ketik balasan pada form di bagian bawah lalu tekan <strong>Kirim</strong>, pesan akan terkirim langsung ke WhatsApp pasien.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "documents" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <FolderOpen className="h-5 w-5" /> Pustaka Lampiran 
                </CardTitle>
                <CardDescription>
                  Manajemen berkas digital, hasil lab, kwitansi, file resep dokter dll
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p className="text-xs">
                  Semua berkas yang pernah diunggah ke platform tersimpan dengan aman di Pustaka Lampiran. Apabila diperlukan, anda tidak perlu mengunggah ulang file yang sama saat ingin mengirimkannya ke pasien lain.
                </p>

                <div className="rounded-md border p-3 text-xs bg-muted/20 space-y-1">
                  <p className="font-semibold text-foreground">Ketentuan Lampiran Berkas:</p>
                  <p>• Ukuran berkas maksimal: <strong>10 MB</strong>.</p>
                  <p>• Format yang didukung: <strong>PDF, PNG, JPG, DOCX, XLSX</strong>.</p>
                  <p>• Berkas yang tersimpan di storage dapat dipilih kembali kapan saja melalui modal <em>Pilih dari Pustaka</em> di komposer pesan.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "contacts" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" /> Data Kontak Pasien
                </CardTitle>
                <CardDescription>
                  Mengelola direktori kontak pasien dan mengelompokkan segmen kontak pasien, anda dapat mengimpor data kontak pasien dari file Excel. Kami telah menyediakan format yang sudah sesuai dengan sistem kami.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-xs">Manajemen Grup Pasien:</h4>
                  <p className="text-xs">
                    Grup digunakan untuk mempermudah pengiriman broadcast massal (contoh: "Grup Pasien Hipertensi", "Grup Ibu Hamil"). Anda bisa menambahkan atau mengeluarkan pasien dari grup melalui menu <em>Kelola Grup</em>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "settings" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Settings className="h-5 w-5" /> Pengaturan & Konfigurasi API
                </CardTitle>
                <CardDescription>
                  Menghubungkan platform ke server gateway WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-xs">Pengaturan Signature dan API key gateway:</h4>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs">
                    <li>Buka menu <strong>Pengaturan</strong> di sidebar utama.</li>
                    {/* <li>Masukkan <strong>WhatsApp API Token</strong> yang didapatkan dari .</li> */}
                    <li>Atur <strong>Tanda Tangan / Signature Klinik</strong> (misal: "Salam Sehat,\nKlinik Utama Mediflow").</li>
                    <li>Klik <strong>Simpan Pengaturan</strong>.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 8. TROUBLESHOOTING / FAQ */}
          {activeSection === "troubleshooting" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <HelpCircle className="h-5 w-5" /> Pertanyaan Sering Diajukan (FAQ)
                </CardTitle>
                <CardDescription>
                  Solusi masalah teknis dan kendala pengiriman pesan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg space-y-1">
                    <h5 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-600" /> Mengapa file lampiran tidak ikut terkirim di WhatsApp pasien?
                    </h5>
                    <p className="text-xs">
                      Pastikan akun paket Fonnte Anda mendukung pengiriman media (Paket Advanced, Super, atau Ultra). Pada paket Freemium, file tetap terunggah ke penyimpanan storage tetapi tidak dikirim sebagai lampiran media WA.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg space-y-1">
                    <h5 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-600" /> Mengapa pesan gagal terkirim (Status: Failed)?
                    </h5>
                    <p className="text-xs">
                      Periksa apakah nomor WhatsApp pasien sudah menggunakan format internasional (contoh: 0812... akan otomatis diubah ke 62812...). Pastikan juga perangkat WhatsApp pengirim di dashboard Fonnte berada dalam status <em>Connected</em>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}