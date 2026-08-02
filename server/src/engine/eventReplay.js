const EventStore = require('../models/EventStore');
const { initialShipmentState, applyEvent } = require('./eventReducers');

/**
 * Event Replay Engine
 * Reconstructs the current state of an aggregate from all its events.
 */

/**
 * Replay all events for a given aggregate, up to an optional timestamp.
 * @param {string} aggregateId
 * @param {Date|null} upToTimestamp - if provided, only replay events <= this timestamp
 * @returns {Object} reconstructed state
 */
const replayShipment = async (aggregateId, upToTimestamp = null) => {
  const query = { aggregateId };
  if (upToTimestamp) {
    query.timestamp = { $lte: new Date(upToTimestamp) };
  }

  const events = await EventStore.find(query)
    .sort({ version: 1 })
    .lean();

  if (events.length === 0) return null;

  let state = initialShipmentState();
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
};

/**
 * Get the latest version number for an aggregate.
 * Returns 0 if aggregate doesn't exist.
 */
const getLatestVersion = async (aggregateId) => {
  const latest = await EventStore.findOne({ aggregateId })
    .sort({ version: -1 })
    .select('version')
    .lean();
  return latest ? latest.version : 0;
};

/**
 * Append an event to the store with OCC version check.
 * @param {Object} eventData - { aggregateId, aggregateType, eventType, payload, metadata }
 * @param {number} expectedVersion - version the caller expects the aggregate to be at
 * @returns {Object} the saved event
 */
const appendEvent = async (eventData, expectedVersion) => {
  const currentVersion = await getLatestVersion(eventData.aggregateId);

  if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
    const { createConcurrencyError } = require('../middleware/errorHandler');
    throw createConcurrencyError(expectedVersion, currentVersion);
  }

  const newVersion = currentVersion + 1;
  const event = await EventStore.create({
    ...eventData,
    version: newVersion,
    timestamp: new Date(),
  });

  return event;
};

/**
 * Get all events for an aggregate in order.
 */
const getEventsForAggregate = async (aggregateId) => {
  return EventStore.find({ aggregateId }).sort({ version: 1 }).lean();
};

/**
 * Get a paginated list of events (for the event log view).
 */
const getEventStream = async ({ page = 1, limit = 20, aggregateType, eventType, userId, startDate, endDate } = {}) => {
  const query = {};
  if (aggregateType) query.aggregateType = aggregateType;
  if (eventType) query.eventType = eventType;
  if (userId) query['metadata.userId'] = userId;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [events, total] = await Promise.all([
    EventStore.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    EventStore.countDocuments(query),
  ]);

  return { events, total, page, totalPages: Math.ceil(total / limit) };
};

module.exports = { replayShipment, getLatestVersion, appendEvent, getEventsForAggregate, getEventStream };
