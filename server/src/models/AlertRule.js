const mongoose = require('mongoose');

const alertRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  condition: {
    field: { type: String, required: true },    // e.g. 'action', 'severity', 'userId'
    operator: { type: String, required: true }, // 'equals', 'contains', 'gt', 'lt', 'in'
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  threshold: {
    count: { type: Number, default: 1 },
    windowMinutes: { type: Number, default: 5 },
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'WARNING',
  },
  actions: [{
    type: String,
    enum: ['in_app', 'email', 'webhook'],
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  triggerCount: {
    type: Number,
    default: 0,
  },
  lastTriggered: {
    type: Date,
  },
}, {
  timestamps: true,
});

const AlertRule = mongoose.model('AlertRule', alertRuleSchema);
module.exports = AlertRule;
