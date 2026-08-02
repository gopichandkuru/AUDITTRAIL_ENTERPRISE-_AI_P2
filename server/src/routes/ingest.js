const express = require('express');
const router = express.Router();
const { ingestEvents } = require('../controllers/ingestController');
const { apiKeyMiddleware, authMiddleware } = require('../middleware/auth');

// Accept both API key and Bearer token for ingest
router.post('/', (req, res, next) => {
  if (req.headers['x-api-key']) {
    return apiKeyMiddleware(req, res, next);
  }
  return authMiddleware(req, res, next);
}, ingestEvents);

module.exports = router;
