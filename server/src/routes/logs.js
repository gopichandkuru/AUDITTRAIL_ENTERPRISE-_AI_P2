const express = require('express');
const router = express.Router();
const { getLogs, getLogById, flagLog, getStatsSummary, createLog } = require('../controllers/logsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', authMiddleware, getLogs);
router.get('/stats/summary', authMiddleware, getStatsSummary);
router.get('/:id', authMiddleware, getLogById);
router.patch('/:id/flag', authMiddleware, requireRole('admin', 'auditor'), flagLog);
router.post('/', authMiddleware, requireRole('admin'), createLog);

module.exports = router;
