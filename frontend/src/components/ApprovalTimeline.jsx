import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

const STEP_ICONS = {
  'Submitted': '📋',
  'OCR Processing': '🔍',
  'Rule Engine': '⚙️',
  'AI Analysis': '🧠',
  'Manager Approval': '👤',
  'Payment Processed': '💳'
};

export default function ApprovalTimeline({ expenseId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!expenseId) return;
    fetchTimeline();
  }, [expenseId]);

  const fetchTimeline = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/expenses/${expenseId}/timeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSteps(data.timeline || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    completed: { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, ring: 'border-emerald-500 bg-emerald-500/10', line: 'bg-emerald-500' },
    rejected:  { icon: <AlertCircle className="w-5 h-5 text-rose-400" />, ring: 'border-rose-500 bg-rose-500/10', line: 'bg-slate-700' },
    pending:   { icon: <Clock className="w-5 h-5 text-slate-500" />, ring: 'border-slate-700 bg-slate-800/40', line: 'bg-slate-700' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading approval timeline...</span>
      </div>
    );
  }

  if (!steps.length) return null;

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const cfg = statusConfig[step.status] || statusConfig.pending;
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.step} className="flex gap-4">
            {/* Timeline Column */}
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${cfg.ring}`}>
                {cfg.icon}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 min-h-[28px] rounded-full ${cfg.line}`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-5 ${isLast ? '' : ''}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base">{STEP_ICONS[step.step]}</span>
                <h4 className={`text-sm font-semibold ${step.status === 'completed' ? 'text-white' : step.status === 'rejected' ? 'text-rose-400' : 'text-slate-500'}`}>
                  {step.step}
                </h4>
                {step.status === 'completed' && (
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">Done</span>
                )}
                {step.status === 'rejected' && (
                  <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-md">Rejected</span>
                )}
                {step.status === 'pending' && (
                  <span className="text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded-md">Pending</span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-snug">{step.details}</p>
              {step.timestamp && (
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {new Date(step.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
