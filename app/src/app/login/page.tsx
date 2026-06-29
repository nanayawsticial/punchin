'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Building, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, signup, join, loading } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'login' | 'signup' | 'join'>('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    joinCode: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
        showToast('Welcome back to PunchIn!', 'success');
      } else if (tab === 'signup') {
        await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          organizationName: form.organizationName
        });
        showToast('Organization created successfully!', 'success');
      } else if (tab === 'join') {
        await join({
          name: form.name,
          email: form.email,
          password: form.password,
          joinCode: form.joinCode
        });
        showToast('Successfully joined organization!', 'success');
      }
      router.replace('/dashboard');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Authentication failed. Please try again.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--bg-page)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background visual graphics */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(232, 96, 60, 0.04)',
          top: '-10%',
          right: '-10%',
          zIndex: 0
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(27, 46, 75, 0.03)',
          bottom: '-10%',
          left: '-10%',
          zIndex: 0
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card"
        style={{
          maxWidth: 440,
          width: '100%',
          zIndex: 1,
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 48 }}>⏱️</span>
          <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginTop: 12 }}>PunchIn</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Attendance & Biometrics Ecosystem
          </p>
        </div>

        {/* Auth Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            padding: 4,
            borderRadius: 'var(--radius-full)',
            marginBottom: 24
          }}
        >
          {(['login', 'join', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="btn"
              style={{
                flex: 1,
                minHeight: 38,
                padding: '8px 12px',
                fontSize: 'var(--text-xs)',
                borderRadius: 'var(--radius-full)',
                background: tab === t ? 'var(--bg-surface)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-2)',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {t === 'login' && 'Login'}
              {t === 'join' && 'Join Org'}
              {t === 'signup' && 'Register Org'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tab !== 'login' && (
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. John Doe"
                className="input"
                required
                value={form.name}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@organization.com"
              className="input"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="input"
              required
              value={form.password}
              onChange={handleChange}
            />
          </div>

          {tab === 'signup' && (
            <div className="input-group">
              <label className="input-label" htmlFor="organizationName">Organization Name</label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="e.g. STEMAIDE Africa"
                className="input"
                required
                value={form.organizationName}
                onChange={handleChange}
              />
            </div>
          )}

          {tab === 'join' && (
            <div className="input-group">
              <label className="input-label" htmlFor="joinCode">Join Code</label>
              <input
                id="joinCode"
                name="joinCode"
                type="text"
                placeholder="6-character alphanumeric code"
                className="input"
                required
                value={form.joinCode}
                onChange={handleChange}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
          >
            {submitting ? (
              <div className="btn-spinner" />
            ) : (
              <>
                {tab === 'login' && <LogIn size={18} />}
                {tab === 'join' && <UserPlus size={18} />}
                {tab === 'signup' && <Building size={18} />}
                {tab === 'login' ? 'Sign In' : tab === 'join' ? 'Join & Clock In' : 'Create Organization'}
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          <Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Secure Enterprise Cryptographic Authentication
        </div>
      </motion.div>
    </div>
  );
}
