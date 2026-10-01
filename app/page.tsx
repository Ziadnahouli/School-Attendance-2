'use client';

import React from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function HomePage() {
  return (
    <div className="portal-wrapper">
      {/* Ambient glowing gradient orbs */}
      <div className="portal-bg-decor" aria-hidden="true">
        <div className="portal-orb portal-orb-1"></div>
        <div className="portal-orb portal-orb-2"></div>
        <div className="portal-orb portal-orb-3"></div>
      </div>

      {/* Top Glass Navigation Bar */}
      <header className="portal-navbar">
        <div className="portal-brand">
          <div className="portal-brand-icon">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <div className="portal-brand-text">
            <h1>EduPresence IQ</h1>
            <span>Campus Attendance Intelligence</span>
          </div>
        </div>

        <div className="portal-nav-actions">
          <div className="portal-session-pill">
            <span className="pulse-dot"></span>
            <span>Academic Year 2026-2027</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Header */}
      <main>
        <section className="portal-hero">
          <div className="portal-badge-chip">
            <i className="fas fa-bolt"></i>
            <span>Real-Time Attendance Operations</span>
          </div>
          <h2>
            Unified Campus Presence &amp; <span className="gradient-text">Student Attendance</span>
          </h2>
          <p>
            Streamlined daily absence reporting, instant multi-division supervisor oversight,
            and comprehensive automated archival analytics in one cohesive workspace.
          </p>
        </section>

        {/* 3-Role Interactive Cards */}
        <section className="portal-roles-container" aria-label="Portal access roles">
          <div className="portal-roles-grid">
            {/* Teacher Card */}
            <Link href="/teacher/login" className="portal-card role-teacher" id="role-card-teacher">
              <div>
                <div className="portal-card-header">
                  <div className="portal-card-icon">
                    <i className="fas fa-chalkboard-teacher"></i>
                  </div>
                  <span className="portal-role-tag">Educator</span>
                </div>
                <div className="portal-card-body">
                  <h3>Teacher Portal</h3>
                  <p>
                    Submit period roll-calls, tag excused or late statuses, and transmit instant student absence manifests.
                  </p>
                  <div className="portal-feature-pills">
                    <span className="portal-pill">
                      <i className="fas fa-check-circle"></i> Quick Roll Call
                    </span>
                    <span className="portal-pill">
                      <i className="fas fa-layer-group"></i> Multi-Division
                    </span>
                    <span className="portal-pill">
                      <i className="fas fa-paper-plane"></i> Instant Push
                    </span>
                  </div>
                </div>
              </div>
              <div className="portal-cta-btn">
                <span>Enter Teacher Workspace</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </Link>

            {/* Supervisor Card */}
            <Link href="/supervisor/login" className="portal-card role-supervisor" id="role-card-supervisor">
              <div>
                <div className="portal-card-header">
                  <div className="portal-card-icon">
                    <i className="fas fa-user-shield"></i>
                  </div>
                  <span className="portal-role-tag">Operations</span>
                </div>
                <div className="portal-card-body">
                  <h3>Supervisor Dashboard</h3>
                  <p>
                    Live division monitoring, automated unexcused absence alerts, and dynamic classroom roster inspection.
                  </p>
                  <div className="portal-feature-pills">
                    <span className="portal-pill">
                      <i className="fas fa-tower-broadcast"></i> Live Feed
                    </span>
                    <span className="portal-pill">
                      <i className="fas fa-table-columns"></i> Cards &amp; Table
                    </span>
                    <span className="portal-pill">
                      <i className="fas fa-filter"></i> Division Scopes
                    </span>
                  </div>
                </div>
              </div>
              <div className="portal-cta-btn">
                <span>Enter Supervisor Control</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* Modern Glass Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-left">
          <div className="portal-footer-logos">
            <img
              src="/logo 1.png"
              alt="School Emblem"
              className="portal-footer-logo-img"
              loading="lazy"
            />
            <img
              src="/logo 2.png"
              alt="RHTI Emblem"
              className="portal-footer-logo-img"
              loading="lazy"
            />
          </div>
          <span className="portal-footer-copy">
            &copy; 2026 EduPresence IQ. Educational Attendance Platform.
          </span>
        </div>

        <div className="portal-footer-links">
          <Link href="/about" className="portal-footer-link">
            <i className="fas fa-info-circle"></i>
            <span>About Platform &amp; Team</span>
          </Link>
          <span style={{ color: 'var(--border-strong)' }}>&bull;</span>
          <span className="portal-footer-link" style={{ cursor: 'default' }}>
            <i className="fas fa-shield-halved"></i>
            <span>End-to-End Encrypted</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
