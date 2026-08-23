import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { SkeletonTable } from '../components/ui/Skeleton';
import { 
  Package, PlusSquare, MinusSquare, Thermometer, MapPin, Anchor, 
  Truck, RotateCw, CheckCircle2, AlertTriangle, Shuffle, XCircle, 
  Clock3, User, Server, ChevronDown 
} from 'lucide-react';

const EVENT_COLORS = {
  SHIPMENT_CREATED:    { bg: 'var(--bg-elevated)', border: 'var(--text-secondary)', color: 'var(--text-secondary)',   icon: <Package size={16} /> },
  ITEM_ADDED:          { bg: 'var(--bg-elevated)', border: 'var(--text-primary)', color: 'var(--text-primary)',   icon: <PlusSquare size={16} /> },
  ITEM_REMOVED:        { bg: 'var(--bg-elevated)', border: 'var(--text-primary)', color: 'var(--text-primary)',   icon: <MinusSquare size={16} /> },
  TEMPERATURE_RECORDED:{ bg: 'var(--bg-elevated)', border: 'var(--text-muted)', color: 'var(--text-muted)',   icon: <Thermometer size={16} /> },
  LOCATION_UPDATED:    { bg: 'var(--bg-elevated)', border: 'var(--text-secondary)', color: 'var(--text-secondary)',   icon: <MapPin size={16} /> },
  CONTAINER_LOADED:    { bg: 'var(--bg-elevated)', border: 'var(--text-secondary)', color: 'var(--text-secondary)',   icon: <Anchor size={16} /> },
  IN_TRANSIT:          { bg: 'var(--bg-elevated)', border: 'var(--text-primary)', color: 'var(--text-primary)',   icon: <Truck size={16} /> },
  STATUS_CHANGED:      { bg: 'var(--bg-elevated)', border: 'var(--text-muted)', color: 'var(--text-muted)',   icon: <RotateCw size={16} /> },
  DELIVERED:           { bg: 'var(--bg-elevated)', border: 'var(--text-primary)', color: 'var(--text-primary)',   icon: <CheckCircle2 size={16} /> },
  DELAYED:             { bg: 'var(--bg-elevated)', border: 'var(--text-primary)', color: 'var(--text-primary)',   icon: <AlertTriangle size={16} /> },
  TRANSFER_INITIATED:  { bg: 'var(--bg-elevated)', border: 'var(--text-secondary)', color: 'var(--text-secondary)',   icon: <Shuffle size={16} /> },
  SHIPMENT_CANCELLED:  { bg: 'var(--bg-elevated)', border: 'var(--text-muted)', color: 'var(--text-muted)',   icon: <XCircle size={16} /> },
};

const DEFAULT_EVENT = { bg: 'var(--bg-elevated)', border: 'var(--text-secondary)', color: 'var(--text-secondary)', icon: <Clock3 size={16} /> };

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
              <div style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4" style={{ marginTop: 8 }}>
            {event.metadata?.userName && (
              <span className="text-sm text-secondary flex items-center gap-1">
                <User size={14} /> {event.metadata.userName}
              </span>
            )}
            {event.metadata?.userRole && (
              <span className="badge badge-neutral text-xs">{event.metadata.userRole}</span>
            )}
            {event.metadata?.source && (
              <span className="text-xs text-muted flex items-center gap-1">
                <Server size={12} /> via {event.metadata.source}
              </span>
            )}
          </div>

          {/* Quick summary */}
          {!expanded && event.payload && (
            <div className="text-sm text-muted flex items-center gap-2" style={{ marginTop: 8 }}>
              {event.eventType === 'TEMPERATURE_RECORDED' && <><Thermometer size={14} /> {event.payload.value}°{event.payload.unit}{event.payload.alert ? <span className="flex items-center gap-1 text-danger ml-1"><AlertTriangle size={14} color="var(--danger)" /> ALERT</span> : ''}</>}
              {event.eventType === 'LOCATION_UPDATED' && <><MapPin size={14} /> {event.payload.city}, {event.payload.country}</>}
              {event.eventType === 'ITEM_ADDED' && <><Package size={14} /> {event.payload.name} × {event.payload.quantity}</>}
              {event.eventType === 'STATUS_CHANGED' && <><RotateCw size={14} /> {event.payload.status}</>}
              {event.eventType === 'DELIVERED' && <><CheckCircle2 size={14} /> Delivered at {event.payload.deliveredAt ? format(new Date(event.payload.deliveredAt), 'MMM d, HH:mm') : '—'}</>}
              {event.eventType === 'DELAYED' && <span className="flex items-center gap-1"><AlertTriangle size={14} /> Reason: {event.payload.reason}</span>}
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
            <div className="empty-state-icon"><Clock3 size={32} /></div>
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
