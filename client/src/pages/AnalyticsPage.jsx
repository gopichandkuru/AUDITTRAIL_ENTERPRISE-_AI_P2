import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useUIStore } from '../store/uiStore';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4'];
const SEVERITY_COLORS = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6', SUCCESS: '#10b981' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      {label && <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color || 'var(--text-primary)', fontWeight: 500 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { showToast } = useUIStore();
  const [data, setData] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, riskRes] = await Promise.all([
          api.get(`/analytics/overview?days=${days}`),
          api.get('/analytics/risk'),
        ]);
        setData(analyticsRes.data);
        setRisk(riskRes.data);
      } catch {
        showToast('Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [days]);

  // Build heatmap data (hour x dayOfWeek grid)
  const buildHeatmap = () => {
    if (!data?.hourlyHeatmap) return [];
    const grid = {};
    data.hourlyHeatmap.forEach(({ _id: { hour, dayOfWeek }, count }) => {
      const key = `${dayOfWeek}-${hour}`;
      grid[key] = count;
    });
    return grid;
  };

  const heatmapData = buildHeatmap();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxHeat = Math.max(...Object.values(heatmapData), 1);

  const getHeatColor = (count) => {
    if (!count) return 'rgba(255,255,255,0.04)';
    const intensity = count / maxHeat;
    if (intensity > 0.75) return '#6366f1';
    if (intensity > 0.5) return '#818cf8';
    if (intensity > 0.25) return '#a5b4fc';
    return 'rgba(99,102,241,0.3)';
  };

  // Pie data for actions
  const actionPie = data?.actionBreakdown?.slice(0, 8).map((a) => ({ name: a.action, value: a.count })) || [];

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Deep-dive behavioral analysis and trends</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDays(d)}
            >{d}d</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Event Trend */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Event Volume Trend — Last {days} Days</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.timeSeriesData || []} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fill: '#4a4d6b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a4d6b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Total" stroke="#6366f1" fill="url(#gradTotal)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" fill="url(#gradCrit)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="warning" name="Warning" stroke="#f59e0b" fill="url(#gradWarn)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 24 }}>
            {/* Action Breakdown Bar */}
            <div className="card">
              <div className="card-title">Top Actions Breakdown</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.actionBreakdown || []} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                  <XAxis type="number" tick={{ fill: '#4a4d6b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="action" type="category" tick={{ fill: '#8b8fa8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>
                    {(data?.actionBreakdown || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Action Pie */}
            <div className="card">
              <div className="card-title">Action Distribution</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={actionPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {actionPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{val}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Activity Heatmap — Hour × Day of Week</div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(24, 1fr)`, gap: 4, minWidth: 720 }}>
                {/* Header row */}
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 4 }}>
                    {h.toString().padStart(2, '0')}
                  </div>
                ))}
                {/* Day rows (1=Sun...7=Sat) */}
                {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
                  <React.Fragment key={dow}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {DAYS[dow - 1]}
                    </div>
                    {Array.from({ length: 24 }, (_, h) => {
                      const count = heatmapData[`${dow}-${h}`] || 0;
                      return (
                        <div
                          key={h}
                          title={`${DAYS[dow - 1]} ${h}:00 — ${count} events`}
                          style={{
                            height: 28,
                            borderRadius: 4,
                            background: getHeatColor(count),
                            transition: 'var(--transition)',
                            cursor: count > 0 ? 'pointer' : 'default',
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Low</span>
                {[0.1, 0.3, 0.5, 0.75, 1].map((i) => (
                  <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: getHeatColor(Math.ceil(i * maxHeat)) }} />
                ))}
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            {/* Top Users */}
            <div className="card">
              <div className="card-title">Most Active Users (Top 10)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data?.topUsers || []).map((u, i) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: COLORS[i % COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {u.userName?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{u.userName}</div>
                      <div style={{ marginTop: 3 }}>
                        <div className="risk-bar">
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${(u.count / (data.topUsers[0]?.count || 1)) * 100}%`,
                            background: COLORS[i % COLORS.length],
                          }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                      {u.count}
                    </div>
                    {u.critical > 0 && (
                      <span className="badge badge-critical" style={{ flexShrink: 0 }}>{u.critical} crit</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* High Risk Users */}
            <div className="card">
              <div className="card-title">⚠ High Risk Users</div>
              {(risk?.highRiskUsers || []).length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="empty-state-icon">✅</div>
                  <h3>No high-risk users</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {risk.highRiskUsers.map((u) => (
                    <div key={u.userId} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.userName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.userEmail}</div>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: u.avgRisk >= 70 ? 'var(--critical)' : 'var(--warning)' }}>
                          {u.avgRisk}
                        </div>
                      </div>
                      <div className="risk-bar">
                        <div className={`risk-fill ${u.avgRisk >= 70 ? 'risk-fill-high' : 'risk-fill-medium'}`}
                          style={{ width: `${u.avgRisk}%` }} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        {u.eventCount} events · Max risk: {u.maxRisk}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
