import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Activity, Thermometer, AlertTriangle } from 'lucide-react';

const STATUS_COLORS = {
  PENDING:    '#92989B',
  PROCESSING: '#687076',
  IN_TRANSIT: '#111315',
  AT_PORT:    '#5D7585',
  DELIVERED:  '#2F6F6D',
  DELAYED:    '#B18445',
  CANCELLED:  '#A65D5D',
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
          <div className="card-title"><BarChart3 size={18} className="text-secondary" /> Daily Event Volume</div>
          {dailyEvents.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyEvents} margin={{ top: 20, right: 10, bottom: 20, left: -10 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Events" stroke="var(--accent)" fill="url(#colorEvents)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon"><BarChart3 size={32} /></div><p>No data for this period</p></div>}
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-title"><PieChartIcon size={18} className="text-secondary" /> Shipment Status Distribution</div>
          {statusTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusTrend} dataKey="count" nameKey="_id" cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={2} stroke="none">
                  {statusTrend.map((entry, i) => <Cell key={entry._id} fill={STATUS_COLORS[entry._id] || 'var(--text-primary)'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, paddingLeft: 4 }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon"><PieChartIcon size={32} /></div><p>No shipments yet</p></div>}
        </div>
      </div>

      <div className="grid grid-2 mb-4">
        {/* Event Type Breakdown */}
        <div className="card">
          <div className="card-title"><Activity size={18} className="text-secondary" /> Top Event Types</div>
          {eventTypeBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={eventTypeBreakdown} layout="vertical" margin={{ top: 20, right: 10, bottom: 20, left: 10 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis type="category" dataKey="_id" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon"><Activity size={32} /></div><p>No events yet</p></div>}
        </div>

        {/* Temperature Trend */}
        <div className="card">
          <div className="card-title"><Thermometer size={18} className="text-secondary" /> Temperature Trend</div>
          {temperatureTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={temperatureTrend} margin={{ top: 20, right: 10, bottom: 20, left: -10 }}>
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => format(new Date(v), 'MMM d')}
                  dy={10}
                />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  cursor={{ fill: 'var(--bg-hover)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                        <div style={{ color: 'var(--text-muted)' }}>{d.aggregateId}</div>
                        <div style={{ color: d.alert ? 'var(--text-primary)' : 'var(--accent)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {d.value}°{d.unit} {d.alert ? <AlertTriangle size={14} color="var(--danger)" /> : null}
                        </div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="value" name="°C" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="empty-state-icon"><Thermometer size={32} /></div><p>No temperature data</p></div>}
        </div>
      </div>
    </div>
  );
}
