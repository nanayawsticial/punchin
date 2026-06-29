import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('punchin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('punchin_refresh');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
        localStorage.setItem('punchin_token', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('punchin_token');
        localStorage.removeItem('punchin_refresh');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data: { name: string; email: string; password: string; organizationName: string }) =>
    api.post('/api/auth/signup', data).then(r => r.data),
  join: (data: { name: string; email: string; password: string; joinCode: string }) =>
    api.post('/api/auth/join', data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data).then(r => r.data),
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }).then(r => r.data),
  logout: (refreshToken: string) =>
    api.post('/api/auth/logout', { refreshToken }).then(r => r.data),
  me: () => api.get('/api/auth/me').then(r => r.data),
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/attendance', { params }).then(r => r.data),
  liveFeed: () => api.get('/api/attendance/live-feed').then(r => r.data),
  presence: () => api.get('/api/attendance/presence').then(r => r.data),
  stats: (params?: Record<string, string>) =>
    api.get('/api/attendance/stats', { params }).then(r => r.data),
  timesheets: (params?: Record<string, string>) =>
    api.get('/api/attendance/timesheets', { params }).then(r => r.data),
  clockIn: (data?: { latitude?: number; longitude?: number; notes?: string }) =>
    api.post('/api/attendance/clock-in', data || {}).then(r => r.data),
  clockOut: () => api.post('/api/attendance/clock-out', {}).then(r => r.data),
  correct: (id: string, data: { clockIn?: string; clockOut?: string; correctionReason: string; notes?: string; status?: string }) =>
    api.patch(`/api/attendance/${id}`, data).then(r => r.data),
};

// ── Devices ───────────────────────────────────────────────────────────────────
export const devicesApi = {
  list: () => api.get('/api/devices').then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/devices', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/devices/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/api/devices/${id}`).then(r => r.data),
  logs: (id: string) => api.get(`/api/devices/${id}/logs`).then(r => r.data),
  pairingCode: () => api.post('/api/devices/pairing-code').then(r => r.data),
  pairStatus: (code: string) =>
    api.get('/api/devices/pair/status', { params: { code } }).then(r => r.data),
  pair: (data: { code: string; name: string; location?: string }) =>
    api.post('/api/devices/pair', data).then(r => r.data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/users', { params }).then(r => r.data),
  get: (id: string) => api.get(`/api/users/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/users', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/users/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/api/users/${id}`).then(r => r.data),
};

// ── Departments ────────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: () => api.get('/api/departments').then(r => r.data),
  create: (data: { name: string; color?: string }) =>
    api.post('/api/departments', data).then(r => r.data),
};

// ── Leaves ────────────────────────────────────────────────────────────────────
export const leavesApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/leaves', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/leaves', data).then(r => r.data),
  update: (id: string, data: { status: string; managerNotes?: string }) =>
    api.patch(`/api/leaves/${id}`, data).then(r => r.data),
};

// ── Geofence ──────────────────────────────────────────────────────────────────
export const geofenceApi = {
  list: () => api.get('/api/geofence').then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/geofence', data).then(r => r.data),
  validate: (lat: number, lng: number) =>
    api.post('/api/geofence/validate', { latitude: lat, longitude: lng }).then(r => r.data),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/api/notifications').then(r => r.data),
  markRead: (id: string) =>
    api.post(`/api/notifications/${id}/read`).then(r => r.data),
};

// ── Shifts ────────────────────────────────────────────────────────────────────
export const shiftsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/shifts', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/shifts', data).then(r => r.data),
};

// ── Holidays ──────────────────────────────────────────────────────────────────
export const holidaysApi = {
  list: () => api.get('/api/holidays').then(r => r.data),
  create: (data: { name: string; date: string; type?: string }) =>
    api.post('/api/holidays', data).then(r => r.data),
  remove: (id: string) => api.delete(`/api/holidays/${id}`).then(r => r.data),
};

// ── Organization ──────────────────────────────────────────────────────────────
export const organizationApi = {
  get: () => api.get('/api/organization').then(r => r.data),
  update: (data: Record<string, unknown>) =>
    api.patch('/api/organization', data).then(r => r.data),
};

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payrollApi = {
  getSummary: (month?: string) => api.get('/api/payroll', { params: { month } }).then(r => r.data),
  updateSalary: (userId: string, baseSalary: number) => api.patch(`/api/payroll/salary/${userId}`, { baseSalary }).then(r => r.data),
};
