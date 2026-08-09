import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, FileText, Scale3d, User, CreditCard } from 'lucide-react';
import api from '../lib/api';

const STEP_ICONS = {
  'Submitted': <FileText size={14} className="text-indigo-400" />,
  'OCR Processing': <Sparkles size={14} className="text-emerald-400" />,
  'Rule Engine': <Scale3d size={14} className="text-amber-400" />,
  'AI Analysis': <Sparkles size={14} className="text-violet-400" />,
  'Manager Review': <User size={14} className="text-blue-400" />,
  'Manager Approval': <User size={14} className="text-blue-400" />,
  'Finance Payment': <CreditCard size={14} className="text-emerald-400" />,
  'Payment Processed': <CreditCard size={14} className="text-emerald-400" />
};

export default function ApprovalTimeline({ expenseId, initialTimeline }) {
  const [steps, setSteps] = useState(initialTimeline || []);
  const [loading, setLoading] = useState(!initialTimeline && !!expenseId);

  useEffect(() => {
    if (initialTimeline && initialTimeline.length > 0) {
      setSteps(initialTimeline);
      setLoading(false);
      return;
    }
    if (!expenseId) return;
    fetchTimeline();
  }, [expenseId, initialTimeline]);

  const fetchTimeline = async () => {
    try {
      const res = await api.get(`/api/expenses/${expenseId}/timeline`);
      setSteps(res.data.timeline || []);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    completed: {
      icon: <CheckCircle2 size={16} style={{ color: 'var(--emerald-400)' }} />,
      dotClass: 'timeline-dot-done',
      badgeClass: 'badge-emerald',
      label: 'Done'
    },
    rejected: {
      icon: <AlertCircle size={16} style={{ color: 'var(--crimson-400)' }} />,
      dotClass: 'timeline-dot-error',
      badgeClass: 'badge-crimson',
      label: 'Rejected'
    },
    pending: {
      icon: <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />,
      dotClass: 'timeline-dot-pending',
      badgeClass: 'badge-slate',
      label: 'Pending'
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', gap: 8 }}>
        <Loader2 size={14} className="animate-spin" />
        <span>Loading lifecycle timeline…</span>
      </div>
    );
  }

  if (!steps.length) return null;

  return (
    <div className="timeline" style={{ paddingTop: 4 }}>
      {steps.map((step, idx) => {
        const status = step.status || (step.timestamp ? 'completed' : 'pending');
        const cfg = statusConfig[status] || statusConfig.pending;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.step || idx} className="timeline-item" style={{ marginBottom: isLast ? 0 : 16 }}>
            <div className="timeline-connector">
              <div className={`timeline-dot ${cfg.dotClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cfg.icon}
              </div>
              {!isLast && <div className="timeline-line" />}
            </div>

            <div className="timeline-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: status === 'completed' ? 'var(--text-primary)' : status === 'rejected' ? 'var(--crimson-400)' : 'var(--text-tertiary)' }}>
                  {step.step}
                </span>
                <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                  {cfg.label}
                </span>
              </div>

              {step.details && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                  {step.details}
                </div>
              )}

              {step.timestamp && (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {new Date(step.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
