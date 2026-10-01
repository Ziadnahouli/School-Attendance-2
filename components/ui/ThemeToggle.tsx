'use client';

import React, { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ThemeToggle({ className, style }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
    const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
    const initialTheme = saved || current || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    const handleThemeChange = () => {
      const active = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
      if (active) setTheme(active);
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('app-theme', nextTheme);
    } catch {
      // ignore storage errors
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  if (!mounted) {
    return (
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          ...style,
        }}
      />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className || ''}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        border: '1px solid var(--border-color, #e2e8f0)',
        backgroundColor: 'var(--card-background, #ffffff)',
        color: 'var(--text-color, #0f172a)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(8px)',
        fontSize: '15px',
        padding: 0,
        position: 'relative',
        ...style,
      }}
    >
      <i
        className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}
        style={{
          color: isDark ? '#f59e0b' : '#6366f1',
          transition: 'transform 0.3s ease, color 0.3s ease',
          transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  );
}
