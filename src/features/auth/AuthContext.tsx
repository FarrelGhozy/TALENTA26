import React, { createContext, useContext, useEffect, useState } from 'react';
import { Role, User } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { userService } from '../../services/factory';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  isLoading: boolean;
  loginAsRole: (role: Role, userId?: string) => Promise<void>;
  loginWithCredentials: (email: string, pass: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>(() => getItem<Role>('talenta-role', 'mahasiswa'));
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    try {
      const user = await userService.getCurrentUser();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
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

  const loginWithCredentials = async (email: string, _pass: string, role: Role) => {
    setIsLoading(true);
    try {
      const users = await userService.getAll();
      const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!found) throw new Error('Email tidak terdaftar');
      setItem('talenta-role', role);
      setItem('talenta-user-id', found.id);
      setCurrentRole(role);
      setCurrentUser(found);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
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
