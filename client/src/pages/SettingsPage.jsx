import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { format } from 'date-fns';
import { User, Users, Key, Settings, Copy, Eye, EyeOff, ShieldCheck, FileCheck, Lock, Activity, CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('profile'); // profile | users | api | system
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (tab === 'users' && user?.role === 'admin') {
      fetchUsers();
    }
  }, [tab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    showToast('API key copied to clipboard!', 'success');
  };

  const TABS = [
    { id: 'profile', label: <span className="flex items-center gap-2"><User size={14} /> Profile</span>, roles: ['admin', 'auditor', 'viewer'] },
    { id: 'users', label: <span className="flex items-center gap-2"><Users size={14} /> Users</span>, roles: ['admin'] },
    { id: 'api', label: <span className="flex items-center gap-2"><Key size={14} /> API Keys</span>, roles: ['admin', 'auditor', 'viewer'] },
    { id: 'system', label: <span className="flex items-center gap-2"><Settings size={14} /> System</span>, roles: ['admin'] },
  ];

  const visibleTabs = TABS.filter((t) => t.roles.includes(user?.role));

  const CURL_EXAMPLE = `curl -X POST http://localhost:5000/api/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '[{
    "userId": "user_123",
    "userName": "John Doe",
    "action": "LOGIN",
    "resource": "Session",
    "severity": "INFO",
    "status": "SUCCESS"
  }]'`;

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, users, and integrations</p>
      </div>

      <div className="flex gap-2" style={{ marginBottom: 24 }}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-title">My Profile</div>
          <div className="flex items-center gap-4" style={{ marginBottom: 24, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, color: 'white', flexShrink: 0,
              boxShadow: '0 4px 16px rgba(255,255,255,0.1)',
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              <span className={`badge badge-sm ${user?.role === 'admin' ? 'badge-critical' : user?.role === 'auditor' ? 'badge-warning' : 'badge-info'}`} style={{ marginTop: 6 }}>
                {user?.role}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Full Name', user?.name],
              ['Email', user?.email],
              ['Role', user?.role],
              ['Department', user?.department || 'Not set'],
              ['Last Login', user?.lastLogin ? format(new Date(user.lastLogin), 'PPpp') : 'N/A'],
              ['Member Since', user?.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab (Admin only) */}
      {tab === 'users' && user?.role === 'admin' && (
        <div className="card">
          <div className="card-title">User Management</div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr><th>User</th><th>Role</th><th>Department</th><th>Last Login</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>
                            {u.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="td-primary">{u.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-critical' : u.role === 'auditor' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.department || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {u.lastLogin ? format(new Date(u.lastLogin), 'MMM d, HH:mm') : 'Never'}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-critical'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
          <div className="card">
            <div className="card-title">Your API Key</div>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
              Use this key to ingest audit events from external services via the <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>/api/ingest</code> endpoint.
            </p>
            <div className="flex gap-3" style={{ marginBottom: 16 }}>
              <input
                className="form-input flex-1 font-mono"
                style={{ fontSize: '0.82rem' }}
                value={showKey ? apiKey : '••••••••••••••••••••••••••••••••••••'}
                readOnly
              />
              <button className="btn btn-secondary flex items-center gap-2" onClick={() => setShowKey((s) => !s)}>
                {showKey ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Show</>}
              </button>
              <button className="btn btn-primary flex items-center gap-2" onClick={copyApiKey}><Copy size={14} /> Copy</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Ingest API — Usage Example</div>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
              Send audit events from any service using a simple HTTP POST:
            </p>
            <pre style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              overflow: 'auto',
              lineHeight: 1.7,
            }}>
              {CURL_EXAMPLE}
            </pre>
          </div>

          <div className="card">
            <div className="card-title">Event Schema</div>
            <pre style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
            }}>{`{
  "eventId": "string (optional, auto-generated)",
  "userId": "string (required)",
  "userName": "string (required)",
  "userEmail": "string (optional)",
  "userRole": "admin|auditor|viewer|system|api",
  "action": "string (required) — e.g. LOGIN, DELETE, EXPORT",
  "resource": "string (required) — e.g. User, Document",
  "resourceId": "string (optional)",
  "severity": "INFO|WARNING|CRITICAL|SUCCESS",
  "status": "SUCCESS|FAILURE|PENDING",
  "ipAddress": "string (optional)",
  "riskScore": "number 0-100 (optional)",
  "metadata": "object (optional)",
  "timestamp": "ISO date string (optional, defaults to now)"
}`}</pre>
          </div>
        </div>
      )}

      {/* System Tab (Admin only) */}
      {tab === 'system' && user?.role === 'admin' && (
        <div className="grid grid-2" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title">System Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Platform', 'AuditTrail Enterprise AI v1.0'],
                ['Database', 'MongoDB'],
                ['AI Engine', process.env.NODE_ENV !== 'production' ? 'Google Gemini 1.5 Flash' : 'Gemini'],
                ['Real-time', 'Socket.IO v4'],
                ['Auth', 'JWT (7d expiry)'],
                ['Environment', 'Development'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Compliance Standards</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: 'SOC 2 Type II', status: 'Supported', icon: <ShieldCheck size={16} /> },
                { name: 'GDPR', status: 'Supported', icon: <FileCheck size={16} /> },
                { name: 'ISO 27001', status: 'Supported', icon: <Lock size={16} /> },
                { name: 'HIPAA', status: 'Partial', icon: <Activity size={16} /> },
                { name: 'PCI DSS', status: 'Partial', icon: <CreditCard size={16} /> },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div className="flex items-center gap-2">
                    <span>{s.icon}</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{s.name}</span>
                  </div>
                  <span className={`badge ${s.status === 'Supported' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
