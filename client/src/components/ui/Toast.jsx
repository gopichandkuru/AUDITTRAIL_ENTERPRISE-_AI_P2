import React from 'react';
import { useUIStore } from '../../store/uiStore';

const ICON = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const COLORS = {
  success: { bg: 'var(--success)', border: 'rgba(16,185,129,0.4)' },
  error:   { bg: 'var(--danger)',  border: 'rgba(239,68,68,0.4)' },
  warning: { bg: 'var(--warning)', border: 'rgba(245,158,11,0.4)' },
  info:    { bg: 'var(--accent)',  border: 'rgba(99,102,241,0.4)' },
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
              color: 'white',
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
