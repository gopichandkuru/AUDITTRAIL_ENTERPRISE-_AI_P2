const mongoose = require('mongoose');

/**
 * Shipment Read Model
 * Optimized for fast reads. State is rebuilt from EventStore via projections.
 * This collection is NEVER the source of truth — events are.
 */
const itemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'units' },
  weight: { type: Number }, // kg
  hazmat: { type: Boolean, default: false },
}, { _id: false });

const temperatureReadingSchema = new mongoose.Schema({
  value: { type: Number, required: true },
  unit: { type: String, enum: ['C', 'F'], default: 'C' },
  sensor: { type: String },
  timestamp: { type: Date, default: Date.now },
  alert: { type: Boolean, default: false },
}, { _id: false });

const locationSchema = new mongoose.Schema({
  name: { type: String },
  city: { type: String },
  country: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  shipmentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS', 'DELIVERED', 'DELAYED', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  },
  origin: {
    city: String,
    country: String,
    port: String,
  },
  destination: {
    city: String,
    country: String,
    port: String,
  },
  carrier: { type: String },
  containerId: { type: String, index: true },
  items: [itemSchema],
  currentLocation: locationSchema,
  locationHistory: [locationSchema],
  temperatureReadings: [temperatureReadingSchema],
  temperatureMin: { type: Number },
  temperatureMax: { type: Number },
  temperatureAlertCount: { type: Number, default: 0 },
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date },
  notes: { type: String },
  tags: [{ type: String }],

  // CQRS / OCC fields
  currentVersion: { type: Number, default: 0 },
  eventCount: { type: Number, default: 0 },
  lastEventAt: { type: Date },

  // Audit
  createdBy: { type: String },
  createdByName: { type: String },
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Computed fields
shipmentSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, i) => sum + i.quantity, 0);
});

shipmentSchema.virtual('latestTemperature').get(function () {
  if (!this.temperatureReadings.length) return null;
  return this.temperatureReadings[this.temperatureReadings.length - 1];
});

// Text search index
shipmentSchema.index({ shipmentId: 'text', containerId: 'text', carrier: 'text', 'origin.city': 'text', 'destination.city': 'text' });
shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({ estimatedDelivery: 1 });

const Shipment = mongoose.model('Shipment', shipmentSchema);
module.exports = Shipment;
