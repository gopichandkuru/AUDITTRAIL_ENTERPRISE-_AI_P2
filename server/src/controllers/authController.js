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

// ─── Safe auth logger — NEVER logs passwords, tokens, or secrets ─────────────
const authLog = (event, data = {}) => {
  console.log(`[AUTH][${new Date().toISOString()}] ${event}`, JSON.stringify(data));
};

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

  authLog('REGISTER_REQUEST', { email, role });

  if (!name || !email || !password) {
    throw createError('Name, email, and password are required', 400);
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw createError('Invalid email address', 400);
  }

  if (password.length < 8) {
    throw createError('Password must contain at least 8 characters', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  authLog('REGISTER_USER_CHECK', { email: normalizedEmail });
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw createError('An account with this email already exists.', 409);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
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
  authLog('REGISTER_SUCCESS', { userId: user._id.toString(), email: normalizedEmail, role: user.role });

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

  authLog('LOGIN_REQUEST', { email });

  if (!email || !password) throw createError('Email and password are required', 400);

  const normalizedEmail = email.toLowerCase().trim();

  authLog('USER_LOOKUP', { email: normalizedEmail });
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    authLog('LOGIN_FAILURE', { email: normalizedEmail, reason: 'USER_NOT_FOUND' });
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  authLog('PASSWORD_CHECK', { userId: user._id.toString() });
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    authLog('LOGIN_FAILURE', { email: normalizedEmail, reason: 'WRONG_PASSWORD' });
    await logAuditEvent('LOGIN_FAILED', user, req, { riskScore: 35 });
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  if (!user.isActive) {
    authLog('LOGIN_FAILURE', { email: normalizedEmail, reason: 'ACCOUNT_DEACTIVATED' });
    return res.status(403).json({ success: false, error: 'Account deactivated. Contact your administrator.' });
  }

  user.lastLogin = new Date();
  user.lastLoginIp = req.ip;
  await user.save();

  authLog('JWT_CREATED', { userId: user._id.toString() });
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken();

  await Session.create({
    userId: user._id,
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await logAuditEvent('LOGIN', user, req);
  authLog('LOGIN_SUCCESS', { userId: user._id.toString(), email: normalizedEmail, role: user.role });

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

  authLog('TOKEN_REFRESHED', { userId: user._id.toString() });
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
  authLog('LOGOUT', { userId: req.user._id.toString() });
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
