'use client';

import React from 'react';
import type { AttendanceRecord } from '@/types';
import { StatusBadge } from './StatusBadge';
import { Clock, MapPin, Edit, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AttendanceCardProps {
  record: AttendanceRecord;
  onEdit?: () => void;
  showUser?: boolean;
}

export function AttendanceCard({ record, onEdit, showUser = false }: AttendanceCardProps) {
  const { isManager } = useAuth();

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card card-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showUser && record.user && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justify-content: 'center',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-1)'
              }}
            >
              {record.user.avatar ? (
                <img
                  src={record.user.avatar}
                  alt={record.user.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                record.user.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <div>
            <div className="font-bold truncate" style={{ fontSize: 'var(--text-sm)' }}>
              {showUser && record.user ? record.user.name : record.date}
            </div>
            {showUser && record.user && (
              <div className="text-muted truncate" style={{ fontSize: 'var(--text-xs)' }}>
                {record.user.department?.name || 'General'} • {record.date}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={record.status} />
          {isManager && onEdit && (
            <button className="btn-icon" onClick={onEdit} aria-label="Edit timesheet record">
              <Edit size={14} />
            </button>
          )}
        </div>
      </div>

      <hr className="divider" style={{ margin: '4px 0' }} />

      <div className="grid-3" style={{ textAlign: 'center' }}>
        <div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>In</div>
          <div className="font-semibold" style={{ fontSize: 'var(--text-sm)', color: 'var(--navy)' }}>
            {formatTime(record.clockIn)}
          </div>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Out</div>
          <div className="font-semibold" style={{ fontSize: 'var(--text-sm)', color: 'var(--navy)' }}>
            {formatTime(record.clockOut)}
          </div>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Hours</div>
          <div className="badge badge-accent" style={{ display: 'inline-flex', marginTop: 2 }}>
            {record.hoursWorked !== null ? `${record.hoursWorked} hrs` : '--'}
          </div>
        </div>
      </div>

      {(record.notes || record.correctionReason) && (
        <div
          className="card-sm"
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          {record.notes && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <FileText size={12} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span className="font-semibold">Notes:</span> {record.notes}
              </div>
            </div>
          )}
          {record.correctionReason && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', color: 'var(--warning)' }}>
              <AlertCircle size={12} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span className="font-semibold">Corrected:</span> {record.correctionReason} (by {record.correctedBy})
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline fallback for AlertCircle inside note view
function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-alert-circle"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
