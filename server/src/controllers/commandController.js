const { v4: uuidv4 } = require('uuid');
const { appendEvent } = require('../engine/eventReplay');
const { projectShipmentEvent } = require('../projections/shipmentProjector');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * Helper: append event + project + emit socket
 */
const executeCommand = async (req, aggregateId, aggregateType, eventType, payload, expectedVersion) => {
  const event = await appendEvent(
    {
      aggregateId,
      aggregateType,
      eventType,
      payload,
      metadata: {
        userId: req.user?._id?.toString(),
        userName: req.user?.name,
        userRole: req.user?.role,
        ipAddress: req.ip,
        source: req.headers['x-source'] || 'web',
        correlationId: uuidv4(),
      },
    },
    expectedVersion
  );

  // Project to read model
  await projectShipmentEvent(event);

  // Broadcast to connected clients
  if (req.io) {
    req.io.emit('shipment_event', {
      aggregateId,
      eventType,
      version: event.version,
      timestamp: event.timestamp,
      payload,
    });
  }

  return event;
};

// ─── Shipment Commands ────────────────────────────────────────────────────────

// POST /api/commands/shipments
const createShipment = asyncHandler(async (req, res) => {
  const { origin, destination, carrier, containerId, estimatedDelivery, notes, tags, items } = req.body;
  if (!origin || !destination) throw createError('Origin and destination are required', 400);

  const shipmentId = `SHP-${Date.now().toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;

  const event = await executeCommand(req, shipmentId, 'Shipment', 'SHIPMENT_CREATED', {
    origin, destination, carrier, containerId, estimatedDelivery, notes, tags,
  }, 0);

  // If items provided, add them immediately
  if (items && items.length > 0) {
    for (const item of items) {
      await executeCommand(req, shipmentId, 'Shipment', 'ITEM_ADDED', item, event.version);
    }
  }

  res.status(201).json({ success: true, shipmentId, message: 'Shipment created successfully' });
});

// POST /api/commands/shipments/:id/items
const addItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sku, name, quantity, unit, weight, hazmat } = req.body;
  if (!sku || !name || quantity == null) throw createError('SKU, name, and quantity are required', 400);

  const expectedVersion = Number(req.headers['x-expected-version'] ?? req.body.expectedVersion ?? undefined);

  await executeCommand(req, id, 'Shipment', 'ITEM_ADDED',
    { sku, name, quantity: Number(quantity), unit, weight, hazmat },
    isNaN(expectedVersion) ? undefined : expectedVersion
  );

  res.json({ success: true, message: 'Item added' });
});

// DELETE /api/commands/shipments/:id/items/:sku
const removeItem = asyncHandler(async (req, res) => {
  const { id, sku } = req.params;
  const { quantity } = req.body;
  const expectedVersion = Number(req.headers['x-expected-version'] ?? req.body.expectedVersion ?? undefined);

  await executeCommand(req, id, 'Shipment', 'ITEM_REMOVED',
    { sku, quantity: quantity ? Number(quantity) : undefined },
    isNaN(expectedVersion) ? undefined : expectedVersion
  );

  res.json({ success: true, message: 'Item removed' });
});

// PUT /api/commands/shipments/:id/status
const changeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const validStatuses = ['PENDING', 'PROCESSING', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS', 'DELIVERED', 'DELAYED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status)) {
    throw createError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const eventType = status === 'DELIVERED' ? 'DELIVERED'
    : status === 'DELAYED' ? 'DELAYED'
    : status === 'IN_TRANSIT' ? 'IN_TRANSIT'
    : status === 'CANCELLED' ? 'SHIPMENT_CANCELLED'
    : 'STATUS_CHANGED';

  const expectedVersion = Number(req.headers['x-expected-version'] ?? req.body.expectedVersion ?? undefined);

  await executeCommand(req, id, 'Shipment', eventType,
    { status, reason, deliveredAt: status === 'DELIVERED' ? new Date() : undefined },
    isNaN(expectedVersion) ? undefined : expectedVersion
  );

  res.json({ success: true, message: `Status changed to ${status}` });
});

// POST /api/commands/shipments/:id/temperature
const recordTemperature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { value, unit, sensor, alert } = req.body;
  if (value == null) throw createError('Temperature value is required', 400);

  await executeCommand(req, id, 'Shipment', 'TEMPERATURE_RECORDED',
    { value: Number(value), unit: unit || 'C', sensor, alert: !!alert }
  );

  res.json({ success: true, message: 'Temperature recorded' });
});

// POST /api/commands/shipments/:id/location
const updateLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, city, country, lat, lng } = req.body;
  if (!city) throw createError('City is required', 400);

  await executeCommand(req, id, 'Shipment', 'LOCATION_UPDATED', { name, city, country, lat, lng });

  res.json({ success: true, message: 'Location updated' });
});

// POST /api/commands/shipments/:id/transfer
const transferShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newCarrier, reason } = req.body;
  if (!newCarrier) throw createError('New carrier is required', 400);

  await executeCommand(req, id, 'Shipment', 'TRANSFER_INITIATED', { newCarrier, reason });

  res.json({ success: true, message: 'Transfer initiated' });
});

// POST /api/commands/shipments/:id/load-container
const loadContainer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { containerId } = req.body;
  if (!containerId) throw createError('Container ID is required', 400);

  await executeCommand(req, id, 'Shipment', 'CONTAINER_LOADED', { containerId });

  res.json({ success: true, message: 'Container loaded' });
});

// DELETE /api/commands/shipments/:id (soft delete via event)
const deleteShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await executeCommand(req, id, 'Shipment', 'SHIPMENT_CANCELLED', { reason: reason || 'Deleted by user' });

  res.json({ success: true, message: 'Shipment cancelled and removed from active view' });
});

// PUT /api/commands/shipments/:id/notes
const updateNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, tags } = req.body;

  await executeCommand(req, id, 'Shipment', 'SHIPMENT_NOTES_UPDATED', { notes, tags });

  res.json({ success: true, message: 'Notes updated' });
});

module.exports = {
  createShipment, addItem, removeItem, changeStatus, recordTemperature,
  updateLocation, transferShipment, loadContainer, deleteShipment, updateNotes,
};
