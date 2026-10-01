'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { determineUserRole, logoutUser } from '@/lib/auth';
import { UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  divisions: string[];
  loading: boolean;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  divisions: [],
  loading: true,
  logout: async () => {},
  refreshRole: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const checkRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setRole(null);
      setDivisions([]);
      setLoading(false);
      return;
    }

    try {
      const result = await determineUserRole(currentUser.uid, currentUser.email);
      setUser(currentUser);
      setRole(result.role);
      setDivisions(result.divisions || []);
    } catch (err) {
      console.error('Failed to resolve user role:', err);
      setUser(currentUser);
      setRole(null);
      setDivisions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      checkRole(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const refreshRole = async () => {
    if (auth.currentUser) {
      await checkRole(auth.currentUser);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setRole(null);
    setDivisions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        divisions,
        loading,
        logout: handleLogout,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
