'use client';

import React from 'react';
import type { AttendanceStatus } from '@/types';

interface PresenceAvatarProps {
  name: string;
  avatar: string | null;
  status: AttendanceStatus | 'OFFLINE';
  size?: number;
}

export function PresenceAvatar({ name, avatar, status, size = 36 }: PresenceAvatarProps) {
  let ringClass = 'absent';
  if (status === 'PRESENT' || status === 'HALF_DAY') ringClass = 'present';
  else if (status === 'LATE') ringClass = 'late';
  else if (status === 'ON_LEAVE') ringClass = 'leave';
  else if (status === 'OFFLINE') ringClass = 'absent';

  const initials = name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="avatar-wrap" style={{ width: size, height: size }}>
      <div className={`avatar-ring ${ringClass}`} />
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="avatar-img"
          style={{ width: size - 4, height: size - 4 }}
        />
      ) : (
        <div
          className="avatar-img"
          style={{
            width: size - 4,
            height: size - 4,
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size > 40 ? 'var(--text-lg)' : 'var(--text-xs)',
            fontWeight: 700,
            color: 'var(--text-2)',
            borderRadius: '50%'
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
