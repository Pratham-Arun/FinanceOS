import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Bell, Check } from 'lucide-react';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/notifications')
      .then(r => setNotifications(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read');
      setNotifications(p => p.map(n => ({ ...n, read: true })));
    } catch (e) { console.error(e); }
  };

  const unread = notifications.filter(n => !n.read).length;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div className="skeleton" style={{ height: 40, width: 200 }} />
      <LoadingSkeleton rows={5} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Notifications
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary btn-sm">
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden', maxWidth: 720 }}>
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={20} />}
            title="No notifications yet"
            subtitle="You'll see updates here when expenses are submitted, approved, or paid."
          />
        ) : (
          <div>
            {notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: 'var(--sp-4) var(--sp-5)',
                  borderBottom: '1px solid var(--border-subtle)',
                  borderLeft: n.read ? 'none' : '3px solid var(--indigo-500)',
                  background: n.read ? 'transparent' : 'rgba(99,102,241,0.03)',
                  display: 'flex',
                  gap: 'var(--sp-4)',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: n.read ? 'var(--surface-overlay)' : 'var(--indigo-100)',
                  color: n.read ? 'var(--text-tertiary)' : 'var(--indigo-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bell size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--text-md)', fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 12 }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
