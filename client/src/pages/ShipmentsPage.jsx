import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { useShipmentStore } from '../store/shipmentStore';
import Modal from '../components/ui/Modal';
import { SkeletonTable, SkeletonCard } from '../components/ui/Skeleton';
import { Package, Search, Plus, ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUSES = ['PENDING', 'PROCESSING', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS', 'DELIVERED', 'DELAYED', 'CANCELLED'];

const STATUS_BADGE = {
  PENDING:    'badge-neutral',
  PROCESSING: 'badge-neutral',
  IN_TRANSIT: 'badge-accent',
  AT_PORT:    'badge-neutral',
  CUSTOMS:    'badge-warning',
  DELIVERED:  'badge-success',
  DELAYED:    'badge-warning',
  CANCELLED:  'badge-danger',
};

const emptyForm = {
  origin: { city: '', country: '', port: '' },
  destination: { city: '', country: '', port: '' },
  carrier: '',
  containerId: '',
  estimatedDelivery: '',
  notes: '',
};

export default function ShipmentsPage() {
  const { user } = useAuthStore();
  const { shipments, total, loading, filters, fetchShipments, setFilter, setPage,
          createShipment, updateStatus, deleteShipment } = useShipmentStore();

  const [createOpen, setCreateOpen]   = useState(false);
  const [statusOpen, setStatusOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [statusForm, setStatusForm]   = useState({ status: '', reason: '' });
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState(null);

  useEffect(() => { fetchShipments(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const canWrite = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await createShipment(form);
    setSubmitting(false);
    if (result.success) {
      setCreateOpen(false);
      setForm(emptyForm);
      showToast(`Shipment ${result.shipmentId} created!`);
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await updateStatus(selected.shipmentId, statusForm.status, statusForm.reason);
    setSubmitting(false);
    if (result.success) {
      setStatusOpen(false);
      showToast('Status updated');
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    const result = await deleteShipment(selected.shipmentId, 'Deleted by admin');
    setSubmitting(false);
    if (result.success) {
      setDeleteOpen(false);
      showToast('Shipment cancelled');
    } else {
      showToast(result.error, 'error');
    }
  };

  const totalPages = Math.ceil(total / (filters.limit || 20));

  return (
    <div className="page-wrapper fade-in">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 999,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideUp 0.25s ease',
        }}>
          {toast.type === 'error' ? <XCircle size={18} color="var(--danger)" /> : <CheckCircle2 size={18} color="var(--success)" />}
          {toast.msg}
        </div>
      )}

      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Shipments</h1>
          <p className="page-subtitle">{total} shipment{total !== 1 ? 's' : ''} total</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> New Shipment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div style={{ position: 'relative', maxWidth: 280, width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search by ID, container..."
              value={filters.search || ''}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ maxWidth: 180 }}
            value={filters.status || ''}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilter('search', ''); setFilter('status', ''); }}>
            Clear
          </button>
          <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>
            {total} results
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Status</th>
                  <th>Origin → Destination</th>
                  <th>Carrier</th>
                  <th>Container</th>
                  <th>Events</th>
                  <th>ETA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><Package size={32} /></div>
                        <h3>No shipments found</h3>
                        <p>Create your first shipment to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.shipmentId} className="slide-up">
                      <td className="td-primary font-mono text-sm">{s.shipmentId}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[s.status] || 'badge-neutral'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                          {s.origin?.city || '—'} <ArrowRight size={14} className="text-muted" /> {s.destination?.city || '—'}
                        </span>
                      </td>
                      <td className="text-secondary">{s.carrier || '—'}</td>
                      <td className="font-mono text-sm">{s.containerId || '—'}</td>
                      <td>
                        <span className="badge badge-accent">{s.eventCount || 0}</span>
                      </td>
                      <td className="text-muted text-sm">
                        {s.estimatedDelivery ? format(new Date(s.estimatedDelivery), 'MMM d, yyyy') : '—'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {canWrite && s.status !== 'CANCELLED' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setSelected(s); setStatusForm({ status: s.status, reason: '' }); setStatusOpen(true); }}
                            >
                              Status
                            </button>
                          )}
                          {canDelete && s.status !== 'CANCELLED' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => { setSelected(s); setDeleteOpen(true); }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border)' }}>
            <span className="text-muted text-sm">
              Page {filters.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setPage(filters.page - 1)}>
                ← Prev
              </button>
              <button className="btn btn-secondary btn-sm" disabled={filters.page >= totalPages} onClick={() => setPage(filters.page + 1)}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create Modal ─── */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={20} /> Create New Shipment
          </div>
        }
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" form="create-form" type="submit" disabled={submitting}>
              {submitting ? <><span className="spinner spinner-sm" /> Creating...</> : 'Create Shipment'}
            </button>
          </>
        }
      >
        <form id="create-form" onSubmit={handleCreate}>
          <div className="input-row">
            <div className="form-group">
              <label className="form-label">Origin City *</label>
              <input className="form-input" required placeholder="Shanghai"
                value={form.origin.city}
                onChange={(e) => setForm((f) => ({ ...f, origin: { ...f.origin, city: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Origin Country</label>
              <input className="form-input" placeholder="China"
                value={form.origin.country}
                onChange={(e) => setForm((f) => ({ ...f, origin: { ...f.origin, country: e.target.value } }))} />
            </div>
          </div>
          <div className="input-row">
            <div className="form-group">
              <label className="form-label">Destination City *</label>
              <input className="form-input" required placeholder="New York"
                value={form.destination.city}
                onChange={(e) => setForm((f) => ({ ...f, destination: { ...f.destination, city: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Destination Country</label>
              <input className="form-input" placeholder="USA"
                value={form.destination.country}
                onChange={(e) => setForm((f) => ({ ...f, destination: { ...f.destination, country: e.target.value } }))} />
            </div>
          </div>
          <div className="input-row">
            <div className="form-group">
              <label className="form-label">Carrier</label>
              <input className="form-input" placeholder="Maersk Line"
                value={form.carrier}
                onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Container ID</label>
              <input className="form-input" placeholder="CNTR123456"
                value={form.containerId}
                onChange={(e) => setForm((f) => ({ ...f, containerId: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Delivery</label>
            <input type="date" className="form-input"
              value={form.estimatedDelivery}
              onChange={(e) => setForm((f) => ({ ...f, estimatedDelivery: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* ─── Status Modal ─── */}
      <Modal
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={`Update Status — ${selected?.shipmentId}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setStatusOpen(false)}>Cancel</button>
            <button className="btn btn-primary" form="status-form" type="submit" disabled={submitting}>
              {submitting ? <><span className="spinner spinner-sm" /> Saving...</> : 'Update Status'}
            </button>
          </>
        }
      >
        <form id="status-form" onSubmit={handleStatusChange}>
          <div className="form-group">
            <label className="form-label">New Status *</label>
            <select className="form-select" required
              value={statusForm.status}
              onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Select status...</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reason (optional)</label>
            <textarea className="form-textarea" rows={3} placeholder="Reason for status change..."
              value={statusForm.reason}
              onChange={(e) => setStatusForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* ─── Delete Modal ─── */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Cancel Shipment"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>Keep It</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
              {submitting ? <><span className="spinner spinner-sm" /> Cancelling...</> : 'Cancel Shipment'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Are you sure you want to cancel shipment <strong style={{ color: 'var(--text-primary)' }}>{selected?.shipmentId}</strong>?
          This action will emit a <code className="tag">SHIPMENT_CANCELLED</code> event and is recorded permanently in the event log.
        </p>
      </Modal>
    </div>
  );
}
