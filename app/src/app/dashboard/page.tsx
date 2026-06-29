'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { LiveClock } from '@/components/ui/LiveClock';
import { ClockButton } from '@/components/ui/ClockButton';
import { GeofenceStatus } from '@/components/ui/GeofenceStatus';
import { DailyTimeline } from '@/components/ui/DailyTimeline';
import { PresenceAvatar } from '@/components/ui/PresenceAvatar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { attendanceApi } from '@/lib/api';
import type { AttendanceRecord, PresenceData } from '@/types';
import { Users, Calendar, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [presence, setPresence] = useState<PresenceData>({
    present: [],
    late: [],
    absent: [],
    onLeave: []
  });
  const [stats, setStats] = useState({
    presentCount: 0,
    lateCount: 0,
    absentCount: 0
  });
  const [timeline, setTimeline] = useState<AttendanceRecord[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // Load today's attendance record & presence feed
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const records = await attendanceApi.timesheets({
        userId: user.id,
        startDate: todayStr,
        endDate: todayStr
      });
      const activeRecord = records.find((r: AttendanceRecord) => r.date === todayStr && r.clockIn);
      setTodayRecord(activeRecord || null);
      if (activeRecord) {
        setTimeline([activeRecord]);
      } else {
        setTimeline([]);
      }

      // Fetch live presence feed
      const pres = await attendanceApi.presence();
      setPresence(pres);

      setStats({
        presentCount: pres.present.length,
        lateCount: pres.late.length,
        absentCount: pres.absent.length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Real-time socket presence listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('attendance:clockIn', (data: { record: AttendanceRecord }) => {
      // Refresh presence feed
      loadDashboardData();
      showToast(`${data.record.user?.name || 'Someone'} clocked in`, 'success');
    });

    socket.on('attendance:clockOut', (data: { record: AttendanceRecord }) => {
      loadDashboardData();
      showToast(`${data.record.user?.name || 'Someone'} clocked out`, 'info');
    });

    socket.on('stats:update', (data: { present: number; late: number; absent: number }) => {
      setStats({
        presentCount: data.present,
        lateCount: data.late,
        absentCount: data.absent
      });
    });

    return () => {
      socket.off('attendance:clockIn');
      socket.off('attendance:clockOut');
      socket.off('stats:update');
    };
  }, [socket]);

  const handleClockIn = async () => {
    try {
      const res = await attendanceApi.clockIn({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        notes: 'Clocked in via web app dashboard'
      });
      setTodayRecord(res.record);
      setTimeline([res.record]);
      showToast('Successfully clocked in!', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Clock In failed.', 'danger');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await attendanceApi.clockOut();
      setTodayRecord(res.record);
      setTimeline([res.record]);
      showToast('Successfully clocked out. Have a good evening!', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Clock Out failed.', 'danger');
    }
  };

  const isClockedIn = !!todayRecord && !todayRecord.clockOut;

  // Banner status helpers
  let bannerClass = 'not-clocked';
  let bannerMessage = 'You are not clocked in yet.';
  if (isClockedIn) {
    bannerClass = 'clocked-in';
    bannerMessage = `Clocked in since ${new Date(todayRecord!.clockIn!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
  } else if (todayRecord?.clockOut) {
    bannerClass = 'clocked-out';
    bannerMessage = 'Shift completed for today.';
  }

  const allActivePresence = [...presence.present, ...presence.late];

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header Grid */}
        <div className="flex flex-col gap-2">
          <LiveClock />
        </div>

        {/* Status Banner */}
        <div className={`status-banner ${bannerClass}`}>
          <AlertCircle size={16} />
          <span>{bannerMessage}</span>
        </div>

        {/* Geofence verification */}
        <GeofenceStatus onLocationUpdate={setCoords} />

        {/* Hero Clock Button Section */}
        <div className="card flex flex-col items-center justify-center" style={{ padding: '40px 20px', minHeight: 300 }}>
          {loadingRecord ? (
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

        {/* Live Presence Feed Strip */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold flex items-center gap-2" style={{ margin: 0, color: 'var(--navy)' }}>
              <Users size={18} />
              Office Presence
            </h4>
            <span className="badge badge-accent">
              {allActivePresence.length} present today
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '6px 0',
              scrollbarWidth: 'none'
            }}
          >
            {allActivePresence.length === 0 ? (
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)', padding: '6px 0' }}>
                Nobody has clocked in yet today.
              </span>
            ) : (
              allActivePresence.map((record) => (
                <div
                  key={record.id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}
                >
                  <PresenceAvatar
                    name={record.user?.name || '?'}
                    avatar={record.user?.avatar || null}
                    status={record.status}
                    size={48}
                  />
                  <span className="truncate" style={{ fontSize: 10, maxWidth: 64, fontWeight: 600, color: 'var(--text-2)' }}>
                    {record.user?.name.split(' ')[0]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div className="stat-card">
            <span className="stat-card-number">{stats.presentCount}</span>
            <span className="stat-card-label">Present</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-number" style={{ color: 'var(--warning)' }}>{stats.lateCount}</span>
            <span className="stat-card-label">Late</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-number" style={{ color: 'var(--danger)' }}>{stats.absentCount}</span>
            <span className="stat-card-label">Absent</span>
          </div>
        </div>

        {/* Daily Timeline */}
        <div className="card flex flex-col gap-4">
          <h4 className="font-bold flex items-center gap-2" style={{ margin: 0, color: 'var(--navy)' }}>
            <Calendar size={18} />
            Today's Log
          </h4>
          <DailyTimeline records={timeline} />
        </div>
      </div>
    </PageWrapper>
  );
}
