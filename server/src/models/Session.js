const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true,
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  isActive: { type: Boolean, default: true },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 },
  },
}, { timestamps: true });

sessionSchema.index({ userId: 1, isActive: 1 });

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
