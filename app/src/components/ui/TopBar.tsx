'use client';

import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Sun, Moon, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { notificationsApi } from '@/lib/api';
import { useSocket } from '@/lib/socket-context';
import type { Notification } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export function TopBar() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);

  // Initialize theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark-theme');
    setDarkTheme(isDark);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !darkTheme;
    setDarkTheme(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('punchin_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('punchin_theme', 'light');
    }
  };

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    notificationsApi.list().then(setNotifications).catch(console.error);
  }, [user]);

  // Real-time notifications
  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => {
      socket.off('notification:new');
    };
  }, [socket]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      try {
        await notificationsApi.markRead(n.id);
      } catch (e) {
        console.error(e);
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span>⏱️</span>
        <span style={{ color: 'var(--navy)', fontStyle: 'normal' }}>PunchIn</span>
      </div>

      <div className="topbar-actions">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          aria-label="Toggle theme"
          style={{ position: 'relative' }}
        >
          {darkTheme ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
              if (unreadCount > 0) markAllRead();
            }}
            className="btn-icon"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  background: 'var(--accent)',
                  borderRadius: '50%',
                }}
              />
            )}
          </button>

          <AnimatePresence>
            {showDropdown && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                  }}
                  onClick={() => setShowDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 320,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 0',
                    zIndex: 101,
                    maxHeight: 400,
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      padding: '0 16px 8px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      color: 'var(--navy)',
                    }}
                  >
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-3)',
                      }}
                    >
                      No new notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          fontSize: 'var(--text-sm)',
                          opacity: n.isRead ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>
                          {n.type === 'warning' ? '⚠️' : '🔔'}
                        </span>
                        <div>
                          <div>{n.message}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 4 }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar / profile button */}
        {user && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: 'var(--accent-text)',
              }}
            >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
        )}
      </div>
    </header>
  );
}
