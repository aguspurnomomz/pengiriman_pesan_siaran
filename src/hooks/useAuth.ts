// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  name: string;
  email: string;
  role: string;
}

export function useAuth() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cek status login saat komponen mount
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userData = localStorage.getItem("user");
    
    setIsAuthenticated(loggedIn);
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string, userData: User) => {
    // Simpan ke localStorage
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user", JSON.stringify(userData));
    
    // Update state
    setIsAuthenticated(true);
    setUser(userData);
    
    // Redirect ke dashboard
    navigate("/", { replace: true });
  };

  const logout = () => {
    // Hapus dari localStorage
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    
    // Update state
    setIsAuthenticated(false);
    setUser(null);
    
    // Redirect ke login
    navigate("/login", { replace: true });
  };

  return { 
    isAuthenticated, 
    user, 
    isLoading, 
    login, 
    logout 
  };
}