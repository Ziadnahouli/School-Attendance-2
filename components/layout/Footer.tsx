'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-center">
        <Link href="/about" title="Learn more About Us">
          <img
            src="/logo 1.png"
            alt="About Us"
            className="footer-logo-about"
            loading="lazy"
          />
        </Link>
        <img
          src="/logo 2.png"
          alt="RHTI Logo"
          className="footer-logo-rhti"
          loading="lazy"
        />
        <div className="footer-text">
          <Link href="/about">About Us</Link>
          <span>© 2025 RHTI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
