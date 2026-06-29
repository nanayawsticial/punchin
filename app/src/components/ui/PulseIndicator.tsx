'use client';

import React from 'react';
import type { DeviceStatus } from '@/types';

interface PulseIndicatorProps {
  status: DeviceStatus;
}

export function PulseIndicator({ status }: PulseIndicatorProps) {
  let indicatorClass = 'offline';
  if (status === 'ONLINE') indicatorClass = 'online';
  else if (status === 'OFFLINE') indicatorClass = 'offline';
  else if (status === 'UNKNOWN') indicatorClass = 'connecting';

  return (
    <div className={`pulse-dot ${indicatorClass}`} />
  );
}
