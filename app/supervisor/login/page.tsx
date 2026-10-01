'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, logoutUser, setLocalUserRole, clearLocalUserRole, determineUserRole } from '@/lib/auth';
import { getDivisionsForSupervisor } from '@/lib/firestore';
import { useAuth } from '@/components/auth/AuthContext';

export default function SupervisorLoginPage() {
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
      alert('Enter email & password');
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate with credentials
      const user = await loginWithEmail(email, password);

      // 2. Verify actual role authorization
      const userRole = await determineUserRole(user.uid, user.email);
      if (userRole.role !== 'supervisor') {
        await logoutUser();
        clearLocalUserRole();
        alert('Access Denied: You do not have a supervisor account.');
        return;
      }

      setLocalUserRole('supervisor', userRole.divisions);
      await refreshRole();
      router.push('/supervisor/dashboard');
    } catch (err: unknown) {
      clearLocalUserRole();
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Login failed: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('Password123!');
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
          <i className="fas fa-user-tie"></i> Supervisor Login
        </h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              id="email"
              placeholder="Official Email"
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
              placeholder="Secure Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login Securely'}
          </button>
        </form>

        {/* Division Account Quick Selectors */}
        <div style={{ marginTop: '20px', textAlign: 'left', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Select Division Account:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.secondary@test.com')}
              style={{ padding: '7px 8px', fontSize: '11px', fontWeight: 600, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}
            >
              🎓 Secondary
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.elementary@test.com')}
              style={{ padding: '7px 8px', fontSize: '11px', fontWeight: 600, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}
            >
              🌱 Elementary
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.middle@test.com')}
              style={{ padding: '7px 8px', fontSize: '11px', fontWeight: 600, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}
            >
              📚 Middle School
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.technical@test.com')}
              style={{ padding: '7px 8px', fontSize: '11px', fontWeight: 600, background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8', borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}
            >
              ⚙️ Technical
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleQuickFill('supervisor@test.com')}
            style={{ width: '100%', marginTop: '6px', padding: '6px 8px', fontSize: '11px', fontWeight: 500, background: '#f9fafb', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}
          >
            🌐 All Divisions (General Supervisor)
          </button>
        </div>

        <Link href="/" className="back-link">
          Back to Portal
        </Link>
      </div>
    </div>
  );
}
