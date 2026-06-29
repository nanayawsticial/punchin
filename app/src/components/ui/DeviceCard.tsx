'use client';

import React from 'react';
import type { BiometricDevice } from '@/types';
import { PulseIndicator } from './PulseIndicator';
import { Cpu, Trash, RefreshCw, Key, Terminal } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface DeviceCardProps {
  device: BiometricDevice;
  onSync?: () => void;
  onLogs?: () => void;
  onDelete?: () => void;
  onKey?: () => void;
}

export function DeviceCard({ device, onSync, onLogs, onDelete, onKey }: DeviceCardProps) {
  const { isAdmin } = useAuth();

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card device-card">
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-soft)',
          display: 'flex',
          alignItems: 'center',
          justify-content: 'center',
          color: 'var(--accent)',
          flexShrink: 0
        }}
      >
        <Cpu size={24} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-bold truncate" style={{ fontSize: 'var(--text-base)', color: 'var(--navy)', margin: 0 }}>
            {device.name}
          </h4>
          <PulseIndicator status={device.status} />
        </div>

        <div className="text-muted" style={{ fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div><span className="font-semibold">Serial:</span> {device.serialNumber}</div>
          <div><span className="font-semibold">Location:</span> {device.location || 'Not Specified'}</div>
          <div><span className="font-semibold">Last Seen:</span> {formatDate(device.lastSeenAt)}</div>
          {device.apiKeyLast4 && (
            <div><span className="font-semibold">Key:</span> •••• {device.apiKeyLast4}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {onSync && (
            <button className="btn-icon" onClick={onSync} title="Ping & Sync Terminal" aria-label="Sync terminal">
              <RefreshCw size={14} />
            </button>
          )}
          {onLogs && (
            <button className="btn-icon" onClick={onLogs} title="Terminal Logs" aria-label="View logs">
              <Terminal size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {isAdmin && onKey && (
            <button className="btn-icon" onClick={onKey} title="Provision API Key" aria-label="Generate API Key">
              <Key size={14} />
            </button>
          )}
          {isAdmin && onDelete && (
            <button className="btn-icon" onClick={onDelete} style={{ color: 'var(--danger)' }} title="Remove Terminal" aria-label="Delete terminal">
              <Trash size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
