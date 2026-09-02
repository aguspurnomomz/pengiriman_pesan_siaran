import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, UserPlus, Building2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

// Interface untuk data klinik
interface Clinic {
  id: string;
  clinic_name: string;
}

// Interface untuk form data
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  clinicId: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    clinicId: "",
  });
  
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  // Fetch daftar klinik dari database
  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    setIsLoadingClinics(true);
    try {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('id, clinic_name')
        .order('clinic_name', { ascending: true });

      if (error) throw error;
      
      setClinics(data || []);
    } catch (error: any) {
      console.error('Error fetching clinics:', error);
      setGeneralError("Gagal mengambil data klinik. Silakan refresh halaman.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsLoadingClinics(false);
    }
  };

  // Validasi form
  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};
    
    // Validasi email
    if (!formData.email) {
      newErrors.email = "Email wajib diisi";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }
    
    // Validasi password
    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
    }
    
    // Validasi konfirmasi password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password wajib diisi";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Password tidak cocok";
    }
    
    // Validasi klinik
    if (!formData.clinicId) {
      newErrors.clinicId = "Silakan pilih klinik";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Hapus error field yang sedang diedit
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Hapus general error
    if (generalError) setGeneralError("");
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setGeneralError("");
    
    try {
      // Registrasi user ke Supabase Auth dengan metadata
      // Database Trigger akan otomatis membuat entri di user_clinics
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            clinic_id: formData.clinicId,
            role: 'admin',
            registered_at: new Date().toISOString(),
          },
        },
      });
      
      if (error) {
        // Tangani error email sudah terdaftar
        if (error.message.toLowerCase().includes('already registered') || 
            error.status === 422 ||
            error.code === 'user_already_exists') {
          setErrors({ email: "Email sudah terdaftar. Silakan gunakan email lain atau login." });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }
      
      // Tampilkan pesan sukses (tanpa insert manual ke user_clinics)
      setSuccessMessage("Registrasi berhasil! Silakan cek email Anda untuk verifikasi.");
      setShowSuccessToast(true);
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        clinicId: "",
      });
      
      // Redirect ke halaman login setelah 3 detik
      setTimeout(() => {
        setShowSuccessToast(false);
        navigate("/login");
      }, 3000);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setGeneralError(error.message || "Terjadi kesalahan saat registrasi. Silakan coba lagi.");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-2xl shadow-lg mb-4">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">HealthTech Message Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar untuk memulai menggunakan platform
          </p>
        </div>

        {/* Form Registrasi */}
        <Card className="border-border/80 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Buat Akun Baru</CardTitle>
            <CardDescription className="text-center">
              Isi data di bawah ini untuk mendaftar
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="admin@klinik.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={`pl-10 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Password minimal 6 karakter
                </p>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Clinic Selection Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Pilih Klinik
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <select
                    value={formData.clinicId}
                    onChange={(e) => handleChange("clinicId", e.target.value)}
                    className={`w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      errors.clinicId ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                    disabled={isSubmitting || isLoadingClinics}
                  >
                    <option value="">-- Pilih Klinik --</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.clinic_name}
                      </option>
                    ))}
                  </select>
                  {isLoadingClinics && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {errors.clinicId && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.clinicId}
                  </p>
                )}
                {clinics.length === 0 && !isLoadingClinics && (
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Belum ada klinik terdaftar. Silakan hubungi administrator.
                  </p>
                )}
              </div>

              {/* General Error Message */}
              {generalError && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Info Verifikasi Email */}
              <div className="text-xs text-blue-600 bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Setelah mendaftar, Anda akan menerima email verifikasi. Silakan verifikasi email Anda sebelum login.
                </span>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isSubmitting || clinics.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mendaftar...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Daftar
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Link ke Login */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Sudah punya akun?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-primary hover:underline font-medium"
          >
            Masuk di sini
          </button>
        </p>
      </div>

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-green-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Registrasi Berhasil!</p>
              <p className="text-xs opacity-90">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast Notification */}
      {showErrorToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-red-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <XCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">Registrasi Gagal!</p>
              <p className="text-xs opacity-90">{generalError || "Terjadi kesalahan"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}