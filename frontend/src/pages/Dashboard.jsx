import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { StatusPill } from '../components/ui/RiskBadge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatsStripSkeleton } from '../components/ui/EmptyState';
import { EmptyState } from '../components/ui/EmptyState';
import {
  DollarSign, Clock, CheckCircle2, Plus, ArrowUpRight,
  FileText, Activity, Bot, Zap, TrendingUp, Users,
  ChevronRight, ShieldAlert, ShieldCheck, CreditCard, BarChart3
} from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getRoleConfig = (role) => {
  const configs = {
    Employee: {
      greeting: 'Your Expense Dashboard',
      subtitle: 'Track your reimbursement claims and submission history.',
    },
    Manager: {
      greeting: 'Approvals Dashboard',
      subtitle: 'Review and process employee expense submissions pending your action.',
    },
    Finance: {
      greeting: 'Finance Dashboard',
      subtitle: 'Process approved expenses and manage disbursement queue.',
    },
    Admin: {
      greeting: 'System Dashboard',
      subtitle: 'Enterprise-wide expense intelligence and system health overview.',
    },
  };
  return configs[role] || configs.Employee;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ total_submitted: 0, total_paid: 0, total_pending: 0, count: 0 });
  const [expenses, setExpenses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [analyticsRes, expRes] = await Promise.all([
          api.get('/api/analytics/summary'),
          api.get('/api/expenses'),
        ]);
        setSummary(analyticsRes.data.summary || {});
        setLogs(analyticsRes.data.logs || []);
        setExpenses(expRes.data || []);
      } catch (err) {
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const role = user?.role;
  const roleConfig = getRoleConfig(role);

  const getPendingQueue = () => {
    if (role === 'Manager') return expenses.filter(e => (e.status === 'Submitted' || e.status === 'Under Review') && e.employee_id !== user.id);
    if (role === 'Finance') return expenses.filter(e => e.status === 'Approved');
    return [];
  };

  const pendingQueue = getPendingQueue();
  const recentExpenses = expenses.slice(0, 6);

  const totalRejected = expenses.filter(e => e.status === 'Rejected').length;
  const highRiskCount = expenses.filter(e => e.risk_score === 'High' || e.risk_score === 'Critical').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <div className="skeleton" style={{ height: 28, width: 240 }} />
          <div className="skeleton" style={{ height: 14, width: 320 }} />
        </div>
        <StatsStripSkeleton count={4} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 'var(--sp-6)' }}>
          <div className="skeleton" style={{ height: 340 }} />
          <div className="skeleton" style={{ height: 340 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }} className="animate-fade-up">

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">
            {roleConfig.greeting}
          </h1>
          <p className="page-subtitle" style={{ marginTop: 'var(--sp-1)' }}>
            {roleConfig.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
          {role === 'Employee' && (
            <button onClick={() => navigate('/submit')} className="btn btn-primary btn-md">
              <Plus size={15} strokeWidth={2.5} /> New Claim
            </button>
          )}
          {(role === 'Manager' || role === 'Finance') && pendingQueue.length > 0 && (
            <button onClick={() => navigate('/expenses')} className="btn btn-primary btn-md">
              <CheckCircle2 size={15} /> Review Queue ({pendingQueue.length})
            </button>
          )}
          {role === 'Admin' && (
            <button onClick={() => navigate('/analytics')} className="btn btn-secondary btn-md">
              <BarChart3 size={15} /> Analytics
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Stats Row ── */}
      <div className="stats-strip">
        {/* Total Volume */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-icon stat-icon-indigo">
              <DollarSign size={17} strokeWidth={2} />
            </div>
            <span className="stat-trend trend-up">
              <TrendingUp size={10} />
              {summary.count || 0} claims
            </span>
          </div>
          <div>
            <div className="stat-value">{formatCurrency(summary.total_submitted)}</div>
            <div className="stat-label" style={{ marginTop: 'var(--sp-1)' }}>Total Volume</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3 }}>
              Lifetime submitted expenses
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-icon stat-icon-amber">
              <Clock size={17} strokeWidth={2} />
            </div>
            {pendingQueue.length > 0 && (
              <span className="badge badge-amber">{pendingQueue.length} pending</span>
            )}
          </div>
          <div>
            <div className="stat-value" style={{ color: summary.total_pending > 0 ? 'var(--amber-400)' : undefined }}>
              {formatCurrency(summary.total_pending)}
            </div>
            <div className="stat-label" style={{ marginTop: 'var(--sp-1)' }}>Awaiting Action</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3 }}>
              Pending approval or disbursement
            </div>
          </div>
        </div>

        {/* Reimbursed */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-icon stat-icon-emerald">
              <CheckCircle2 size={17} strokeWidth={2} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--emerald-400)' }}>
              {formatCurrency(summary.total_paid)}
            </div>
            <div className="stat-label" style={{ marginTop: 'var(--sp-1)' }}>Total Reimbursed</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3 }}>
              Successfully disbursed
            </div>
          </div>
        </div>

        {/* 4th card: context-sensitive */}
        {(role === 'Admin' || role === 'Manager' || role === 'Finance') ? (
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/expenses')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon stat-icon-crimson">
                <ShieldAlert size={17} strokeWidth={2} />
              </div>
              {highRiskCount > 0 && (
                <span className="badge badge-crimson">{highRiskCount} flagged</span>
              )}
            </div>
            <div>
              <div className="stat-value" style={{ color: highRiskCount > 0 ? 'var(--crimson-400)' : undefined }}>
                {highRiskCount}
              </div>
              <div className="stat-label" style={{ marginTop: 'var(--sp-1)' }}>AI High-Risk Flags</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3 }}>
                Flagged for manual review
              </div>
            </div>
          </div>
        ) : (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon stat-icon-crimson">
                <FileText size={17} strokeWidth={2} />
              </div>
            </div>
            <div>
              <div className="stat-value">{totalRejected}</div>
              <div className="stat-label" style={{ marginTop: 'var(--sp-1)' }}>Rejected Claims</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3 }}>
                Requires resubmission
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>

        {/* Main Table Card */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: 'var(--sp-4) var(--sp-5)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div className="card-title">
                {role === 'Employee'
                  ? 'Recent Claims'
                  : role === 'Finance'
                  ? 'Ready for Payment'
                  : `Action Required (${pendingQueue.length})`}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {role === 'Employee'
                  ? 'Your latest expense submissions'
                  : role === 'Finance'
                  ? 'Approved claims awaiting disbursement'
                  : 'Expense submissions requiring your decision'}
              </div>
            </div>
            <button
              onClick={() => navigate('/expenses')}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--indigo-400)', gap: 4 }}
            >
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          {role === 'Employee' ? (
            recentExpenses.length === 0 ? (
              <EmptyState
                icon={<FileText size={20} />}
                title="No claims yet"
                subtitle="Submit your first expense claim to begin tracking reimbursements."
                action={
                  <button onClick={() => navigate('/submit')} className="btn btn-secondary btn-sm">
                    Submit Claim
                  </button>
                }
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th className="col-right">Amount</th>
                    <th>Status</th>
                    <th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.map(e => (
                    <tr key={e.id} onClick={() => navigate(`/expense/${e.id}`)}>
                      <td className="col-mono" style={{ color: 'var(--text-tertiary)' }}>{formatDate(e.expense_date)}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{e.category}</div>
                      </td>
                      <td className="col-mono col-right" style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                      <td><StatusPill status={e.status?.toLowerCase().replace(' ', '_') || 'draft'} label={e.status} /></td>
                      <td className="col-right">
                        <span className="btn btn-ghost btn-xs row-actions" style={{ color: 'var(--indigo-400)' }}>
                          View <ChevronRight size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            pendingQueue.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={20} style={{ color: 'var(--emerald-400)' }} />}
                title="All caught up"
                subtitle={`There are no ${role === 'Finance' ? 'approved expenses awaiting payment' : 'pending claims in your review queue'}.`}
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Submitter</th>
                    <th>Claim</th>
                    <th className="col-right">Amount</th>
                    <th>AI Risk</th>
                    <th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQueue.slice(0, 6).map(e => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{e.employee_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{formatDate(e.expense_date)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{e.category}</div>
                      </td>
                      <td className="col-mono col-right" style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                      <td>
                        <RiskBadge
                          level={e.risk_score?.toLowerCase() || 'low'}
                          score={e.fraud_score}
                        />
                      </td>
                      <td className="col-right">
                        <button
                          onClick={() => navigate(`/expense/${e.id}`)}
                          className="btn btn-primary btn-xs"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

          {/* AI Status Panel */}
          <div className="card-ai" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              <Bot size={15} style={{ color: 'var(--violet-400)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--violet-400)' }}>AI Copilot</span>
              <span className="badge badge-violet" style={{ marginLeft: 'auto', fontSize: 10 }}>Active</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div style={{ padding: 'var(--sp-3)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(139,92,246,0.1)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--violet-400)', fontWeight: 600, marginBottom: 4 }}>
                  OCR + Risk Analysis
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  AI automatically extracts receipt data, detects duplicates, and calculates fraud risk on every submission.
                </div>
              </div>
              <div style={{ padding: 'var(--sp-3)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99,102,241,0.1)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--indigo-400)', fontWeight: 600, marginBottom: 4 }}>
                  Policy Compliance
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Claims over $500 require dual approval. Duplicate detection active across 30-day window.
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: 'var(--sp-3) var(--sp-5)',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <Activity size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span className="card-title" style={{ fontSize: 'var(--text-base)' }}>
                  {role === 'Admin' ? 'Audit Activity' : 'Quick Actions'}
                </span>
              </div>
              {role === 'Admin' && logs.length > 0 && (
                <button onClick={() => navigate('/ai-logs')} className="btn btn-ghost btn-xs" style={{ color: 'var(--indigo-400)' }}>
                  View all <ArrowUpRight size={11} />
                </button>
              )}
            </div>

            <div style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
              {role === 'Admin' ? (
                logs.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--sp-5) 0' }}>
                    No audit logs yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    {logs.slice(0, 5).map((log, i) => (
                      <div key={log.id || i} style={{
                        display: 'flex',
                        gap: 'var(--sp-3)',
                        padding: 'var(--sp-3)',
                        background: 'var(--surface-inset)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--indigo-100)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Zap size={12} style={{ color: 'var(--indigo-400)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {log.action}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
                            {log.details?.slice(0, 60)}{log.details?.length > 60 ? '…' : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-disabled)', flexShrink: 0 }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {[
                    { icon: <FileText size={14} />, label: 'View all expenses', action: () => navigate('/expenses') },
                    role === 'Employee' && { icon: <Plus size={14} />, label: 'Submit new claim', action: () => navigate('/submit') },
                    { icon: <Activity size={14} />, label: 'View analytics', action: () => navigate('/analytics') },
                  ].filter(Boolean).map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', gap: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-lg)', width: '100%' }}
                    >
                      <span style={{ color: 'var(--indigo-400)' }}>{item.icon}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{item.label}</span>
                      <ChevronRight size={12} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
