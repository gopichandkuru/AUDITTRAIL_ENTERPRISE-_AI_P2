require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const AlertRule = require('../models/AlertRule');

const ACTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'CREATE', 'READ', 'UPDATE', 'DELETE',
  'BULK_DELETE', 'EXPORT', 'DATA_EXPORT', 'PERMISSION_CHANGE', 'ROLE_CHANGE',
  'API_KEY_GENERATED', 'PASSWORD_RESET', 'MFA_ENABLED', 'REPORT_GENERATED',
  'BACKUP_CREATED', 'CONFIG_CHANGED', 'USER_INVITED', 'USER_DEACTIVATED',
];

const RESOURCES = [
  'User', 'Document', 'Report', 'Setting', 'Database', 'API Key',
  'Permission', 'Role', 'Backup', 'Config', 'Dashboard', 'Audit Log',
  'Integration', 'Webhook', 'Notification',
];

const SEVERITIES = ['INFO', 'INFO', 'INFO', 'WARNING', 'WARNING', 'CRITICAL', 'SUCCESS'];

const STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILURE'];

const IPS = [
  '192.168.1.101', '10.0.0.25', '172.16.0.50', '203.0.113.45',
  '198.51.100.12', '192.0.2.88', '185.220.101.45', '91.108.4.22',
];

const LOCATIONS = [
  { country: 'United States', city: 'New York', lat: 40.7128, lng: -74.0060 },
  { country: 'United Kingdom', city: 'London', lat: 51.5074, lng: -0.1278 },
  { country: 'Germany', city: 'Berlin', lat: 52.5200, lng: 13.4050 },
  { country: 'India', city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { country: 'Australia', city: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { country: 'Japan', city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
];

const seedUsers = async () => {
  const users = [
    { name: 'Admin User', email: 'admin@audittrail.io', password: 'admin123', role: 'admin', department: 'IT Security' },
    { name: 'Sarah Chen', email: 'sarah@audittrail.io', password: 'auditor123', role: 'auditor', department: 'Compliance' },
    { name: 'Marcus Johnson', email: 'marcus@audittrail.io', password: 'viewer123', role: 'viewer', department: 'Finance' },
    { name: 'Emily Rodriguez', email: 'emily@audittrail.io', password: 'viewer123', role: 'viewer', department: 'HR' },
    { name: 'James Kim', email: 'james@audittrail.io', password: 'viewer123', role: 'viewer', department: 'Engineering' },
  ];

  const createdUsers = [];
  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const user = await User.create({ ...u, apiKey: uuidv4() });
      createdUsers.push(user);
      console.log(`✅ Created user: ${u.email} (${u.role}) | password: ${u.password}`);
    } else {
      createdUsers.push(existing);
      console.log(`⏭️  User exists: ${u.email}`);
    }
  }
  return createdUsers;
};

const seedAlertRules = async (adminUser) => {
  const rules = [
    {
      name: 'Multiple Failed Logins',
      description: 'Alert when a failed login event occurs',
      condition: { field: 'action', operator: 'equals', value: 'LOGIN_FAILED' },
      severity: 'WARNING',
      actions: ['in_app'],
      isActive: true,
    },
    {
      name: 'Critical Severity Event',
      description: 'Alert on any critical severity event',
      condition: { field: 'severity', operator: 'equals', value: 'CRITICAL' },
      severity: 'CRITICAL',
      actions: ['in_app', 'email'],
      isActive: true,
    },
    {
      name: 'Bulk Delete Operation',
      description: 'Alert when bulk delete is performed',
      condition: { field: 'action', operator: 'equals', value: 'BULK_DELETE' },
      severity: 'CRITICAL',
      actions: ['in_app'],
      isActive: true,
    },
    {
      name: 'Permission Change',
      description: 'Alert when a permission is changed',
      condition: { field: 'action', operator: 'equals', value: 'PERMISSION_CHANGE' },
      severity: 'WARNING',
      actions: ['in_app'],
      isActive: true,
    },
  ];

  for (const r of rules) {
    const existing = await AlertRule.findOne({ name: r.name });
    if (!existing) {
      await AlertRule.create({ ...r, createdBy: adminUser._id });
      console.log(`✅ Created alert rule: ${r.name}`);
    }
  }
};

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedLogs = async (users) => {
  const existingCount = await AuditLog.countDocuments();
  if (existingCount > 100) {
    console.log(`⏭️  Logs already seeded (${existingCount} exist). Skipping.`);
    return;
  }

  const logs = [];
  const now = Date.now();
  const DAYS_BACK = 14;

  for (let i = 0; i < 500; i++) {
    const user = randomFrom(users);
    const action = randomFrom(ACTIONS);
    const severity = action === 'LOGIN_FAILED' ? 'WARNING'
      : action === 'BULK_DELETE' || action === 'PERMISSION_CHANGE' || action === 'ROLE_CHANGE' ? 'CRITICAL'
      : action === 'LOGIN' || action === 'CREATE' || action === 'BACKUP_CREATED' ? 'SUCCESS'
      : randomFrom(SEVERITIES);
    const status = action === 'LOGIN_FAILED' ? 'FAILURE' : randomFrom(STATUSES);
    const location = randomFrom(LOCATIONS);

    // Generate timestamps spread over last 14 days
    const hoursAgo = randomBetween(0, DAYS_BACK * 24);
    const timestamp = new Date(now - hoursAgo * 60 * 60 * 1000);

    // Higher risk for certain actions
    let riskScore = randomBetween(0, 20);
    if (action === 'BULK_DELETE') riskScore = randomBetween(70, 95);
    else if (action === 'PERMISSION_CHANGE' || action === 'ROLE_CHANGE') riskScore = randomBetween(60, 85);
    else if (action === 'LOGIN_FAILED') riskScore = randomBetween(30, 55);
    else if (severity === 'CRITICAL') riskScore = randomBetween(50, 80);
    else if (severity === 'WARNING') riskScore = randomBetween(20, 45);

    logs.push({
      eventId: uuidv4(),
      timestamp,
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      resource: randomFrom(RESOURCES),
      resourceId: uuidv4().split('-')[0],
      severity,
      status,
      ipAddress: randomFrom(IPS),
      location,
      riskScore,
      flagged: riskScore > 75 && Math.random() > 0.7,
      source: randomFrom(['web', 'api', 'system', 'mobile']),
      sessionId: uuidv4().split('-')[0],
      metadata: { browser: 'Chrome 120', os: 'Windows 11' },
    });
  }

  await AuditLog.insertMany(logs);
  console.log(`✅ Seeded ${logs.length} audit log entries`);
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audittrail');
    console.log('✅ Connected to MongoDB');

    const users = await seedUsers();
    const adminUser = users.find(u => u.role === 'admin');
    await seedAlertRules(adminUser);
    await seedLogs(users);

    console.log('\n🎉 Seed complete!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin:   admin@audittrail.io / admin123');
    console.log('  Auditor: sarah@audittrail.io / auditor123');
    console.log('  Viewer:  marcus@audittrail.io / viewer123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seed();
}

module.exports = { seedUsers, seedAlertRules, seedLogs };
