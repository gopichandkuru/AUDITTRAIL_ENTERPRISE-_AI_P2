import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const STATUS_COLORS = {
  PENDING:    '#f59e0b',
  PROCESSING: '#3b82f6',
  IN_TRANSIT: '#6366f1',
  AT_PORT:    '#8b5cf6',
  DELIVERED:  '#10b981',
  DELAYED:    '#ef4444',
  CANCELLED:  '#6b7280',
};

const EVENT_ICONS = {
  SHIPMENT_CREATED:    '📦',
  ITEM_ADDED:          '➕',
  ITEM_REMOVED:        '➖',
  TEMPERATURE_RECORDED:'🌡️',
  LOCATION_UPDATED:    '📍',
  CONTAINER_LOADED:    '🏗️',
  IN_TRANSIT:          '🚢',
  STATUS_CHANGED:      '🔄',
  DELIVERED:           '✅',
  DELAYED:             '⏰',
  TRANSFER_INITIATED:  '🔀',
  SHIPMENT_CANCELLED:  '❌',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
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

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        api.get('/queries/dashboard/stats'),
        api.get('/queries/analytics/overview?days=7'),
      ]);
      setStats(statsRes.data.stats);
      setAnalytics(analyticsRes.data);
      setLiveEvents(statsRes.data.recentEvents || []);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSocket((event) => {
    setLiveEvents((prev) => [event, ...prev].slice(0, 8));
  });

  const statusPieData = stats?.statusBreakdown
    ? Object.entries(stats.statusBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const kpis = [
    { icon: '🚢', label: 'Total Shipments',    value: stats?.totalShipments,     accent: 'accent' },
    { icon: '⚡', label: 'Events Today',        value: stats?.eventsToday,         accent: 'info' },
    { icon: '✅', label: 'Delivered',            value: stats?.delivered,           accent: 'success' },
    { icon: '⏰', label: 'Delayed',              value: stats?.delayed,             accent: 'warning' },
    { icon: '🚦', label: 'In Transit',           value: stats?.inTransit,           accent: 'purple' },
    { icon: '🕐', label: 'Pending',              value: stats?.pending,             accent: 'neutral' },
    { icon: '🌡️', label: 'Temp Alerts',         value: stats?.temperatureAlerts,   accent: 'critical' },
    { icon: '📅', label: 'Events This Week',     value: stats?.eventsThisWeek,      accent: 'info' },
  ];

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Logistics Dashboard</h1>
          <p className="page-subtitle">
            Real-time overview — {format(new Date(), 'EEEE, MMMM d yyyy')}
          </p>
        </div>
        <span className="live-badge">
          <span className="dot dot-pulse" />
          Live
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4 mb-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map((kpi) => (
            <div key={kpi.label} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 'var(--radius-md)',
                background: `var(--${kpi.accent === 'accent' ? 'accent-subtle' : kpi.accent === 'success' ? 'success-bg' : kpi.accent === 'warning' ? 'warning-bg' : kpi.accent === 'critical' ? 'danger-bg' : kpi.accent === 'info' ? 'info-bg' : 'bg-elevated'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', flexShrink: 0,
              }}>
                {kpi.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {kpi.value?.toLocaleString() ?? '—'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{kpi.label}</div>
              </div>
            </div>
          ))}
      </div>

      <div className="grid grid-2 mb-4">
        {/* Daily Events Bar Chart */}
        <div className="card">
          <div className="card-title">📊 Daily Events — Last 7 Days</div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : analytics?.dailyEvents?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.dailyEvents} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Events" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>No events in the last 7 days</p>
            </div>
          )}
        </div>

        {/* Status Donut */}
        <div className="card">
          <div className="card-title">🥧 Shipment Status Distribution</div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                >
                  {statusPieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || 'var(--accent)'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(val) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🥧</div>
              <p>No shipments yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title" style={{ margin: 0 }}>⚡ Live Event Feed</div>
          <span className="live-badge">
            <span className="dot dot-pulse" />
            Real-time
          </span>
        </div>
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Shipment ID</th>
                  <th>Timestamp</th>
                  <th>By</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {liveEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <h3>No events yet</h3>
                        <p>Create a shipment to see events appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  liveEvents.map((ev) => (
                    <tr key={ev._id || ev.correlationId} className="slide-up">
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{EVENT_ICONS[ev.eventType] || '📋'}</span>
                          <span className="tag">{ev.eventType}</span>
                        </span>
                      </td>
                      <td className="td-mono text-sm">{ev.aggregateId}</td>
                      <td className="text-muted text-sm font-mono">
                        {ev.timestamp ? format(new Date(ev.timestamp), 'MMM d, HH:mm:ss') : '—'}
                      </td>
                      <td className="td-primary">{ev.metadata?.userName || '—'}</td>
                      <td>
                        <span className="badge badge-neutral">v{ev.version}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Type Breakdown */}
      {analytics?.eventTypeBreakdown?.length > 0 && (
        <div className="card mt-3" style={{ marginTop: 20 }}>
          <div className="card-title">🔠 Top Event Types (7 days)</div>
          <div className="flex flex-wrap gap-2">
            {analytics.eventTypeBreakdown.map((et) => (
              <div key={et._id} className="flex items-center gap-2" style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '7px 14px',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {EVENT_ICONS[et._id] || '📋'} {et._id}
                </span>
                <span className="badge badge-accent">{et.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
