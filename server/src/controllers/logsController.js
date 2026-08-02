const { v4: uuidv4 } = require('uuid');
const AuditLog = require('../models/AuditLog');

// GET /api/logs
const getLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      action,
      userId,
      resource,
      status,
      flagged,
      startDate,
      endDate,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (severity) filter.severity = { $in: severity.split(',') };
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (userId) filter.userId = userId;
    if (resource) filter.resource = { $regex: resource, $options: 'i' };
    if (status) filter.status = status;
    if (flagged !== undefined) filter.flagged = flagged === 'true';

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await AuditLog.countDocuments(filter);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await AuditLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/logs/:id
const getLogById = async (req, res) => {
  try {
    const log = await AuditLog.findOne({ eventId: req.params.id });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/logs/:id/flag
const flagLog = async (req, res) => {
  try {
    const { flagged, flagReason } = req.body;
    const log = await AuditLog.findOneAndUpdate(
      { eventId: req.params.id },
      { flagged, flagReason },
      { new: true }
    );
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/logs/stats/summary
const getStatsSummary = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [total, last24hCount, criticalCount, flaggedCount, severityBreakdown, actionBreakdown] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ timestamp: { $gte: last24h } }),
      AuditLog.countDocuments({ severity: 'CRITICAL', timestamp: { $gte: last7d } }),
      AuditLog.countDocuments({ flagged: true }),
      AuditLog.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      total,
      last24h: last24hCount,
      critical: criticalCount,
      flagged: flaggedCount,
      severityBreakdown: severityBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topActions: actionBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/logs (manual create - for testing)
const createLog = async (req, res) => {
  try {
    const log = await AuditLog.create({
      eventId: uuidv4(),
      ...req.body,
    });

    // Emit to connected clients
    if (req.io) {
      req.io.emit('new_log', log);
    }

    res.status(201).json({ log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getLogs, getLogById, flagLog, getStatsSummary, createLog };
