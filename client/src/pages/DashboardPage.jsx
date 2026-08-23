import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Package, Zap, CheckCircle2, AlertTriangle, Truck, Clock, Thermometer, Calendar,
  BarChart3, PieChart as PieChartIcon, Activity, PlusSquare, MinusSquare,
  MapPin, Anchor, RotateCw, XCircle, Shuffle
} from 'lucide-react';

const STATUS_COLORS = {
  PENDING:    '#92989B',
  PROCESSING: '#687076',
  IN_TRANSIT: '#111315',
  AT_PORT:    '#5D7585',
  DELIVERED:  '#2F6F6D',
  DELAYED:    '#B18445',
  CANCELLED:  '#A65D5D',
};

const EVENT_ICONS = {
  SHIPMENT_CREATED:    <Package size={16} />,
  ITEM_ADDED:          <PlusSquare size={16} />,
  ITEM_REMOVED:        <MinusSquare size={16} />,
  TEMPERATURE_RECORDED:<Thermometer size={16} />,
  LOCATION_UPDATED:    <MapPin size={16} />,
  CONTAINER_LOADED:    <Anchor size={16} />,
  IN_TRANSIT:          <Truck size={16} />,
  STATUS_CHANGED:      <RotateCw size={16} />,
  DELIVERED:           <CheckCircle2 size={16} />,
  DELAYED:             <AlertTriangle size={16} />,
  TRANSFER_INITIATED:  <Shuffle size={16} />,
  SHIPMENT_CANCELLED:  <XCircle size={16} />,
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
    { icon: <Package size={20} />, label: 'Total Shipments',    value: stats?.totalShipments,     accent: 'accent' },
    { icon: <Zap size={20} />, label: 'Events Today',        value: stats?.eventsToday,         accent: 'info' },
    { icon: <CheckCircle2 size={20} />, label: 'Delivered',            value: stats?.delivered,           accent: 'success' },
    { icon: <AlertTriangle size={20} />, label: 'Delayed',              value: stats?.delayed,             accent: 'warning' },
    { icon: <Truck size={20} />, label: 'In Transit',           value: stats?.inTransit,           accent: 'purple' },
    { icon: <Clock size={20} />, label: 'Pending',              value: stats?.pending,             accent: 'neutral' },
    { icon: <Thermometer size={20} />, label: 'Temp Alerts',         value: stats?.temperatureAlerts,   accent: 'critical' },
    { icon: <Calendar size={20} />, label: 'Events This Week',     value: stats?.eventsThisWeek,      accent: 'info' },
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
          <div className="card-title"><BarChart3 size={18} className="text-secondary" /> Daily Events — Last 7 Days</div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : analytics?.dailyEvents?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics.dailyEvents} margin={{ top: 20, right: 10, bottom: 20, left: -10 }}>
                <XAxis dataKey="_id" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<CustomTooltip />} />
                <Bar dataKey="count" name="Events" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><BarChart3 size={32} /></div>
              <p>No events in the last 7 days</p>
            </div>
          )}
        </div>

        {/* Status Donut */}
        <div className="card">
          <div className="card-title"><PieChartIcon size={18} className="text-secondary" /> Shipment Status Distribution</div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="45%"
                  innerRadius={70} outerRadius={100}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusPieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || 'var(--text-primary)'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(val) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, paddingLeft: 4 }}>{val}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><PieChartIcon size={32} /></div>
              <p>No shipments yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title" style={{ margin: 0 }}><Activity size={18} className="text-secondary" /> Live Event Feed</div>
          <span className="live-badge">
            <span className="dot dot-pulse" style={{ color: 'var(--accent)' }} />
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
                        <div className="empty-state-icon"><Activity size={32} /></div>
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
                          <span style={{ color: 'var(--text-secondary)' }}>{EVENT_ICONS[ev.eventType] || <Activity size={16} />}</span>
                          <span className="tag" style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text-primary)', fontWeight: 500 }}>{ev.eventType.replace(/_/g, ' ')}</span>
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
          <div className="card-title"><Activity size={18} className="text-secondary" /> Top Event Types (7 days)</div>
          <div className="flex flex-wrap gap-2">
            {analytics.eventTypeBreakdown.map((et) => (
              <div key={et._id} className="flex items-center gap-2" style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '7px 14px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {EVENT_ICONS[et._id] || <Activity size={16} />} 
                  <span style={{ color: 'var(--text-primary)' }}>{et._id.replace(/_/g, ' ')}</span>
                </span>
                <span className="badge badge-neutral" style={{ border: 'none', background: 'var(--bg-hover)' }}>{et.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
