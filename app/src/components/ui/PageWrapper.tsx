'use client';

import React, { useEffect } from 'react';
import { TopBar } from './TopBar';
import { Sidebar, BottomTabBar } from './Navigation';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

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

  if (!user) return null;

  return (
    <div className="page-root">
      <TopBar />
      {!noSidebar && <Sidebar />}
      <main className={`main-content ${noSidebar ? 'no-sidebar' : ''}`}>
        {children}
      </main>
      {!noSidebar && <BottomTabBar />}
    </div>
  );
}
