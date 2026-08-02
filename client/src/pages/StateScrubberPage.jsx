import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';

const STATUS_COLORS = {
  PENDING: '#f59e0b', PROCESSING: '#3b82f6', IN_TRANSIT: '#6366f1',
  AT_PORT: '#8b5cf6', DELIVERED: '#10b981', DELAYED: '#ef4444', CANCELLED: '#6b7280',
};

function ShipmentSnapshot({ state, targetVersion, eventCount }) {
  if (!state) return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <p>Move the slider to see shipment state</p>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Status */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: STATUS_COLORS[state.status] || '#6366f1',
          boxShadow: `0 0 8px ${STATUS_COLORS[state.status] || '#6366f1'}`,
        }} />
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{state.status}</span>
        <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>v{state.currentVersion}</span>
        <span className="badge badge-accent">{state.eventCount} events applied</span>
      </div>

      {/* Route */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="text-xs text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Route</div>
        <div className="text-secondary text-sm">
          📍 {state.origin?.city || '—'}, {state.origin?.country || '—'}
        </div>
        <div style={{ margin: '4px 0', color: 'var(--text-muted)' }}>↓</div>
        <div className="text-secondary text-sm">
          🏁 {state.destination?.city || '—'}, {state.destination?.country || '—'}
        </div>
      </div>

      {/* Carrier */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="text-xs text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Carrier & Container</div>
        <div className="font-semibold">{state.carrier || '—'}</div>
        <div className="text-muted text-sm font-mono">{state.containerId || '—'}</div>
      </div>

      {/* Items */}
      <div className="card" style={{ padding: '14px 16px', gridColumn: '1 / -1' }}>
        <div className="text-xs text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Items ({state.items?.length || 0})
        </div>
        {state.items?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.items.map((item) => (
              <div key={item.sku} className="flex items-center justify-between" style={{
                padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
              }}>
                <span className="text-sm">{item.name}</span>
                <span className="badge badge-accent">{item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>
        ) : <span className="text-muted text-sm">No items</span>}
      </div>

      {/* Temperature */}
      {state.temperatureReadings?.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', gridColumn: '1 / -1' }}>
          <div className="text-xs text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Temperature ({state.temperatureReadings.length} readings)
          </div>
          <div className="flex gap-4">
            <div>
              <div className="text-xs text-muted">Min</div>
              <div className="font-semibold" style={{ color: '#3b82f6' }}>{state.temperatureMin}°C</div>
            </div>
            <div>
              <div className="text-xs text-muted">Max</div>
              <div className="font-semibold" style={{ color: state.temperatureMax > 8 ? '#ef4444' : '#10b981' }}>
                {state.temperatureMax}°C
              </div>
            </div>
            <div>
              <div className="text-xs text-muted">Alerts</div>
              <div className="font-semibold" style={{ color: state.temperatureAlertCount > 0 ? '#ef4444' : '#10b981' }}>
                {state.temperatureAlertCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location */}
      {state.currentLocation && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="text-xs text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Location</div>
          <div className="font-semibold">📍 {state.currentLocation.city}</div>
          <div className="text-muted text-sm">{state.currentLocation.country}</div>
        </div>
      )}

      {/* Notes */}
      {state.notes && (
        <div className="card" style={{ padding: '14px 16px', gridColumn: state.currentLocation ? '2 / 3' : '1 / -1' }}>
          <div className="text-xs text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</div>
          <div className="text-secondary text-sm" style={{ whiteSpace: 'pre-wrap' }}>{state.notes}</div>
        </div>
      )}
    </div>
  );
}

export default function StateScrubberPage() {
  const [shipments, setShipments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [events, setEvents] = useState([]);
  const [targetVersion, setTargetVersion] = useState(0);
  const [state, setState] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/queries/shipments?limit=50')
      .then(({ data }) => {
        setShipments(data.shipments || []);
        if (data.shipments?.[0]) setSelectedId(data.shipments[0].shipmentId);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingEvents(true);
    setState(null);
    setTargetVersion(0);
    api.get(`/queries/shipments/${selectedId}/timeline`)
      .then(({ data }) => {
        const evs = data.events || [];
        setEvents(evs);
        if (evs.length > 0) {
          setTargetVersion(evs[evs.length - 1].version);
        }
      })
      .finally(() => setLoadingEvents(false));
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !events.length || targetVersion === 0) { setState(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const targetEvent = events.find((e) => e.version === targetVersion);
      if (!targetEvent) return;
      setLoadingState(true);
      api.get(`/queries/shipments/${selectedId}/state?timestamp=${targetEvent.timestamp}`)
        .then(({ data }) => setState(data.state))
        .catch(() => setState(null))
        .finally(() => setLoadingState(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [selectedId, targetVersion, events]);

  const maxVersion = events.length > 0 ? events[events.length - 1].version : 1;
  const currentEvent = events.find((e) => e.version === targetVersion);

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header">
        <h1 className="page-title">State Scrubber</h1>
        <p className="page-subtitle">Time-travel through shipment history — reconstruct state at any point</p>
      </div>

      {/* Shipment selector */}
      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="form-select"
            style={{ flex: '1 1 300px', maxWidth: 400 }}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {shipments.length === 0 ? (
              <option>No shipments found</option>
            ) : (
              shipments.map((s) => (
                <option key={s.shipmentId} value={s.shipmentId}>
                  {s.shipmentId} — {s.origin?.city || '?'} → {s.destination?.city || '?'} ({s.status})
                </option>
              ))
            )}
          </select>
          {events.length > 0 && (
            <span className="badge badge-accent">{events.length} events total</span>
          )}
        </div>
      </div>

      {/* Scrubber slider */}
      {events.length > 0 && (
        <div className="card mb-4" style={{ padding: '20px 24px' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold">Version Scrubber</div>
              <div className="text-muted text-sm">Drag to replay shipment state at version {targetVersion} of {maxVersion}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {currentEvent && (
                <div className="text-sm text-secondary">
                  Event: <span className="tag">{currentEvent.eventType}</span>
                </div>
              )}
              {currentEvent && (
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  {format(new Date(currentEvent.timestamp), 'MMM d, yyyy HH:mm:ss')}
                </div>
              )}
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={maxVersion}
            value={targetVersion}
            onChange={(e) => setTargetVersion(Number(e.target.value))}
            style={{
              width: '100%', height: 6, cursor: 'pointer',
              accentColor: 'var(--accent)', borderRadius: 3,
            }}
          />

          <div className="flex justify-between" style={{ marginTop: 8 }}>
            <span className="text-xs text-muted">v1 — {events[0]?.eventType}</span>
            <span className="text-xs text-muted">v{maxVersion} — {events[events.length - 1]?.eventType}</span>
          </div>

          {/* Event markers */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16, flexWrap: 'wrap' }}>
            {events.map((ev) => (
              <button
                key={ev.version}
                className="btn btn-sm"
                onClick={() => setTargetVersion(ev.version)}
                style={{
                  padding: '3px 10px',
                  background: ev.version === targetVersion ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: ev.version === targetVersion ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${ev.version === targetVersion ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: '0.7rem',
                }}
                title={`v${ev.version}: ${ev.eventType}`}
              >
                v{ev.version}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* State snapshot */}
      <div className="card">
        <div className="card-title">
          🕐 Shipment State at Version {targetVersion}
          {loadingState && <span className="spinner spinner-sm" style={{ marginLeft: 8 }} />}
        </div>
        <ShipmentSnapshot state={state} targetVersion={targetVersion} eventCount={events.length} />
      </div>
    </div>
  );
}
