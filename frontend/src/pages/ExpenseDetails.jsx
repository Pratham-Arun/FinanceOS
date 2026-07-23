import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import {
  ShieldCheck, ShieldAlert, ArrowLeft, Send, CheckCircle2,
  XCircle, RefreshCcw, FileText, Sparkles, Clock, AlertTriangle
} from 'lucide-react';

const ExpenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('Approved');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/api/expenses/${id}`);
      setExpense(response.data.expense);
      setHistory(response.data.history || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    if (action === 'Rejected' && !comments.trim()) {
      setError('A review comment is required when rejecting a claim.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post(`/api/approvals/${id}/action`, { action, comments });
      await fetchDetails();
      setComments('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  const isReviewer = () => {
    if (!expense) return false;
    if ((expense.status === 'Submitted' || expense.status === 'Under Review') && user?.role === 'Manager' && expense.employee_id !== user.id) return true;
    if (expense.status === 'Approved' && user?.role === 'Finance') return true;
    return false;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '32px', width: '220px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div style={{ height: '400px' }} className="skeleton" />
          <div style={{ height: '400px' }} className="skeleton" />
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 500, marginBottom: '12px' }}>Expense Claim Not Found</div>
        <button onClick={() => navigate('/expenses')} className="btn btn-primary btn-sm">Return to Expenses</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/expenses')}
            className="btn btn-ghost btn-xs"
            style={{ marginBottom: '8px', color: 'var(--text-tertiary)' }}
          >
            <ArrowLeft size={13} /> Back to Expenses
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="page-title">{expense.title}</h2>
            <StatusBadge status={expense.status} />
          </div>
          <p className="page-subtitle text-mono">Claim ID: {expense.id}</p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Receipt Document Preview & Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Claim Parameters */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Claim Parameters</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: 'var(--text-sm)' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Submitted By</span>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>{expense.employee_name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Expense Date</span>
                <div className="text-mono" style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>{expense.expense_date}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Category</span>
                <div style={{ marginTop: '2px' }}><span className="badge badge-slate">{expense.category}</span></div>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Amount Claimed</span>
                <div className="text-mono" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            </div>

            {expense.description && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                  {expense.description}
                </p>
              </div>
            )}

            {expense.payment_reference && (
              <div style={{
                marginTop: '16px', padding: '10px 14px', background: 'var(--emerald-50)',
                border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--emerald-400)' }}>Disbursal Reference:</span>{' '}
                <span className="text-mono" style={{ color: 'var(--text-primary)' }}>{expense.payment_reference}</span>
              </div>
            )}
          </div>

          {/* Receipt File Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Receipt Document</h3>
            {expense.receipt_url ? (
              <div className="card-inset" style={{ padding: '20px', textAlign: 'center' }}>
                <FileText size={32} style={{ color: 'var(--indigo-400)', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Document Attached</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '4px 0 12px' }}>
                  {expense.receipt_url}
                </div>
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-xs"
                >
                  View Original Receipt File
                </a>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div className="empty-state-title">No receipt uploaded</div>
                <div className="empty-state-sub">This claim was submitted without an attached receipt document.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Risk Check, Decision Form & Workflow History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* AI Auditor Risk Card */}
          <div className="ai-panel">
            <div className="ai-panel-header">
              <Sparkles size={15} style={{ color: 'var(--violet-400)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>AI Audit & Risk Check</span>
              <span className={`badge ${expense.risk_score === 'High' ? 'badge-crimson' : expense.risk_score === 'Medium' ? 'badge-amber' : 'badge-emerald'}`} style={{ marginLeft: 'auto' }}>
                {expense.risk_score} Risk
              </span>
            </div>
            <div className="ai-panel-body">
              {expense.risk_flags.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-400)', fontSize: 'var(--text-sm)' }}>
                  <ShieldCheck size={16} /> All corporate policy compliance checks passed.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--crimson-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} /> Potential policy violations flagged:
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: 'var(--text-xs)', color: 'var(--crimson-400)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {expense.risk_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Reviewer Action Controls */}
          {isReviewer() && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 className="section-title" style={{ marginBottom: '16px' }}>Take Action ({user?.role})</h3>
              
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '14px' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-xs)' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="segmented" style={{ display: 'flex', width: '100%' }}>
                  <button
                    type="button"
                    className={`segmented-option ${action === 'Approved' ? 'active' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setAction('Approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={`segmented-option ${action === 'Rejected' ? 'active' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setAction('Rejected')}
                  >
                    Reject
                  </button>
                  {user?.role === 'Manager' && (
                    <button
                      type="button"
                      className={`segmented-option ${action === 'Clarification' ? 'active' : ''}`}
                      style={{ flex: 1 }}
                      onClick={() => setAction('Clarification')}
                    >
                      Clarification
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label className="field-label" htmlFor="comments">Reviewer Remarks</label>
                  <textarea
                    id="comments"
                    className="field-input"
                    rows="3"
                    placeholder="Enter review remarks or reason for rejection..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn btn-primary btn-md" style={{ width: '100%' }}>
                  {submitting ? 'Recording Action…' : 'Submit Decision'}
                </button>
              </form>
            </div>
          )}

          {/* Workflow Stepper History */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Approval Audit Trail</h3>
            
            <div className="timeline">
              {/* Submission Node */}
              <div className="timeline-item">
                <div className="timeline-connector">
                  <div className="timeline-dot" />
                  <div className="timeline-line" />
                </div>
                <div className="timeline-content">
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Claim Created</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Submitted by {expense.employee_name}</div>
                </div>
              </div>

              {/* History Actions */}
              {history.map((node, index) => (
                <div key={node.id} className="timeline-item">
                  <div className="timeline-connector">
                    <div
                      className="timeline-dot"
                      style={{
                        background: node.action === 'Approved' ? 'var(--emerald-500)' : node.action === 'Rejected' ? 'var(--crimson-500)' : 'var(--amber-500)'
                      }}
                    />
                    {index < history.length - 1 && <div className="timeline-line" />}
                  </div>
                  <div className="timeline-content">
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                      {node.action} by {node.approver_name}
                    </div>
                    {node.comments && (
                      <div style={{
                        margin: '4px 0', padding: '6px 10px', background: 'var(--surface-inset)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--text-secondary)'
                      }}>
                        "{node.comments}"
                      </div>
                    )}
                    <div className="text-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {new Date(node.actioned_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetails;
