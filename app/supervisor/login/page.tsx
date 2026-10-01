'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, logoutUser, setLocalUserRole, clearLocalUserRole, determineUserRole } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function SupervisorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshRole } = useAuth();

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
    <div className="login-page-wrapper">
      {/* Ambient role glow */}
      <div className="login-glow-orb login-glow-supervisor" aria-hidden="true"></div>

      {/* Top Bar with Back and Theme Switcher */}
      <nav className="login-top-bar">
        <Link href="/" className="login-back-nav">
          <i className="fas fa-arrow-left"></i>
          <span>Return to Portal</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Login Card */}
      <div className="login-card login-role-supervisor">
        <div className="login-card-header">
          <div className="login-role-icon">
            <i className="fas fa-user-shield"></i>
          </div>
          <h2>Supervisor Portal</h2>
          <p>Access live division attendance feeds and student rosters</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Supervisor Email</label>
            <div className="login-input-wrap">
              <i className="fas fa-envelope field-icon"></i>
              <input
                type="email"
                id="email"
                placeholder="supervisor@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Account Password</label>
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
                <span>Entering Dashboard...</span>
              </>
            ) : (
              <>
                <i className="fas fa-arrow-right-to-bracket"></i>
                <span>Sign In to Division Hub</span>
              </>
            )}
          </button>
        </form>

        {/* Division Quick Fill Helper */}
        <div className="division-quick-picker">
          <div className="division-picker-title">
            <i className="fas fa-layer-group"></i>
            <span>Quick-Select Division Account:</span>
          </div>
          <div className="division-grid">
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.secondary@test.com')}
              className="division-pill-btn"
            >
              <span>🎓</span>
              <span>Secondary</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.elementary@test.com')}
              className="division-pill-btn"
            >
              <span>🌱</span>
              <span>Elementary</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.middle@test.com')}
              className="division-pill-btn"
            >
              <span>📚</span>
              <span>Middle School</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.technical@test.com')}
              className="division-pill-btn"
            >
              <span>⚙️</span>
              <span>Technical</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor@test.com')}
              className="division-pill-btn division-pill-all"
            >
              <span>🌐</span>
              <span>All Divisions (Global Scope)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
