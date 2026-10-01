'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, logoutUser, setLocalUserRole, clearLocalUserRole, determineUserRole } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="login-page-wrapper">
      {/* Ambient role glow */}
      <div className="login-glow-orb login-glow-admin" aria-hidden="true"></div>

      {/* Top Bar with Back and Theme Switcher */}
      <nav className="login-top-bar">
        <Link href="/" className="login-back-nav">
          <i className="fas fa-arrow-left"></i>
          <span>Return to Portal</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Login Card */}
      <div className="login-card login-role-admin">
        <div className="login-card-header">
          <div className="login-role-icon">
            <i className="fas fa-user-shield"></i>
          </div>
          <h2>Executive Admin</h2>
          <p>Sign in to manage classes, users, and campus analytics</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Administrator Email</label>
            <div className="login-input-wrap">
              <i className="fas fa-envelope field-icon"></i>
              <input
                type="email"
                id="email"
                placeholder="admin@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Secure Password</label>
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
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <i className="fas fa-shield-halved"></i>
                <span>Authenticate Securely</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
