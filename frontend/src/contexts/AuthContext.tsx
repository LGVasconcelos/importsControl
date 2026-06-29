import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { AuthUser } from '../services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());

  const login = async (email: string, password: string) => {
    const u = await authService.login({ email, password });
    setUser(u);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
