'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { useToast } from '@/components/ui/Toast';
import { organizationApi, geofenceApi, holidaysApi } from '@/lib/api';
import type { Organization, GeoFenceZone, PublicHoliday } from '@/types';
import { Building, Map, Calendar, Copy, Check, Plus, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { showToast } = useToast();

  const [org, setOrg] = useState<Organization | null>(null);
  const [zones, setZones] = useState<GeoFenceZone[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Forms
  const [orgName, setOrgName] = useState('');
  const [zoneForm, setZoneForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radiusMeters: '100'
  });
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'PUBLIC'
  });

  const [savingOrg, setSavingOrg] = useState(false);
  const [savingZone, setSavingZone] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [o, z, h] = await Promise.all([
        organizationApi.get(),
        geofenceApi.list(),
        holidaysApi.list()
      ]);
      setOrg(o);
      setOrgName(o.name);
      setZones(z);
      setHolidays(h);
    } catch (e) {
      console.error(e);
      showToast('Failed to load settings.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleCopyCode = () => {
    if (!org) return;
    navigator.clipboard.writeText(org.joinCode);
    setCopied(true);
    showToast('Join code copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      await organizationApi.update({ name: orgName });
      showToast('Organization settings saved!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to save organization.', 'danger');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name || !zoneForm.latitude || !zoneForm.longitude) {
      showToast('Please fill out all zone details.', 'warning');
      return;
    }

    setSavingZone(true);
    try {
      await geofenceApi.create({
        name: zoneForm.name,
        latitude: parseFloat(zoneForm.latitude),
        longitude: parseFloat(zoneForm.longitude),
        radiusMeters: parseFloat(zoneForm.radiusMeters)
      });
      showToast('Geofence zone added!', 'success');
      setZoneForm({ name: '', latitude: '', longitude: '', radiusMeters: '100' });
      
      const z = await geofenceApi.list();
      setZones(z);
    } catch (e) {
      console.error(e);
      showToast('Failed to save geofence.', 'danger');
    } finally {
      setSavingZone(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.date) {
      showToast('Please fill out all holiday details.', 'warning');
      return;
    }

    setSavingHoliday(true);
    try {
      await holidaysApi.create(holidayForm);
      showToast('Holiday added!', 'success');
      setHolidayForm({ name: '', date: '', type: 'PUBLIC' });
      
      const h = await holidaysApi.list();
      setHolidays(h);
    } catch (e) {
      console.error(e);
      showToast('Failed to save holiday.', 'danger');
    } finally {
      setSavingHoliday(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      await holidaysApi.remove(id);
      showToast('Holiday deleted.', 'success');
      setHolidays(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error(e);
      showToast('Failed to delete holiday.', 'danger');
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginBottom: 4 }}>System Settings</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
            Configure organization settings, geofencing, and calendars.
          </p>
        </div>

        {/* Organization Config */}
        <div className="card flex flex-col gap-4">
          <h3 className="font-bold flex items-center gap-2" style={{ margin: 0, color: 'var(--navy)', fontSize: 'var(--text-lg)' }}>
            <Building size={20} />
            Organization Info
          </h3>

          <form onSubmit={handleUpdateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="orgName">Organization Name</label>
              <input
                id="orgName"
                type="text"
                className="input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Employee Join Code</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="input font-bold"
                  readOnly
                  value={org?.joinCode || ''}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--bg-elevated)' }}
                />
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="btn btn-ghost"
                  style={{ minHeight: 52, padding: '0 16px', borderRadius: 'var(--radius-sm)' }}
                >
                  {copied ? <Check size={20} style={{ color: 'var(--success)' }} /> : <Copy size={20} />}
                </button>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 4 }}>
                Provide this code to employees so they can self-register into your organization directory.
              </span>
            </div>

            <button type="submit" disabled={savingOrg} className="btn btn-primary" style={{ width: 'fit-content' }}>
              {savingOrg ? <div className="btn-spinner" /> : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Geofence zones */}
        <div className="card flex flex-col gap-4">
          <h3 className="font-bold flex items-center gap-2" style={{ margin: 0, color: 'var(--navy)', fontSize: 'var(--text-lg)' }}>
            <Map size={20} />
            Office Geofence Zones
          </h3>

          {zones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {zones.map((zone) => (
                <div key={zone.id} className="card card-sm flex items-center justify-between" style={{ background: 'var(--bg-page)' }}>
                  <div>
                    <div className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{zone.name}</div>
                    <div className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                      Coords: {zone.latitude}, {zone.longitude} • Radius: {zone.radiusMeters}m
                    </div>
                  </div>
                  <span className="badge badge-online">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />

          <form onSubmit={handleAddZone} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="zoneName">Zone Name</label>
              <input
                id="zoneName"
                type="text"
                placeholder="e.g. Headquarters Office"
                className="input"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label" htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 5.6037"
                  className="input"
                  value={zoneForm.latitude}
                  onChange={(e) => setZoneForm({ ...zoneForm, latitude: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. -0.1870"
                  className="input"
                  value={zoneForm.longitude}
                  onChange={(e) => setZoneForm({ ...zoneForm, longitude: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="radius">Radius (meters)</label>
              <input
                id="radius"
                type="number"
                placeholder="100"
                className="input"
                value={zoneForm.radiusMeters}
                onChange={(e) => setZoneForm({ ...zoneForm, radiusMeters: e.target.value })}
              />
            </div>

            <button type="submit" disabled={savingZone} className="btn btn-primary" style={{ width: 'fit-content' }}>
              {savingZone ? <div className="btn-spinner" /> : <><Plus size={18} /> Add Zone</>}
            </button>
          </form>
        </div>

        {/* Public holidays */}
        <div className="card flex flex-col gap-4">
          <h3 className="font-bold flex items-center gap-2" style={{ margin: 0, color: 'var(--navy)', fontSize: 'var(--text-lg)' }}>
            <Calendar size={20} />
            Public Holidays
          </h3>

          {holidays.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {holidays.map((h) => (
                <div key={h.id} className="card card-sm flex items-center justify-between" style={{ background: 'var(--bg-page)' }}>
                  <div>
                    <div className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{h.name}</div>
                    <div className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                      Date: {h.date}
                    </div>
                  </div>
                  <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deleteHoliday(h.id)} aria-label="Delete holiday">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />

          <form onSubmit={handleAddHoliday} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="holidayName">Holiday Name</label>
              <input
                id="holidayName"
                type="text"
                placeholder="e.g. Christmas Day"
                className="input"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="holidayDate">Date</label>
              <input
                id="holidayDate"
                type="date"
                className="input"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              />
            </div>

            <button type="submit" disabled={savingHoliday} className="btn btn-primary" style={{ width: 'fit-content' }}>
              {savingHoliday ? <div className="btn-spinner" /> : <><Plus size={18} /> Add Holiday</>}
            </button>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
