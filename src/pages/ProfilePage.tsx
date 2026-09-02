import { useState, useEffect, useRef } from "react";
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
  User, 
  Mail, 
  Phone, 
  Lock, 
  Camera, 
  Save,
  Building2,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Interface untuk data profile
interface ProfileData {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  avatar: string | null;
}

// Interface untuk password form
interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "",
    avatar: null,
  });
  
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileError, setProfileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        setProfile({
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "",
          email: user.email || "",
          phoneNumber: user.user_metadata?.phone_number || "",
          role: user.user_metadata?.role || "Medical Staff",
          avatar: user.user_metadata?.avatar || null,
        });
      }
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      setErrorMessage(error.message || "Gagal mengambil data profil");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange = (field: keyof ProfileData, value: string) => {
    setProfile({ ...profile, [field]: value });
    setProfileError("");
  };

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    setPasswordData({ ...passwordData, [field]: value });
    setPasswordError("");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Avatar = reader.result as string;
        
        // Update user metadata with avatar
        try {
          const { error } = await supabase.auth.updateUser({
            data: { avatar: base64Avatar }
          });
          
          if (error) throw error;
          
          setProfile({ ...profile, avatar: base64Avatar });
          setSuccessMessage("Foto profil berhasil diperbarui");
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error: any) {
          setErrorMessage(error.message || "Gagal memperbarui foto profil");
          setShowErrorToast(true);
          setTimeout(() => setShowErrorToast(false), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = () => {
    return profile.fullName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const validateProfile = () => {
    if (!profile.fullName.trim()) {
      setProfileError("Nama lengkap wajib diisi");
      return false;
    }
    if (!profile.phoneNumber.trim()) {
      setProfileError("Nomor telepon wajib diisi");
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (!passwordData.currentPassword) {
      setPasswordError("Password saat ini wajib diisi");
      return false;
    }
    if (!passwordData.newPassword) {
      setPasswordError("Password baru wajib diisi");
      return false;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password minimal 6 karakter");
      return false;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Password baru tidak cocok");
      return false;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError("Password baru harus berbeda dari password saat ini");
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    setIsSavingProfile(true);
    setProfileError("");

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName,
          name: profile.fullName,
          phone_number: profile.phoneNumber,
          role: profile.role,
        }
      });

      if (error) throw error;

      setSuccessMessage("Profil berhasil diperbarui");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setProfileError(error.message || "Gagal memperbarui profil");
      setErrorMessage(error.message || "Gagal memperbarui profil");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordError("Password saat ini salah");
        setIsChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setSuccessMessage("Password berhasil diperbarui");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      setPasswordError(error.message || "Gagal mengubah password");
      setErrorMessage(error.message || "Gagal mengubah password");
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancel = () => {
    fetchUserProfile(); 
    setIsEditing(false);
    setProfileError("");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Profil Saya
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola informasi pribadi dan pengaturan keamanan Anda
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Profile Card - 2 columns wide */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Section */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informasi Pribadi
                  </CardTitle>
                  <CardDescription>
                    Perbarui detail pribadi dan informasi kontak Anda
                  </CardDescription>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profil
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  {/* Grid Form - 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Nama Lengkap
                      </label>
                      <Input
                        value={profile.fullName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleProfileChange("fullName", e.target.value)
                        }
                        placeholder="Masukkan nama lengkap Anda"
                      />
                    </div>

                    {/* Email Address (Read-only) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Alamat Email
                      </label>
                      <Input
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-muted/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email tidak dapat diubah. Hubungi administrator untuk perubahan.
                      </p>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Nomor Telepon
                      </label>
                      <Input
                        value={profile.phoneNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleProfileChange("phoneNumber", e.target.value)
                        }
                        placeholder="Masukkan nomor telepon Anda"
                      />
                    </div>

                    {/* Role/Position (Read-only or editable based on needs) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        Peran / Posisi
                      </label>
                      <Input
                        value={profile.role}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleProfileChange("role", e.target.value)
                        }
                        placeholder="Masukkan peran atau posisi Anda"
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {profileError && (
                    <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                      {profileError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSavingProfile}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="gap-2"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Simpan Perubahan
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Display Mode - Grid 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Nama Lengkap</label>
                      <p className="text-sm font-medium mt-1">{profile.fullName || "-"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Alamat Email</label>
                      <p className="text-sm font-medium mt-1">{profile.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Nomor Telepon</label>
                      <p className="text-sm font-medium mt-1">{profile.phoneNumber || "-"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Peran / Posisi</label>
                      <p className="text-sm font-medium mt-1">{profile.role}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Section - Change Password */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Keamanan</CardTitle>
                  <CardDescription>
                    Ganti password Anda untuk menjaga keamanan akun
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Password Saat Ini
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handlePasswordChange("currentPassword", e.target.value)
                      }
                      placeholder="Masukkan password saat ini"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password Baru</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handlePasswordChange("newPassword", e.target.value)
                      }
                      placeholder="Masukkan password baru"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password minimal 6 karakter
                  </p>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handlePasswordChange("confirmPassword", e.target.value)
                      }
                      placeholder="Konfirmasi password baru"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Error */}
                {passwordError && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                    {passwordError}
                  </div>
                )}

                {/* Change Password Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                    variant="outline"
                    className="gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memperbarui...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Avatar Section - 1 column wide */}
        <div className="lg:col-span-1">
          <Card className="border-border/80 shadow-sm sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Foto Profil
              </CardTitle>
              <CardDescription>
                Upload foto baru untuk profil Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {/* Avatar Display */}
              <div className="relative mb-4">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.fullName}
                    className="h-32 w-32 rounded-full object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-primary/20">
                    <span className="text-3xl font-bold text-primary">
                      {getInitials()}
                    </span>
                  </div>
                )}
                
                {/* Upload Button Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-lg">{profile.fullName || "-"}</h3>
                <p className="text-sm text-muted-foreground">{profile.role}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>

              {/* Upload Instructions */}
              <div className="mt-4 pt-4 border-t border-border/50 text-center">
                <p className="text-xs text-muted-foreground">
                  Klik icon kamera untuk upload foto baru.
                  <br />
                  Rekomendasi: Gambar persegi, minimal 128x128px
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Toast Notification */}
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

      {/* Error Toast Notification */}
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