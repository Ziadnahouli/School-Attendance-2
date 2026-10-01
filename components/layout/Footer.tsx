'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer dashboard-footer" role="contentinfo">
      <div className="footer-content footer-center">
        <div className="footer-brand-logos">
          <Link href="/about" title="Learn more About Us" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img
              src="/logo 1.png"
              alt="School Emblem"
              className="dashboard-footer-logo footer-logo-about"
              style={{ height: '36px', maxHeight: '36px', width: 'auto', objectFit: 'contain', display: 'block' }}
              loading="lazy"
            />
          </Link>
          <img
            src="/logo 2.png"
            alt="RHTI Logo"
            className="dashboard-footer-logo footer-logo-rhti"
            style={{ height: '36px', maxHeight: '36px', width: 'auto', objectFit: 'contain', display: 'block' }}
            loading="lazy"
          />
        </div>
        <div className="footer-info footer-text">
          <Link href="/about" className="footer-about-link">
            About System &amp; Team
          </Link>
          <span className="footer-divider">&bull;</span>
          <span className="footer-copy">&copy; 2026 RHTI Attendance Intelligence</span>
        </div>
      </div>
    </footer>
  );
}
