import React, { createContext, useContext, useEffect, useState } from 'react';
import { Role, User } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { registerUnauthorizedHandler, userService } from '@talenta/services';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  isLoading: boolean;
  loginAsRole: (role: Role, userId?: string) => Promise<void>;
  loginWithCredentials: (email: string, pass: string) => Promise<User>;
  registerMahasiswa: (payload: any) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>(() => getItem<Role>('talenta-role', 'mahasiswa'));
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    try {
      const user = await userService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const role = user.role[0] || 'mahasiswa';
        setCurrentRole(role);
        setItem('talenta-role', role);
        setItem('talenta-user-id', user.id);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Tangani sesi kedaluwarsa (401) secara global agar user terproteksi diarahkan kembali ke /masuk
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      localStorage.removeItem('talenta-user-id');
      localStorage.removeItem('talenta-role');
      setCurrentUser(null);
      setCurrentRole('mahasiswa');
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const isProtected =
        window.location.pathname.startsWith('/app') ||
        window.location.pathname.startsWith('/admin');
      if (isProtected && !window.location.pathname.startsWith('/masuk')) {
        window.location.assign(
          `/masuk?redirect=${encodeURIComponent(currentPath)}&reason=session_expired`
        );
      }
    });
    return () => registerUnauthorizedHandler(null);
  }, []);

  const loginAsRole = async (role: Role, userId?: string) => {
    setIsLoading(true);
    try {
      setItem('talenta-role', role);
      setCurrentRole(role);
      if (userId) {
        setItem('talenta-user-id', userId);
        const user = await userService.getById(userId);
        setCurrentUser(user);
      } else {
        const users = await userService.getAll();
        const found = users.find((u) => u.role.includes(role)) || users[0];
        if (found) {
          setItem('talenta-user-id', found.id);
          setCurrentUser(found);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      if ((userService as any).login) {
        const res = await (userService as any).login(email, pass);
        const user = res.user;
        const role = user.role[0] || 'mahasiswa';
        setItem('talenta-role', role);
        setItem('talenta-user-id', user.id);
        setCurrentRole(role);
        setCurrentUser(user);
        return user;
      } else {
        const users = await userService.getAll();
        const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!found) throw new Error('Email tidak terdaftar');
        const role = found.role[0] || 'mahasiswa';
        setItem('talenta-role', role);
        setItem('talenta-user-id', found.id);
        setCurrentRole(role);
        setCurrentUser(found);
        return found;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerMahasiswa = async (payload: any) => {
    setIsLoading(true);
    try {
      if ((userService as any).register) {
        const res = await (userService as any).register(payload);
        const user = res.user;
        const role = user.role[0] || 'mahasiswa';
        setItem('talenta-role', role);
        setItem('talenta-user-id', user.id);
        setCurrentRole(role);
        setCurrentUser(user);
        return user;
      }
      throw new Error('Fitur registrasi tidak tersedia pada adapter ini');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const user = await userService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const role = user.role[0] || 'mahasiswa';
        setCurrentRole(role);
        setItem('talenta-role', role);
        setItem('talenta-user-id', user.id);
      }
    } catch {
      // Abaikan bila sesi belum siap
    }
  };

  const logout = async () => {
    try {
      if ((userService as any).logout) {
        await (userService as any).logout();
      }
    } catch {
      // Ignore network error on logout
    }
    localStorage.removeItem('talenta-user-id');
    localStorage.removeItem('talenta-role');
    setCurrentUser(null);
    setCurrentRole('mahasiswa');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isLoading,
        loginAsRole,
        loginWithCredentials,
        registerMahasiswa,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
