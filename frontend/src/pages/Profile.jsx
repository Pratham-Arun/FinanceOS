import React from 'react';
import { useAuth } from '../lib/auth';
import { User, Mail, Shield, CheckCircle, Hash, Clock, Star } from 'lucide-react';

const ROLE_CONFIG = {
  Admin:    { badgeClass: 'badge-indigo',  color: 'var(--indigo-400)' },
  Manager:  { badgeClass: 'badge-amber',   color: 'var(--amber-400)' },
  Finance:  { badgeClass: 'badge-emerald', color: 'var(--emerald-400)' },
  Employee: { badgeClass: 'badge-slate',   color: 'var(--text-secondary)' },
};

const ROLE_CAPABILITIES = {
  Admin: [
    'View & manage all users and roles',
    'Configure global reimbursement policies',
    'Access full system audit logs',
    'View organization-wide analytics',
  ],
  Manager: [
    'Review and approve direct report expenses',
    'Request clarifications on submitted claims',
    'Reject non-compliant expense requests',
    'View team spending analytics',
  ],
  Finance: [
    'Process and disburse approved payments',
    'Issue payment reference numbers',
    'Audit AI risk flags and OCR results',
    'View organization-wide analytics',
  ],
  Employee: [
    'Submit new reimbursement claims',
    'Upload receipt documents for AI parsing',
    'Track real-time status of all claims',
    'Receive notifications for status changes',
  ],
};

const Profile = () => {
  const { user } = useAuth();
  const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.Employee;
  const capabilities = ROLE_CAPABILITIES[user?.role] || [];
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '900px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">User Account Profile</h2>
          <p className="page-subtitle">
            Review active session credentials, account authority levels, and role permissions.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Identity Card */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Avatar & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--indigo-50)', border: '1.5px solid var(--indigo-500)',
              color: 'var(--indigo-400)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--text-lg)', fontWeight: 600, flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <h3 className="section-title" style={{ fontSize: 'var(--text-lg)', marginBottom: '4px' }}>{user?.name}</h3>
              <span className={`badge ${roleCfg.badgeClass}`}>
                {user?.role}
              </span>
            </div>
          </div>

          {/* User Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', fontSize: 'var(--text-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-tertiary)', width: '100px' }}>Email:</span>
              <span className="text-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user?.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-tertiary)', width: '100px' }}>System Role:</span>
              <span style={{ color: roleCfg.color, fontWeight: 500 }}>{user?.role}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Hash size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-tertiary)', width: '100px' }}>Account ID:</span>
              <span className="text-mono" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{user?.id}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={15} style={{ color: 'var(--emerald-400)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-tertiary)', width: '100px' }}>Status:</span>
              <span style={{ color: 'var(--emerald-400)', fontWeight: 500 }}>Active & Verified</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-tertiary)', width: '100px' }}>Session:</span>
              <span style={{ color: 'var(--text-secondary)' }}>JWT Token (24h)</span>
            </div>
          </div>
        </div>

        {/* Right: Role Capabilities */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={16} style={{ color: roleCfg.color }} />
            <h3 className="section-title">{user?.role} Role Permissions</h3>
          </div>
          <p className="section-sub" style={{ marginTop: '-8px' }}>
            Capabilities granted to your user profile in this workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {capabilities.map((cap, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: 'var(--text-sm)' }}>
                <CheckCircle size={14} style={{ color: 'var(--emerald-400)', marginTop: '3px', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{cap}</span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '8px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
          }}>
            Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong> with {user?.role}-level permissions.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
