import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { User, Lock, Mail, AlertTriangle, Zap } from 'lucide-react';
import api from '../lib/api';

const ROLES = [
  { value: 'Employee',  label: 'Employee',      desc: 'Submit expense claims for approval' },
  { value: 'Manager',   label: 'Manager',       desc: 'Review and approve team expense claims' },
  { value: 'Finance',   label: 'Finance Officer', desc: 'Process final payments and disbursals' },
  { value: 'Admin',     label: 'Admin',         desc: 'Manage policies and system settings' },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [managerId, setManagerId] = useState('');
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await api.get('/api/users');
        setManagers(response.data);
        if (response.data.length > 0) setManagerId(response.data[0].id);
      } catch (err) {
        console.error('Failed to load managers:', err);
      }
    };
    fetchManagers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, role, role === 'Employee' ? managerId : '');
      navigate('/');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--surface-base)',
      padding: '32px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'var(--indigo-500)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-lg)',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>FinanceOS</span>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h2 style={{
            fontSize: 'var(--text-2xl)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}>
            Create your account
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            Join your organization's expense workflow
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: 'var(--text-sm)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Full Name */}
          <div className="form-group">
            <label className="field-label" htmlFor="name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none',
              }}>
                <User size={14} />
              </span>
              <input
                id="name" type="text" required className="field-input"
                style={{ paddingLeft: '34px' }}
                placeholder="Jane Doe" value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="field-label" htmlFor="reg-email">Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none',
              }}>
                <Mail size={14} />
              </span>
              <input
                id="reg-email" type="email" required className="field-input"
                style={{ paddingLeft: '34px' }}
                placeholder="jane@company.com" value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="field-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none',
              }}>
                <Lock size={14} />
              </span>
              <input
                id="reg-password" type="password" required className="field-input"
                style={{ paddingLeft: '34px' }}
                placeholder="Minimum 8 characters" value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Role selector */}
          <div className="form-group">
            <label className="field-label">Role</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  style={{
                    padding: '10px 12px',
                    background: role === r.value ? 'var(--indigo-50)' : 'var(--surface-inset)',
                    border: `1px solid ${role === r.value ? 'rgba(99,102,241,0.35)' : 'var(--border-default)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: role === r.value ? 'var(--indigo-400)' : 'var(--text-primary)',
                    marginBottom: '3px',
                  }}>
                    {r.label}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    lineHeight: 1.3,
                  }}>
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manager selector (employees only) */}
          {role === 'Employee' && managers.length > 0 && (
            <div className="form-group">
              <label className="field-label" htmlFor="manager">Reporting Manager</label>
              <select
                id="manager"
                className="filter-select field-input"
                value={managerId}
                onChange={e => setManagerId(e.target.value)}
              >
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-md"
            style={{ width: '100%', marginTop: '4px' }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{
                  width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%', display: 'inline-block',
                }} />
                Creating account…
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-tertiary)',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--indigo-400)', fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
