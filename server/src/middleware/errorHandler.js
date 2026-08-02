/**
 * Central Error Handling Middleware
 * Catches all errors thrown from route handlers and controllers.
 */

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Joi validation errors
  if (err.isJoi || err.name === 'ValidationError' && err.details) {
    statusCode = 422;
    message = 'Validation Error';
    details = err.details.map((d) => ({ field: d.context?.key, message: d.message.replace(/['"]/g, '') }));
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    message = 'Validation Error';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Optimistic Concurrency Conflict
  if (err.name === 'ConcurrencyError') {
    statusCode = 409;
    message = err.message || 'Concurrency conflict — version mismatch';
  }

  const response = {
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  // Log server errors
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path} → ${statusCode}: ${message}`);
    if (process.env.NODE_ENV === 'development') console.error(err.stack);
  }

  res.status(statusCode).json(response);
};

/**
 * Async route wrapper — eliminates try/catch boilerplate
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create a typed HTTP error
 */
const createError = (message, statusCode = 500, name = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (name) err.name = name;
  return err;
};

const createConcurrencyError = (expected, actual) => {
  const err = new Error(
    `Version conflict: expected ${expected}, got ${actual}. Fetch the latest version and retry.`
  );
  err.name = 'ConcurrencyError';
  return err;
};

module.exports = { errorHandler, asyncHandler, createError, createConcurrencyError };
