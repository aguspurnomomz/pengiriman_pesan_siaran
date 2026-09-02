import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  type LucideIcon,
  Send,
  Settings,
  Heart,
  Users,
  BookOpen,
  Clock,
  FileText
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const navItems: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}[] = [
  { to: "/", label: "Beranda", icon: LayoutDashboard, end: true },
  { to: "/patients", label: "Data Kontak ", icon: Users },
  { to: "/broadcast", label: "Pesan Siaran", icon: Send },
  { to: "/schedule", label: "Penjadwalan", icon: Clock },
  { to: "/termsinfo", label: "Syarat & Ketentuan", icon: FileText },
  { to: "/docs", label: "Dokumentasi", icon: BookOpen }, 
  { to: "/settings", label: "Pengaturan", icon: Settings },
];

interface ClinicData {
  name: string;
  logo: string | null;
}

export function AppSidebar() {
  const [clinic, setClinic] = useState<ClinicData>({
    name: "Layanan Pengiriman Pesan dan Informasi",
    logo: null,
  });

  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) return;

        const { data, error } = await supabase
          .from('clinic_settings')
          .select('clinic_name, clinic_logo')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          setClinic({
            name: data.clinic_name || "Pengiriman Pesan dan Informasi",
            logo: data.clinic_logo || null,
          });
        }
      } catch (error) {
        console.error("Error fetching clinic data for sidebar:", error);
      }
    };

    fetchClinicData();
  }, []);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden">
          {clinic.logo ? (
            <img 
              src={clinic.logo} 
              alt={clinic.name} 
              className="h-6 w-6 object-contain"
            />
          ) : (
            <Heart className="h-5 w-5" fill="currentColor" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {clinic.name}
          </p>
          <p className="text-sm font-semibold text-foreground line-clamp-1">
            Message Hub
          </p>
        </div>
      </div>
      
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      
      <div className="border-t border-border p-4">
         <p className="text-xs text-muted-foreground">
            Secure messaging for clinical teams. HIPAA-ready workflows in
            development.
          </p>
      </div>
    </aside>
  );
}