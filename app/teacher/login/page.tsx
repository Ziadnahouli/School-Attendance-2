'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, logoutUser, setLocalUserRole, clearLocalUserRole, determineUserRole } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthContext';

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshRole } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-scheme', 'fluent');
    return () => {
      document.documentElement.removeAttribute('data-scheme');
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate with credentials
      const user = await loginWithEmail(email, password);

      // 2. Verify actual role authorization
      const userRole = await determineUserRole(user.uid, user.email);
      if (userRole.role !== 'teacher') {
        await logoutUser();
        clearLocalUserRole();
        alert('Access Denied: You do not have a teacher account.');
        return;
      }

      setLocalUserRole('teacher');
      await refreshRole();
      router.push('/teacher/dashboard');
    } catch (err: unknown) {
      clearLocalUserRole();
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Login failed: ' + msg);
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
        backgroundColor: 'var(--background-color)',
      }}
    >
      <div className="login-box">
        <h2>
          <i className="fas fa-chalkboard-teacher"></i> Teacher Login
        </h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              id="email"
              placeholder="Email Address"
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <Link href="/" className="back-link">
          Back to Portal
        </Link>
      </div>
    </div>
  );
}
