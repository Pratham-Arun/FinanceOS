import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Mail, Lock, AlertTriangle, Zap, CheckCircle, TrendingUp, Shield, Eye, EyeOff } from 'lucide-react';

const FEATURES = [
  { icon: <TrendingUp size={15} />, title: 'AI-Powered OCR', desc: 'Extract vendor, amount, and dates automatically' },
  { icon: <Shield size={15} />, title: 'Policy Enforcement', desc: 'Instant flagging of limit violations and duplicates' },
  { icon: <CheckCircle size={15} />, title: 'Approval Workflows', desc: 'Manager → Finance sequential review chain' },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (emailVal, pwd) => {
    setEmail(emailVal);
    setPassword(pwd);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--surface-base)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 420px',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px',
        borderRight: '1px solid var(--border-default)',
        background: 'var(--surface-raised)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'auto' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'var(--indigo-500)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Zap size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xl)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            FinanceOS
          </span>
        </div>

        <div style={{ marginBottom: 'auto' }}>
          <div style={{
            fontSize: 'var(--text-3xl)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            marginBottom: '16px',
          }}>
            Expense intelligence<br />
            <span style={{ color: 'var(--text-secondary)' }}>for finance teams.</span>
          </div>

          <p style={{
            fontSize: 'var(--text-base)',
            color: 'var(--text-tertiary)',
            lineHeight: 1.65,
            marginBottom: '40px',
            maxWidth: '300px',
          }}>
            Automate receipt processing, enforce spend policies, and streamline reimbursement approvals at scale.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--indigo-50)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--indigo-400)',
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          © 2026 FinanceOS · Enterprise Expense Automation
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: 'var(--text-2xl)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
              Access your expense workflow
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: 'var(--text-sm)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="field-label" htmlFor="email">Email</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  pointerEvents: 'none',
                }}>
                  <Mail size={14} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  className="field-input"
                  style={{ paddingLeft: '34px' }}
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  pointerEvents: 'none',
                }}>
                  <Lock size={14} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="field-input"
                  style={{ paddingLeft: '34px', paddingRight: '36px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    padding: '2px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-md"
              style={{ width: '100%', marginTop: '4px' }}
            >
              {loading ? (
                <>
                  <span className="animate-spin" style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                  }} />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
          }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--indigo-400)', fontWeight: 500 }}>
              Request access
            </Link>
          </div>

          {/* Demo credentials */}
          <div style={{
            marginTop: '32px',
            padding: '14px 16px',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
            }}>
              Demo access
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { role: 'Employee', email: 'employee@demo.com', password: 'demo1234' },
                { role: 'Manager', email: 'manager@demo.com', password: 'demo1234' },
                { role: 'Finance', email: 'finance@demo.com', password: 'demo1234' },
                { role: 'Admin', email: 'admin@demo.com', password: 'admin123' },
              ].map(c => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => fillDemo(c.email, c.password)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--surface-hover)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {c.email}
                  </span>
                  <span className="badge badge-slate" style={{ fontSize: '10px' }}>{c.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
