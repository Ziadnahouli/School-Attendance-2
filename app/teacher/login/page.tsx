'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, logoutUser, setLocalUserRole, clearLocalUserRole, determineUserRole } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshRole } = useAuth();

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

  const handleQuickFillTeacher = () => {
    setEmail('teacher.english@test.com');
    setPassword('Password123!');
  };

  return (
    <div className="login-page-wrapper">
      {/* Ambient role glow */}
      <div className="login-glow-orb login-glow-teacher" aria-hidden="true"></div>

      {/* Top Bar with Back and Theme Switcher */}
      <nav className="login-top-bar">
        <Link href="/" className="login-back-nav">
          <i className="fas fa-arrow-left"></i>
          <span>Return to Portal</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Login Card */}
      <div className="login-card login-role-teacher">
        <div className="login-card-header">
          <div className="login-role-icon">
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <h2>Teacher Portal</h2>
          <p>Sign in to submit daily student roll calls and class reports</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Teacher Email Address</label>
            <div className="login-input-wrap">
              <i className="fas fa-envelope field-icon"></i>
              <input
                type="email"
                id="email"
                placeholder="teacher@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Security Password</label>
            <div className="login-input-wrap">
              <i className="fas fa-lock field-icon"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label="Toggle password visibility"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-btn-submit">
            {loading ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <i className="fas fa-arrow-right-to-bracket"></i>
                <span>Open Classroom Workspace</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={handleQuickFillTeacher}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-wand-magic-sparkles"></i>
            <span>Quick-fill demo teacher credentials</span>
          </button>
        </div>
      </div>
    </div>
  );
}
