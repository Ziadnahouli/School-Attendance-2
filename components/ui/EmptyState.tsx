'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  message: string;
}

export default function EmptyState({ icon = 'fas fa-bell-slash', message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <i className={icon} style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}
