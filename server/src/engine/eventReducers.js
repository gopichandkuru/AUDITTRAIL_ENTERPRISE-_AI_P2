/**
 * Event Reducers — Pure functions that apply events to build state.
 * Each reducer takes (currentState, event) and returns the new state.
 * Reducers MUST be pure (no side effects, no DB calls).
 */

const initialShipmentState = () => ({
  shipmentId: null,
  status: 'PENDING',
  origin: {},
  destination: {},
  carrier: null,
  containerId: null,
  items: [],
  currentLocation: null,
  locationHistory: [],
  temperatureReadings: [],
  temperatureMin: null,
  temperatureMax: null,
  temperatureAlertCount: 0,
  estimatedDelivery: null,
  actualDelivery: null,
  notes: null,
  tags: [],
  createdBy: null,
  createdByName: null,
  isDeleted: false,
  currentVersion: 0,
  eventCount: 0,
  lastEventAt: null,
  createdAt: null,
  updatedAt: null,
});

const reducers = {

  SHIPMENT_CREATED: (state, event) => ({
    ...state,
    shipmentId: event.aggregateId,
    status: 'PENDING',
    origin: event.payload.origin || {},
    destination: event.payload.destination || {},
    carrier: event.payload.carrier || null,
    containerId: event.payload.containerId || null,
    estimatedDelivery: event.payload.estimatedDelivery || null,
    notes: event.payload.notes || null,
    tags: event.payload.tags || [],
    createdBy: event.metadata?.userId || null,
    createdByName: event.metadata?.userName || null,
    createdAt: event.timestamp,
  }),

  ITEM_ADDED: (state, event) => {
    const { sku, name, quantity, unit, weight, hazmat } = event.payload;
    const existingIndex = state.items.findIndex((i) => i.sku === sku);
    const updatedItems = existingIndex >= 0
      ? state.items.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        )
      : [...state.items, { sku, name, quantity, unit: unit || 'units', weight, hazmat: hazmat || false }];
    return { ...state, items: updatedItems };
  },

  ITEM_REMOVED: (state, event) => {
    const { sku, quantity } = event.payload;
    const updatedItems = state.items
      .map((item) => item.sku === sku
        ? { ...item, quantity: Math.max(0, item.quantity - (quantity || item.quantity)) }
        : item
      )
      .filter((item) => item.quantity > 0);
    return { ...state, items: updatedItems };
  },

  ITEM_QUANTITY_UPDATED: (state, event) => {
    const { sku, quantity } = event.payload;
    return {
      ...state,
      items: state.items.map((item) =>
        item.sku === sku ? { ...item, quantity } : item
      ),
    };
  },

  TEMPERATURE_RECORDED: (state, event) => {
    const { value, unit, sensor, alert } = event.payload;
    const reading = { value, unit: unit || 'C', sensor, alert: alert || false, timestamp: event.timestamp };
    const all = [...state.temperatureReadings, reading];
    const values = all.map((r) => r.value);
    return {
      ...state,
      temperatureReadings: all,
      temperatureMin: Math.min(...values),
      temperatureMax: Math.max(...values),
      temperatureAlertCount: state.temperatureAlertCount + (alert ? 1 : 0),
    };
  },

  LOCATION_UPDATED: (state, event) => {
    const loc = { ...event.payload, timestamp: event.timestamp };
    return {
      ...state,
      currentLocation: loc,
      locationHistory: [...state.locationHistory, loc],
    };
  },

  CONTAINER_LOADED: (state, event) => ({
    ...state,
    containerId: event.payload.containerId,
    status: 'PROCESSING',
  }),

  STATUS_CHANGED: (state, event) => ({
    ...state,
    status: event.payload.status,
    notes: event.payload.reason
      ? `${state.notes ? state.notes + '\n' : ''}Status → ${event.payload.status}: ${event.payload.reason}`
      : state.notes,
  }),

  IN_TRANSIT: (state, event) => ({
    ...state,
    status: 'IN_TRANSIT',
    carrier: event.payload.carrier || state.carrier,
  }),

  CUSTOMS_CLEARED: (state, event) => ({
    ...state,
    status: 'AT_PORT',
    notes: `${state.notes ? state.notes + '\n' : ''}Customs cleared: ${event.payload.clearanceId || ''}`,
  }),

  DELIVERED: (state, event) => ({
    ...state,
    status: 'DELIVERED',
    actualDelivery: event.payload.deliveredAt || event.timestamp,
  }),

  DELAYED: (state, event) => ({
    ...state,
    status: 'DELAYED',
    estimatedDelivery: event.payload.newEstimatedDelivery || state.estimatedDelivery,
    notes: `${state.notes ? state.notes + '\n' : ''}Delayed: ${event.payload.reason || 'Reason not provided'}`,
  }),

  TRANSFER_INITIATED: (state, event) => ({
    ...state,
    carrier: event.payload.newCarrier || state.carrier,
    notes: `${state.notes ? state.notes + '\n' : ''}Transfer to ${event.payload.newCarrier}: ${event.payload.reason || ''}`,
  }),

  SHIPMENT_CANCELLED: (state, event) => ({
    ...state,
    status: 'CANCELLED',
    isDeleted: true,
    notes: `${state.notes ? state.notes + '\n' : ''}Cancelled: ${event.payload.reason || 'No reason provided'}`,
  }),

  SHIPMENT_NOTES_UPDATED: (state, event) => ({
    ...state,
    notes: event.payload.notes,
    tags: event.payload.tags || state.tags,
  }),
};

/**
 * Apply a single event to a state object.
 */
const applyEvent = (state, event) => {
  const reducer = reducers[event.eventType];
  if (!reducer) {
    console.warn(`[EventReducer] No reducer for eventType: ${event.eventType}`);
    return state;
  }
  const newState = reducer(state, event);
  return {
    ...newState,
    currentVersion: event.version,
    eventCount: (state.eventCount || 0) + 1,
    lastEventAt: event.timestamp,
    updatedAt: event.timestamp,
  };
};

module.exports = { initialShipmentState, applyEvent, reducers };
