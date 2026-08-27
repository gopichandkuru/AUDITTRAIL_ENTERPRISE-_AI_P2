import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ShieldCheck, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import './Auth.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.email, form.password);
    if (result.success) navigate('/dashboard');
  };

  const fillDemo = (role) => {
    const creds = {
      admin: { email: 'admin@audittrail.io', password: 'admin123' },
      auditor: { email: 'sarah@audittrail.io', password: 'auditor123' },
      viewer: { email: 'marcus@audittrail.io', password: 'viewer123' },
    };
    setForm(creds[role]);
    clearError();
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-bg-grid" />
      </div>

      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon flex items-center justify-center"><ShieldCheck size={36} className="text-accent" /></div>
          <div>
            <div className="auth-logo-title">AuditTrail</div>
            <div className="auth-logo-sub">Enterprise AI</div>
          </div>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Sign in to your account</h2>
          <p className="auth-subtitle">Monitor, analyze, and secure your audit trails</p>

          {error && (
            <div className="auth-error flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn flex justify-center items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="spinner spinner-sm" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="auth-demo">
            <div className="auth-demo-label">Quick demo access (click to fill)</div>
            <div className="auth-demo-btns">
              <button type="button" className="auth-demo-btn" onClick={() => fillDemo('admin')} title="admin@audittrail.io / admin123">
                <span className="badge badge-critical">Admin</span>
                <span style={{ fontSize: '11px', opacity: 0.7, display: 'block', marginTop: '2px' }}>admin123</span>
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => fillDemo('auditor')} title="sarah@audittrail.io / auditor123">
                <span className="badge badge-warning">Auditor</span>
                <span style={{ fontSize: '11px', opacity: 0.7, display: 'block', marginTop: '2px' }}>auditor123</span>
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => fillDemo('viewer')} title="marcus@audittrail.io / viewer123">
                <span className="badge badge-info">Viewer</span>
                <span style={{ fontSize: '11px', opacity: 0.7, display: 'block', marginTop: '2px' }}>viewer123</span>
              </button>
            </div>
          </div>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">Create account</Link>
          </div>
        </div>

        <div className="auth-features">
          {['Real-time log monitoring', 'AI anomaly detection', 'SOC 2 & GDPR compliance'].map((f) => (
            <span key={f} className="auth-feature-tag flex items-center gap-1"><Check size={14} className="text-accent" /> {f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
