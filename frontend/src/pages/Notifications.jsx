import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Bell, Check, Clock } from 'lucide-react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
        <div style={{ height: '32px', width: '200px' }} className="skeleton" />
        <div style={{ height: '300px' }} className="skeleton" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Activity & Notifications</h2>
          <p className="page-subtitle">
            System notifications, workflow updates, approval logs, and policy alerts.
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn btn-secondary btn-sm">
            <Check size={14} /> Mark All as Read
          </button>
        )}
      </div>

      {/* Notifications Feed Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={20} /></div>
            <div className="empty-state-title">No notifications yet</div>
            <div className="empty-state-sub">You will receive notifications when expenses are submitted, approved, or disbursed.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  borderLeft: n.read ? 'none' : '3px solid var(--indigo-500)',
                  backgroundColor: n.read ? 'transparent' : 'rgba(99,102,241,0.03)',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: n.read ? 'var(--surface-inset)' : 'var(--indigo-50)',
                  color: n.read ? 'var(--text-tertiary)' : 'var(--indigo-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
                }}>
                  <Bell size={15} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: n.read ? 500 : 600,
                      color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)',
                      lineHeight: 1.4
                    }}>
                      {n.title}
                    </h4>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
