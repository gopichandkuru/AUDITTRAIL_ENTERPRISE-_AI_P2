const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
  },
  userRole: {
    type: String,
    enum: ['admin', 'auditor', 'viewer', 'system', 'api'],
    default: 'viewer',
  },
  action: {
    type: String,
    required: true,
    index: true,
    // e.g. LOGIN, LOGOUT, CREATE, READ, UPDATE, DELETE, EXPORT, PERMISSION_CHANGE, etc.
  },
  resource: {
    type: String,
    required: true,
    // e.g. 'User', 'Document', 'Report', 'Setting', 'API Key'
  },
  resourceId: {
    type: String,
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL', 'SUCCESS'],
    default: 'INFO',
    index: true,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'PENDING'],
    default: 'SUCCESS',
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  location: {
    country: String,
    city: String,
    lat: Number,
    lng: Number,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  flagged: {
    type: Boolean,
    default: false,
    index: true,
  },
  flagReason: {
    type: String,
  },
  source: {
    type: String,
    default: 'web',
    // 'web', 'api', 'system', 'mobile'
  },
  sessionId: {
    type: String,
  },
  duration: {
    type: Number, // milliseconds
  },
  tags: [{
    type: String,
  }],
}, {
  timestamps: true,
  collection: 'audit_logs',
});

// Compound indexes for common queries
auditLogSchema.index({ timestamp: -1, severity: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
