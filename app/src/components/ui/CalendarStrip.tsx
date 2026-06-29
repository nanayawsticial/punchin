'use client';

import React, { useRef, useEffect } from 'react';

interface CalendarStripProps {
  selectedDate: string; // yyyy-mm-dd
  onChange: (dateStr: string) => void;
}

export function CalendarStrip({ selectedDate, onChange }: CalendarStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  // Format date helper
  const formatDateStr = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  // Auto-scroll selected day into view
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector('.calendar-day.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDate]);

  return (
    <div className="calendar-strip" ref={containerRef} role="grid" aria-label="Select day">
      {days.map((d, index) => {
        const dateStr = formatDateStr(d);
        const isActive = dateStr === selectedDate;
        const dayName = d.toLocaleDateString([], { weekday: 'short' });
        const dayNum = d.getDate();

        // Check if weekend
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        return (
          <button
            key={index}
            className={`calendar-day ${isActive ? 'active' : ''}`}
            onClick={() => onChange(dateStr)}
            role="gridcell"
            aria-selected={isActive}
            aria-label={`${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}`}
          >
            <span className="day-name">{dayName}</span>
            <span className="day-num">{dayNum}</span>
            {isWeekend && (
              <span
                className="day-dot"
                style={{
                  background: isActive ? '#fff' : 'var(--text-3)',
                  opacity: 0.5,
                  marginTop: 2
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
