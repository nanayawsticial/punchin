'use client';

import React, { useEffect, useState } from 'react';

export function LiveClock() {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDate(
        now.toLocaleDateString([], {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="clock-hero mono">{time || '--:--:--'}</div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.02em' }}>
        {date || '---, --- --, ----'}
      </div>
    </div>
  );
}
