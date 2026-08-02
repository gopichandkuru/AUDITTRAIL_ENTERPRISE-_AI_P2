require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./src/routes/auth');
const logsRoutes = require('./src/routes/logs');
const analyticsRoutes = require('./src/routes/analytics');
const aiRoutes = require('./src/routes/ai');
const alertsRoutes = require('./src/routes/alerts');
const ingestRoutes = require('./src/routes/ingest');
const { initSocket } = require('./src/socket/socketHandlers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/ingest', ingestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'AuditTrail Enterprise AI' });
});

// Socket.IO
initSocket(io);

// MongoDB connection
const startServer = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/audittrail';
    try {
      await mongoose.connect(mongoUri);
    } catch (error) {
      console.log('❌ Could not connect to provided MONGODB_URI. Falling back to mongodb-memory-server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      
      console.log('🌱 Seeding memory database...');
      const { seedUsers, seedAlertRules, seedLogs } = require('./src/scripts/seed');
      const users = await seedUsers();
      const adminUser = users.find(u => u.role === 'admin');
      await seedAlertRules(adminUser);
      await seedLogs(users);
      console.log('✅ Seed complete');
    }
    
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 AuditTrail Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };

