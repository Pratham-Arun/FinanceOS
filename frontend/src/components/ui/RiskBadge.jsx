import React from 'react';

/**
 * RiskBadge — Colored badge for risk levels
 * Props: level = 'low' | 'medium' | 'high' | 'critical'
 *        score - optional number 0-100
 */
export function RiskBadge({ level, score }) {
  const labels = { low: 'Low Risk', medium: 'Medium', high: 'High Risk', critical: 'Critical' };
  const dots   = { low: '●', medium: '●', high: '●', critical: '⬟' };

  return (
    <span className={`risk-badge risk-${level}`}>
      <span style={{ fontSize: 8, opacity: 0.8 }}>{dots[level] || '●'}</span>
      {labels[level] || level}
      {score !== undefined && (
        <span style={{ opacity: 0.7 }}>({score})</span>
      )}
    </span>
  );
}

/**
 * StatusPill — Enterprise status indicator
 * Props: status = 'draft' | 'submitted' | 'review' | 'approved' | 'paid' | 'rejected'
 */
export function StatusPill({ status, label }) {
  const labels = {
    draft:     'Draft',
    submitted: 'Submitted',
    review:    'Under Review',
    approved:  'Approved',
    paid:      'Paid',
    rejected:  'Rejected',
  };

  return (
    <span className={`status-pill status-${status}`}>
      {label || labels[status] || status}
    </span>
  );
}

/**
 * Badge — Generic semantic badge
 */
export function Badge({ children, variant = 'badge-slate', className = '' }) {
  return (
    <span className={`badge ${variant} ${className}`}>
      {children}
    </span>
  );
}

export default RiskBadge;
