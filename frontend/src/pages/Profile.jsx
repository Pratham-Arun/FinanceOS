import React from 'react';
import { useAuth } from '../lib/auth';
import { Mail, Shield, CheckCircle, Hash, Star, Clock, User } from 'lucide-react';

const ROLE_STYLES = {
  Admin:    { badge: 'badge-violet',  color: 'var(--violet-400)',  bg: 'rgba(139,92,246,0.1)', label: 'Administrator' },
  Manager:  { badge: 'badge-amber',   color: 'var(--amber-400)',   bg: 'rgba(245,158,11,0.1)', label: 'Manager' },
  Finance:  { badge: 'badge-emerald', color: 'var(--emerald-400)', bg: 'rgba(16,185,129,0.1)', label: 'Finance Officer' },
  Employee: { badge: 'badge-indigo',  color: 'var(--indigo-400)',  bg: 'var(--indigo-100)',    label: 'Employee' },
};

const CAPABILITIES = {
  Admin:    ['View and manage all users and roles', 'Configure global reimbursement policies', 'Access system-wide audit logs', 'View organisation analytics'],
  Manager:  ['Review and approve direct report expenses', 'Request clarifications on submitted claims', 'Reject non-compliant requests with reason', 'View team spending analytics'],
  Finance:  ['Process and disburse approved payments', 'Issue payment transaction references', 'Audit AI risk flags and OCR results', 'View organisation-wide analytics'],
  Employee: ['Submit new reimbursement claims', 'Upload receipts for AI auto-extraction', 'Track claim status in real time', 'Receive notifications on status changes'],
};

const Row = ({ icon, label, value, valueStyle = {} }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--text-sm)', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{icon}</span>
    <span style={{ width: 120, color: 'var(--text-tertiary)', flexShrink: 0 }}>{label}</span>
    <span style={{ fontWeight: 500, ...valueStyle }}>{value}</span>
  </div>
);

const Profile = () => {
  const { user } = useAuth();
  const rs = ROLE_STYLES[user?.role] || ROLE_STYLES.Employee;
  const caps = CAPABILITIES[user?.role] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Account Profile
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          Your credentials, role, and access permissions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)', alignItems: 'start', maxWidth: 900 }}>
        {/* Identity Card */}
        <div className="card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: rs.bg, border: `2px solid ${rs.color}44`,
              color: rs.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={28} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
                {user?.name}
              </div>
              <span className={`badge ${rs.badge}`}>{rs.label}</span>
            </div>
          </div>

          <div>
            <Row icon={<Mail size={15} />} label="Email" value={user?.email} />
            <Row icon={<Shield size={15} />} label="Role" value={user?.role} valueStyle={{ color: rs.color }} />
            <Row icon={<Hash size={15} />} label="Account ID"
              value={<code style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{user?.id}</code>}
            />
            <Row icon={<CheckCircle size={15} />} label="Status"
              value="Active & Verified" valueStyle={{ color: 'var(--emerald-400)' }}
            />
            <Row icon={<Clock size={15} />} label="Session"
              value="JWT Bearer Token (24h)"
            />
          </div>
        </div>

        {/* Permissions Card */}
        <div className="card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Star size={16} style={{ color: rs.color }} />
            <span className="section-title">{user?.role} Permissions</span>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            Capabilities granted to your account.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {caps.map((cap, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 'var(--text-sm)' }}>
                <CheckCircle size={14} style={{ color: rs.color, marginTop: 2, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{cap}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 4, padding: 'var(--sp-3) var(--sp-4)',
            background: rs.bg, border: `1px solid ${rs.color}33`,
            borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', color: rs.color, fontWeight: 500,
          }}>
            Signed in as <strong>{user?.name}</strong> with {user?.role}-level access.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
