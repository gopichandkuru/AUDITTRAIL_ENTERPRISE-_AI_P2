import React, { useState } from 'react';
import api from '../api/axios';
import { useUIStore } from '../store/uiStore';
import SeverityBadge from '../components/ui/SeverityBadge';
import { format } from 'date-fns';

export default function AIInsightsPage() {
  const { showToast } = useUIStore();

  // NL Query
  const [nlQuery, setNlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Anomalies
  const [anomalies, setAnomalies] = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  // Summary
  const [summaryRange, setSummaryRange] = useState({ startDate: '', endDate: '' });
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Risk Scores
  const [riskScores, setRiskScores] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const runQuery = async () => {
    if (!nlQuery.trim()) return;
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const { data } = await api.post('/ai/query', { query: nlQuery });
      setQueryResult(data);
    } catch (e) {
      showToast('Query failed', 'error');
    } finally {
      setQueryLoading(false);
    }
  };

  const detectAnomalies = async () => {
    setAnomalyLoading(true);
    setAnomalies(null);
    try {
      const { data } = await api.post('/ai/anomalies');
      setAnomalies(data);
    } catch (e) {
      showToast('Analysis failed', 'error');
    } finally {
      setAnomalyLoading(false);
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    setSummary(null);
    try {
      const { data } = await api.post('/ai/summarize', summaryRange);
      setSummary(data);
    } catch (e) {
      showToast('Summary failed', 'error');
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadRiskScores = async () => {
    setRiskLoading(true);
    try {
      const { data } = await api.get('/ai/risk-scores');
      setRiskScores(data.riskScores);
    } catch (e) {
      showToast('Failed to load risk scores', 'error');
    } finally {
      setRiskLoading(false);
    }
  };

  const RISK_EXAMPLES = [
    'Show me all failed logins from yesterday',
    'Find critical events in the last week',
    'Show bulk delete operations',
    'List flagged events',
    'Show events by admin users today',
  ];

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header">
        <h1 className="page-title">🤖 AI Insights</h1>
        <p className="page-subtitle">Gemini-powered anomaly detection, natural language querying, and risk analysis</p>
      </div>

      {/* AI Badge */}
      <div className="alert-banner info" style={{ marginBottom: 24 }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <span>
          <strong>Gemini AI</strong> — Add your <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>GEMINI_API_KEY</code> to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>server/.env</code> for full AI features. Statistical analysis always runs without a key.
        </span>
      </div>

      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Natural Language Query */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔍</span> Natural Language Query
          </div>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
            Ask questions about your audit logs in plain English
          </p>

          <div className="flex gap-3" style={{ marginBottom: 12 }}>
            <input
              className="form-input flex-1"
              placeholder='e.g. "Show all failed logins from yesterday"'
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runQuery()}
            />
            <button className="btn btn-primary" onClick={runQuery} disabled={queryLoading || !nlQuery.trim()}>
              {queryLoading ? <><span className="spinner spinner-sm" /> Querying…</> : '⚡ Run Query'}
            </button>
          </div>

          {/* Example queries */}
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
            {RISK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                className="btn btn-secondary btn-sm"
                onClick={() => setNlQuery(ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          {queryResult && (
            <>
              <div className="ai-response">
                <div className="ai-response-label">✨ AI Response</div>
                <div style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {queryResult.explanation} — <strong style={{ color: 'var(--text-primary)' }}>{queryResult.count} events</strong> found
                </div>
              </div>
              {queryResult.logs?.length > 0 && (
                <div className="table-wrapper" style={{ marginTop: 16 }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Severity</th><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {queryResult.logs.slice(0, 15).map((log) => (
                        <tr key={log._id}>
                          <td><SeverityBadge severity={log.severity} /></td>
                          <td className="td-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                          </td>
                          <td className="td-primary">{log.userName}</td>
                          <td><span className="tag">{log.action}</span></td>
                          <td>{log.resource}</td>
                          <td><span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-critical'}`}>{log.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Anomaly Detection */}
        <div className="card">
          <div className="card-title">🚨 Anomaly Detection</div>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
            AI scans the last 24h of logs for suspicious patterns
          </p>
          <button className="btn btn-primary btn-sm" onClick={detectAnomalies} disabled={anomalyLoading}>
            {anomalyLoading ? <><span className="spinner spinner-sm" /> Analyzing…</> : '🔍 Detect Anomalies'}
          </button>

          {anomalies && (
            <div style={{ marginTop: 16 }}>
              <div className="ai-response" style={{ marginBottom: 16 }}>
                <div className="ai-response-label">✨ AI Summary</div>
                {anomalies.summary}
              </div>

              {anomalies.anomalies?.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="empty-state-icon">✅</div>
                  <h3>No anomalies detected</h3>
                  <p>Activity looks normal in the last 24 hours</p>
                </div>
              ) : anomalies.anomalies.map((a, i) => (
                <div key={i} style={{
                  background: a.severity === 'CRITICAL' ? 'var(--critical-dim)' : 'var(--warning-dim)',
                  border: `1px solid ${a.severity === 'CRITICAL' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: 10,
                }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <SeverityBadge severity={a.severity} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.title}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Risk: {a.riskScore}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{a.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Summary */}
        <div className="card">
          <div className="card-title">📄 Executive Summary</div>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
            Generate an AI-written compliance summary for any time range
          </p>
          <div className="flex gap-3" style={{ marginBottom: 14 }}>
            <div className="form-group flex-1">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={summaryRange.startDate}
                onChange={(e) => setSummaryRange((p) => ({ ...p, startDate: e.target.value }))}
                style={{ colorScheme: 'dark' }} />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">End Date</label>
              <input type="date" className="form-input" value={summaryRange.endDate}
                onChange={(e) => setSummaryRange((p) => ({ ...p, endDate: e.target.value }))}
                style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={generateSummary} disabled={summaryLoading}>
            {summaryLoading ? <><span className="spinner spinner-sm" /> Generating…</> : '✍ Generate Summary'}
          </button>

          {summary && (
            <div style={{ marginTop: 16 }}>
              <div className="ai-response">
                <div className="ai-response-label">✨ Executive Summary</div>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0, fontSize: '0.88rem' }}>
                  {summary.summary}
                </p>
              </div>
              {summary.stats && (
                <div className="grid grid-2" style={{ gap: 8, marginTop: 12 }}>
                  {[
                    ['Total Events', summary.stats.total],
                    ['Critical', summary.stats.criticalCount],
                    ['Warnings', summary.stats.warningCount],
                    ['Failures', summary.stats.failureCount],
                    ['Flagged', summary.stats.flaggedCount],
                    ['Avg Risk', `${Math.round(summary.stats.avgRisk || 0)}/100`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Risk Scores */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>🎯 User Risk Scores (7d)</div>
            <button className="btn btn-secondary btn-sm" onClick={loadRiskScores} disabled={riskLoading}>
              {riskLoading ? <><span className="spinner spinner-sm" /> Loading…</> : '📊 Load Risk Scores'}
            </button>
          </div>

          {riskScores ? (
            riskScores.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">✅</div><h3>No risk data</h3></div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>User</th><th>Role</th><th>Risk Level</th><th>Risk Score</th><th>Events</th><th>Failures</th><th>Criticals</th></tr>
                  </thead>
                  <tbody>
                    {riskScores.map((u) => (
                      <tr key={u.userId}>
                        <td>
                          <div className="td-primary">{u.userName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.userEmail}</div>
                        </td>
                        <td><span className="tag">{u.userRole}</span></td>
                        <td>
                          <span className={`badge ${u.riskLevel === 'HIGH' ? 'badge-critical' : u.riskLevel === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>
                            {u.riskLevel}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="risk-bar" style={{ width: 80 }}>
                              <div className={`risk-fill ${u.riskScore >= 70 ? 'risk-fill-high' : u.riskScore >= 40 ? 'risk-fill-medium' : 'risk-fill-low'}`}
                                style={{ width: `${u.riskScore}%` }} />
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.riskScore}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.totalEvents}</td>
                        <td style={{ color: u.failures > 0 ? 'var(--critical)' : 'var(--text-secondary)' }}>{u.failures}</td>
                        <td style={{ color: u.criticals > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>{u.criticals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <h3>Load risk scores</h3>
              <p>Click the button above to compute AI risk scores for all users</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
