import { create } from 'zustand';
import api from '../api/axios';

export const useShipmentStore = create((set, get) => ({
  shipments: [],
  total: 0,
  loading: false,
  error: null,
  filters: { status: '', search: '', page: 1, limit: 20 },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value, page: 1 } }));
    get().fetchShipments();
  },

  setPage: (page) => {
    set((s) => ({ filters: { ...s.filters, page } }));
    get().fetchShipments();
  },

  fetchShipments: async () => {
    const { filters } = get();
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const { data } = await api.get(`/queries/shipments?${params}`);
      set({ shipments: data.shipments, total: data.pagination?.total || 0, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load shipments', loading: false });
    }
  },

  createShipment: async (payload) => {
    try {
      const { data } = await api.post('/commands/shipments', payload);
      await get().fetchShipments();
      return { success: true, shipmentId: data.shipmentId };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Create failed' };
    }
  },

  updateStatus: async (id, status, reason) => {
    try {
      await api.put(`/commands/shipments/${id}/status`, { status, reason });
      await get().fetchShipments();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Update failed' };
    }
  },

  addItem: async (id, item) => {
    try {
      await api.post(`/commands/shipments/${id}/items`, item);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to add item' };
    }
  },

  recordTemperature: async (id, tempData) => {
    try {
      await api.post(`/commands/shipments/${id}/temperature`, tempData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to record temperature' };
    }
  },

  deleteShipment: async (id, reason) => {
    try {
      await api.delete(`/commands/shipments/${id}`, { data: { reason } });
      await get().fetchShipments();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Delete failed' };
    }
  },
}));
