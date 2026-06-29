'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { DeviceCard } from '@/components/ui/DeviceCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/components/ui/Toast';
import { devicesApi } from '@/lib/api';
import type { BiometricDevice } from '@/types';
import { Cpu, Plus, Key, Terminal, Wifi } from 'lucide-react';

export default function DevicesPage() {
  const { showToast } = useToast();

  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);

  // Pairing Flow states
  const [isPairingSheetOpen, setIsPairingSheetOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingStatus, setPairingStatus] = useState<string>('Waiting for terminal to request code...');
  
  // Registering device details after pairing code matches
  const [confirmForm, setConfirmForm] = useState({
    code: '',
    name: '',
    location: ''
  });
  const [registering, setRegistering] = useState(false);

  // API Key provision show states
  const [rawApiKey, setRawApiKey] = useState<string | null>(null);
  const [isKeySheetOpen, setIsKeySheetOpen] = useState(false);

  // Terminals activity sync log states
  const [isLogsSheetOpen, setIsLogsSheetOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await devicesApi.list();
      setDevices(data);
    } catch (e) {
      console.error(e);
      showToast('Failed to load biometric terminals.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const triggerPairing = async () => {
    setPairingCode(null);
    setPairingStatus('Requesting pairing code from server...');
    setIsPairingSheetOpen(true);
    try {
      const res = await devicesApi.pairingCode();
      setPairingCode(res.code);
      setConfirmForm(prev => ({ ...prev, code: res.code }));
      setPairingStatus('Code generated! Please enter terminal name to complete registration.');
    } catch (e) {
      console.error(e);
      setPairingStatus('Failed to generate pairing code. Make sure server is online.');
      showToast('Pairing request failed.', 'danger');
    }
  };

  const handleConfirmPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmForm.name || !confirmForm.code) {
      showToast('Please fill out all fields', 'warning');
      return;
    }

    setRegistering(true);
    try {
      const res = await devicesApi.pair(confirmForm);
      showToast('Terminal paired successfully!', 'success');
      
      // Save raw API key to show admin once
      setRawApiKey(res.apiKey);
      setIsKeySheetOpen(true);
      
      setIsPairingSheetOpen(false);
      setConfirmForm({ code: '', name: '', location: '' });
      fetchDevices();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to complete pairing.', 'danger');
    } finally {
      setRegistering(false);
    }
  };

  const loadLogs = async (id: string) => {
    setLogsLoading(true);
    setIsLogsSheetOpen(true);
    try {
      const logs = await devicesApi.logs(id);
      setTerminalLogs(logs);
    } catch (e) {
      console.error(e);
      showToast('Failed to fetch terminal logs.', 'danger');
    } finally {
      setLogsLoading(false);
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device? This will invalidate all keys.')) return;
    try {
      await devicesApi.remove(id);
      showToast('Device removed.', 'success');
      fetchDevices();
    } catch (e) {
      console.error(e);
      showToast('Failed to remove device.', 'danger');
    }
  };

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginBottom: 4 }}>Biometric Terminals</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
              Manage RFID gates and physical check-in devices.
            </p>
          </div>

          <button className="btn btn-primary" onClick={triggerPairing}>
            <Plus size={18} /> Pair Device
          </button>
        </div>

        {/* Device List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
          </div>
        ) : devices.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--text-3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <Cpu size={36} />
            <div>
              <div className="font-bold" style={{ fontSize: 'var(--text-base)', color: 'var(--navy)' }}>
                No active terminals paired
              </div>
              <div style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                Click "Pair Device" above to connect your Raspberry Pi Pico gate.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onSync={fetchDevices}
                onLogs={() => loadLogs(device.id)}
                onDelete={() => deleteDevice(device.id)}
              />
            ))}
          </div>
        )}

        {/* Pairing drawer */}
        <BottomSheet
          isOpen={isPairingSheetOpen}
          onClose={() => setIsPairingSheetOpen(false)}
          title="Pair Physical Device"
          subtitle="Link RFID Terminal Ecosystem"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pairingCode && (
              <div
                style={{
                  background: 'var(--accent-soft)',
                  border: '1.5px dashed var(--accent)',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-text)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Enter this code on Pico Pairing screen
                </div>
                <div className="mono" style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginTop: 8 }}>
                  {pairingCode.slice(0, 3)} {pairingCode.slice(3)}
                </div>
              </div>
            )}

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', lineHeight: 1.5 }}>
              💡 {pairingStatus}
            </div>

            <form onSubmit={handleConfirmPair} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              <div className="input-group">
                <label className="input-label" htmlFor="deviceName">Device Name</label>
                <input
                  id="deviceName"
                  name="name"
                  type="text"
                  placeholder="e.g. Lobby Entrance Gate"
                  className="input"
                  required
                  value={confirmForm.name}
                  onChange={(e) => setConfirmForm({ ...confirmForm, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="deviceLocation">Location</label>
                <input
                  id="deviceLocation"
                  name="location"
                  type="text"
                  placeholder="e.g. Ground Floor Reception"
                  className="input"
                  value={confirmForm.location}
                  onChange={(e) => setConfirmForm({ ...confirmForm, location: e.target.value })}
                />
              </div>

              <button type="submit" disabled={registering} className="btn btn-primary" style={{ width: '100%' }}>
                {registering ? <div className="btn-spinner" /> : 'Confirm & Register'}
              </button>
            </form>
          </div>
        </BottomSheet>

        {/* API Key Provision Show Sheet */}
        <BottomSheet
          isOpen={isKeySheetOpen}
          onClose={() => setIsKeySheetOpen(false)}
          title="Terminal API Key"
          subtitle="Write to configuration file"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)', padding: 12, borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: 'var(--text-xs)', lineHeight: 1.4 }}>
              <strong>IMPORTANT:</strong> Copy this API key now. It will not be shown again for security. Place this key inside your Pico local_config.json as device_key.
            </div>

            <div
              className="mono"
              style={{
                background: 'var(--bg-elevated)',
                padding: 16,
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                wordBreak: 'break-all',
                userSelect: 'all',
                textAlign: 'center'
              }}
            >
              {rawApiKey}
            </div>

            <button className="btn btn-primary" onClick={() => setIsKeySheetOpen(false)} style={{ width: '100%' }}>
              I have copied it safely
            </button>
          </div>
        </BottomSheet>

        {/* Logs Drawer */}
        <BottomSheet
          isOpen={isLogsSheetOpen}
          onClose={() => setIsLogsSheetOpen(false)}
          title="Terminal Activity Logs"
          subtitle="Real-time device check-in streams"
        >
          {logsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
            </div>
          ) : terminalLogs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>
              No check-ins synced from this device yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 350, overflowY: 'auto' }}>
              {terminalLogs.map((log) => (
                <div key={log.id} className="card card-sm flex items-center justify-between" style={{ background: 'var(--bg-page)' }}>
                  <div>
                    <div className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                      {log.user ? log.user.name : `UID: ${log.employeeCode}`}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                      RFID Sync • {new Date(log.eventTime).toLocaleString()}
                    </div>
                  </div>
                  <span className={`badge ${log.eventType === 'clock_in' ? 'badge-present' : 'badge-late'}`}>
                    {log.eventType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </BottomSheet>
      </div>
    </PageWrapper>
  );
}
