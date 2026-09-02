import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, User, LogOut, Settings} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  clinicName: string;
  userName: string;
  userRole: string;
  userEmail?: string; 
};

export function AppHeader({ clinicName, userName, userRole, userEmail = "user@riversideclinic.com" }: AppHeaderProps) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getUserInitials = () => {
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };


  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate("/profile");
  };


  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    navigate("/settings");
  };


const handleLogout = async () => {
  setIsDropdownOpen(false);
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    
    navigate("/login", { replace: true });
  } catch (error) {
    console.error("Logout error:", error);

    navigate("/login", { replace: true });
  }
};


const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      {/* Clinic Logo & Name */}
      <div className="cursor-pointer" onClick={() => navigate("/dashboard")}>
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          {clinicName}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Button */}
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* Desktop User Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            className="hidden h-10 gap-2 border-border sm:inline-flex"
            onClick={handleDropdownToggle}
          >
            <span className="flex flex-col items-start text-left">
              <span className="text-sm font-medium leading-tight">{userName}</span>
              <span className="text-xs text-muted-foreground">{userRole}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Backdrop untuk close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
                    <p className="text-xs text-gray-400 mt-1">{userRole}</p>
                  </div>
                  
                  {/* My Profile Button */}
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-500" />
                    My Profile
                  </button>
                  
                  {/* Settings Button (Optional) */}
                  <button
                    onClick={handleSettingsClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    Settings
                  </button>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Avatar (dengan dropdown juga) */}
        <div className="relative sm:hidden">
          <button
            onClick={handleDropdownToggle}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-sm font-semibold text-white"
          >
            {getUserInitials()}
          </button>

          {/* Mobile Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
                  </div>
                  
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </button>
                  
                  <button
                    onClick={handleSettingsClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

