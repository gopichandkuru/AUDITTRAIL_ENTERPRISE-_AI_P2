const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'INFO',
  },
  read: { type: Boolean, default: false },
  alertRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertRule' },
  logId: { type: String },
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
