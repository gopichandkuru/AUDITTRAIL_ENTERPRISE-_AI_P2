const express = require('express');
const router = express.Router();
const {
  register, login, refresh, getMe, logout, getUsers, getSessions,
} = require('../controllers/authController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);
router.get('/users', authMiddleware, requireRole(['admin']), getUsers);
router.get('/sessions', authMiddleware, requireRole(['admin']), getSessions);

module.exports = router;
