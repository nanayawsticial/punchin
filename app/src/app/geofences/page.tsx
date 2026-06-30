'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/components/ui/Toast';
import { geofenceApi } from '@/lib/api';
import type { GeoFenceZone } from '@/types';
import { MapPin, Plus, Edit2, Trash2, Crosshair, HelpCircle, Check, X } from 'lucide-react';
import GeofenceMap from '@/components/ui/GeofenceMap';

// Default center coordinates if map has no data (e.g. Accra, Ghana or somewhere general)
const DEFAULT_LAT = 5.6037;
const DEFAULT_LNG = -0.1870;

export default function GeofencesPage() {
  const { showToast } = useToast();

  const [zones, setZones] = useState<GeoFenceZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Form sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    radiusMeters: 100,
    isActive: true
  });
  
  const [saving, setSaving] = useState(false);

  // Active zone for visual mini-map display on select
  const [selectedZone, setSelectedZone] = useState<GeoFenceZone | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const data = await geofenceApi.list();
      setZones(data);
      if (data.length > 0 && !selectedZone) {
        setSelectedZone(data[0]);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load geofence zones.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LNG,
      radiusMeters: 100,
      isActive: true
    });
    setIsSheetOpen(true);
    
    // Auto-attempt current location on create
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(prev => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6))
          }));
        },
        (err) => console.log('Geolocation failed: ', err.message)
      );
    }
  };

  const handleOpenEdit = (zone: GeoFenceZone) => {
    setEditingId(zone.id);
    setForm({
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusMeters: zone.radiusMeters,
      isActive: zone.isActive
    });
    setIsSheetOpen(true);
  };

  const handleMapChange = (data: { lat: number; lng: number; radius: number }) => {
    setForm(prev => ({
      ...prev,
      latitude: parseFloat(data.lat.toFixed(6)),
      longitude: parseFloat(data.lng.toFixed(6))
    }));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'warning');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6))
        }));
        showToast('Location updated to current position!', 'success');
      },
      (err) => {
        console.error(err);
        showToast(`Could not retrieve location: ${err.message}`, 'danger');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.latitude === undefined || form.longitude === undefined) {
      showToast('Please specify a name and coordinates.', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await geofenceApi.update(editingId, form);
        showToast('Geofence zone updated successfully!', 'success');
        setSelectedZone(updated);
      } else {
        const created = await geofenceApi.create(form);
        showToast('Geofence zone created successfully!', 'success');
        setSelectedZone(created);
      }
      setIsSheetOpen(false);
      fetchZones();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save geofence zone.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this geofence zone?')) return;
    try {
      await geofenceApi.remove(id);
      showToast('Geofence zone deleted successfully.', 'success');
      if (selectedZone?.id === id) {
        setSelectedZone(null);
      }
      fetchZones();
    } catch (e) {
      console.error(e);
      showToast('Failed to delete geofence zone.', 'danger');
    }
  };

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginBottom: 4 }}>Geofences</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
              Authorized check-in regions. Employees must be inside these boundaries to clock in/out.
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} /> Add Geofence
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, ...({ '@media (min-width: 1024px)': { gridTemplateColumns: '1fr 1fr' } } as any) }} className="geofence-grid">
            
            {/* Left: Geofence List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {zones.length === 0 ? (
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
                  <MapPin size={48} style={{ color: 'var(--text-3)', strokeWidth: 1.2 }} />
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--navy)' }}>No geofences defined</div>
                  <p style={{ fontSize: 'var(--text-sm)', maxWidth: 300, margin: 0 }}>
                    Add geofence zones around your offices so employees can verify their attendance on-site.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleOpenCreate}>
                    Create Your First Zone
                  </button>
                </div>
              ) : (
                zones.map(zone => {
                  const isSelected = selectedZone?.id === zone.id;
                  return (
                    <div
                      key={zone.id}
                      className={`card ${isSelected ? 'active-card' : ''}`}
                      onClick={() => setSelectedZone(zone)}
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--accent)' : undefined,
                        borderWidth: isSelected ? 2 : 1,
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{zone.name}</span>
                          <span
                            className={`badge ${zone.isActive ? 'badge-online' : 'badge-offline'}`}
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                          >
                            {zone.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                          Radius: {zone.radiusMeters}m | Lat: {zone.latitude.toFixed(4)}, Lng: {zone.longitude.toFixed(4)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(zone);
                          }}
                          style={{ color: 'var(--text-3)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={(e) => handleDelete(zone.id, e)}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Selected Zone Map Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedZone ? (
                <div className="card" style={{ height: 450, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--navy)' }}>
                      Boundary Preview: {selectedZone.name}
                    </h3>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <GeofenceMap
                      lat={selectedZone.latitude}
                      lng={selectedZone.longitude}
                      radius={selectedZone.radiusMeters}
                      onChange={() => {}}
                      readOnly={true}
                    />
                  </div>
                </div>
              ) : zones.length > 0 ? (
                <div
                  className="card"
                  style={{
                    height: 450,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-3)',
                    textAlign: 'center'
                  }}
                >
                  <div>Select a geofence zone to preview boundary map</div>
                </div>
              ) : null}
            </div>

          </div>
        )}
      </div>

      {/* Form BottomSheet */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingId ? 'Edit Geofence Boundary' : 'Add Geofence Boundary'}
        subtitle="Provide a boundary center and radius. Drag the map marker or click to position the geofence."
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--navy)' }}>Boundary Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Head Office, West Wing, Warehouse"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--navy)' }}>Latitude</label>
              <input
                type="number"
                step="any"
                className="input"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--navy)' }}>Longitude</label>
              <input
                type="number"
                step="any"
                className="input"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          {/* Current Location Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGetCurrentLocation}
            style={{ width: 'fit-content', minHeight: 40, padding: '8px 16px', fontSize: 'var(--text-sm)' }}
          >
            <Crosshair size={16} /> Use My Current Location
          </button>

          {/* Radius Adjustment Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--navy)' }}>
                Geofence Radius (meters)
              </label>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#fa972d' }}>
                {form.radiusMeters} meters
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <input
                type="range"
                min="10"
                max="2000"
                step="10"
                style={{ flex: 1, accentColor: '#fa972d' }}
                value={form.radiusMeters}
                onChange={(e) => setForm({ ...form, radiusMeters: parseInt(e.target.value) || 100 })}
              />
              <input
                type="number"
                className="input"
                style={{ width: 80, minHeight: 36, padding: '4px 8px', fontSize: 'var(--text-sm)' }}
                value={form.radiusMeters}
                onChange={(e) => setForm({ ...form, radiusMeters: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>

          {/* Interactive Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--navy)' }}>
              Drag Marker to Move Center
            </label>
            <div style={{ height: 260, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <GeofenceMap
                lat={form.latitude}
                lng={form.longitude}
                radius={form.radiusMeters}
                onChange={handleMapChange}
              />
            </div>
          </div>

          {/* Active status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: '#fa972d' }}
            />
            <label htmlFor="isActive" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy)', cursor: 'pointer' }}>
              Enable this geofence zone immediately
            </label>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setIsSheetOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, background: '#fa972d', borderColor: '#fa972d' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Boundary'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </PageWrapper>
  );
}
