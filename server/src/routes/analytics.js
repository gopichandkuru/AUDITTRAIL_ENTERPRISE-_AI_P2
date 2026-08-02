const express = require('express');
const router = express.Router();
const { getOverview, getRiskOverview } = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

router.get('/overview', authMiddleware, getOverview);
router.get('/risk', authMiddleware, getRiskOverview);

module.exports = router;
