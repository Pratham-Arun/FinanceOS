import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatsCard — KPI metric card
 * Props:
 *   label      - string
 *   value      - string | number
 *   subtext    - string (optional)
 *   icon       - ReactNode
 *   iconClass  - 'stat-icon-indigo' | 'stat-icon-emerald' | 'stat-icon-amber' | 'stat-icon-crimson' | 'stat-icon-violet'
 *   trend      - { value: string, direction: 'up'|'down'|'flat', label: string }
 *   onClick    - function (optional)
 */
export function StatsCard({ label, value, subtext, icon, iconClass = 'stat-icon-indigo', trend, onClick, className = '' }) {
  const trendClass = trend?.direction === 'up' ? 'trend-up' : trend?.direction === 'down' ? 'trend-down' : 'trend-flat';
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={`stat-card ${className}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {icon && (
          <div className={`stat-icon ${iconClass}`}>
            {icon}
          </div>
        )}
        {trend && (
          <div className={`stat-trend ${trendClass}`}>
            <TrendIcon size={10} />
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label" style={{ marginTop: 'var(--sp-1)' }}>{label}</div>
        {subtext && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3 }}>
            {subtext}
          </div>
        )}
        {trend?.label && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3 }}>
            {trend.label}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MetricRow — Inline metric for compact sections
 */
export function MetricRow({ label, value, valueClass = '' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }} className={valueClass}>
        {value}
      </span>
    </div>
  );
}

export default StatsCard;
