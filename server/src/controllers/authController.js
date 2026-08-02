const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'audittrail_enterprise_secret_key_2024';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '15m';
const REFRESH_EXPIRES_DAYS = 30;

const generateAccessToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');

const logAuditEvent = async (action, user, req, extra = {}) => {
  try {
    await AuditLog.create({
      eventId: uuidv4(),
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      resource: 'Session',
      severity: action.includes('FAILED') ? 'WARNING' : 'INFO',
      status: action.includes('FAILED') ? 'FAILURE' : 'SUCCESS',
      ipAddress: req.ip || req.connection?.remoteAddress,
      source: 'web',
      ...extra,
    });
  } catch (_) { /* non-blocking */ }
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password) {
    throw createError('Name, email, and password are required', 400);
  }
  const existing = await User.findOne({ email });
  if (existing) throw createError('Email already registered', 409);

  const user = await User.create({
    name, email, password,
    role: role || 'viewer',
    department,
    apiKey: uuidv4(),
  });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken();

  await Session.create({
    userId: user._id,
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await logAuditEvent('REGISTER', user, req);

  res.status(201).json({
    success: true,
    token: accessToken,
    refreshToken,
    user,
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw createError('Email and password are required', 400);

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await logAuditEvent('LOGIN_FAILED', user, req, { riskScore: 35 });
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, error: 'Account deactivated. Contact your administrator.' });
  }

  user.lastLogin = new Date();
  user.lastLoginIp = req.ip;
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken();

  await Session.create({
    userId: user._id,
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await logAuditEvent('LOGIN', user, req);

  res.json({
    success: true,
    token: accessToken,
    refreshToken,
    user,
  });
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw createError('Refresh token required', 400);

  const session = await Session.findOne({ refreshToken, isActive: true });
  if (!session || session.expiresAt < new Date()) {
    if (session) { session.isActive = false; await session.save(); }
    throw createError('Session expired. Please log in again.', 401);
  }

  const user = await User.findById(session.userId);
  if (!user || !user.isActive) throw createError('User not found', 401);

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken();

  session.refreshToken = newRefreshToken;
  session.expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await session.save();

  res.json({ success: true, token: newAccessToken, refreshToken: newRefreshToken, user });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await Session.updateMany({ userId: req.user._id, refreshToken }, { isActive: false });
  }
  await logAuditEvent('LOGOUT', req.user, req);
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/users (admin only)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, users });
});

// GET /api/auth/sessions (admin)
const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ isActive: true })
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, sessions });
});

module.exports = { register, login, refresh, getMe, logout, getUsers, getSessions };
