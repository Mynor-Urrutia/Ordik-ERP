import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [ready, setReady]   = useState(false); // tokens verificados

  const logout = useCallback(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }, []);

  // Al arrancar, si hay access token válido recupera el usuario
  useEffect(() => {
    const access = localStorage.getItem("access");
    if (!access) { setReady(true); return; }

    const checkUser = async () => {
      try {
        const { data } = await authService.me();
        setUser(data);
      } catch {
        logout();
      } finally {
        setReady(true);
      }
    };
    checkUser();
  }, [logout]);

  const login = async (username, password) => {
    try {
      const { data } = await authService.login(username, password);
      localStorage.setItem("access",  data.access);
      localStorage.setItem("refresh", data.refresh);
      setUser(data.user);
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
