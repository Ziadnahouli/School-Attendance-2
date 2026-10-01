'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { UserRole } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: UserRole;
  loginPath: string;
}

export default function ProtectedRoute({ children, allowedRole, loginPath }: ProtectedRouteProps) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace(loginPath);
      } else if (role && role !== allowedRole) {
        alert(`ACCESS DENIED. You do not have permissions for the ${allowedRole} dashboard.`);
        logout().then(() => {
          router.replace('/');
        });
      }
    }
  }, [user, role, loading, allowedRole, loginPath, router, logout]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner message="Verifying authentication & role permissions..." />
      </div>
    );
  }

  if (!user || (role && role !== allowedRole)) {
    return null;
  }

  return <>{children}</>;
}
