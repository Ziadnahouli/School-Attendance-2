'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  useEffect(() => {
    document.documentElement.setAttribute('data-scheme', 'fluent');
    return () => {
      document.documentElement.removeAttribute('data-scheme');
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', margin: 0, backgroundColor: 'var(--background-color)' }}>
      <div className="portal-container">
        <h1>School Attendance Portal</h1>
        <p>Please select your role to log in.</p>
        <div className="button-group">
          <Link href="/supervisor/login" className="portal-btn supervisor-btn">
            <i className="fas fa-user-shield"></i>
            Supervisor Login
          </Link>
          <Link href="/teacher/login" className="portal-btn teacher-btn">
            <i className="fas fa-chalkboard-teacher"></i>
            Teacher Login
          </Link>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link
            href="/admin/login"
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            <i className="fas fa-lock" style={{ marginRight: '4px' }}></i>
            Administrator Portal
          </Link>
        </div>

        <div className="logo-footer">
          <Link href="/about" title="About Us">
            <img
              src="/logo 1.png"
              alt="About Us"
              className="footer-logo about-logo"
              loading="lazy"
            />
          </Link>
          <img
            src="/logo 2.png"
            alt="RHTI Logo"
            className="footer-logo"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
