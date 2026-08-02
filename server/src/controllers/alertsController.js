const AlertRule = require('../models/AlertRule');
const Notification = require('../models/Notification');

// GET /api/alerts/rules
const getRules = async (req, res) => {
  try {
    const rules = await AlertRule.find().sort({ createdAt: -1 });
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/alerts/rules
const createRule = async (req, res) => {
  try {
    const rule = await AlertRule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/alerts/rules/:id
const updateRule = async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/alerts/rules/:id
const deleteRule = async (req, res) => {
  try {
    await AlertRule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ read: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/alerts/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getRules, createRule, updateRule, deleteRule, getNotifications, markAllRead };
