'use client';

import React, { useEffect, useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar, BottomTabBar } from './Navigation';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/socket-context';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

interface PageWrapperProps {
  children: React.ReactNode;
  noSidebar?: boolean;
}

export function PageWrapper({ children, noSidebar = false }: PageWrapperProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-page)'
        }}
      >
        <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  const { connected } = useSocket();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (connected) {
      setShowBanner(false);
    } else {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connected]);

  if (!user) return null;

  return (
    <div className="page-root">
      <TopBar />
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              background: 'var(--danger-soft)',
              borderBottom: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '6px 12px',
              zIndex: 99
            }}
          >
            <WifiOff size={14} /> Connection lost. Reconnecting to live services...
          </motion.div>
        )}
      </AnimatePresence>
      {!noSidebar && <Sidebar />}
      <main className={`main-content ${noSidebar ? 'no-sidebar' : ''}`}>
        {children}
      </main>
      {!noSidebar && <BottomTabBar />}
    </div>
  );
}
