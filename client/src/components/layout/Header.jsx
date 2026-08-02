import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import './Header.css';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Real-time audit monitoring overview' },
  '/logs': { title: 'Audit Logs', subtitle: 'Browse and filter all audit events' },
  '/ai-insights': { title: 'AI Insights', subtitle: 'Gemini-powered anomaly detection & analysis' },
  '/analytics': { title: 'Analytics', subtitle: 'Deep-dive charts and behavioral patterns' },
  '/reports': { title: 'Reports', subtitle: 'Generate compliance reports' },
  '/alerts': { title: 'Alerts', subtitle: 'Alert rules and notifications' },
  '/settings': { title: 'Settings', subtitle: 'Users, API keys, and preferences' },
};

export default function Header() {
  const { pathname } = useLocation();
  const { unreadCount, clearUnread } = useUIStore();
  const page = PAGE_TITLES[pathname] || { title: 'AuditTrail', subtitle: '' };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">{page.title}</h1>
        {page.subtitle && <p className="header-subtitle">{page.subtitle}</p>}
      </div>
      <div className="header-right">
        <div className="header-time">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <div className="header-divider" />
        <button
          className="header-notif-btn"
          onClick={clearUnread}
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span className="notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
