import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, FileText, Lock, AlertTriangle, RefreshCw, HelpCircle } from "lucide-react";

export function TermsPageDash() {
  const lastUpdated = "28 Juli 2026";

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Syarat dan Ketentuan</h1>
        <p className="text-sm text-muted-foreground">
          Terakhir diperbarui: {lastUpdated}, oleh MediflowHub
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            1. Penerimaan Ketentuan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Dengan mendaftar, mengakses, atau menggunakan platform <strong>HealthTech Message Hub</strong>, Anda telah menyatakan bahwa Anda telah membaca, memahami dan menyetujui seluruh Syarat dan Ketentuan layanan kami.
          </p>
          <p>
            Layanan ini diperuntukkan bagi fasilitas kesehatan, klinik, serta tenaga medis yang berwenang untuk mengelola kebutuhan komunikasi dan pengingat informasi kesehatan kepada pasien.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Lock className="h-5 w-5" />
            2. Privasi Data Pasien & Kerahasian Rekam Medis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>HealthTech Message Hub</strong> berkomitmen tinggi terhadap perlindungan data pribadi dan data medis pasien sesuai dengan regulasi perlindungan data kesehatan yang berlaku saat ini.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>
              <strong>Persetujuan Pasien (Consent):</strong> Fasilitas kesehatan pengguna wajib memastikan bahwa setiap pasien telah memberikan persetujuan resmi untuk menerima pesan informasi medis melalui nomor WhatsApp yang terdaftar pada layanan kami.
            </li>
            <li>
              <strong>Penggunaan Data Kontak:</strong> Nomor telepon dan data medis pasien yang diunggah ke platform  kami, hanya digunakan untuk kepentingan operasional klinik seperti <strong>informasi nomor antrian, pengingat jadwal kontrol, pesan pengambilan resep/obat dan kebutuhan yang berkaitan dengan layanan fasilitas kesehatan atau klinik </strong> dan tidak akan diperjualbelikan kepada pihak ketiga mana pun.
            </li>
            <li>
              <strong>Pustaka Lampiran Dokumen:</strong> Berkas dokumen, hasil laboratorium, resep pengambilan obat yang diunggah ke *database kami* dilindungi dengan enkripsi akses yang ketat dan hanya dapat diakses oleh pihak yang berwenang.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertTriangle className="h-5 w-5" />
            3. Pengiriman Pesan & Batasan Tanggung Jawab WhatsApp API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Pengiriman pesan WhatsApp otomatis pada platform ini dihubungkan melalui integrasi layanan integrasi pihak ketiga (bukan API resmi dari WhatsApp).
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>
              <strong>Pengiriman Lampiran File:</strong> Fitur pengiriman berkas/dokumen langsung ke pesan WhatsApp memerlukan paket berlangganan tertentu (Advanced, Super, atau Ultra). Pengguna paket Freemium tetap dapat mengunggah file ke penyimpanan kami, tetapi berkas tidak akan terkirim secara langsung di aplikasi WhatsApp pasien.
            </li>
            <li>
              <strong>Risiko Pemblokiran Nomor:</strong> Pengguna dilarang keras melakukan pengiriman pesan spam, promosi agresif tak terdeteksi, atau konten yang melanggar kebijakan Komunitas WhatsApp (Meta). Pihak kami tidak bertanggung jawab atas pemblokiran nomor WhatsApp yang disebabkan oleh aktivitas spamming pengirim.
            </li>
            <li>
              <strong>Keterlambatan Pengiriman:</strong> Pengiriman pesan terjadwal dipengaruhi oleh kestabilan jaringan internet, status perangkat yang terhubung, serta antrean server API pihak ketiga.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            4. Larangan Penggunaan (Prohibited Conduct)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Saat menggunakan platform ini, Anda dilarang untuk:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Mengirimkan informasi medis palsu, menyesatkan, atau berpotensi membahayakan keselamatan jiwa pasien.</li>
            <li>Menggunakan platform untuk aktivitas terorisme, penipuan, judi online, atau ujaran kebencian.</li>
            <li>Mencoba meretas, membobol *security layer*, atau mengganggu integritas server dan database platform kami.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <RefreshCw className="h-5 w-5" />
            5. Perubahan Syarat dan Ketentuan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Kami berhak untuk memperbarui atau mengubah Syarat dan Ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Perubahan baru akan berlaku efektif setlah kebijakan terbaru diunggah pada halaman ini. Penggunaan berlanjut atas layanan kami dianggap sebagai persetujuan terhadap perubahan tersebut.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <HelpCircle className="h-5 w-5" />
            6. Kontak & Dukungan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            Jika Anda memiliki pertanyaan mengenai Syarat dan Ketentuan ini atau membutuhkan bantuan teknis terkait integrasi sistem, silakan hubungi tim dukungan kami melalui:
          </p>
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1 font-mono text-foreground border border-border">
            <p><strong>Email Support:</strong> support@mediflowhub.com</p>
            <p><strong>Helpdesk WhatsApp:</strong> +62 813-2443-9591</p>
            <p><strong>Jam Operasional:</strong> Senin - Jumat (08.00 - 17.00 WIB)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}