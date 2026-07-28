import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * EmptyState — Full empty section with optional CTA
 * Props:
 *   icon       - ReactNode (defaults to Inbox)
 *   title      - string
 *   subtitle   - string
 *   action     - ReactNode (optional button)
 */
export function EmptyState({ icon, title = 'Nothing here yet', subtitle, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {icon || <Inbox size={20} />}
      </div>
      <div>
        <div className="empty-state-title">{title}</div>
        {subtitle && <div className="empty-state-sub" style={{ marginTop: 6 }}>{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * LoadingSkeleton — Shimmer placeholder blocks
 * Props:
 *   rows  - number of skeleton rows
 *   card  - wrap in a card
 */
export function LoadingSkeleton({ rows = 3, card = true, className = '' }) {
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', padding: 'var(--sp-5)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <div className="skeleton" style={{ height: 14, width: `${70 + (i % 3) * 10}%` }} />
          {i % 2 === 0 && (
            <div className="skeleton" style={{ height: 12, width: `${40 + (i % 2) * 20}%` }} />
          )}
        </div>
      ))}
    </div>
  );

  if (!card) return <div className={className}>{content}</div>;

  return (
    <div className={`card ${className}`}>
      {content}
    </div>
  );
}

/**
 * SkeletonLine — Single shimmer line
 */
export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: 'var(--radius-md)', ...style }}
    />
  );
}

/**
 * StatsStripSkeleton — Skeleton for KPI cards
 */
export function StatsStripSkeleton({ count = 4 }) {
  return (
    <div className={`stats-strip${count === 3 ? '-3' : count === 2 ? '-2' : ''}`}
         style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 'var(--sp-4)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton" style={{ height: 36, width: 36, borderRadius: 'var(--radius-lg)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 28, width: '60%' }} />
            <div className="skeleton" style={{ height: 11, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default EmptyState;
