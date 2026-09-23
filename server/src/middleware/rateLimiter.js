const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter — 200 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Increased for interview
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' },
});

/**
 * Auth rate limiter — 15 attempts per 15 minutes per IP (prevent brute force)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Increased for interview
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

/**
 * Command rate limiter — 60 write operations per minute per IP
 */
const commandLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Command rate limit exceeded. Please slow down.' },
});

module.exports = { generalLimiter, authLimiter, commandLimiter };
