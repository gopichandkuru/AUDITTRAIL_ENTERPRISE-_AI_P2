import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import './Sidebar.css';

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',  icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    label: 'Logistics',
    items: [
      { to: '/shipments',  icon: '🚢', label: 'Shipments' },
      { to: '/timeline',   icon: '📅', label: 'Event Timeline' },
      { to: '/scrubber',   icon: '⏮', label: 'State Scrubber' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics',  icon: '📈', label: 'Analytics' },
      { to: '/events',     icon: '🗃', label: 'Event Log' },
      { to: '/ai-insights',icon: '🤖', label: 'AI Insights' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/alerts',     icon: '🔔', label: 'Alerts' },
      { to: '/reports',    icon: '📄', label: 'Reports' },
      { to: '/settings',   icon: '⚙️',  label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛡</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">LogisticAI</div>
          <div className="sidebar-logo-sub">Enterprise Ledger</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="sidebar-item-text">{item.label}</span>
                {item.badge && <span className="sidebar-item-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{user?.role || 'viewer'} · Logout</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
