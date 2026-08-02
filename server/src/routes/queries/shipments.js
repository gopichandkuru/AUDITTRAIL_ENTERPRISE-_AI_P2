const express = require('express');
const router = express.Router();
const {
  listShipments, getShipment, getShipmentTimeline, getShipmentStateAt,
  getEvents, getDashboardStats, getAnalyticsOverview, getRollbackPreview,
} = require('../../controllers/queryController');
const { authMiddleware } = require('../../middleware/auth');

// All query routes require authentication
router.use(authMiddleware);

// Shipment reads
router.get('/shipments', listShipments);
router.get('/shipments/:id', getShipment);
router.get('/shipments/:id/timeline', getShipmentTimeline);
router.get('/shipments/:id/state', getShipmentStateAt);       // ?timestamp=ISO
router.get('/shipments/:id/rollback', getRollbackPreview);    // ?targetVersion=N

// Global event stream
router.get('/events', getEvents);

// Dashboard & analytics
router.get('/dashboard/stats', getDashboardStats);
router.get('/analytics/overview', getAnalyticsOverview);

module.exports = router;
