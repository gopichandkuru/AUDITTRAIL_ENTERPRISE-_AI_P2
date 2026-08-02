const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'viewer',
      department,
      apiKey: uuidv4(),
    });

    // Log registration event
    await AuditLog.create({
      eventId: uuidv4(),
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'REGISTER',
      resource: 'User',
      resourceId: user._id.toString(),
      severity: 'INFO',
      status: 'SUCCESS',
      ipAddress: req.ip,
      source: 'web',
    });

    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log failed login
      await AuditLog.create({
        eventId: uuidv4(),
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        resource: 'Session',
        severity: 'WARNING',
        status: 'FAILURE',
        ipAddress: req.ip,
        source: 'web',
        riskScore: 35,
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    // Log successful login
    await AuditLog.create({
      eventId: uuidv4(),
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      resource: 'Session',
      severity: 'INFO',
      status: 'SUCCESS',
      ipAddress: req.ip,
      source: 'web',
    });

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await AuditLog.create({
      eventId: uuidv4(),
      userId: req.user._id.toString(),
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'LOGOUT',
      resource: 'Session',
      severity: 'INFO',
      status: 'SUCCESS',
      ipAddress: req.ip,
      source: 'web',
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/auth/users (admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, getMe, logout, getUsers };
