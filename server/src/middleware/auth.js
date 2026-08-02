const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

/**
 * Core JWT authentication middleware
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please provide a Bearer token.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'audittrail_enterprise_secret_key_2024');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired. Please refresh your session.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, error: 'Invalid token.', code: 'INVALID_TOKEN' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or account deactivated.' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware factory
 * Usage: requireRole(['admin', 'manager'])
 */
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
    });
  }
  next();
};

/**
 * Optional auth — attaches user if token present, but doesn't block if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'audittrail_enterprise_secret_key_2024');
    const user = await User.findById(decoded.userId).select('-password');
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id.toString();
    }
  } catch (_) { /* silent */ }
  next();
};

module.exports = { authMiddleware, requireRole, optionalAuth };
