import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import './Header.css';

const ROUTE_LABELS = {
  '/dashboard':  { title: 'Dashboard',       icon: '📊' },
  '/shipments':  { title: 'Shipments',        icon: '🚢' },
  '/timeline':   { title: 'Event Timeline',   icon: '📅' },
  '/scrubber':   { title: 'State Scrubber',   icon: '⏮' },
  '/analytics':  { title: 'Analytics',        icon: '📈' },
  '/events':     { title: 'Event Log',        icon: '🗃' },
  '/ai-insights':{ title: 'AI Insights',      icon: '🤖' },
  '/alerts':     { title: 'Alerts',           icon: '🔔' },
  '/reports':    { title: 'Reports',          icon: '📄' },
  '/settings':   { title: 'Settings',         icon: '⚙️' },
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const page = ROUTE_LABELS[pathname] || { title: 'LogisticAI', icon: '🛡' };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-breadcrumb">
          <span className="breadcrumb-icon">{page.icon}</span>
          <span className="breadcrumb-title">{page.title}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Theme Toggle */}
        <button
          className="btn btn-ghost btn-icon header-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User chip */}
        <div className="header-user-chip">
          <div className="header-user-dot" />
          <span className="header-user-name">{user?.name?.split(' ')[0]}</span>
          <span className={`badge badge-${user?.role === 'admin' ? 'critical' : user?.role === 'manager' ? 'warning' : 'info'}`}>
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}
