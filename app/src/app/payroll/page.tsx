'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { payrollApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { PresenceAvatar } from '@/components/ui/PresenceAvatar';
import { CreditCard, Calendar, Edit3, Save, Printer, DollarSign, Clock, AlertTriangle } from 'lucide-react';

export default function PayrollPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Edit salary state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getSummary(month);
      setData(res);
    } catch (e) {
      console.error(e);
      showToast('Failed to load payroll details.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [month, showToast]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const handleEditClick = (record: any) => {
    setSelectedUser(record);
    setSalaryInput(record.baseSalary.toString());
    setIsEditOpen(true);
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const salary = parseFloat(salaryInput);
    if (isNaN(salary) || salary < 0) {
      showToast('Please enter a valid salary amount.', 'danger');
      return;
    }

    setSaving(true);
    try {
      await payrollApi.updateSalary(selectedUser.userId, salary);
      showToast(`Base salary updated successfully for ${selectedUser.name}!`, 'success');
      setIsEditOpen(false);
      fetchPayroll();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update salary.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate month options (past 12 months)
  const monthOptions = React.useMemo(() => {
    const options = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value, label });
      date.setMonth(date.getMonth() - 1);
    }
    return options;
  }, []);

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ color: 'var(--navy)', fontWeight: 800, marginBottom: 4 }}>Workplace Payroll</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
              {data?.isManager ? 'Manage employee salaries and view attendance-based payroll summaries.' : 'View your monthly payslip and attendance penalties.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Calendar size={18} style={{ color: 'var(--text-3)' }} />
            <select
              className="input"
              style={{ width: 180, height: 42, minHeight: 0, padding: '0 12px' }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="btn-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} />
          </div>
        ) : data?.isManager ? (
          /* ── ADMIN / MANAGER VIEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="stat-card">
                <span className="stat-card-number">₵{data.records.reduce((acc: number, r: any) => acc + r.baseSalary, 0).toLocaleString()}</span>
                <span className="stat-card-label">Total Base Salaries</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-number" style={{ color: 'var(--danger)' }}>₵{data.records.reduce((acc: number, r: any) => acc + r.deductions, 0).toLocaleString()}</span>
                <span className="stat-card-label">Total Late Deductions</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-number" style={{ color: 'var(--accent)' }}>₵{data.records.reduce((acc: number, r: any) => acc + r.netSalary, 0).toLocaleString()}</span>
                <span className="stat-card-label">Total Net Payroll</span>
              </div>
            </div>

            {/* Payroll Sheet table */}
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Employee</th>
                    <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Code</th>
                    <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Base Salary</th>
                    <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Late Days</th>
                    <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Deductions</th>
                    <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Net Pay</th>
                    <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r: any) => (
                    <tr key={r.userId} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <PresenceAvatar name={r.name} avatar={null} status="OFFLINE" size={32} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: r.departmentColor }}>{r.departmentName}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>{r.employeeCode}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600 }}>₵{r.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>{r.lateDays} days</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: r.deductions > 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                        {r.deductions > 0 ? `-₵${r.deductions.toFixed(2)}` : '₵0.00'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                        ₵{r.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => handleEditClick(r)}
                          className="btn btn-ghost"
                          style={{ padding: 6, minHeight: 0, borderRadius: '50%' }}
                        >
                          <Edit3 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── EMPLOYEE VIEW (PAYSLIP) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="stat-card">
                <span className="stat-card-number">₵{data.summary.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="stat-card-label">Monthly Net Pay</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-number" style={{ color: 'var(--warning)' }}>{data.summary.lateDays}</span>
                <span className="stat-card-label">Late Days</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-number" style={{ color: 'var(--danger)' }}>-₵{data.summary.deductions.toFixed(2)}</span>
                <span className="stat-card-label">Late Deductions</span>
              </div>
            </div>

            {/* Payslip Card Container */}
            <div className="card flex flex-col gap-6" style={{ background: 'var(--bg-surface)', padding: 24 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', borderBottom: '1px solid var(--border)', paddingBottom: 16, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--navy)', fontWeight: 800 }}>STEMAIDE Africa Limited</h3>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Employee Payslip • {monthOptions.find(o => o.value === month)?.label}</div>
                </div>
                <button onClick={handlePrint} className="btn btn-ghost flex items-center gap-2" style={{ padding: '8px 12px', minHeight: 0 }}>
                  <Printer size={16} />
                  Print Payslip
                </button>
              </div>

              {/* Employee Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em' }}>Employee Name</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{data.summary.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em' }}>Employee Code</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{data.summary.employeeCode}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em' }}>Department</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{data.summary.departmentName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em' }}>Days Worked</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{data.summary.presentDays} days</div>
                </div>
              </div>

              {/* Payroll Calculation Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'between', fontSize: 14, color: 'var(--text-1)' }}>
                  <span>Basic Salary</span>
                  <span style={{ fontWeight: 600 }}>₵{data.summary.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'between', fontSize: 14, color: 'var(--danger)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Late Arrival Deductions ({data.summary.lateDays} days × ₵14.00)
                  </span>
                  <span style={{ fontWeight: 600 }}>-₵{data.summary.deductions.toFixed(2)}</span>
                </div>
              </div>

              {/* Net Payout */}
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>Net Salary Payout</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>
                  ₵{data.summary.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Policy note */}
              <div style={{ background: 'var(--bg-elevated)', borderLeft: '3px solid var(--warning)', padding: 12, borderRadius: 'var(--radius-sm)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                  Work Schedule: Mon-Thu (9:00 AM - 4:00 PM), Fri (9:00 AM - 3:30 PM). Deductions are calculated automatically if clock-in is registered after 9:00 AM.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Set Employee Base Salary BottomSheet */}
        <BottomSheet
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Set Base Salary`}
          subtitle={`Configure monthly salary for ${selectedUser?.name}`}
        >
          <form onSubmit={handleSaveSalary} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="salaryInput">Monthly Salary (GHS - ₵)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: 16, fontWeight: 700, color: 'var(--text-3)' }}>₵</span>
                <input
                  id="salaryInput"
                  type="number"
                  step="0.01"
                  className="input"
                  style={{ paddingLeft: 36 }}
                  required
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              {saving ? <div className="btn-spinner" /> : <><Save size={18} /> Save Base Salary</>}
            </button>
          </form>
        </BottomSheet>
      </div>
    </PageWrapper>
  );
}
