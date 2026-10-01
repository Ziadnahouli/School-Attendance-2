'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, logoutUser, setLocalUserRole, clearLocalUserRole, determineUserRole } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshRole } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate with credentials
      const user = await loginWithEmail(email, password);

      // 2. Verify actual role authorization
      const userRole = await determineUserRole(user.uid, user.email);
      if (userRole.role !== 'admin') {
        await logoutUser();
        clearLocalUserRole();
        alert('Access Denied: You are not an administrator.');
        return;
      }

      setLocalUserRole('admin');
      await refreshRole();
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      clearLocalUserRole();
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Admin login failed: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        margin: 0,
        backgroundColor: '#f1f2f6',
      }}
    >
      <div
        className="login-box"
        style={{
          borderTop: '5px solid #c0392b',
        }}
      >
        <h2 style={{ color: '#2c3e50' }}>
          <i className="fas fa-user-shield" style={{ color: '#c0392b' }}></i> Admin Login
        </h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              id="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              id="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#c0392b',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logging in...' : 'Login Securely'}
          </button>
        </form>
        <Link href="/" className="back-link">
          Back to Portal
        </Link>
      </div>
    </div>
  );
}
