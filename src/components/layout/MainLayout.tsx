import { useEffect, useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { supabase } from "@/lib/supabaseClient";

interface UserData {
  name: string;
  email: string;
  role: string;
}

interface ClinicInfo {
  name: string;
  logo: string | null;
  id: string;
}

export function MainLayout() {
  const [user, setUser] = useState<UserData>({
    name: "Loading...",
    email: "",
    role: "Medical Staff",
  });
  
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>({
    name: "Memuat data klinik...",
    logo: null,
    id: "",
  });
  
  const [isLoadingClinic, setIsLoadingClinic] = useState(true);
  const hasFetchedUserRef = useRef(false);
  const hasFetchedClinicRef = useRef(false);
  const isMountedRef = useRef(true);

  // Fetch User - Only once
  useEffect(() => {
    if (hasFetchedUserRef.current) return;
    hasFetchedUserRef.current = true;

    const getUser = async () => {
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (isMountedRef.current && supabaseUser) {
          setUser({
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || "User",
            email: supabaseUser.email || "",
            role: supabaseUser.user_metadata?.role || "Medical Staff",
          });
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (isMountedRef.current && session?.user) {
          setUser({
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "User",
            email: session.user.email || "",
            role: session.user.user_metadata?.role || "Medical Staff",
          });
          
          // Pemicu fetch ulang jika ada perubahan sesi otentikasi
          fetchClinicSettings();
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // FITUR BARU: Membaca data klinik dari tabel relasi user_clinics
  const fetchClinicSettings = async () => {
    console.log("1. fetchClinicSettings started via user_clinics relation");
    
    try {
      setIsLoadingClinic(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user found");
        setClinicInfo({ name: "Pengiriman Pesan dan Informasi", logo: null, id: "" });
        setIsLoadingClinic(false);
        return;
      }
      
      // Ambil clinic_id dari tabel relasi junction user_clinics
      const { data: userClinicData, error: userClinicError } = await supabase
        .from('user_clinics')
        .select('clinic_id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (userClinicError || !userClinicData) {
        console.log("No clinic relation found in user_clinics table");
        setClinicInfo({ name: "Pengiriman Pesan dan Informasi", logo: null, id: "" });
        setIsLoadingClinic(false);
        return;
      }
      
      console.log("Target clinic ID found from DB:", userClinicData.clinic_id);
      
      // Ambil profil klinik berdasarkan id yang didapatkan
      const { data} = await supabase
        .from('clinic_settings')
        .select('id, clinic_name, clinic_logo')
        .eq('id', userClinicData.clinic_id)
        .maybeSingle();
      
      if (data) {
        console.log("Setting clinic info successfully:", data.clinic_name);
        setClinicInfo({
          name: data.clinic_name,
          logo: data.clinic_logo,
          id: data.id,
        });
      } else {
        setClinicInfo({ name: "Pengiriman Pesan dan Informasi", logo: null, id: "" });
      }
      
      setIsLoadingClinic(false);
      
    } catch (err) {
      console.error("Error in MainLayout fetch:", err);
      setIsLoadingClinic(false);
    }
  };

  // Initial fetch of clinic settings
  useEffect(() => {
    if (hasFetchedClinicRef.current) return;
    hasFetchedClinicRef.current = true;
    
    console.log("Initial fetch of clinic settings");
    fetchClinicSettings();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (isLoadingClinic) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Memuat data klinik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MobileSidebar />
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <AppHeader
          clinicName={clinicInfo.name}
          userName={user.name}
          userRole={user.role}
          userEmail={user.email}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}