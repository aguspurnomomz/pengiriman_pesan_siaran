import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn, Eye, EyeOff} from "lucide-react";
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

import logo from "@/assets/logo_healtech_message.png";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data?.user) {
        // Simpan data user ke localStorage
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: data.user.user_metadata?.name || email.split('@')[0],
            email: data.user.email,
            role: data.user.user_metadata?.role || "Medical Staff",
          })
        );
        
        // Simpan clinic_id jika ada
        if (data.user.user_metadata?.clinic_id) {
          localStorage.setItem("clinicId", data.user.user_metadata.clinic_id);
        }
        
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Terjemahkan pesan error ke bahasa Indonesia
      let errorMessage = err.message || "Email atau password salah. Silakan coba lagi.";
      
      if (errorMessage.toLowerCase().includes("invalid login credentials")) {
        errorMessage = "Email atau password salah. Silakan coba lagi.";
      } else if (errorMessage.toLowerCase().includes("email not confirmed")) {
        errorMessage = "Email belum dikonfirmasi. Silakan cek email Anda untuk link verifikasi.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-4">
            <img 
              src={logo} 
              alt="HealthTech Message Hub Logo" 
              className="h-8 w-8 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">HealthTech Message Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform Komunikasi Klinik
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/80 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Selamat Datang Kembali</CardTitle>
            <CardDescription className="text-center">
              Masuk ke akun Anda untuk melanjutkan
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="admin@klinik.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Masuk
                  </>
                )}
              </Button>
              
              {/* Link ke halaman registrasi */}
              {/* <div className="text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" />
                  Daftar di sini
                </button>
              </div> */}
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} HealthTech Message Hub. All rights reserved.
        </p>
      </div>
    </div>
  );
}