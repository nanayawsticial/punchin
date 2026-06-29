'use client';

import React from 'react';

export function SkeletonCard() {
  return (
    <div className="card" style={{ pointerEvents: 'none' }}>
      <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 'var(--radius-full)' }} />
        <div className="skeleton" style={{ height: 32, width: 100, borderRadius: 'var(--radius-full)' }} />
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map((n) => (
        <div key={n} className="card card-sm" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton" style={{ height: 40, width: 40, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 16, width: '30%', marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 12, width: '50%' }} />
          </div>
          <div className="skeleton" style={{ height: 24, width: 70 }} />
        </div>
      ))}
    </div>
  );
}
