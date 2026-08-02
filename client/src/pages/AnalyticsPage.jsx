import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/queries/analytics/overview?days=${days}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="page-wrapper fade-in">
      <div className="page-header"><h1 className="page-title">Analytics</h1></div>
      <div className="loading-center"><div className="spinner" /></div>
    </div>
  );

  const { dailyEvents = [], eventTypeBreakdown = [], statusTrend = [], temperatureTrend = [] } = data || {};

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Logistics metrics and trends</p>
        </div>
        <select className="form-select" style={{ width: 160 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="grid grid-2 mb-4">
        {/* Daily Events */}
        <div className="card">
          <div className="card-title">📊 Daily Event Volume</div>
          {dailyEvents.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyEvents} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Events" stroke="#6366f1" fill="url(#colorEvents)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon">📊</div><p>No data for this period</p></div>}
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-title">🥧 Shipment Status Distribution</div>
          {statusTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusTrend} dataKey="count" nameKey="_id" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusTrend.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon">🥧</div><p>No shipments yet</p></div>}
        </div>
      </div>

      <div className="grid grid-2 mb-4">
        {/* Event Type Breakdown */}
        <div className="card">
          <div className="card-title">🔠 Top Event Types</div>
          {eventTypeBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={eventTypeBreakdown} layout="vertical" margin={{ top: 0, right: 5, bottom: 0, left: 10 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="_id" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon">🔠</div><p>No events yet</p></div>}
        </div>

        {/* Temperature Trend */}
        <div className="card">
          <div className="card-title">🌡️ Temperature Trend</div>
          {temperatureTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={temperatureTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => format(new Date(v), 'MMM d')}
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                        <div style={{ color: 'var(--text-muted)' }}>{d.aggregateId}</div>
                        <div style={{ color: d.alert ? '#ef4444' : '#10b981', fontWeight: 600, marginTop: 4 }}>
                          {d.value}°{d.unit} {d.alert ? '⚠️' : ''}
                        </div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="value" name="°C" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon">🌡️</div><p>No temperature data</p></div>}
        </div>
      </div>
    </div>
  );
}
