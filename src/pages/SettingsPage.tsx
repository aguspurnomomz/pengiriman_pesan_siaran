import { useState, useEffect } from "react";
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
  Building2,
  MapPin,
  Phone,
  Mail,
  Key,
  Smartphone,
  Stethoscope,
  Bell,
  Save,
  Loader2,
  CheckCircle,
  Upload,
  ImageIcon,
  Shield,
  Database,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface ClinicSettings {
  id?: string;
  user_id?: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicLogo: string | null;
  fonteApiKey: string;
  fonteDeviceId: string;
  signature: string;
  autoSendBirthday: boolean;
}

const defaultSettings: ClinicSettings = {
  clinicName: "",
  clinicAddress: "",
  clinicPhone: "",
  clinicEmail: "",
  clinicLogo: null,
  fonteApiKey: "",
  fonteDeviceId: "",
  signature: "Semoga lekas sembuh,\n{clinic_name}",
  autoSendBirthday: false,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>(defaultSettings);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showTestToast, setShowTestToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { 
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          user_id: data.user_id,
          clinicName: data.clinic_name || "",
          clinicAddress: data.clinic_address || "",
          clinicPhone: data.clinic_phone || "",
          clinicEmail: data.clinic_email || "",
          clinicLogo: data.clinic_logo || null,
          fonteApiKey: data.fonte_api_key || "",
          fonteDeviceId: data.fonte_device_id || "",
          signature: data.signature || defaultSettings.signature,
          autoSendBirthday: data.auto_send_birthday || false,
        });
        
        if (data.clinic_logo) {
          setPreviewLogo(data.clinic_logo);
        }
      } else {
        setSettings(defaultSettings);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (key: keyof ClinicSettings, value: string | boolean | null) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoBase64 = reader.result as string;
        setPreviewLogo(logoBase64);
        updateSettings("clinicLogo", logoBase64);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const testConnection = async () => {
    if (!settings.fonteApiKey) {
      alert("Mohon isi API Key terlebih dahulu!");
      return;
    }

    setIsTestingConnection(true);
    setErrorMessage("");

    try {
      const response = await fetch('https://api.fonnte.com/devices', {
        method: 'GET',
        headers: {
          'Authorization': settings.fonteApiKey,
        },
      });

      const data = await response.json();

      if (response.ok && data.status === true) {
        setShowTestToast(true);
        setTimeout(() => setShowTestToast(false), 3000);
      } else {
        throw new Error(data.message || "Invalid API Key");
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      setErrorMessage(error.message || "Connection failed. Please check your API Key.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!settings.clinicName) {
      alert("Nama Klinik harus diisi!");
      return;
    }
    
    if (!settings.clinicPhone) {
      alert("Nomor Telepon Klinik harus diisi!");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const clinicData = {
        user_id: userId,
        clinic_name: settings.clinicName,
        clinic_address: settings.clinicAddress,
        clinic_phone: settings.clinicPhone,
        clinic_email: settings.clinicEmail,
        clinic_logo: settings.clinicLogo,
        fonte_api_key: settings.fonteApiKey,
        fonte_device_id: settings.fonteDeviceId,
        signature: settings.signature,
        auto_send_birthday: settings.autoSendBirthday,
        updated_at: new Date().toISOString(),
      };

      if (settings.id) {
        Object.assign(clinicData, { id: settings.id });
      }

      const { data, error } = await supabase
        .from('clinic_settings')
        .upsert(clinicData, { onConflict: 'user_id' })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setSettings({
          ...settings,
          id: data[0].id,
          user_id: data[0].user_id,
        });
      }

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setErrorMessage(error.message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const formatSignature = (signature: string) => {
    return signature.replace(/{clinic_name}/g, settings.clinicName);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pengaturan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Konfigurasi profil klinik, integrasi dan pengaturan notifikasi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="space-y-6">
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Profil Klinik</CardTitle>
                  <CardDescription>
                    Informasi dasar tentang klinik Anda
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4" />
                  Logo Klinik
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {previewLogo ? (
                      <div className="relative">
                        <img
                          src={previewLogo}
                          alt="Clinic Logo"
                          className="h-20 w-20 rounded-lg object-cover border-2 border-border"
                        />
                        <button
                          onClick={() => {
                            setPreviewLogo(null);
                            updateSettings("clinicLogo", null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition text-xs w-5 h-5 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="mt-2 inline-flex cursor-pointer text-xs text-primary hover:text-primary/80"
                    >
                      {previewLogo ? "Ganti Logo" : "Upload Logo"}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Nama Klinik</div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={settings.clinicName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings("clinicName", e.target.value)}
                    className="pl-10"
                    placeholder="Masukkan nama klinik"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Alamat</div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    value={settings.clinicAddress}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSettings("clinicAddress", e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Masukkan alamat klinik"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Nomor Telepon</div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={settings.clinicPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings("clinicPhone", e.target.value)}
                    className="pl-10"
                    placeholder="Masukkan nomor telepon"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Email Support</div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={settings.clinicEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings("clinicEmail", e.target.value)}
                    className="pl-10"
                    placeholder="Masukkan email support"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Default Pesan</CardTitle>
                  <CardDescription>
                    Template pesan dan signature default
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Signature Default</div>
                <textarea
                  value={settings.signature}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSettings("signature", e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Masukkan signature default untuk pesan"
                />
                <p className="text-xs text-muted-foreground">
                  Gunakan {"{clinic_name}"} untuk menyisipkan nama klinik
                </p>
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  Preview: {formatSignature(settings.signature)}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <div className="font-medium">Kirim Ucapan Ultah Otomatis</div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Kirim ucapan ulang tahun otomatis ke pasien
                  </p>
                </div>
                <button
                  onClick={() => updateSettings("autoSendBirthday", !settings.autoSendBirthday)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    settings.autoSendBirthday ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoSendBirthday ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Gateway WhatsApp</CardTitle>
                  <CardDescription>
                    Konfigurasi integrasi Token API Gateway untuk pengiriman pesan WhatsApp
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Key className="h-4 w-4" />
                  Gateway API Key
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      value={settings.fonteApiKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings("fonteApiKey", e.target.value)}
                      className="pl-10"
                      placeholder="Masukkan API Key"
                    />
                  </div>
                  <Button
                    onClick={testConnection}
                    disabled={isTestingConnection || !settings.fonteApiKey}
                    variant="outline"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Koneksi"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4" />
                  Device ID / Server Token
                </div>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={settings.fonteDeviceId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings("fonteDeviceId", e.target.value)}
                    className="pl-10"
                    placeholder="Masukkan Device ID"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <span className="font-semibold">Catatan Keamanan:</span> API Key Anda
                    disimpan secara aman di database dan tidak dibagikan dengan pihak ketiga.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Keamanan & Preferensi</CardTitle>
                  <CardDescription>
                    Kelola data dan preferensi aplikasi Anda
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      <span className="font-semibold">Penyimpanan Data:</span> Semua pengaturan
                      disimpan di database dan tersinkronisasi.
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="w-full gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan Perubahan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Semua Perubahan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-green-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Berhasil!</p>
              <p className="text-xs opacity-90">Pengaturan telah disimpan</p>
            </div>
          </div>
        </div>
      )}

      {showTestToast && (
        <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-left-5 fade-in duration-300">
          <div className="bg-blue-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Koneksi Berhasil!</p>
              <p className="text-xs opacity-90">API F*n*e dapat dijangkau</p>
            </div>
          </div>
        </div>
      )}

      {showErrorToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-red-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <XCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Error!</p>
              <p className="text-xs opacity-90">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}