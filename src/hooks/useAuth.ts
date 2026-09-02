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
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userData = localStorage.getItem("user");
    
    setIsAuthenticated(loggedIn);
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const login = (_email: string, _password: string, userData: User) => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user", JSON.stringify(userData));
    
    setIsAuthenticated(true);
    setUser(userData);
    
    navigate("/", { replace: true });
  };

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    
    setIsAuthenticated(false);
    setUser(null);
    
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