'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { CalendarStrip } from '@/components/ui/CalendarStrip';
import { AttendanceCard } from '@/components/ui/AttendanceCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { attendanceApi } from '@/lib/api';
import type { AttendanceRecord } from '@/types';
import { Plus, Edit2, AlertCircle } from 'lucide-react';

export default function HistoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Correction request states
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [targetRecord, setTargetRecord] = useState<AttendanceRecord | null>(null);
  const [form, setForm] = useState({
    clockIn: '',
    clockOut: '',
    correctionReason: '',
    notes: '',
    status: 'PRESENT'
  });
  const [saving, setSaving] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.list({ date: selectedDate });
      setRecords(data);
    } catch (e) {
      console.error(e);
      showToast('Failed to load history records.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedDate, user]);

  const openCorrectionSheet = (record: AttendanceRecord) => {
    setTargetRecord(record);
    const formatTimeForInput = (isoString: string | null) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      // Format to yyyy-MM-ddThh:mm
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setForm({
      clockIn: formatTimeForInput(record.clockIn),
      clockOut: formatTimeForInput(record.clockOut),
      correctionReason: record.correctionReason || '',
      notes: record.notes || '',
      status: record.status
    });
    setIsSheetOpen(true);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRecord) return;
    if (!form.correctionReason) {
      showToast('Correction reason is required', 'warning');
      return;
    }

    setSaving(true);
    try {
      await attendanceApi.correct(targetRecord.id, {
        clockIn: form.clockIn ? new Date(form.clockIn).toISOString() : undefined,
        clockOut: form.clockOut ? new Date(form.clockOut).toISOString() : undefined,
        correctionReason: form.correctionReason,
        notes: form.notes || undefined,
        status: form.status
      });

      showToast('Attendance record corrected successfully!', 'success');
      setIsSheetOpen(false);
      fetchRecords();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to submit correction.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginBottom: 4 }}>History & Logs</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
            View and manage your attendance timelines.
          </p>
        </div>

        {/* Horizontal Calendar Strip */}
        <CalendarStrip selectedDate={selectedDate} onChange={setSelectedDate} />

        {/* Selected Date Records */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <SkeletonList />
          ) : records.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: 'var(--text-3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={32} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                No attendance logs found for this date.
              </span>
            </div>
          ) : (
            records.map((rec) => (
              <AttendanceCard
                key={rec.id}
                record={rec}
                onEdit={() => openCorrectionSheet(rec)}
                showUser={user?.role !== 'EMPLOYEE'} // Show name if manager viewing list
              />
            ))
          )}
        </div>

        {/* Correction request sheet */}
        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Manual Corrections"
          subtitle="Admin & Manager Timesheet Override"
        >
          <form onSubmit={handleCorrectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="clockIn">Clock In Time</label>
              <input
                id="clockIn"
                name="clockIn"
                type="datetime-local"
                className="input"
                value={form.clockIn}
                onChange={(e) => setForm({ ...form, clockIn: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="clockOut">Clock Out Time</label>
              <input
                id="clockOut"
                name="clockOut"
                type="datetime-local"
                className="input"
                value={form.clockOut}
                onChange={(e) => setForm({ ...form, clockOut: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="status">Override Status</label>
              <select
                id="status"
                name="status"
                className="input-select input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="ABSENT">ABSENT</option>
                <option value="ON_LEAVE">ON LEAVE</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="correctionReason">Reason for Correction</label>
              <input
                id="correctionReason"
                name="correctionReason"
                type="text"
                placeholder="e.g. Forgot to punch out / RFID failure"
                className="input"
                required
                value={form.correctionReason}
                onChange={(e) => setForm({ ...form, correctionReason: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="notes">Audit Log Notes</label>
              <input
                id="notes"
                name="notes"
                type="text"
                placeholder="Additional notes..."
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%' }}>
              {saving ? <div className="btn-spinner" /> : 'Confirm Override'}
            </button>
          </form>
        </BottomSheet>
      </div>
    </PageWrapper>
  );
}
