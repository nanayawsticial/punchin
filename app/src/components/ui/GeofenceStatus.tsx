'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, ShieldCheck, ShieldAlert } from 'lucide-react';
import { geofenceApi } from '@/lib/api';

interface GeofenceStatusProps {
  onLocationUpdate?: (coords: { latitude: number; longitude: number } | null) => void;
}

export function GeofenceStatus({ onLocationUpdate }: GeofenceStatusProps) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ valid: boolean; zoneName: string | null; distance: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });
        if (onLocationUpdate) onLocationUpdate({ latitude, longitude });

        try {
          const res = await geofenceApi.validate(latitude, longitude);
          setStatus({
            valid: res.valid,
            zoneName: res.zone?.name || null,
            distance: res.distance
          });
        } catch (e) {
          console.error(e);
          setError('Failed to validate location with server.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setError('Location permission denied or unavailable.');
        setLoading(false);
        if (onLocationUpdate) onLocationUpdate(null);
      },
      { enableHighAccuracy: true }
    );
  }, [onLocationUpdate]);

  if (loading) {
    return (
      <div className="card flex items-center gap-3" style={{ background: 'var(--bg-elevated)' }}>
        <Navigation size={18} className="btn-spinner" style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Locating position...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex items-center gap-3" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
        <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--danger)' }}>Geofence Alert</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)' }}>{error}</span>
        </div>
      </div>
    );
  }

  const isValid = status?.valid ?? false;

  return (
    <div
      className="card flex items-center gap-3"
      style={{
        background: isValid ? 'var(--success-soft)' : 'var(--warning-soft)',
        border: `1px solid ${isValid ? 'var(--success)' : 'var(--warning)'}`
      }}
    >
      {isValid ? (
        <ShieldCheck size={20} style={{ color: 'var(--success)' }} />
      ) : (
        <ShieldAlert size={20} style={{ color: 'var(--warning)' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: isValid ? 'var(--success)' : 'var(--warning)'
          }}
        >
          {isValid ? 'Within Authorized Zone' : 'Outside Authorized Zone'}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)' }}>
          {isValid
            ? `Office Terminal: ${status?.zoneName || 'Main Zone'}`
            : `You are ${status?.distance ? Math.round(status.distance) : '?'}m away from nearest office.`}
        </span>
      </div>
    </div>
  );
}
