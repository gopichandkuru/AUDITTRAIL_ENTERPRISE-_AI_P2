const mongoose = require('mongoose');

/**
 * APPEND-ONLY Event Store
 * This collection is the source of truth.
 * Events are NEVER updated or deleted — only appended.
 */
const eventStoreSchema = new mongoose.Schema({
  aggregateId: {
    type: String,
    required: true,
    index: true,
  },
  aggregateType: {
    type: String,
    required: true,
    enum: ['Shipment', 'Inventory', 'Transfer'],
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  version: {
    type: Number,
    required: true,
    min: 1,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  metadata: {
    userId: { type: String },
    userName: { type: String },
    userRole: { type: String },
    ipAddress: { type: String },
    source: { type: String, default: 'web' },
    correlationId: { type: String },
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  // Disable update/delete methods at schema level
  strict: true,
  // Immutable: once set, cannot change these fields
  timestamps: false,
});

// Enforce append-only: compound unique index on (aggregateId, version)
eventStoreSchema.index({ aggregateId: 1, version: 1 }, { unique: true });
eventStoreSchema.index({ aggregateId: 1, timestamp: 1 });
eventStoreSchema.index({ eventType: 1, timestamp: -1 });
eventStoreSchema.index({ 'metadata.userId': 1, timestamp: -1 });
eventStoreSchema.index({ timestamp: -1 });

// Block updates and deletes at the middleware level
eventStoreSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
  throw new Error('EventStore is append-only. Updates are not permitted.');
});
eventStoreSchema.pre(['deleteOne', 'findOneAndDelete', 'deleteMany'], function () {
  throw new Error('EventStore is append-only. Deletes are not permitted.');
});

const EventStore = mongoose.model('EventStore', eventStoreSchema);
module.exports = EventStore;
