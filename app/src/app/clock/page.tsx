'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { ClockButton } from '@/components/ui/ClockButton';
import { LiveClock } from '@/components/ui/LiveClock';
import { GeofenceStatus } from '@/components/ui/GeofenceStatus';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { attendanceApi } from '@/lib/api';
import type { AttendanceRecord } from '@/types';

export default function ClockPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchTodayRecord = async () => {
    if (!user) return;
    try {
      const records = await attendanceApi.timesheets({
        userId: user.id,
        startDate: todayStr,
        endDate: todayStr
      });
      const activeRecord = records.find((r: AttendanceRecord) => r.date === todayStr && r.clockIn);
      setTodayRecord(activeRecord || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayRecord();
  }, [user]);

  const handleClockIn = async () => {
    try {
      const res = await attendanceApi.clockIn({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        notes: 'Clocked in via full screen clock page'
      });
      setTodayRecord(res.record);
      showToast('Successfully clocked in!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Clock In failed.', 'danger');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await attendanceApi.clockOut();
      setTodayRecord(res.record);
      showToast('Successfully clocked out!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Clock Out failed.', 'danger');
    }
  };

  const isClockedIn = !!todayRecord && !todayRecord.clockOut;

  return (
    <PageWrapper>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          minHeight: 'calc(100vh - var(--topbar-height) - var(--bottomnav-height) - 48px)',
          padding: '16px 0'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <LiveClock />
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>
          <GeofenceStatus onLocationUpdate={setCoords} />
        </div>

        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px'
          }}
        >
          {loading ? (
            <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
          ) : (
            <ClockButton
              isClockedIn={isClockedIn}
              clockInTime={todayRecord?.clockIn || null}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
            />
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
