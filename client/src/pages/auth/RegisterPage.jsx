import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import './Auth.css';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(form.name, form.email, form.password, form.role);
    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-bg-grid" />
      </div>

      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-icon flex items-center justify-center"><ShieldCheck size={36} className="text-accent" /></div>
          <div>
            <div className="auth-logo-title">AuditTrail</div>
            <div className="auth-logo-sub">Enterprise AI</div>
          </div>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">Join your team's audit monitoring platform</p>

          {error && (
            <div className="auth-error flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="John Smith"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
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
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select name="role" className="form-input form-select" value={form.role} onChange={handleChange}>
                <option value="viewer">Viewer — Read-only access</option>
                <option value="auditor">Auditor — Read + Export</option>
                <option value="admin">Admin — Full access</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn flex items-center justify-center gap-2" disabled={isLoading}>
              {isLoading ? <><span className="spinner spinner-sm" /> Creating account...</> : <>Create Account <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
