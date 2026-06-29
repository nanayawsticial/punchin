'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { PresenceAvatar } from '@/components/ui/PresenceAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { departmentsApi, attendanceApi, usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import type { Department, User } from '@/types';
import { Search, Grid, List, Edit2, User as UserIcon, Phone, Mail, Save } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  avatar: string | null;
  departmentName: string;
  departmentColor: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
  clockInTime: string | null;
}

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDept, setActiveDept] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Edit states
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    employeeCode: '',
    role: '',
    status: '',
    departmentId: ''
  });
  const [fetchingUser, setFetchingUser] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const [depts, presence] = await Promise.all([
        departmentsApi.list(),
        attendanceApi.presence()
      ]);
      setDepartments(depts);

      // Map presence data to simple list
      const list: TeamMember[] = [];

      // Present
      presence.present.forEach((p: any) => {
        list.push({
          id: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar,
          departmentName: p.user.department?.name || 'General',
          departmentColor: p.user.department?.color || '#E8603C',
          status: p.status,
          clockInTime: p.clockIn
        });
      });

      // Late
      presence.late.forEach((p: any) => {
        list.push({
          id: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar,
          departmentName: p.user.department?.name || 'General',
          departmentColor: p.user.department?.color || '#E8603C',
          status: 'LATE',
          clockInTime: p.clockIn
        });
      });

      // On Leave
      presence.onLeave.forEach((p: any) => {
        list.push({
          id: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar,
          departmentName: p.user.department?.name || 'General',
          departmentColor: p.user.department?.color || '#E8603C',
          status: 'ON_LEAVE',
          clockInTime: null
        });
      });

      // Absent
      presence.absent.forEach((u: User) => {
        list.push({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          departmentName: u.department?.name || 'General',
          departmentColor: u.department?.color || '#E8603C',
          status: 'ABSENT',
          clockInTime: null
        });
      });

      setMembers(list.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      showToast('Failed to load team data.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, []);

  const handleEditClick = async (member: TeamMember) => {
    setEditingMember(member);
    setIsEditSheetOpen(true);
    setFetchingUser(true);
    try {
      const userDetails = await usersApi.get(member.id);
      setEditForm({
        name: userDetails.name || '',
        email: userDetails.email || '',
        phone: userDetails.phone || '',
        employeeCode: userDetails.employeeCode || '',
        role: userDetails.role || 'EMPLOYEE',
        status: userDetails.status || 'ACTIVE',
        departmentId: userDetails.departmentId || ''
      });
    } catch (e) {
      console.error(e);
      showToast('Failed to load user details.', 'danger');
      setIsEditSheetOpen(false);
    } finally {
      setFetchingUser(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    try {
      await usersApi.update(editingMember.id, editForm);
      showToast('Employee profile updated successfully!', 'success');
      setIsEditSheetOpen(false);
      loadTeamData();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update employee profile.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Filter members
  const filtered = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchesDept = activeDept === 'all' || m.departmentName === activeDept;
    return matchesSearch && matchesDept;
  });

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginBottom: 4 }}>Team Directory</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
            Real-time workplace presence feed.
          </p>
        </div>

        {/* Search & Toggle bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)'
              }}
            />
            <input
              type="text"
              placeholder="Search team member..."
              className="input"
              style={{ paddingLeft: 46 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="btn btn-ghost"
            style={{ minHeight: 52, padding: '0 16px', borderRadius: 'var(--radius-sm)' }}
          >
            {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
          </button>
        </div>

        {/* Department Filters Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none'
          }}
        >
          <button
            onClick={() => setActiveDept('all')}
            className="btn"
            style={{
              minHeight: 38,
              padding: '6px 16px',
              fontSize: 'var(--text-xs)',
              background: activeDept === 'all' ? 'var(--accent)' : 'var(--bg-surface)',
              color: activeDept === 'all' ? '#fff' : 'var(--text-2)',
              border: activeDept === 'all' ? 'none' : '1px solid var(--border)'
            }}
          >
            All Departments
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDept(d.name)}
              className="btn"
              style={{
                minHeight: 38,
                padding: '6px 16px',
                fontSize: 'var(--text-xs)',
                background: activeDept === d.name ? d.color : 'var(--bg-surface)',
                color: activeDept === d.name ? '#fff' : 'var(--text-2)',
                border: activeDept === d.name ? 'none' : '1px solid var(--border)'
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Members Grid / List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
            No members found matching filters.
          </div>
        ) : viewMode === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12
            }}
          >
            {filtered.map((m) => (
              <div
                key={m.id}
                className="card flex flex-col items-center justify-center text-center gap-3"
                style={{ position: 'relative', minHeight: 180 }}
              >
                {/* Department strip tag */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: m.departmentColor,
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                  }}
                />

                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(m);
                    }}
                    className="btn btn-ghost"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      padding: 6,
                      minHeight: 0,
                      borderRadius: '50%',
                      color: 'var(--text-3)'
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                )}

                <PresenceAvatar name={m.name} avatar={m.avatar} status={m.status} size={64} />

                <div style={{ width: '100%', maxWidth: '100%', textAlign: 'center', padding: '0 8px', minWidth: 0 }}>
                  <div 
                    className="font-bold truncate" 
                    title={m.name}
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-1)', width: '100%' }}
                  >
                    {m.name}
                  </div>
                  <div 
                    className="text-muted truncate" 
                    title={m.departmentName}
                    style={{ fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', width: '100%' }}
                  >
                    {m.departmentName}
                  </div>
                </div>

                <StatusBadge status={m.status} />

                {m.clockInTime && (
                  <div className="text-muted" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    Clocked in: {new Date(m.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((m) => (
              <div key={m.id} className="card card-sm flex items-center justify-between gap-3" style={{ minWidth: 0 }}>
                <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                  <PresenceAvatar name={m.name} avatar={m.avatar} status={m.status} size={40} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div 
                      className="font-bold truncate" 
                      title={m.name}
                      style={{ fontSize: 'var(--text-sm)', color: 'var(--text-1)' }}
                    >
                      {m.name}
                    </div>
                    <div 
                      className="text-muted truncate" 
                      title={m.departmentName}
                      style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}
                    >
                      {m.departmentName}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  {m.clockInTime && (
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                      In: {new Date(m.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleEditClick(m)}
                      className="btn btn-ghost"
                      style={{ padding: 6, minHeight: 0, borderRadius: '50%', color: 'var(--text-3)' }}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  <StatusBadge status={m.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Employee Drawer */}
        <BottomSheet
          isOpen={isEditSheetOpen}
          onClose={() => setIsEditSheetOpen(false)}
          title="Edit Employee Profile"
          subtitle="Manage role, status and department"
        >
          {fetchingUser ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div className="btn-spinner" style={{ width: 36, height: 36, borderTopColor: 'var(--accent)' }} />
            </div>
          ) : (
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label" htmlFor="editName">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-3)' }} />
                  <input
                    id="editName"
                    type="text"
                    className="input"
                    style={{ paddingLeft: 44 }}
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="editEmail">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-3)' }} />
                  <input
                    id="editEmail"
                    type="email"
                    className="input"
                    style={{ paddingLeft: 44 }}
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="editPhone">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text-3)' }} />
                  <input
                    id="editPhone"
                    type="tel"
                    className="input"
                    style={{ paddingLeft: 44 }}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label" htmlFor="editCode">Employee Code</label>
                  <input
                    id="editCode"
                    type="text"
                    className="input"
                    required
                    value={editForm.employeeCode}
                    onChange={(e) => setEditForm({ ...editForm, employeeCode: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="editDept">Department</label>
                  <select
                    id="editDept"
                    className="input"
                    style={{ height: 52 }}
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label" htmlFor="editRole">System Role</label>
                  <select
                    id="editRole"
                    className="input"
                    style={{ height: 52 }}
                    required
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="editStatus">Status</label>
                  <select
                    id="editStatus"
                    className="input"
                    style={{ height: 52 }}
                    required
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                {saving ? <div className="btn-spinner" /> : <><Save size={18} /> Save Profile</>}
              </button>
            </form>
          )}
        </BottomSheet>
      </div>
    </PageWrapper>
  );
}
