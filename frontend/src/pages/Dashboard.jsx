import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { StatsCard } from '../components/ui/StatsCard';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import {
  DollarSign, FileClock, CheckCircle, ArrowRight, UploadCloud,
  ShieldAlert, Activity, Brain, AlertTriangle, BadgeCheck
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ total_submitted: 0, total_paid: 0, total_pending: 0, count: 0 });
  const [expenses, setExpenses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, expRes] = await Promise.all([
          api.get('/api/analytics/summary'),
          api.get('/api/expenses'),
        ]);
        setSummary(analyticsRes.data.summary);
        setLogs(analyticsRes.data.logs || []);
        setExpenses(expRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fmt = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const pendingQueue = (() => {
    if (user.role === 'Manager')
      return expenses.filter(
        (e) => (e.status === 'Submitted' || e.status === 'Under Review') && e.employee_id !== user.id
      );
    if (user.role === 'Finance') return expenses.filter((e) => e.status === 'Approved');
    return [];
  })();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div className="skeleton" style={{ height: 44, width: 280 }} />
        <div className="stats-strip-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 80 }} />
            </div>
          ))}
        </div>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Welcome back, {user?.name?.split(' ')[0]}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            Your reimbursement workflow overview.
          </p>
        </div>
        {user.role === 'Employee' && (
          <button onClick={() => navigate('/submit')} className="btn btn-primary btn-md">
            <UploadCloud size={15} /> Submit Claim
          </button>
        )}
      </div>

      {/* ── KPI strip (all roles) ────────────────────────────────── */}
      <div className="stats-strip-3">
        <StatsCard
          label="Total Submitted"
          value={fmt(summary.total_submitted)}
          icon={<DollarSign size={17} />}
          iconClass="stat-icon-indigo"
          subtext={`${summary.count} expense${summary.count !== 1 ? 's' : ''} total`}
        />
        <StatsCard
          label="Pending Approval"
          value={fmt(summary.total_pending)}
          icon={<FileClock size={17} />}
          iconClass="stat-icon-amber"
          subtext="Awaiting review or payment"
        />
        <StatsCard
          label="Total Reimbursed"
          value={fmt(summary.total_paid)}
          icon={<CheckCircle size={17} />}
          iconClass="stat-icon-emerald"
          subtext="Paid out to employees"
        />
      </div>


      {/* ── Employee: Recent Claims ──────────────────────────────── */}
      {user.role === 'Employee' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border-default)' }}>
            <span className="section-title">Recent Claims</span>
            <button onClick={() => navigate('/expenses')} className="btn btn-ghost btn-sm" style={{ color: 'var(--indigo-400)', gap: 4 }}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          {expenses.length === 0 ? (
            <EmptyState
              title="No claims submitted yet"
              subtitle="Submit your first expense to get started."
              action={<button onClick={() => navigate('/submit')} className="btn btn-primary btn-sm">Submit Expense</button>}
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th>Status</th>
                  <th className="col-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 6).map((e) => (
                  <tr key={e.id} onClick={() => navigate(`/expense/${e.id}`)}>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{e.expense_date}</td>
                    <td style={{ fontWeight: 500 }}>{e.title}</td>
                    <td>{e.category}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(e.amount)}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="col-right">
                      <button className="btn btn-ghost btn-xs row-actions" style={{ color: 'var(--indigo-400)' }}>View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}


      {/* ── Manager / Finance: Risk strip + pending queue ────────── */}
      {(user.role === 'Manager' || user.role === 'Finance') && (
        <>
          {/* Risk Distribution */}
          <div className="stats-strip-3">
            {[
              { label: 'High Risk', key: 'High',      cls: 'stat-icon-crimson', icon: <ShieldAlert size={17} /> },
              { label: 'Medium Risk', key: 'Medium',  cls: 'stat-icon-amber',   icon: <AlertTriangle size={17} /> },
              { label: 'Policy Violations', key: 'violation', cls: 'stat-icon-violet', icon: <Brain size={17} /> },
            ].map(({ label, key, cls, icon }) => {
              const count =
                key === 'violation'
                  ? expenses.filter(
                      (e) => e.rule_engine?.policy_status === 'VIOLATION' || e.risk_flags?.length > 0
                    ).length
                  : expenses.filter((e) => e.risk_score === key).length;
              return (
                <StatsCard key={key} label={label} value={String(count)} icon={icon} iconClass={cls} subtext="across all claims" />
              );
            })}
          </div>

          {/* Pending queue table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-title">
                {user.role === 'Manager' ? 'Pending Approval Queue' : 'Payment Queue'} ({pendingQueue.length})
              </span>
              <button onClick={() => navigate('/expenses')} className="btn btn-ghost btn-sm" style={{ color: 'var(--indigo-400)', gap: 4 }}>
                View all <ArrowRight size={13} />
              </button>
            </div>
            {pendingQueue.length === 0 ? (
              <EmptyState title="Queue is clear" subtitle="No pending items require your attention right now." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Submitter</th><th>Date</th><th>Title</th><th>Amount</th>
                    <th>Risk</th><th>AI Rec.</th><th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQueue.map((e) => {
                    const aiRec = e.ai_analysis?.recommendation;
                    const recLabel = aiRec
                      ? aiRec.toLowerCase().includes('auto')   ? 'AUTO APPROVE'
                      : aiRec.toLowerCase().includes('manual') ? 'INVESTIGATE'
                      : 'REVIEW'
                      : null;
                    const recCls = aiRec
                      ? aiRec.toLowerCase().includes('auto')   ? 'badge-emerald'
                      : aiRec.toLowerCase().includes('manual') ? 'badge-crimson'
                      : 'badge-amber'
                      : 'badge-slate';
                    return (
                      <tr key={e.id} onClick={() => navigate(`/expense/${e.id}`)}>
                        <td style={{ fontWeight: 500 }}>{e.employee_name}</td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{e.expense_date}</td>
                        <td>{e.title}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(e.amount)}</td>
                        <td>
                          <span className={`risk-badge risk-${(e.risk_score || 'low').toLowerCase()}`}>
                            {e.risk_score === 'High' && <ShieldAlert size={11} />}
                            {e.risk_score || 'Low'}
                          </span>
                        </td>
                        <td>
                          {recLabel
                            ? <span className={`badge ${recCls}`} style={{ fontSize: 'var(--text-2xs)' }}>{recLabel}</span>
                            : <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>—</span>}
                        </td>
                        <td className="col-right">
                          <button className="btn btn-primary btn-xs row-actions">Review →</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}


      {/* ── Admin: AI monitoring + audit logs ───────────────────── */}
      {user.role === 'Admin' && (
        <>
          {/* AI system KPIs */}
          <div className="stats-strip">
            {[
              { label: 'AI Accuracy',          value: '92%',   cls: 'stat-icon-violet',  icon: <Brain size={17} /> },
              { label: 'OCR Accuracy',          value: '97%',   cls: 'stat-icon-emerald', icon: <BadgeCheck size={17} /> },
              { label: 'Duplicates Prevented',  value: '23',    cls: 'stat-icon-blue',    icon: <ShieldAlert size={17} /> },
              { label: 'Monthly Savings',       value: '$8,430',cls: 'stat-icon-indigo',  icon: <Activity size={17} /> },
            ].map(({ label, value, cls, icon }) => (
              <StatsCard key={label} label={label} value={value} icon={icon} iconClass={cls} subtext="system-wide" />
            ))}
          </div>

          {/* Audit log table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border-default)' }}>
              <span className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} style={{ color: 'var(--violet-400)' }} /> Recent Audit Events
              </span>
              <button onClick={() => navigate('/ai-logs')} className="btn btn-ghost btn-sm" style={{ color: 'var(--indigo-400)', gap: 4 }}>
                Full Logs <ArrowRight size={13} />
              </button>
            </div>
            {logs.length === 0 ? (
              <EmptyState title="No audit events yet" subtitle="Events are recorded automatically as users interact with the system." />
            ) : (
              <table className="data-table dense">
                <thead>
                  <tr><th>Timestamp</th><th>Event</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {logs.slice(0, 8).map((log, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td><span className="badge badge-violet">{log.action}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default Dashboard;
