import React from 'react';
import { useUIStore } from '../../store/uiStore';

const ICON = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const COLORS = {
  success: { bg: 'var(--bg-elevated)', border: 'var(--border)' },
  error:   { bg: 'var(--bg-elevated)',  border: 'var(--text-primary)' },
  warning: { bg: 'var(--bg-elevated)', border: 'var(--text-muted)' },
  info:    { bg: 'var(--bg-elevated)',  border: 'var(--border)' },
};

export default function Toast() {
  const { notifications, removeNotification } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 76, right: 20, zIndex: 10000,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360,
    }}>
      {notifications.slice(0, 3).map((n) => {
        const c = COLORS[n.type || 'info'] || COLORS.info;
        return (
          <div
            key={n.id}
            className="slide-up"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: 'var(--shadow-lg)',
              cursor: 'pointer',
            }}
            onClick={() => removeNotification(n.id)}
          >
            <span>{ICON[n.type || 'info']}</span>
            <span style={{ flex: 1 }}>{n.message || n.msg}</span>
            <span style={{ opacity: 0.6, fontSize: '1rem' }}>×</span>
          </div>
        );
      })}
    </div>
  );
}
