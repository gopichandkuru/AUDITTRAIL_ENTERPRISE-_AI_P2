import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/logs', icon: '📋', label: 'Audit Logs' },
  { path: '/ai-insights', icon: '🤖', label: 'AI Insights' },
  { path: '/analytics', icon: '📊', label: 'Analytics' },
  { path: '/reports', icon: '📄', label: 'Reports' },
  { path: '/alerts', icon: '🔔', label: 'Alerts' },
  { path: '/settings', icon: '⚙', label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColors = {
    admin: 'badge-critical',
    auditor: 'badge-warning',
    viewer: 'badge-info',
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <span className="logo-shield">🛡</span>
        </div>
        <div className="logo-text">
          <span className="logo-title">AuditTrail</span>
          <span className="logo-sub">Enterprise AI</span>
        </div>
      </div>

      {/* Live indicator */}
      <div className="sidebar-live">
        <span className="live-badge">
          <span className="dot dot-pulse"></span>
          Live Monitoring
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.path === '/alerts' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <span className={`badge badge-sm ${roleColors[user?.role] || 'badge-info'}`}>
              {user?.role}
            </span>
          </div>
          <button
            className="btn btn-ghost btn-icon logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}
