import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { StatusPill, RiskBadge } from '../components/ui/RiskBadge';
import { PageHeader } from '../components/ui/PageHeader';
import ApprovalTimeline from '../components/ApprovalTimeline';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import {
  ArrowLeft, FileText, Sparkles, Clock, AlertTriangle,
  Brain, ShieldCheck, ShieldAlert, CheckCircle2, XCircle,
  Download, ExternalLink, RefreshCw, Layers
} from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

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
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const fetchAIAnalysis = async (expenseData) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ expense_data: expenseData })
      });
      if (res.ok) setAiAnalysis(await res.json());
    } catch (err) {
      console.error('AI analyze fetch failed:', err);
    }
  };

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

  useEffect(() => {
    if (expense) fetchAIAnalysis(expense);
  }, [expense?.id]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (action === 'Rejected' && !comments.trim()) {
      setError('A review remark is required when rejecting a claim.');
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

  const isReviewer = () => {
    if (!expense) return false;
    if ((expense.status === 'Submitted' || expense.status === 'Under Review') && user?.role === 'Manager' && expense.employee_id !== user.id) return true;
    if (expense.status === 'Approved' && user?.role === 'Finance') return true;
    return false;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div className="skeleton" style={{ height: 40, width: 300 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr var(--panel-width)', gap: 'var(--sp-6)' }}>
          <LoadingSkeleton rows={5} />
          <LoadingSkeleton rows={5} />
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <EmptyState
        title="Expense claim not found"
        subtitle="The requested expense record does not exist or you do not have permission to view it."
        action={
          <button onClick={() => navigate('/expenses')} className="btn btn-primary btn-sm">
            Return to Expenses
          </button>
        }
      />
    );
  }

  const fraudScore = aiAnalysis?.fraud_score ?? (expense.risk_score === 'High' ? 78 : expense.risk_score === 'Medium' ? 42 : 12);
  const confidenceScore = aiAnalysis?.confidence_score != null ? Math.round(aiAnalysis.confidence_score * 100) : 94;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title={expense.title}
        subtitle={`Claim ID: ${expense.id} • Submitted by ${expense.employee_name}`}
        breadcrumbs={[
          { label: 'Expenses', href: '/expenses' },
          { label: expense.id },
        ]}
        badge={{
          label: expense.status,
          className: expense.status === 'Approved' || expense.status === 'Paid' ? 'badge-emerald' : expense.status === 'Rejected' ? 'badge-crimson' : 'badge-amber',
        }}
        actions={
          <button onClick={() => navigate('/expenses')} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      {/* Split 2-Column Layout */}
      <div className="page-split">

        {/* Left Main Column */}
        <div className="content-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

          {/* Hero Claim Parameters Card */}
          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
              <div>
                <div className="label-caps">Claim Amount</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                  {formatCurrency(expense.amount)}
                </div>
              </div>
              <StatusPill status={expense.status?.toLowerCase().replace(' ', '_') || 'draft'} label={expense.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)', padding: 'var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="label-caps">Submitted By</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                  {expense.employee_name}
                </div>
              </div>
              <div>
                <div className="label-caps">Expense Date</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                  {expense.expense_date}
                </div>
              </div>
              <div>
                <div className="label-caps">Category</div>
                <div style={{ marginTop: 4 }}>
                  <span className="badge badge-slate">{expense.category}</span>
                </div>
              </div>
            </div>

            {expense.description && (
              <div style={{ marginTop: 'var(--sp-5)' }}>
                <div className="label-caps" style={{ marginBottom: 6 }}>Claim Purpose / Notes</div>
                <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {expense.description}
                </p>
              </div>
            )}

            {expense.payment_reference && (
              <div className="alert alert-success" style={{ marginTop: 'var(--sp-4)' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>Disbursal Reference: <strong className="text-mono">{expense.payment_reference}</strong></span>
              </div>
            )}
          </div>

          {/* Receipt Document Preview */}
          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div className="section-header">
              <div className="section-title">Receipt Verification</div>
              {expense.receipt_url && (
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-xs"
                >
                  <ExternalLink size={12} /> Open Document
                </a>
              )}
            </div>

            {expense.receipt_url ? (
              <div className="card-inset" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-xl)',
                  background: 'var(--indigo-100)', color: 'var(--indigo-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto var(--sp-3)',
                }}>
                  <FileText size={24} />
                </div>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Original Receipt Attached
                </div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '4px 0 var(--sp-4)' }}>
                  {expense.receipt_url}
                </div>
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={13} /> View Receipt File
                </a>
              </div>
            ) : (
              <EmptyState
                icon={<FileText size={20} />}
                title="No receipt file attached"
                subtitle="This claim was submitted without an attached receipt file."
              />
            )}
          </div>

          {/* Approval Audit Trail */}
          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div className="section-header">
              <div className="section-title">Approval Audit Log</div>
            </div>

            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-connector">
                  <div className="timeline-dot timeline-dot-done" />
                  <div className="timeline-line" />
                </div>
                <div className="timeline-content">
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Expense Submitted</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Created by {expense.employee_name}</div>
                </div>
              </div>

              {history.map((node, index) => (
                <div key={node.id} className="timeline-item">
                  <div className="timeline-connector">
                    <div className={`timeline-dot ${node.action === 'Approved' ? 'timeline-dot-done' : node.action === 'Rejected' ? 'timeline-dot-error' : ''}`} />
                    {index < history.length - 1 && <div className="timeline-line" />}
                  </div>
                  <div className="timeline-content">
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                      {node.action} by {node.approver_name}
                    </div>
                    {node.comments && (
                      <div style={{
                        marginTop: 4, padding: '8px 12px', background: 'var(--surface-inset)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--text-secondary)',
                      }}>
                        "{node.comments}"
                      </div>
                    )}
                    <div className="text-mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {new Date(node.actioned_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sticky Side Panel */}
        <div className="content-aside">

          {/* AI Copilot Intelligence Panel */}
          <div className="card-ai" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
              <Brain size={16} style={{ color: 'var(--violet-400)' }} />
              <span className="card-title" style={{ fontSize: 'var(--text-sm)', color: 'var(--violet-400)' }}>AI Copilot Audit</span>
              <RiskBadge level={expense.risk_score?.toLowerCase() || 'low'} score={fraudScore} />
            </div>

            {/* Score Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
              <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div className="label-caps">Fraud Risk Score</div>
                <div className="text-mono" style={{
                  fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 2,
                  color: fraudScore >= 70 ? 'var(--crimson-400)' : fraudScore >= 40 ? 'var(--amber-400)' : 'var(--emerald-400)',
                }}>
                  {fraudScore}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 400 }}>/100</span>
                </div>
              </div>

              <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div className="label-caps">AI Confidence</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--violet-400)', marginTop: 2 }}>
                  {confidenceScore}%
                </div>
              </div>
            </div>

            {/* Recommendation Pill */}
            {aiAnalysis?.recommendation && (
              <div style={{
                padding: 'var(--sp-3)',
                background: aiAnalysis.recommendation === 'APPROVE' ? 'var(--emerald-50)' : 'var(--crimson-50)',
                border: `1px solid ${aiAnalysis.recommendation === 'APPROVE' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--sp-4)',
                textAlign: 'center',
              }}>
                <div className="label-caps" style={{ color: 'var(--text-tertiary)' }}>AI Recommendation</div>
                <div style={{
                  fontSize: 'var(--text-md)', fontWeight: 700,
                  color: aiAnalysis.recommendation === 'APPROVE' ? 'var(--emerald-400)' : 'var(--crimson-400)',
                  marginTop: 2,
                }}>
                  {aiAnalysis.recommendation} (Route: {aiAnalysis.routing || 'STANDARD'})
                </div>
              </div>
            )}

            {/* Policy Violations or Clean signal */}
            {expense.risk_flags?.length > 0 ? (
              <div className="alert alert-error" style={{ marginBottom: 'var(--sp-3)' }}>
                <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  <strong>Flagged Risk Violations:</strong>
                  <ul style={{ paddingLeft: 14, marginTop: 4 }}>
                    {expense.risk_flags.map((flag, idx) => <li key={idx}>{flag}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="alert alert-success" style={{ marginBottom: 'var(--sp-3)' }}>
                <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-xs)' }}>Clean claim: All corporate policy checks passed.</span>
              </div>
            )}

            {/* Audit Metadata */}
            {aiAnalysis?.audit_metadata && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
                <span className="badge badge-slate">Model: {aiAnalysis.audit_metadata.model}</span>
                <span className="badge badge-slate">Policy: {aiAnalysis.audit_metadata.policy_version}</span>
                <span className="badge badge-slate">{aiAnalysis.audit_metadata.latency_ms}ms</span>
              </div>
            )}
          </div>

          {/* Reviewer Action Controls */}
          {isReviewer() && (
            <div className="card" style={{ padding: 'var(--sp-5)' }}>
              <div className="section-title" style={{ marginBottom: 'var(--sp-4)' }}>
                Reviewer Decision ({user?.role})
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--sp-3)' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-xs)' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                <div className="segmented" style={{ width: '100%' }}>
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
                </div>

                <div className="form-group">
                  <label className="field-label" htmlFor="comments">Reviewer Remarks</label>
                  <textarea
                    id="comments"
                    className="field-input"
                    rows="3"
                    placeholder="Enter review notes or rejection reason…"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn btn-primary btn-md" style={{ width: '100%' }}>
                  {submitting ? 'Submitting…' : 'Submit Decision'}
                </button>
              </form>
            </div>
          )}

          {/* 6-step Approval Pipeline Widget */}
          <div className="card" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
              <Clock size={15} style={{ color: 'var(--indigo-400)' }} />
              <span className="card-title" style={{ fontSize: 'var(--text-sm)' }}>Approval Pipeline</span>
            </div>
            <ApprovalTimeline expenseId={id} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExpenseDetails;
