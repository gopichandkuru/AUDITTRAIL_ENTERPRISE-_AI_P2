import React, { useState } from 'react';
import api from '../api/axios';
import { useUIStore } from '../store/uiStore';
import { format } from 'date-fns';

const REPORT_TEMPLATES = [
  { id: 'soc2', name: 'SOC 2 Type II', icon: '🏛', description: 'System & Organization Controls audit report', scope: 'SOC 2' },
  { id: 'gdpr', name: 'GDPR Compliance', icon: '🇪🇺', description: 'General Data Protection Regulation activity report', scope: 'GDPR' },
  { id: 'iso27001', name: 'ISO 27001', icon: '🔐', description: 'Information security management report', scope: 'ISO 27001' },
  { id: 'general', name: 'General Audit', icon: '📋', description: 'Complete audit activity summary', scope: 'general' },
];

export default function ReportsPage() {
  const { showToast } = useUIStore();
  const [selected, setSelected] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!selected) return;
    setLoading(true);
    setReport(null);
    try {
      const { data } = await api.post('/ai/summarize', {
        ...dateRange,
        scope: selected.scope,
      });
      setReport({ ...data, template: selected, generatedAt: new Date() });
      showToast('Report generated successfully!', 'success');
    } catch {
      showToast('Report generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const content = `
AUDITTRAIL ENTERPRISE AI — COMPLIANCE REPORT
============================================
Template: ${report.template.name}
Generated: ${format(report.generatedAt, 'PPpp')}
${dateRange.startDate ? `Period: ${dateRange.startDate} to ${dateRange.endDate || 'now'}` : ''}

EXECUTIVE SUMMARY
-----------------
${report.summary}

STATISTICS
----------
Total Events: ${report.stats?.total || 0}
Critical Events: ${report.stats?.criticalCount || 0}
Warnings: ${report.stats?.warningCount || 0}
Failures: ${report.stats?.failureCount || 0}
Flagged Events: ${report.stats?.flaggedCount || 0}
Average Risk Score: ${Math.round(report.stats?.avgRisk || 0)}/100

ACTIVE USERS (SAMPLE)
---------------------
${report.uniqueUsers?.join(', ') || 'N/A'}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${report.template.id}-${format(report.generatedAt, 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded!', 'success');
  };

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate AI-powered compliance reports for SOC 2, GDPR, ISO 27001</p>
      </div>

      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Template Selection */}
        <div>
          <div className="card-title" style={{ marginBottom: 16 }}>Select Report Template</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {REPORT_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="card"
                onClick={() => setSelected(t)}
                style={{
                  cursor: 'pointer',
                  border: selected?.id === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: selected?.id === t.id ? '0 0 0 1px var(--accent)' : 'none',
                  padding: '16px 20px',
                  transition: 'var(--transition)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.8rem' }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.description}</div>
                  </div>
                  {selected?.id === t.id && (
                    <span className="badge badge-accent">Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Date range */}
          <div className="card" style={{ marginTop: 16, padding: '20px' }}>
            <div className="card-title" style={{ marginBottom: 14 }}>Report Period (Optional)</div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={dateRange.startDate}
                  onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
                  style={{ colorScheme: 'dark' }} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={dateRange.endDate}
                  onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
                  style={{ colorScheme: 'dark' }} />
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: 14, fontSize: '0.95rem' }}
            onClick={generateReport}
            disabled={!selected || loading}
          >
            {loading ? <><span className="spinner spinner-sm" /> Generating Report…</> : `✍ Generate ${selected?.name || 'Report'}`}
          </button>
        </div>

        {/* Report Preview */}
        <div>
          {!report && !loading && (
            <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <h3>No report generated yet</h3>
                <p>Select a template and click Generate</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="card" style={{ height: '100%', minHeight: 400 }}>
              <div className="loading-center" style={{ height: 400 }}>
                <div className="spinner" />
                <p className="text-secondary" style={{ marginTop: 12 }}>AI is generating your report…</p>
              </div>
            </div>
          )}

          {report && (
            <div className="card fade-in">
              {/* Report header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: '1.5rem' }}>{report.template.icon}</span>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {report.template.name}
                    </h2>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Generated: {format(report.generatedAt, 'PPpp')}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={downloadReport}>⬇ Download</button>
              </div>

              <hr className="divider" style={{ margin: '0 0 20px' }} />

              {/* Stats summary */}
              <div className="grid grid-3" style={{ gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Total Events', value: report.stats?.total, color: 'var(--accent-light)' },
                  { label: 'Critical', value: report.stats?.criticalCount, color: 'var(--critical)' },
                  { label: 'Warnings', value: report.stats?.warningCount, color: 'var(--warning)' },
                  { label: 'Failures', value: report.stats?.failureCount, color: 'var(--critical)' },
                  { label: 'Flagged', value: report.stats?.flaggedCount, color: 'var(--warning)' },
                  { label: 'Avg Risk', value: `${Math.round(report.stats?.avgRisk || 0)}/100`, color: 'var(--text-primary)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{value ?? 0}</div>
                  </div>
                ))}
              </div>

              {/* AI Summary */}
              <div className="ai-response">
                <div className="ai-response-label">✨ AI Executive Summary</div>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {report.summary}
                </p>
              </div>

              {report.uniqueUsers?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="card-title">Active Users During Period</div>
                  <div className="flex flex-wrap gap-2">
                    {report.uniqueUsers.map((u) => (
                      <span key={u} className="tag">{u}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
