import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { useUIStore } from '../store/uiStore';
import SeverityBadge from '../components/ui/SeverityBadge';

const SEVERITY_OPTIONS = ['', 'INFO', 'WARNING', 'CRITICAL', 'SUCCESS'];
const STATUS_OPTIONS = ['', 'SUCCESS', 'FAILURE', 'PENDING'];

export default function AuditLogsPage() {
  const { showToast } = useUIStore();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    search: '', severity: '', status: '', action: '', flagged: '', startDate: '', endDate: '',
  });
  const [sort, setSort] = useState({ sortBy: 'timestamp', sortOrder: 'desc' });
  const debounceRef = useRef(null);

  const fetchLogs = useCallback(async (page = 1, f = filters, s = sort) => {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...s };
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get('/logs', { params });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (e) {
      showToast('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, sort]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLogs(1), 300);
  }, [filters, sort]);

  const handleNewLog = useCallback((log) => {
    setLogs((prev) => [log, ...prev].slice(0, 50));
  }, []);

  useSocket(handleNewLog);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSort = (field) => {
    setSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleFlag = async (log) => {
    try {
      await api.patch(`/logs/${log.eventId}/flag`, { flagged: !log.flagged, flagReason: 'Manually flagged' });
      setLogs((prev) => prev.map((l) => l.eventId === log.eventId ? { ...l, flagged: !l.flagged } : l));
      showToast(log.flagged ? 'Event unflagged' : 'Event flagged', 'success');
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const SortIcon = ({ field }) => {
    if (sort.sortBy !== field) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return <span style={{ color: 'var(--accent-light)' }}>{sort.sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  const clearFilters = () => setFilters({ search: '', severity: '', status: '', action: '', flagged: '', startDate: '', endDate: '' });

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">
            {pagination.total.toLocaleString()} total events
          </p>
        </div>
        <span className="live-badge"><span className="dot dot-pulse" />Live</span>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div className="filter-row">
          <div className="search-wrapper flex-1" style={{ minWidth: 220 }}>
            <span className="search-icon">🔍</span>
            <input
              name="search"
              className="form-input"
              placeholder="Search user, action, resource, IP…"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>

          <select name="severity" className="form-input form-select" value={filters.severity} onChange={handleFilterChange} style={{ width: 130 }}>
            <option value="">All Severity</option>
            {SEVERITY_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select name="status" className="form-input form-select" value={filters.status} onChange={handleFilterChange} style={{ width: 120 }}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select name="flagged" className="form-input form-select" value={filters.flagged} onChange={handleFilterChange} style={{ width: 120 }}>
            <option value="">All Events</option>
            <option value="true">Flagged Only</option>
            <option value="false">Not Flagged</option>
          </select>

          <input
            type="date"
            name="startDate"
            className="form-input"
            value={filters.startDate}
            onChange={handleFilterChange}
            style={{ width: 140, colorScheme: 'dark' }}
          />
          <input
            type="date"
            name="endDate"
            className="form-input"
            value={filters.endDate}
            onChange={handleFilterChange}
            style={{ width: 140, colorScheme: 'dark' }}
          />

          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-center"><div className="spinner" /><p className="text-secondary" style={{ marginTop: 12 }}>Loading logs…</p></div>
        ) : (
          <>
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('severity')}>Severity <SortIcon field="severity" /></th>
                    <th onClick={() => handleSort('timestamp')}>Timestamp <SortIcon field="timestamp" /></th>
                    <th onClick={() => handleSort('userName')}>User <SortIcon field="userName" /></th>
                    <th onClick={() => handleSort('action')}>Action <SortIcon field="action" /></th>
                    <th>Resource</th>
                    <th onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
                    <th onClick={() => handleSort('riskScore')}>Risk <SortIcon field="riskScore" /></th>
                    <th>IP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={9}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h3>No logs found</h3>
                        <p>Try adjusting your filters or seed the database</p>
                      </div>
                    </td></tr>
                  ) : logs.map((log) => (
                    <tr
                      key={log._id || log.eventId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelected(log)}
                    >
                      <td><SeverityBadge severity={log.severity} /></td>
                      <td className="td-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td>
                        <div className="td-primary" style={{ fontSize: '0.85rem' }}>{log.userName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.userRole}</div>
                      </td>
                      <td><span className="tag">{log.action}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.resource}</td>
                      <td>
                        <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : log.status === 'FAILURE' ? 'badge-critical' : 'badge-info'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="risk-bar" style={{ width: 50 }}>
                            <div
                              className={`risk-fill ${log.riskScore >= 70 ? 'risk-fill-high' : log.riskScore >= 40 ? 'risk-fill-medium' : 'risk-fill-low'}`}
                              style={{ width: `${log.riskScore}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.riskScore}</span>
                        </div>
                      </td>
                      <td className="td-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.ipAddress}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`btn btn-ghost btn-sm`}
                          onClick={() => handleFlag(log)}
                          title={log.flagged ? 'Unflag' : 'Flag'}
                          style={{ color: log.flagged ? 'var(--warning)' : 'var(--text-muted)' }}
                        >
                          🚩
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={pagination.page === 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >←</button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      className={`pagination-btn ${pagination.page === page ? 'active' : ''}`}
                      onClick={() => fetchLogs(page)}
                    >{page}</button>
                  );
                })}
                {pagination.pages > 5 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                <button
                  className="pagination-btn"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >→</button>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                  {pagination.total.toLocaleString()} total
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <SeverityBadge severity={selected.severity} />
                <span className="modal-title">{selected.action}</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="grid grid-2" style={{ gap: 12 }}>
              {[
                ['Event ID', selected.eventId],
                ['Timestamp', format(new Date(selected.timestamp), 'PPpp')],
                ['User', selected.userName],
                ['Email', selected.userEmail],
                ['Role', selected.userRole],
                ['Action', selected.action],
                ['Resource', selected.resource],
                ['Resource ID', selected.resourceId],
                ['Status', selected.status],
                ['Severity', selected.severity],
                ['IP Address', selected.ipAddress],
                ['Risk Score', `${selected.riskScore}/100`],
                ['Source', selected.source],
                ['Flagged', selected.flagged ? '🚩 Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>{v || '—'}</div>
                </div>
              ))}
            </div>

            {selected.location?.country && (
              <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Location</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  📍 {selected.location.city}, {selected.location.country}
                </div>
              </div>
            )}

            <div className="flex gap-3" style={{ marginTop: 20 }}>
              <button
                className={`btn ${selected.flagged ? 'btn-secondary' : 'btn-danger'} btn-sm`}
                onClick={() => { handleFlag(selected); setSelected(null); }}
              >
                🚩 {selected.flagged ? 'Unflag Event' : 'Flag Event'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
