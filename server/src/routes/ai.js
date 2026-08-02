const express = require('express');
const router = express.Router();
const { naturalLanguageQuery, detectAnomalies, summarizeActivity, getUserRiskScores } = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');

router.post('/query', authMiddleware, naturalLanguageQuery);
router.post('/anomalies', authMiddleware, detectAnomalies);
router.post('/summarize', authMiddleware, summarizeActivity);
router.get('/risk-scores', authMiddleware, getUserRiskScores);

module.exports = router;
