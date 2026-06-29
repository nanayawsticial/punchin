'use client';

import React from 'react';
import { Check, AlertCircle, Calendar, Clock, HelpCircle } from 'lucide-react';
import type { AttendanceStatus } from '@/types';

interface StatusBadgeProps {
  status: AttendanceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'PRESENT':
      return (
        <span className="badge badge-present" role="status">
          <Check size={12} strokeWidth={3} />
          Present
        </span>
      );
    case 'LATE':
      return (
        <span className="badge badge-late" role="status">
          <Clock size={12} strokeWidth={3} />
          Late
        </span>
      );
    case 'ABSENT':
      return (
        <span className="badge badge-absent" role="status">
          <AlertCircle size={12} strokeWidth={3} />
          Absent
        </span>
      );
    case 'ON_LEAVE':
      return (
        <span className="badge badge-leave" role="status">
          <Calendar size={12} strokeWidth={2.5} />
          On Leave
        </span>
      );
    case 'HALF_DAY':
      return (
        <span className="badge badge-late" role="status">
          <Clock size={12} strokeWidth={2.5} />
          Half Day
        </span>
      );
    default:
      return (
        <span className="badge badge-leave" role="status">
          <HelpCircle size={12} strokeWidth={2.5} />
          Unknown
        </span>
      );
  }
}
