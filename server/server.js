/**
 * AuditTrail Enterprise AI — Main Server
 * Event-Sourced Inventory & Logistics Ledger
 */

// ─── Crash-proof process handlers (MUST be first) ─────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  // Don't exit — keep server alive in production
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const path = require('path');

// ─── Middleware imports ────────────────────────────────────────────────────
const { errorHandler } = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');

// ─── Route imports ─────────────────────────────────────────────────────────
const authRoutes    = require('./src/routes/auth');
const logsRoutes    = require('./src/routes/logs');
const analyticsRoutes = require('./src/routes/analytics');
const aiRoutes      = require('./src/routes/ai');
const alertsRoutes  = require('./src/routes/alerts');
const ingestRoutes  = require('./src/routes/ingest');
const commandRoutes = require('./src/routes/commands/shipments');
const queryRoutes   = require('./src/routes/queries/shipments');

const { initSocket }  = require('./src/socket/socketHandlers');

// ─── App & Server ──────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Security Middleware ───────────────────────────────────────────────────
app.set('trust proxy', 1); // Trust first proxy (Render load balancer) for correct req.ip

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Disabled so frontend can load
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : undefined)
    : (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Expected-Version', 'X-API-Key', 'X-Source'],
}));

// ─── Request Middleware ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Apply rate limiter ONLY to API routes, not static files!
app.use('/api', generalLimiter);

// ─── Attach Socket.IO to requests ─────────────────────────────────────────
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────
// CQRS
app.use('/api/commands/shipments', commandRoutes);
app.use('/api/queries',            queryRoutes);

// Legacy / existing routes (preserved)
app.use('/api/auth',      authRoutes);
app.use('/api/logs',      logsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai',        aiRoutes);
app.use('/api/alerts',    alertsRoutes);
app.use('/api/ingest',    ingestRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AuditTrail Enterprise AI — Logistics Ledger',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '2.0.0',
  });
});

// ─── Serve Frontend in Production ───────────────────────────────────────
app.use(express.static(path.join(__dirname, '../client/dist')));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// React Router catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ─── Central Error Handler (MUST be last middleware) ─────────────────────
app.use(errorHandler);

// ─── Socket.IO Handlers ───────────────────────────────────────────────────
initSocket(io);

// ─── MongoDB + Server Start ───────────────────────────────────────────────
const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000, // Increased timeout for slower connections
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB Atlas connected');
    } catch (err) {
      console.error('❌ MongoDB Atlas unreachable. Server cannot start.', err.message);
      process.exit(1);
    }

    launchServer();
  } catch (err) {
    console.error('❌ Fatal startup error:', err.message);
    process.exit(1);
  }
};



const launchServer = () => {
  // After DB connects, rebuild projections if needed
  const { rebuildAllReadModels } = require('./src/projections/shipmentProjector');
  rebuildAllReadModels().catch((e) =>
    console.warn('[Projector] Rebuild skipped:', e.message)
  );

  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`🚀 AuditTrail Enterprise Ledger running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
};

startServer();
module.exports = { app, io };
