'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from './api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; organizationName: string }) => Promise<void>;
  join: (data: { name: string; email: string; password: string; joinCode: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('punchin_token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await authApi.me();
      setUser(data.user);
    } catch {
      localStorage.removeItem('punchin_token');
      localStorage.removeItem('punchin_refresh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('punchin_token', data.accessToken);
    localStorage.setItem('punchin_refresh', data.refreshToken);
    setUser(data.user);
  };

  const signup = async (payload: { name: string; email: string; password: string; organizationName: string }) => {
    const data = await authApi.signup(payload);
    localStorage.setItem('punchin_token', data.accessToken);
    localStorage.setItem('punchin_refresh', data.refreshToken);
    setUser(data.user);
  };

  const join = async (payload: { name: string; email: string; password: string; joinCode: string }) => {
    const data = await authApi.join(payload);
    localStorage.setItem('punchin_token', data.accessToken);
    localStorage.setItem('punchin_refresh', data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('punchin_refresh');
      if (refresh) await authApi.logout(refresh);
    } catch { /* ignore */ }
    localStorage.removeItem('punchin_token');
    localStorage.removeItem('punchin_refresh');
    setUser(null);
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isManager = isAdmin || user?.role === 'MANAGER';

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, join, logout, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
