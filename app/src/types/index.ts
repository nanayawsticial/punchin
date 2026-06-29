// ─── Core Types for PunchIn ─────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
export type AttendanceMethod = 'WEB' | 'HARDWARE' | 'MANUAL';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'EMERGENCY' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Organization {
  id: string;
  name: string;
  joinCode: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  color: string;
  organizationId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeCode: string;
  departmentId: string | null;
  department: Department | null;
  organizationId: string;
  organization?: Organization;
  avatar: string | null;
  phone: string | null;
  status: UserStatus;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  user?: User;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  status: AttendanceStatus;
  method: AttendanceMethod;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  correctedIn: string | null;
  correctedOut: string | null;
  correctionReason: string | null;
  correctedBy: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BiometricDevice {
  id: string;
  name: string;
  deviceType: string;
  serialNumber: string;
  ipAddress: string | null;
  location: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  apiKeyLast4: string | null;
  isActive: boolean;
  organizationId: string;
  pairingCode: string | null;
  pairingExpiresAt: string | null;
  pairedAt: string | null;
  createdAt: string;
}

export interface DeviceSyncLog {
  id: string;
  deviceId: string;
  employeeCode: string | null;
  userId: string | null;
  eventType: string;
  eventTime: string;
  terminalEventId: string | null;
  rawData: Record<string, unknown> | null;
  processed: boolean;
  createdAt: string;
}

export interface GeoFenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  organizationId: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  user?: User;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveStatus;
  reason: string | null;
  managerNotes: string | null;
  organizationId: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  userId: string;
  user?: User;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
}

export interface Notification {
  id: string;
  message: string;
  type: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  targetRole: string | null;
  userId: string | null;
  organizationId: string;
  createdAt: string;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  type: string;
  organizationId: string;
}

// ── API Response types ───────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PresenceData {
  present: AttendanceRecord[];
  late: AttendanceRecord[];
  absent: User[];
  onLeave: AttendanceRecord[];
}

export interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  avgHours: number;
  byDay: { date: string; present: number; absent: number; late: number }[];
}
