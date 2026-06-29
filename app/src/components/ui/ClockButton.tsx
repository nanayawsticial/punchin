'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, LogOut, Check } from 'lucide-react';

interface ClockButtonProps {
  isClockedIn: boolean;
  clockInTime: string | null;
  onClockIn: () => Promise<void>;
  onClockOut: () => Promise<void>;
}

export function ClockButton({ isClockedIn, clockInTime, onClockIn, onClockOut }: ClockButtonProps) {
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [showSuccess, setShowSuccess] = useState(false);

  // Elapsed timer when clocked in
  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;

    const start = new Date(clockInTime).getTime();
    
    const updateTimer = () => {
      const diff = Date.now() - start;
      const secs = Math.floor(diff / 1000) % 60;
      const mins = Math.floor(diff / (1000 * 60)) % 60;
      const hrs = Math.floor(diff / (1000 * 60 * 60));

      const format = (n: number) => n.toString().padStart(2, '0');
      setElapsed(`${format(hrs)}:${format(mins)}:${format(secs)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isClockedIn) {
        await onClockOut();
      } else {
        await onClockIn();
        // Success celebration
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        {/* Success Ripple Effect */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'var(--success)',
                zIndex: 2,
              }}
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* The Action Button */}
        <button
          onClick={handleClick}
          disabled={loading}
          className={`clock-fab ${isClockedIn ? 'clock-out-btn' : 'clock-in-btn'}`}
          style={{ width: '100%', height: '100%', zIndex: 3 }}
        >
          {loading ? (
            <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
          ) : showSuccess ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{ color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <Check size={48} strokeWidth={3} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginTop: 4 }}>Done!</span>
            </motion.div>
          ) : isClockedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent)' }}>
                {elapsed}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                Active Shift
              </span>
              <LogOut size={24} style={{ marginTop: 8 }} />
              <span className="clock-fab-label" style={{ fontSize: 'var(--text-sm)' }}>Clock Out</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Fingerprint size={48} className="clock-fab-icon" />
              <span className="clock-fab-label">Clock In</span>
            </div>
          )}
        </button>

        {/* Small burst particles on success */}
        {showSuccess && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
            {[...Array(12)].map((_, i) => {
              const angle = (i * 360) / 12;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * 120;
              const y = Math.sin(rad) * 120;
              return (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--success)',
                  }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{ x, y, scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              );
            })}
          </div>
        )}
      </div>

      {isClockedIn && clockInTime && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', fontWeight: 600 }}>
          Clocked in at <span className="font-bold">{new Date(clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
    </div>
  );
}
