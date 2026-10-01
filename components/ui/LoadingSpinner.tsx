'use client';

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ message = 'Loading...', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`loading visible ${className}`} aria-live="polite" aria-busy="true">
      <div className="spinner"></div>
      <span>{message}</span>
    </div>
  );
}
