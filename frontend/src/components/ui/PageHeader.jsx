import React from 'react';

/**
 * PageHeader — Enterprise-grade page title block
 * Props:
 *   title        - string (required)
 *   subtitle     - string (optional)
 *   icon         - ReactNode (optional lucide icon)
 *   badge        - { label, className } (optional)
 *   actions      - ReactNode (right side)
 *   breadcrumbs  - [{ label, href? }]
 */
export function PageHeader({ title, subtitle, icon, badge, actions, breadcrumbs, className = '' }) {
  return (
    <div className={`page-header ${className}`} style={{ marginBottom: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <span style={{ color: 'var(--text-disabled)', fontSize: 'var(--text-xs)' }}>/</span>
                )}
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: i === breadcrumbs.length - 1 ? 'var(--text-tertiary)' : 'var(--text-tertiary)',
                    fontWeight: 400,
                  }}
                >
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          {icon && (
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--indigo-100)',
              color: 'var(--indigo-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {icon}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <h1 className="page-title">{title}</h1>
              {badge && (
                <span className={`badge ${badge.className || 'badge-slate'}`}>
                  {badge.label}
                </span>
              )}
            </div>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * SectionHeader — Card/section title with optional action
 */
export function SectionHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`section-header ${className}`}>
      <div>
        <div className="section-title">{title}</div>
        {subtitle && <div className="section-sub">{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

export default PageHeader;
