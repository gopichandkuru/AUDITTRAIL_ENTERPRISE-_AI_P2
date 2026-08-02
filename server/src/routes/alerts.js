const express = require('express');
const router = express.Router();
const { getRules, createRule, updateRule, deleteRule, getNotifications, markAllRead } = require('../controllers/alertsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/rules', authMiddleware, getRules);
router.post('/rules', authMiddleware, requireRole('admin', 'auditor'), createRule);
router.put('/rules/:id', authMiddleware, requireRole('admin', 'auditor'), updateRule);
router.delete('/rules/:id', authMiddleware, requireRole('admin'), deleteRule);
router.get('/notifications', authMiddleware, getNotifications);
router.patch('/notifications/read-all', authMiddleware, markAllRead);

module.exports = router;
