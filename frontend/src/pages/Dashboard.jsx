import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import {
  DollarSign, Clock, CheckCircle2, Plus, ArrowUpRight,
  ShieldAlert, ShieldCheck, ChevronRight, FileText, Activity
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ total_submitted: 0, total_paid: 0, total_pending: 0, count: 0 });
  const [expenses, setExpenses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/analytics/summary');
      setSummary(response.data.summary || { total_submitted: 0, total_paid: 0, total_pending: 0, count: 0 });
      setLogs(response.data.logs || []);
      
      const expResponse = await api.get('/api/expenses');
      setExpenses(expResponse.data || []);
    } catch (error) {
      console.error('Failed to load dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  // Filter queues based on role
  const getPendingQueue = () => {
    if (user?.role === 'Manager') {
      return expenses.filter(e => (e.status === 'Submitted' || e.status === 'Under Review') && e.employee_id !== user.id);
    }
    if (user?.role === 'Finance') {
      return expenses.filter(e => e.status === 'Approved');
    }
    return [];
  };

  const pendingQueue = getPendingQueue();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '32px', width: '220px' }} className="skeleton" />
        <div style={{ height: '90px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div style={{ height: '320px' }} className="skeleton" />
          <div style={{ height: '320px' }} className="skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Welcome back, {user?.name?.split(' ')[0]}
          </h2>
          <p className="page-subtitle">
            Overview of your reimbursement activity and pending actions for today.
          </p>
        </div>
        {user?.role === 'Employee' && (
          <button
            onClick={() => navigate('/submit')}
            className="btn btn-primary btn-md"
          >
            <Plus size={15} /> New Reimbursement Claim
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-item">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={13} style={{ color: 'var(--indigo-400)' }} />
            Total Volume Submitted
          </div>
          <div className="kpi-value">{formatCurrency(summary.total_submitted)}</div>
          <div className="kpi-sub">{summary.count} total claims created</div>
        </div>

        <div className="kpi-item">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} style={{ color: 'var(--amber-400)' }} />
            Pending Review
          </div>
          <div className="kpi-value" style={{ color: summary.total_pending > 0 ? 'var(--amber-400)' : 'var(--text-primary)' }}>
            {formatCurrency(summary.total_pending)}
          </div>
          <div className="kpi-sub">Awaiting approval or payment</div>
        </div>

        <div className="kpi-item">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} style={{ color: 'var(--emerald-400)' }} />
            Total Reimbursed
          </div>
          <div className="kpi-value" style={{ color: 'var(--emerald-400)' }}>
            {formatCurrency(summary.total_paid)}
          </div>
          <div className="kpi-sub">Successfully disbursed</div>
        </div>
      </div>

      {/* Main Grid: Asymmetric Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: user?.role === 'Admin' ? '1.8fr 1.2fr' : '2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Submitter's Recent Claims OR Reviewer Queue */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 className="section-title">
                {user?.role === 'Employee' ? 'Your Recent Claims' : `Action Required (${pendingQueue.length})`}
              </h3>
              <p className="section-sub">
                {user?.role === 'Employee' ? 'Latest expense submissions' : `${user?.role} review queue`}
              </p>
            </div>
            <button
              onClick={() => navigate('/expenses')}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--indigo-400)', gap: '4px' }}
            >
              View history <ArrowUpRight size={13} />
            </button>
          </div>

          {user?.role === 'Employee' ? (
            expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><FileText size={18} /></div>
                <div className="empty-state-title">No reimbursement claims yet</div>
                <div className="empty-state-sub">Submit your first expense claim to start processing reimbursements.</div>
                <button onClick={() => navigate('/submit')} className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>
                  Submit Claim
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title & Category</th>
                    <th className="col-right">Amount</th>
                    <th>Status</th>
                    <th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 6).map(e => (
                    <tr key={e.id}>
                      <td className="col-mono" style={{ color: 'var(--text-tertiary)' }}>{e.expense_date}</td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{e.category}</div>
                      </td>
                      <td className="col-mono col-right" style={{ fontWeight: 500 }}>{formatCurrency(e.amount)}</td>
                      <td><StatusBadge status={e.status} size="sm" /></td>
                      <td className="col-right">
                        <button
                          onClick={() => navigate(`/expense/${e.id}`)}
                          className="btn btn-ghost btn-xs row-actions"
                        >
                          View <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            pendingQueue.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><CheckCircle2 size={18} style={{ color: 'var(--emerald-400)' }} /></div>
                <div className="empty-state-title">All caught up!</div>
                <div className="empty-state-sub">There are no pending reimbursement claims requiring your action right now.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Submitter</th>
                    <th>Claim Title</th>
                    <th className="col-right">Amount</th>
                    <th>AI Audit Risk</th>
                    <th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQueue.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.employee_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{e.expense_date}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{e.category}</div>
                      </td>
                      <td className="col-mono col-right" style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                      <td>
                        <span className={`badge ${e.risk_score === 'High' ? 'badge-crimson' : e.risk_score === 'Medium' ? 'badge-amber' : 'badge-emerald'}`}>
                          {e.risk_score === 'High' ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                          {e.risk_score} Risk
                        </span>
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

        {/* Right Column: AI / Audit Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Stats or Audit Log Panel */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Activity size={16} style={{ color: 'var(--indigo-400)' }} />
              <h3 className="section-title">System Activity</h3>
            </div>

            {user?.role === 'Admin' ? (
              logs.length === 0 ? (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
                  No audit logs captured yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} style={{
                      padding: '10px 12px',
                      background: 'var(--surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--indigo-400)' }}>{log.action}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{log.details}</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--violet-50)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--violet-400)', marginBottom: '4px' }}>
                    AI Policy Enforcement Active
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Automated receipt OCR extraction & risk detection active for all new submissions.
                  </div>
                </div>

                <div style={{
                  padding: '12px 14px',
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Workflow Rules
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    Claims over $500 require dual approval from Manager and Finance. Duplicate check active across 30 days.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
