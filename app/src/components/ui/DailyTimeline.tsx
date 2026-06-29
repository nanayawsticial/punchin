'use client';

import React from 'react';
import type { AttendanceRecord } from '@/types';
import { Clock } from 'lucide-react';

interface DailyTimelineProps {
  records: AttendanceRecord[];
}

export function DailyTimeline({ records }: DailyTimelineProps) {
  if (!records || records.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>
        No check-ins recorded for today.
      </div>
    );
  }

  const sorted = [...records].sort((a, b) => {
    const timeA = a.clockIn ? new Date(a.clockIn).getTime() : 0;
    const timeB = b.clockIn ? new Date(b.clockIn).getTime() : 0;
    return timeA - timeB;
  });

  return (
    <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Timeline track vertical line */}
      <div
        style={{
          position: 'absolute',
          left: 7,
          top: 8,
          bottom: 8,
          width: 2,
          background: 'var(--border)',
        }}
      />

      {sorted.map((record, index) => {
        const checkInTime = record.clockIn
          ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null;
        const checkOutTime = record.clockOut
          ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null;

        return (
          <div key={record.id || index} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Dot */}
            <div
              style={{
                position: 'absolute',
                left: -21,
                top: 6,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: record.status === 'LATE' ? 'var(--warning)' : 'var(--success)',
                border: '3px solid var(--bg-surface)',
                boxShadow: 'var(--shadow-sm)'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="font-bold" style={{ fontSize: 'var(--text-sm)', color: 'var(--navy)' }}>
                {checkInTime || 'Unregistered'}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Clock In</span>
              <span className={`badge ${record.status === 'LATE' ? 'badge-late' : 'badge-present'}`} style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
                {record.status}
              </span>
            </div>

            {checkOutTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className="font-bold" style={{ fontSize: 'var(--text-sm)', color: 'var(--navy)' }}>
                  {checkOutTime}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Clock Out</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)' }}>
                  ({record.hoursWorked} hrs worked)
                </span>
              </div>
            )}

            {record.notes && (
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-2)',
                  background: 'var(--bg-page)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: 4,
                  width: 'fit-content'
                }}
              >
                📝 {record.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
