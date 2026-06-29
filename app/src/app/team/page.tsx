'use client';

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { PresenceAvatar } from '@/components/ui/PresenceAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { departmentsApi, attendanceApi } from '@/lib/api';
import type { Department, PresenceData, User } from '@/types';
import { Search, Grid, List, MapPin } from 'lucide-react';

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDept, setActiveDept] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, []);

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
                style={{ position: 'relative' }}
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

                <PresenceAvatar name={m.name} avatar={m.avatar} status={m.status} size={64} />

                <div>
                  <div className="font-bold truncate" style={{ fontSize: 'var(--text-sm)', maxWidth: 140 }}>
                    {m.name}
                  </div>
                  <div className="text-muted truncate" style={{ fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {m.departmentName}
                  </div>
                </div>

                <StatusBadge status={m.status === 'OFFLINE' ? 'ABSENT' : m.status} />

                {m.clockInTime && (
                  <div className="text-muted" style={{ fontSize: 10 }}>
                    Clocked in: {new Date(m.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((m) => (
              <div key={m.id} className="card card-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PresenceAvatar name={m.name} avatar={m.avatar} status={m.status} size={40} />
                  <div>
                    <div className="font-bold" style={{ fontSize: 'var(--text-sm)' }}>
                      {m.name}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {m.departmentName}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {m.clockInTime && (
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      In: {new Date(m.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <StatusBadge status={m.status === 'OFFLINE' ? 'ABSENT' : m.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
