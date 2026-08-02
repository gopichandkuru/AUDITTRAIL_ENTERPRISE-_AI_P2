import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { SkeletonTable } from '../components/ui/Skeleton';

const EVENT_COLORS = {
  SHIPMENT_CREATED:    { bg: 'rgba(16,185,129,0.12)', border: '#10b981', color: '#10b981',   icon: '📦' },
  ITEM_ADDED:          { bg: 'rgba(59,130,246,0.12)',  border: '#3b82f6', color: '#3b82f6',   icon: '➕' },
  ITEM_REMOVED:        { bg: 'rgba(239,68,68,0.12)',   border: '#ef4444', color: '#ef4444',   icon: '➖' },
  TEMPERATURE_RECORDED:{ bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', color: '#f59e0b',   icon: '🌡️' },
  LOCATION_UPDATED:    { bg: 'rgba(99,102,241,0.12)',  border: '#6366f1', color: '#6366f1',   icon: '📍' },
  CONTAINER_LOADED:    { bg: 'rgba(139,92,246,0.12)', border: '#8b5cf6', color: '#8b5cf6',   icon: '🏗️' },
  IN_TRANSIT:          { bg: 'rgba(99,102,241,0.12)',  border: '#6366f1', color: '#6366f1',   icon: '🚢' },
  STATUS_CHANGED:      { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', color: '#f59e0b',   icon: '🔄' },
  DELIVERED:           { bg: 'rgba(16,185,129,0.12)', border: '#10b981', color: '#10b981',   icon: '✅' },
  DELAYED:             { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', color: '#ef4444',   icon: '⏰' },
  TRANSFER_INITIATED:  { bg: 'rgba(139,92,246,0.12)', border: '#8b5cf6', color: '#8b5cf6',   icon: '🔀' },
  SHIPMENT_CANCELLED:  { bg: 'rgba(107,114,128,0.12)',border: '#6b7280', color: '#6b7280',   icon: '❌' },
};

const DEFAULT_EVENT = { bg: 'rgba(99,102,241,0.1)', border: '#6366f1', color: '#6366f1', icon: '📋' };

function EventCard({ event, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const style = EVENT_COLORS[event.eventType] || DEFAULT_EVENT;

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: isLast ? 0 : 0 }}>
      {/* Timeline Line + Dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: style.bg, border: `2px solid ${style.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', zIndex: 1,
        }}>
          {style.icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 32, background: 'var(--border)', margin: '4px 0' }} />
        )}
      </div>

      {/* Event Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <div
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '14px 18px',
            cursor: 'pointer', transition: 'border-color 0.15s',
            borderLeft: `3px solid ${style.border}`,
          }}
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="tag" style={{ borderColor: style.border, color: style.color }}>
                {event.eventType}
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>v{event.version}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted text-sm font-mono">
                {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm:ss')}
              </span>
              <span style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▾
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4" style={{ marginTop: 8 }}>
            {event.metadata?.userName && (
              <span className="text-sm text-secondary">
                👤 {event.metadata.userName}
              </span>
            )}
            {event.metadata?.userRole && (
              <span className="badge badge-neutral text-xs">{event.metadata.userRole}</span>
            )}
            {event.metadata?.source && (
              <span className="text-xs text-muted">via {event.metadata.source}</span>
            )}
          </div>

          {/* Quick summary */}
          {!expanded && event.payload && (
            <div className="text-sm text-muted" style={{ marginTop: 8 }}>
              {event.eventType === 'TEMPERATURE_RECORDED' && `🌡️ ${event.payload.value}°${event.payload.unit}${event.payload.alert ? ' ⚠️ ALERT' : ''}`}
              {event.eventType === 'LOCATION_UPDATED' && `📍 ${event.payload.city}, ${event.payload.country}`}
              {event.eventType === 'ITEM_ADDED' && `📦 ${event.payload.name} × ${event.payload.quantity}`}
              {event.eventType === 'STATUS_CHANGED' && `→ ${event.payload.status}`}
              {event.eventType === 'DELIVERED' && `✅ Delivered at ${event.payload.deliveredAt ? format(new Date(event.payload.deliveredAt), 'MMM d, HH:mm') : '—'}`}
              {event.eventType === 'DELAYED' && `Reason: ${event.payload.reason}`}
            </div>
          )}

          {/* Expanded payload */}
          {expanded && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div className="text-xs text-muted" style={{ marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payload</div>
              <pre style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {JSON.stringify(event.payload, null, 2)}
              </pre>
              {event.metadata && (
                <>
                  <div className="text-xs text-muted" style={{ marginTop: 12, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metadata</div>
                  <pre style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                    color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                  }}>
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const [shipments, setShipments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [events, setEvents] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    api.get('/queries/shipments?limit=50')
      .then(({ data }) => {
        setShipments(data.shipments || []);
        if (data.shipments?.length > 0) {
          setSelectedId(data.shipments[0].shipmentId);
        }
      })
      .finally(() => setLoadingShipments(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingEvents(true);
    api.get(`/queries/shipments/${selectedId}/timeline`)
      .then(({ data }) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [selectedId]);

  const eventTypes = [...new Set(events.map((e) => e.eventType))];
  const filtered = filterType ? events.filter((e) => e.eventType === filterType) : events;

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header">
        <h1 className="page-title">Event Timeline</h1>
        <p className="page-subtitle">Complete event history — append-only, auditable, immutable</p>
      </div>

      {/* Controls */}
      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 280px' }}>
            <select
              className="form-select"
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setFilterType(''); }}
              disabled={loadingShipments}
            >
              {loadingShipments ? (
                <option>Loading shipments...</option>
              ) : shipments.length === 0 ? (
                <option>No shipments yet</option>
              ) : (
                shipments.map((s) => (
                  <option key={s.shipmentId} value={s.shipmentId}>
                    {s.shipmentId} — {s.origin?.city || '?'} → {s.destination?.city || '?'} ({s.status})
                  </option>
                ))
              )}
            </select>
          </div>

          <select
            className="form-select"
            style={{ maxWidth: 200 }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All event types</option>
            {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
            <span className="badge badge-accent">{filtered.length} events</span>
            {filterType && (
              <span className="badge badge-neutral">Filtered: {filterType}</span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        {loadingEvents ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No events found</h3>
            <p>Select a shipment to view its event timeline</p>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <span className="font-mono text-sm text-secondary">{selectedId}</span>
              <span className="badge badge-accent">{filtered.length} events</span>
              <span className="text-muted text-sm">Earliest → Latest</span>
            </div>
            {[...filtered].reverse().map((ev, i) => (
              <EventCard
                key={ev._id}
                event={ev}
                isLast={i === filtered.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
