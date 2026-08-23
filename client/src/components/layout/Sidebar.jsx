import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Clock3, Rewind, ChartNoAxesCombined, ScrollText, Sparkles, Bell, FileText, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import './Sidebar.css';

const navSections = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/dashboard',  icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    ],
  },
  {
    label: 'LOGISTICS',
    items: [
      { to: '/shipments',  icon: <Package size={18} />, label: 'Shipments' },
      { to: '/timeline',   icon: <Clock3 size={18} />, label: 'Event Timeline' },
      { to: '/scrubber',   icon: <Rewind size={18} />, label: 'State Scrubber' },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { to: '/analytics',  icon: <ChartNoAxesCombined size={18} />, label: 'Analytics' },
      { to: '/events',     icon: <ScrollText size={18} />, label: 'Event Log' },
      { to: '/ai-insights',icon: <Sparkles size={18} />, label: 'AI Insights' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/alerts',     icon: <Bell size={18} />, label: 'Alerts' },
      { to: '/reports',    icon: <FileText size={18} />, label: 'Reports' },
      { to: '/settings',   icon: <Settings size={18} />,  label: 'Settings' },
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
        <div className="sidebar-logo-icon">
          <Shield size={28} strokeWidth={1.5} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">LogisticAI</div>
          <div className="sidebar-logo-sub">ENTERPRISE LEDGER</div>
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
