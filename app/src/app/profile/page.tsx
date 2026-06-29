'use client';

import React, { useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { useAuth } from '@/lib/auth-context';
import { usersApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { LogOut, Save, User, Shield, Phone, Mail, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Toby',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sasha',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        avatar: form.avatar,
      };
      if (form.password.trim() !== '') {
        payload.password = form.password;
      }

      await usersApi.update(user.id, payload);
      showToast('Profile updated successfully!', 'success');
      setForm(prev => ({ ...prev, password: '' }));
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
              {form.avatar && (form.avatar.startsWith('http') || form.avatar.startsWith('/') || form.avatar.includes('.')) ? (
                <img
                  src={form.avatar}
                  alt={form.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                form.avatar || form.name.charAt(0).toUpperCase()
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
              <label className="input-label" htmlFor="password">New Password (leave blank to keep current)</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-3)' }} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter a new password..."
                  className="input"
                  style={{ paddingLeft: 44 }}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Select Profile Avatar</label>
              
              {/* Preset Avatars Grid */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', 
                  gap: 12, 
                  margin: '12px 0', 
                  padding: '8px',
                  background: 'var(--bg-elevated)', 
                  borderRadius: 'var(--radius-md)' 
                }}
              >
                {PRESET_AVATARS.map((url, idx) => {
                  const isSelected = form.avatar === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({ ...form, avatar: url })}
                      style={{
                        padding: 0,
                        border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                        borderRadius: '50%',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'border-color var(--dur-base) var(--ease-out)',
                        outline: 'none',
                        width: 52,
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img 
                        src={url} 
                        alt={`Avatar ${idx + 1}`} 
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    </button>
                  );
                })}
              </div>

              {/* Custom Input or Randomizer */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                <input
                  id="avatar"
                  name="avatar"
                  type="url"
                  placeholder="Custom avatar URL or Dicebear seed..."
                  className="input"
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                />
                
                <button
                  type="button"
                  onClick={() => {
                    const randomSeed = Math.random().toString(36).substring(7);
                    const randomUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomSeed}`;
                    setForm({ ...form, avatar: randomUrl });
                  }}
                  className="btn btn-ghost"
                  style={{ minHeight: 52, padding: '0 16px', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}
                >
                  Randomize
                </button>
              </div>
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
