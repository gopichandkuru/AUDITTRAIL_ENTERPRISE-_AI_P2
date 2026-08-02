import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { SkeletonTable } from '../components/ui/Skeleton';

const EVENT_ICONS = {
  SHIPMENT_CREATED: '📦', ITEM_ADDED: '➕', ITEM_REMOVED: '➖',
  TEMPERATURE_RECORDED: '🌡️', LOCATION_UPDATED: '📍', CONTAINER_LOADED: '🏗️',
  IN_TRANSIT: '🚢', STATUS_CHANGED: '🔄', DELIVERED: '✅',
  DELAYED: '⏰', TRANSFER_INITIATED: '🔀', SHIPMENT_CANCELLED: '❌',
};

const EVENT_TYPES = Object.keys(EVENT_ICONS);

export default function EventLogPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, limit: 30, eventType: '', aggregateType: 'Shipment' });
  const [expanded, setExpanded] = useState(null);

  const fetchEvents = async (f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
      const { data } = await api.get(`/queries/events?${params}`);
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const applyFilter = (key, value) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    fetchEvents(next);
  };

  const setPage = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    fetchEvents(next);
  };

  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header">
        <h1 className="page-title">Event Log</h1>
        <p className="page-subtitle">Append-only global event stream — {total.toLocaleString()} events total</p>
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="form-select"
            style={{ maxWidth: 220 }}
            value={filters.eventType}
            onChange={(e) => applyFilter('eventType', e.target.value)}
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{EVENT_ICONS[t]} {t}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => { const f = { ...filters, eventType: '', page: 1 }; setFilters(f); fetchEvents(f); }}>
            Clear Filters
          </button>
          <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>
            {total.toLocaleString()} events
          </span>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Aggregate ID</th>
                  <th>Version</th>
                  <th>By</th>
                  <th>Timestamp</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🗃</div>
                      <h3>No events found</h3>
                      <p>Events will appear here as shipments are created and modified</p>
                    </div>
                  </td></tr>
                ) : events.map((ev) => (
                  <React.Fragment key={ev._id}>
                    <tr className="slide-up" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === ev._id ? null : ev._id)}>
                      <td>
                        <span className="flex items-center gap-2">
                          <span>{EVENT_ICONS[ev.eventType] || '📋'}</span>
                          <span className="tag" style={{ fontSize: '0.75rem' }}>{ev.eventType}</span>
                        </span>
                      </td>
                      <td className="font-mono text-sm td-primary">{ev.aggregateId}</td>
                      <td><span className="badge badge-neutral">v{ev.version}</span></td>
                      <td className="text-secondary">{ev.metadata?.userName || '—'}</td>
                      <td className="text-muted text-sm font-mono">
                        {format(new Date(ev.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {expanded === ev._id ? '▲' : '▼'} expand
                        </span>
                      </td>
                    </tr>
                    {expanded === ev._id && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--bg-elevated)', padding: '12px 16px' }}>
                          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify({ payload: ev.payload, metadata: ev.metadata }, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border)' }}>
            <span className="text-muted text-sm">Page {filters.page} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setPage(filters.page - 1)}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={filters.page >= totalPages} onClick={() => setPage(filters.page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
