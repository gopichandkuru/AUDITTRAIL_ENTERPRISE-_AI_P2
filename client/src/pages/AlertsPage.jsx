import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useUIStore } from '../store/uiStore';
import { format } from 'date-fns';
import { Bell, Pause, Play, Trash2, AlertOctagon, AlertTriangle, Plus, X, Check } from 'lucide-react';

const DEFAULT_RULE = {
  name: '', description: '', severity: 'WARNING',
  condition: { field: 'action', operator: 'equals', value: '' },
  threshold: { count: 1, windowMinutes: 5 },
  actions: ['in_app'],
  isActive: true,
};

export default function AlertsPage() {
  const { showToast, notifications, unreadCount, clearUnread } = useUIStore();
  const [rules, setRules] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_RULE);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('rules'); // 'rules' | 'notifications'

  useEffect(() => {
    fetchAll();
    clearUnread();
  }, []);

  const fetchAll = async () => {
    try {
      const [rulesRes, notifRes] = await Promise.all([
        api.get('/alerts/rules'),
        api.get('/alerts/notifications'),
      ]);
      setRules(rulesRes.data.rules);
      setNotifs(notifRes.data.notifications);
    } catch {
      showToast('Failed to load alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async () => {
    if (!form.name || !form.condition.value) {
      showToast('Name and condition value are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/alerts/rules', form);
      showToast('Alert rule created!', 'success');
      setShowModal(false);
      setForm(DEFAULT_RULE);
      fetchAll();
    } catch {
      showToast('Failed to create rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule) => {
    try {
      await api.put(`/alerts/rules/${rule._id}`, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => r._id === rule._id ? { ...r, isActive: !r.isActive } : r));
    } catch {
      showToast('Failed to update rule', 'error');
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await api.delete(`/alerts/rules/${id}`);
      setRules((prev) => prev.filter((r) => r._id !== id));
      showToast('Rule deleted', 'success');
    } catch {
      showToast('Failed to delete rule', 'error');
    }
  };

  const markAllRead = async () => {
    await api.patch('/alerts/notifications/read-all');
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    clearUnread();
  };

  const FIELDS = ['action', 'severity', 'status', 'userId', 'resource', 'riskScore'];
  const OPERATORS = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'gt', label: 'Greater than' },
    { value: 'lt', label: 'Less than' },
    { value: 'in', label: 'Is one of' },
  ];

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Configure alert rules and view notifications</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={14} /> New Alert Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        {[
          { id: 'rules', label: `Alert Rules (${rules.length})` },
          { id: 'notifications', label: `Notifications ${unreadCount > 0 ? `(${unreadCount} new)` : ''}` },
        ].map((t) => (
          <button
            key={t.id}
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : tab === 'rules' ? (
        <>
          {rules.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><Bell size={32} /></div>
                <h3>No alert rules yet</h3>
                <p>Create your first rule to start monitoring events</p>
                <button className="btn btn-primary btn-sm flex items-center gap-2" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}><Plus size={14} /> Create Rule</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rules.map((rule) => (
                <div key={rule._id} className="card" style={{ padding: '18px 22px' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name}</span>
                        <span className={`badge ${rule.severity === 'CRITICAL' ? 'badge-critical' : rule.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`}>
                          {rule.severity}
                        </span>
                        <span className={`badge ${rule.isActive ? 'badge-success' : 'badge-info'}`}>
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{rule.description}</div>
                      <div className="flex gap-3" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>When <strong style={{ color: 'var(--text-primary)' }}>{rule.condition.field}</strong> {rule.condition.operator} <strong style={{ color: 'var(--text-primary)' }}>{String(rule.condition.value)}</strong></span>
                        {rule.triggerCount > 0 && (
                          <span>· Triggered <strong style={{ color: 'var(--text-primary)' }}>{rule.triggerCount}</strong> times</span>
                        )}
                        {rule.lastTriggered && (
                          <span>· Last: {format(new Date(rule.lastTriggered), 'MMM d, HH:mm')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={`btn btn-sm flex items-center gap-1 ${rule.isActive ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => toggleRule(rule)}
                      >{rule.isActive ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Enable</>}</button>
                      <button className="btn btn-secondary btn-sm flex items-center justify-center text-danger hover-danger" onClick={() => deleteRule(rule._id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {notifs.filter((n) => !n.read).length} unread notifications
            </span>
            {notifs.some((n) => !n.read) && (
              <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={markAllRead}><Check size={14} /> Mark all read</button>
            )}
          </div>

          {[...notifications, ...notifs].length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><Bell size={32} /></div>
                <h3>No notifications</h3>
                <p>Alert notifications will appear here when rules are triggered</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Real-time notifications from socket */}
              {notifications.map((n, i) => (
                <div key={`rt-${i}`} className="card" style={{
                  padding: '14px 18px',
                  borderLeft: `3px solid ${n.severity === 'CRITICAL' ? 'var(--text-primary)' : 'var(--text-secondary)'}`,
                  background: 'var(--bg-elevated)',
                }}>
                  <div className="flex items-center gap-3">
                    <span style={{ display: 'flex', color: n.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)' }}>
                      {n.severity === 'CRITICAL' ? <AlertOctagon size={20} /> : <AlertTriangle size={20} />}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                    </div>
                    <span className="badge badge-accent">Live</span>
                  </div>
                </div>
              ))}
              {/* DB notifications */}
              {notifs.map((n) => (
                <div key={n._id} className="card" style={{
                  padding: '14px 18px',
                  opacity: n.read ? 0.65 : 1,
                  borderLeft: `3px solid ${n.severity === 'CRITICAL' ? 'var(--text-primary)' : 'var(--text-secondary)'}`,
                }}>
                  <div className="flex items-center gap-3">
                    <span style={{ display: 'flex', color: n.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)' }}>
                      {n.severity === 'CRITICAL' ? <AlertOctagon size={20} /> : <AlertTriangle size={20} />}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {format(new Date(n.createdAt), 'MMM d, HH:mm')}
                    </div>
                    {!n.read && <span className="dot dot-pulse" style={{ background: 'var(--text-primary)' }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Rule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Alert Rule</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Rule Name</label>
                <input className="form-input" placeholder="e.g. Multiple Failed Logins"
                  value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="Optional description"
                  value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="grid grid-3" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Field</label>
                  <select className="form-input form-select"
                    value={form.condition.field}
                    onChange={(e) => setForm((p) => ({ ...p, condition: { ...p.condition, field: e.target.value } }))}>
                    {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Operator</label>
                  <select className="form-input form-select"
                    value={form.condition.operator}
                    onChange={(e) => setForm((p) => ({ ...p, condition: { ...p.condition, operator: e.target.value } }))}>
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Value</label>
                  <input className="form-input" placeholder="e.g. LOGIN_FAILED"
                    value={form.condition.value}
                    onChange={(e) => setForm((p) => ({ ...p, condition: { ...p.condition, value: e.target.value } }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alert Severity</label>
                <select className="form-input form-select" value={form.severity}
                  onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3" style={{ marginTop: 24 }}>
              <button className="btn btn-primary flex-1 justify-center" onClick={saveRule} disabled={saving}>
                {saving ? <><span className="spinner spinner-sm" /> Saving…</> : 'Create Rule'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
