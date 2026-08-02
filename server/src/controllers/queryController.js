const Shipment = require('../models/Shipment');
const EventStore = require('../models/EventStore');
const { replayShipment, getEventStream } = require('../engine/eventReplay');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// ─── Shipment Queries ────────────────────────────────────────────────────────

// GET /api/queries/shipments
const listShipments = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20, status, carrier, search,
    startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc',
  } = req.query;

  const query = { isDeleted: false };
  if (status) query.status = status;
  if (carrier) query.carrier = new RegExp(carrier, 'i');
  if (search) {
    query.$or = [
      { shipmentId: new RegExp(search, 'i') },
      { containerId: new RegExp(search, 'i') },
      { carrier: new RegExp(search, 'i') },
      { 'origin.city': new RegExp(search, 'i') },
      { 'destination.city': new RegExp(search, 'i') },
    ];
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [shipments, total] = await Promise.all([
    Shipment.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
    Shipment.countDocuments(query),
  ]);

  res.json({
    success: true,
    shipments,
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  });
});

// GET /api/queries/shipments/:id
const getShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ shipmentId: req.params.id }).lean();
  if (!shipment) throw createError('Shipment not found', 404);
  res.json({ success: true, shipment });
});

// GET /api/queries/shipments/:id/timeline
const getShipmentTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const events = await EventStore.find({ aggregateId: id }).sort({ version: 1 }).lean();
  if (!events.length) throw createError('Shipment not found', 404);
  res.json({ success: true, events, total: events.length });
});

// GET /api/queries/shipments/:id/state?timestamp=ISO
const getShipmentStateAt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { timestamp } = req.query;

  const state = await replayShipment(id, timestamp ? new Date(timestamp) : null);
  if (!state) throw createError('Shipment not found', 404);

  res.json({ success: true, state, replayedAt: timestamp || 'latest' });
});

// GET /api/queries/events - Global event stream
const getEvents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, aggregateType, eventType, userId, startDate, endDate } = req.query;
  const result = await getEventStream({
    page: Number(page),
    limit: Number(limit),
    aggregateType,
    eventType,
    userId,
    startDate,
    endDate,
  });
  res.json({ success: true, ...result });
});

// GET /api/queries/dashboard/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);

  const [
    totalShipments, statusCounts, eventsToday, eventsThisWeek,
    tempAlerts, recentEvents, pendingCount, delayedCount,
  ] = await Promise.all([
    Shipment.countDocuments({ isDeleted: false }),
    Shipment.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    EventStore.countDocuments({ timestamp: { $gte: today } }),
    EventStore.countDocuments({ timestamp: { $gte: weekAgo } }),
    Shipment.countDocuments({ temperatureAlertCount: { $gt: 0 }, isDeleted: false }),
    EventStore.find().sort({ timestamp: -1 }).limit(8).lean(),
    Shipment.countDocuments({ status: 'PENDING', isDeleted: false }),
    Shipment.countDocuments({ status: 'DELAYED', isDeleted: false }),
  ]);

  const statusMap = {};
  statusCounts.forEach((s) => { statusMap[s._id] = s.count; });

  res.json({
    success: true,
    stats: {
      totalShipments,
      eventsToday,
      eventsThisWeek,
      delivered: statusMap['DELIVERED'] || 0,
      inTransit: statusMap['IN_TRANSIT'] || 0,
      pending: pendingCount,
      delayed: delayedCount,
      temperatureAlerts: tempAlerts,
      statusBreakdown: statusMap,
    },
    recentEvents,
  });
});

// GET /api/queries/analytics/overview
const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 14;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [dailyEvents, eventTypeBreakdown, statusTrend, temperatureTrend] = await Promise.all([
    EventStore.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
          eventTypes: { $addToSet: '$eventType' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    EventStore.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Shipment.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    EventStore.aggregate([
      { $match: { eventType: 'TEMPERATURE_RECORDED', timestamp: { $gte: since } } },
      { $sort: { timestamp: 1 } },
      { $limit: 100 },
      { $project: { value: '$payload.value', unit: '$payload.unit', alert: '$payload.alert', timestamp: 1, aggregateId: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    dailyEvents,
    eventTypeBreakdown,
    statusTrend,
    temperatureTrend,
  });
});

// GET /api/queries/shipments/:id/rollback-preview?targetVersion=N
const getRollbackPreview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { targetVersion } = req.query;
  if (!targetVersion) throw createError('targetVersion query param required', 400);

  // Find the timestamp of the target version event
  const targetEvent = await EventStore.findOne({
    aggregateId: id,
    version: Number(targetVersion),
  }).lean();
  if (!targetEvent) throw createError(`Event version ${targetVersion} not found`, 404);

  const state = await replayShipment(id, targetEvent.timestamp);
  res.json({
    success: true,
    state,
    targetVersion: Number(targetVersion),
    targetTimestamp: targetEvent.timestamp,
  });
});

module.exports = {
  listShipments, getShipment, getShipmentTimeline, getShipmentStateAt,
  getEvents, getDashboardStats, getAnalyticsOverview, getRollbackPreview,
};
