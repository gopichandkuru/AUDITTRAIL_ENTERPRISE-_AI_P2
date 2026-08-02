const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, getUsers } = require('../controllers/authController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);
router.get('/users', authMiddleware, requireRole('admin'), getUsers);

module.exports = router;
