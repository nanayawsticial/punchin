'use client';

import React, { useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { useAuth } from '@/lib/auth-context';
import { usersApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { LogOut, Save, User, Shield, Phone, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await usersApi.update(user.id, form);
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update profile.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logged out successfully.', 'success');
      router.replace('/login');
    } catch (e) {
      console.error(e);
      showToast('Logout failed.', 'danger');
    }
  };

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginBottom: 4 }}>My Profile</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
            Manage account info and preferences.
          </p>
        </div>

        <div className="card flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                fontWeight: 800,
                fontSize: 'var(--text-2xl)'
              }}
            >
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt={form.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                form.name.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <h3 style={{ margin: 0, color: 'var(--navy)' }}>{form.name}</h3>
              <div className="badge badge-accent" style={{ marginTop: 4 }}>
                {user?.role}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-3)' }} />
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="input"
                  style={{ paddingLeft: 44 }}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-3)' }} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: 44 }}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="phone">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-3)' }} />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="input"
                  style={{ paddingLeft: 44 }}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="avatar">Profile Avatar URL</label>
              <input
                id="avatar"
                name="avatar"
                type="url"
                placeholder="https://example.com/avatar.png"
                className="input"
                value={form.avatar}
                onChange={(e) => setForm({ ...form, avatar: e.target.value })}
              />
            </div>

            <div className="grid-2" style={{ marginTop: 8 }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? <div className="btn-spinner" /> : <><Save size={18} /> Save Details</>}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                <LogOut size={18} /> Log Out
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
