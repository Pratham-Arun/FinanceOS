import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Check, X, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

const PAGE_TITLES = {
  '/':               { title: 'Dashboard',         sub: 'Overview' },
  '/expenses':       { title: 'Expenses',           sub: 'All claims' },
  '/submit':         { title: 'Submit Claim',       sub: 'New expense' },
  '/analytics':      { title: 'Analytics',          sub: 'Spending insights' },
  '/notifications':  { title: 'Notifications',      sub: 'Activity feed' },
  '/profile':        { title: 'Profile',            sub: 'Your account' },
  '/settings':       { title: 'Expense Policies',   sub: 'Admin configuration' },
  '/knowledge':      { title: 'Policy Library',     sub: 'RAG knowledge base' },
  '/policy-rules':   { title: 'Rule Engine',        sub: 'Policy limits' },
  '/ai-config':      { title: 'AI Config',          sub: 'Engine settings' },
  '/ai-logs':        { title: 'Audit Logs',         sub: 'AI observability' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const Topnav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'FinanceOS', sub: '' };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <header style={{
      height: 'var(--topbar-height)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      flexShrink: 0,
      background: 'var(--surface-base)',
    }}>

      {/* Page breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <h1 style={{
          fontSize: 'var(--text-lg)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {pageInfo.title}
        </h1>
        {pageInfo.sub && (
          <span style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            {pageInfo.sub}
          </span>
        )}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ position: 'relative', padding: '6px 8px' }}
            onClick={() => { setShowDropdown(!showDropdown); fetchNotifications(); }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={16} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '3px',
                right: '3px',
                width: '16px',
                height: '16px',
                backgroundColor: 'var(--crimson-500)',
                borderRadius: '50%',
                fontSize: '9px',
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid var(--surface-base)',
                lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showDropdown && (
            <div className="dropdown" style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '340px',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="badge badge-indigo">{unreadCount} new</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="btn btn-ghost"
                      style={{ padding: '3px 8px', fontSize: 'var(--text-xs)', gap: '4px' }}
                    >
                      <Check size={11} /> Mark read
                    </button>
                  )}
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="btn btn-ghost"
                    style={{ padding: '3px 6px' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '32px 20px',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--text-sm)',
                  }}>
                    <Bell size={20} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        borderLeft: n.read ? 'none' : '2px solid var(--indigo-500)',
                        backgroundColor: n.read ? 'transparent' : 'rgba(99,102,241,0.03)',
                        transition: 'background var(--transition-fast)',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(99,102,241,0.03)'}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '3px',
                      }}>
                        <h4 style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 500,
                          color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)',
                          lineHeight: 1.3,
                        }}>
                          {n.title}
                        </h4>
                        <span style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-tertiary)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Clock size={10} />
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-tertiary)',
                        lineHeight: 1.45,
                      }}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{
                  padding: '10px 16px',
                  borderTop: '1px solid var(--border-default)',
                  textAlign: 'center',
                }}>
                  <button
                    onClick={() => { navigate('/notifications'); setShowDropdown(false); }}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--indigo-400)', fontSize: 'var(--text-xs)' }}
                  >
                    View all notifications →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User pill */}
        <button
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '4px 10px 4px 4px',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.background = 'var(--surface-overlay)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.background = 'var(--surface-raised)';
          }}
          aria-label="Profile"
        >
          <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--indigo-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.02em',
          }}>
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontWeight: 500 }}>{user?.name?.split(' ')[0]}</span>
        </button>
      </div>
    </header>
  );
};

export default Topnav;
