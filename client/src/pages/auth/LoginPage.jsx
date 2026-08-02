import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
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
          <div className="auth-logo-icon">🛡</div>
          <div>
            <div className="auth-logo-title">AuditTrail</div>
            <div className="auth-logo-sub">Enterprise AI</div>
          </div>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Sign in to your account</h2>
          <p className="auth-subtitle">Monitor, analyze, and secure your audit trails</p>

          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
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
              className="btn btn-primary auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="spinner spinner-sm" /> Signing in...</>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="auth-demo">
            <div className="auth-demo-label">Quick demo access</div>
            <div className="auth-demo-btns">
              <button className="auth-demo-btn" onClick={() => fillDemo('admin')}>
                <span className="badge badge-critical">Admin</span>
              </button>
              <button className="auth-demo-btn" onClick={() => fillDemo('auditor')}>
                <span className="badge badge-warning">Auditor</span>
              </button>
              <button className="auth-demo-btn" onClick={() => fillDemo('viewer')}>
                <span className="badge badge-info">Viewer</span>
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
            <span key={f} className="auth-feature-tag">✓ {f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
