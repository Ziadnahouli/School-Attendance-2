'use client';

import React from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function AboutPage() {
  return (
    <div className="about-page-wrapper">
      <div className="about-card">
        <div className="about-header-top">
          <div className="about-title-brand">
            <div className="about-title-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div>
              <h1>Driven by Innovation at RHIT</h1>
              <p className="subtitle">School Attendance Intelligence Management System</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <p>
          We are a dedicated group of students from <strong>Rafic Hariri Technical Institute</strong>, united by a
          passion for modern software engineering and a commitment to transforming daily school attendance operations.
          This platform is the direct culmination of practical computer science principles applied to real-world educational infrastructure.
        </p>

        <p>
          Our core objective is to deliver an ultra-responsive, zero-friction tool tailored for all
          school stakeholders—<strong>simplifying classroom roll-call, providing supervisors with instant division transparency, and delivering automated executive analytics and archival reporting.</strong>
        </p>

        <p>
          This initiative represents our vision of{' '}
          <strong>leveraging resilient cloud architecture to solve critical day-to-day school workflows</strong>.
          Every feature, from sub-second real-time sync to automated PDF/CSV compliance exports, reflects engineering excellence and purpose-driven design.
        </p>

        <div className="team-section">
          <h2>
            <i className="fas fa-users-gear"></i> Engineering &amp; Development Team
          </h2>

          <div className="about-team-grid">
            <div className="team-member-card">
              <div className="team-member-avatar">
                <i className="fas fa-code"></i>
              </div>
              <div className="team-member-info">
                <div className="name">Ziad Nahouli</div>
                <a
                  href="mailto:ziad.nahouli@rhhs.edu.lb"
                  style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', fontSize: '0.8rem' }}
                >
                  ziad.nahouli@rhhs.edu.lb
                </a>
              </div>
            </div>

            <div className="team-member-card">
              <div className="team-member-avatar">
                <i className="fas fa-terminal"></i>
              </div>
              <div className="team-member-info">
                <div className="name">Baraa El Mallah</div>
                <a
                  href="mailto:baraa.elmallah@rhhs.edu.lb"
                  style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', fontSize: '0.8rem' }}
                >
                  baraa.elmallah@rhhs.edu.lb
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="about-actions">
          <Link href="/" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            <span>Return to Portal</span>
          </Link>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            &copy; 2026 RHIT Innovation Lab
          </span>
        </div>
      </div>
    </div>
  );
}
