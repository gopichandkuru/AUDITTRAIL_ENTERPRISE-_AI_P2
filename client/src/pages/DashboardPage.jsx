import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import StatCard from '../components/ui/StatCard';
import SeverityBadge from '../components/ui/SeverityBadge';
import '../components/ui/StatCard.css';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
  SUCCESS: '#10b981',
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, analyticsRes, logsRes] = await Promise.all([
        api.get('/logs/stats/summary'),
        api.get('/analytics/overview?days=7'),
        api.get('/logs?limit=8&sortBy=timestamp&sortOrder=desc'),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setLiveLogs(logsRes.data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNewLog = useCallback((log) => {
    setLiveLogs((prev) => [log, ...prev].slice(0, 8));
    setStats((prev) => prev ? { ...prev, last24h: (prev.last24h || 0) + 1 } : prev);
  }, []);

  useSocket(handleNewLog);

  // Build pie data
  const pieData = stats?.severityBreakdown
    ? Object.entries(stats.severityBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 14px', fontSize: 12,
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color, fontWeight: 500 }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time overview — {format(new Date(), 'EEEE, MMMM d yyyy')}</p>
        </div>
        <span className="live-badge">
          <span className="dot dot-pulse" />
          Live
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <StatCard icon="📋" label="Total Events" value={stats?.total?.toLocaleString()} loading={loading} />
        <StatCard icon="⚡" label="Last 24 Hours" value={stats?.last24h?.toLocaleString()} loading={loading} accent="info" />
        <StatCard icon="🚨" label="Critical (7d)" value={stats?.critical?.toLocaleString()} loading={loading} accent="critical" />
        <StatCard icon="🚩" label="Flagged Events" value={stats?.flagged?.toLocaleString()} loading={loading} accent="warning" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 28 }}>
        {/* Area Chart */}
        <div className="card">
          <div className="card-title">Event Volume — Last 7 Days</div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : analytics?.timeSeriesData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.timeSeriesData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fill: '#4a4d6b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a4d6b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Total" stroke="#6366f1" fill="url(#colorCount)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" fill="url(#colorCrit)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📈</div><p>No data yet</p></div>
          )}
        </div>

        {/* Severity Pie */}
        <div className="card">
          <div className="card-title">Severity Distribution</div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">🥧</div><p>No data yet</p></div>
          )}
        </div>
      </div>

      {/* Live Feed */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Live Audit Feed</div>
          <span className="live-badge">
            <span className="dot dot-pulse" />
            Real-time
          </span>
        </div>
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {liveLogs.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📭</div>
                      <h3>No events yet</h3>
                      <p>Run the seed script to populate demo data</p>
                    </div>
                  </td></tr>
                ) : liveLogs.map((log) => (
                  <tr key={log._id || log.eventId} className="slide-up">
                    <td><SeverityBadge severity={log.severity} /></td>
                    <td className="td-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="td-primary">{log.userName}</td>
                    <td>
                      <span className="tag">{log.action}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.resource}</td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : log.status === 'FAILURE' ? 'badge-critical' : 'badge-info'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="td-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Actions */}
      {analytics?.actionBreakdown?.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title">Top Actions (7d)</div>
          <div className="flex flex-wrap gap-3">
            {analytics.actionBreakdown.slice(0, 10).map((a) => (
              <div key={a.action} className="flex items-center gap-2" style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.action}</span>
                <span className="badge badge-accent">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
