'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Clock, Users, Calendar, User, Settings, Cpu, CreditCard, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
 
 const NAV_ITEMS = [
   { href: '/dashboard', icon: Home,     label: 'Home' },
   { href: '/clock',     icon: Clock,    label: 'Clock' },
   { href: '/team',      icon: Users,    label: 'Team' },
   { href: '/history',   icon: Calendar, label: 'History' },
   { href: '/payroll',   icon: CreditCard, label: 'Payroll' },
   { href: '/profile',   icon: User,     label: 'Profile' },
 ];
 
 const ADMIN_ITEMS = [
   { href: '/devices',  icon: Cpu,      label: 'Devices' },
   { href: '/geofences', icon: MapPin,   label: 'Geofences' },
   { href: '/settings', icon: Settings, label: 'Settings' },
 ];

export function BottomTabBar() {
  const pathname = usePathname();
  const { isAdmin, isManager } = useAuth();

  const allItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ href: '/devices', icon: Cpu, label: 'Devices' }] : []),
    ...(isManager ? [{ href: '/geofences', icon: MapPin, label: 'Geofences' }] : []),
    ...(isAdmin ? [{ href: '/settings', icon: Settings, label: 'Settings' }] : []),
  ];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav-items">
        {allItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <motion.button
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                whileTap={{ scale: 0.9 }}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <motion.div
                  className="nav-icon-wrap"
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </motion.div>
                <motion.span
                  animate={isActive ? { opacity: 1 } : { opacity: 0.7 }}
                  style={{ fontSize: 'var(--text-xs)', lineHeight: 1 }}
                >
                  {label}
                </motion.span>
              </motion.button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, isManager } = useAuth();

  const allItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ href: '/devices', icon: Cpu, label: 'Devices' }] : []),
    ...(isManager ? [{ href: '/geofences', icon: MapPin, label: 'Geofences' }] : []),
    ...(isAdmin ? [{ href: '/settings', icon: Settings, label: 'Settings' }] : []),
  ];

  return (
    <aside className="sidebar" aria-label="Sidebar navigation">
      <div className="sidebar-section">Navigation</div>
      {allItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <motion.button
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
            </motion.button>
          </Link>
        );
      })}
    </aside>
  );
}
