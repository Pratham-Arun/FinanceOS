import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Send, BarChart2,
  User, Settings, Bell, LogOut,
  Zap, ChevronRight
} from 'lucide-react';
import { useAuth } from '../lib/auth';

const ROLE_COLORS = {
  Admin:    { bg: 'rgba(99,102,241,0.12)',  color: 'var(--indigo-400)' },
  Manager:  { bg: 'rgba(245,158,11,0.12)',  color: 'var(--amber-400)' },
  Finance:  { bg: 'rgba(16,185,129,0.12)', color: 'var(--emerald-400)' },
  Employee: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' },
};

const NavSection = ({ label, children }) => (
  <div>
    {label && <div className="nav-section-label">{label}</div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {children}
    </div>
  </div>
);

const SidebarLink = ({ to, icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    style={{ paddingLeft: '10px' }}
  >
    <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const roleStyle = ROLE_COLORS[role] || ROLE_COLORS.Employee;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      flexShrink: 0,
      backgroundColor: 'var(--surface-raised)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>

      {/* Workspace / Brand header */}
      <div style={{
        padding: '16px 14px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          background: 'var(--indigo-500)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--text-md)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            FinanceOS
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            lineHeight: 1.2,
          }}>
            Expense Intelligence
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}>
        <NavSection>
          <SidebarLink to="/" end icon={<LayoutDashboard size={15} strokeWidth={1.75} />} label="Dashboard" />
          <SidebarLink to="/expenses" icon={<FileText size={15} strokeWidth={1.75} />} label="Expenses" />
          {role === 'Employee' && (
            <SidebarLink to="/submit" icon={<Send size={15} strokeWidth={1.75} />} label="Submit Claim" />
          )}
        </NavSection>

        {(role === 'Admin' || role === 'Finance' || role === 'Manager') && (
          <NavSection label="Insights">
            <SidebarLink to="/analytics" icon={<BarChart2 size={15} strokeWidth={1.75} />} label="Analytics" />
          </NavSection>
        )}

        <NavSection label="Account">
          <SidebarLink to="/notifications" icon={<Bell size={15} strokeWidth={1.75} />} label="Notifications" />
          <SidebarLink to="/profile" icon={<User size={15} strokeWidth={1.75} />} label="Profile" />
          {role === 'Admin' && (
            <SidebarLink to="/settings" icon={<Settings size={15} strokeWidth={1.75} />} label="Policies" />
          )}
        </NavSection>
      </nav>

      {/* User footer */}
      <div style={{
        padding: '10px',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'background var(--transition-fast)',
        }}
          onClick={() => navigate('/profile')}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Avatar */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--indigo-100)',
            border: '1px solid var(--indigo-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--indigo-400)',
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {user?.name}
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 500,
              background: roleStyle.bg,
              color: roleStyle.color,
              marginTop: '1px',
            }}>
              {role}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleLogout(); }}
            className="btn btn-ghost"
            style={{ padding: '4px', color: 'var(--text-tertiary)' }}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
