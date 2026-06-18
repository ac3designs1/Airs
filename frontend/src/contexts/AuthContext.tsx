import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

export type SpecialRole = 'fto' | 'senior_fto' | 'cirt_fto' | 'academy_leadership';

export const SPECIAL_ROLE_LABELS: Record<SpecialRole, string> = {
  fto:               'FTO',
  senior_fto:        'Senior FTO',
  cirt_fto:          'CIRT FTO',
  academy_leadership:'Academy Leadership',
};

export const ALL_SPECIAL_ROLES: SpecialRole[] = ['fto', 'senior_fto', 'cirt_fto', 'academy_leadership'];

export function hasSpecialRole(user: Officer | null, role: SpecialRole): boolean {
  return !!(user?.special_roles?.includes(role));
}

interface Officer {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  rank: string;
  department: string;
  status: string;
  callsign: string;
  role: string;
  special_roles: SpecialRole[];
  created_at: string;
  onboarding_complete?: number;
  in_city_name?: string;
  discord_username?: string;
}

interface AuthState {
  user: Officer | null;
  loading: boolean;
}

interface AuthContextType {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('airs_token');
    if (!token) { setAuth({ user: null, loading: false }); return; }
    // Validate token against server and get fresh user data
    api.get('/auth/me')
      .then(res => {
        localStorage.setItem('airs_user', JSON.stringify(res.data));
        setAuth({ user: res.data, loading: false });
      })
      .catch(() => {
        localStorage.removeItem('airs_token');
        localStorage.removeItem('airs_user');
        setAuth({ user: null, loading: false });
      });
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, officer } = res.data;
    localStorage.setItem('airs_token', token);
    localStorage.setItem('airs_user', JSON.stringify(officer));
    setAuth({ user: officer, loading: false });
  };

  const setToken = async (token: string) => {
    localStorage.setItem('airs_token', token);
    const res = await api.get('/auth/me');
    localStorage.setItem('airs_user', JSON.stringify(res.data));
    setAuth({ user: res.data, loading: false });
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('airs_token');
    localStorage.removeItem('airs_user');
    setAuth({ user: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
