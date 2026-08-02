require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AlertRule = require('../models/AlertRule');
const AuditLog = require('../models/AuditLog');
const EventStore = require('../models/EventStore');
const Shipment = require('../models/Shipment');

// ─── User Seeding ──────────────────────────────────────────────────────────
const seedUsers = async () => {
  const users = [
    { name: 'Admin User',       email: 'admin@audittrail.io',   password: 'admin123',   role: 'admin',   department: 'IT Security' },
    { name: 'Sarah Chen',       email: 'sarah@audittrail.io',   password: 'auditor123', role: 'manager', department: 'Logistics' },
    { name: 'Marcus Johnson',   email: 'marcus@audittrail.io',  password: 'viewer123',  role: 'viewer',  department: 'Finance' },
    { name: 'Emily Rodriguez',  email: 'emily@audittrail.io',   password: 'viewer123',  role: 'viewer',  department: 'Operations' },
    { name: 'James Kim',        email: 'james@audittrail.io',   password: 'viewer123',  role: 'manager', department: 'Supply Chain' },
  ];

  const created = [];
  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const user = await User.create({ ...u, apiKey: uuidv4() });
      created.push(user);
      console.log(`  ✅ User: ${u.email} (${u.role})`);
    } else {
      created.push(existing);
    }
  }
  return created;
};

// ─── Alert Rules ───────────────────────────────────────────────────────────
const seedAlertRules = async (adminUser) => {
  const rules = [
    { name: 'Temperature Alert',        condition: { field: 'eventType', operator: 'equals', value: 'TEMPERATURE_RECORDED' }, severity: 'WARNING',  actions: ['in_app'] },
    { name: 'Shipment Delayed',         condition: { field: 'eventType', operator: 'equals', value: 'DELAYED' },              severity: 'CRITICAL', actions: ['in_app', 'email'] },
    { name: 'Shipment Delivered',       condition: { field: 'eventType', operator: 'equals', value: 'DELIVERED' },            severity: 'INFO',     actions: ['in_app'] },
    { name: 'Container Loaded',         condition: { field: 'eventType', operator: 'equals', value: 'CONTAINER_LOADED' },     severity: 'INFO',     actions: ['in_app'] },
    { name: 'Transfer Initiated',       condition: { field: 'eventType', operator: 'equals', value: 'TRANSFER_INITIATED' },   severity: 'WARNING',  actions: ['in_app'] },
  ];
  for (const r of rules) {
    const existing = await AlertRule.findOne({ name: r.name });
    if (!existing) {
      await AlertRule.create({ ...r, isActive: true, createdBy: adminUser._id });
      console.log(`  ✅ Alert rule: ${r.name}`);
    }
  }
};

// ─── Shipment Event Seeding ────────────────────────────────────────────────
const ORIGINS = [
  { city: 'Shanghai', country: 'China', port: 'CNSHA' },
  { city: 'Singapore', country: 'Singapore', port: 'SGSIN' },
  { city: 'Rotterdam', country: 'Netherlands', port: 'NLRTM' },
  { city: 'Los Angeles', country: 'USA', port: 'USLAX' },
  { city: 'Mumbai', country: 'India', port: 'INBOM' },
];

const DESTINATIONS = [
  { city: 'New York', country: 'USA', port: 'USNYC' },
  { city: 'Hamburg', country: 'Germany', port: 'DEHAM' },
  { city: 'Dubai', country: 'UAE', port: 'AEDXB' },
  { city: 'London', country: 'UK', port: 'GBLON' },
  { city: 'Tokyo', country: 'Japan', port: 'JPTYO' },
];

const CARRIERS = ['Maersk Line', 'MSC', 'CMA CGM', 'COSCO', 'Hapag-Lloyd', 'ONE', 'Evergreen'];

const ITEMS_POOL = [
  { sku: 'ELEC-001', name: 'Laptop Computers', unit: 'units', weight: 2.5 },
  { sku: 'ELEC-002', name: 'Smartphone Batch', unit: 'units', weight: 0.2 },
  { sku: 'CHEM-001', name: 'Industrial Solvent', unit: 'drums', weight: 200, hazmat: true },
  { sku: 'FOOD-001', name: 'Frozen Seafood', unit: 'kg', weight: 1 },
  { sku: 'TEXT-001', name: 'Cotton Fabric Rolls', unit: 'rolls', weight: 25 },
  { sku: 'AUTO-001', name: 'Auto Parts Kit', unit: 'sets', weight: 15 },
  { sku: 'PHARM-001', name: 'Medical Supplies', unit: 'boxes', weight: 5 },
  { sku: 'MACH-001', name: 'Industrial Machinery', unit: 'units', weight: 500 },
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const appendSeedEvent = async (aggregateId, eventType, payload, version, adminUser, daysAgo) => {
  const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + randomInt(0, 3600) * 1000);
  return EventStore.create({
    aggregateId,
    aggregateType: 'Shipment',
    eventType,
    payload,
    version,
    metadata: {
      userId: adminUser._id.toString(),
      userName: adminUser.name,
      userRole: adminUser.role,
      source: 'seed',
    },
    timestamp,
  });
};

const seedShipments = async (users) => {
  const existingCount = await EventStore.countDocuments({ aggregateType: 'Shipment' });
  if (existingCount > 10) {
    console.log(`  ⏭️  Shipment events already seeded (${existingCount} events). Skipping.`);
    return;
  }

  const admin = users.find((u) => u.role === 'admin') || users[0];
  const scenarios = [
    // Scenario 1: Delivered electronics
    { status: 'DELIVERED', daysAgo: 12, items: [{ ...ITEMS_POOL[0], quantity: 500 }, { ...ITEMS_POOL[1], quantity: 2000 }] },
    // Scenario 2: In Transit with temperature alerts
    { status: 'IN_TRANSIT', daysAgo: 6, items: [{ ...ITEMS_POOL[3], quantity: 5000 }], tempAlerts: true },
    // Scenario 3: Delayed at customs
    { status: 'DELAYED', daysAgo: 8, items: [{ ...ITEMS_POOL[2], quantity: 20 }] },
    // Scenario 4: Delivered pharma
    { status: 'DELIVERED', daysAgo: 15, items: [{ ...ITEMS_POOL[6], quantity: 1000 }] },
    // Scenario 5: Pending new shipment
    { status: 'PENDING', daysAgo: 1, items: [{ ...ITEMS_POOL[4], quantity: 300 }] },
    // Scenario 6: Processing machinery
    { status: 'PROCESSING', daysAgo: 3, items: [{ ...ITEMS_POOL[7], quantity: 5 }] },
    // Scenario 7: Delivered auto parts
    { status: 'DELIVERED', daysAgo: 20, items: [{ ...ITEMS_POOL[5], quantity: 200 }] },
    // Scenario 8: In transit with location updates
    { status: 'IN_TRANSIT', daysAgo: 4, items: [{ ...ITEMS_POOL[0], quantity: 1000 }, { ...ITEMS_POOL[1], quantity: 3000 }] },
    // Scenario 9: Delayed
    { status: 'DELAYED', daysAgo: 9, items: [{ ...ITEMS_POOL[3], quantity: 8000 }], tempAlerts: true },
    // Scenario 10: Recent delivery
    { status: 'DELIVERED', daysAgo: 2, items: [{ ...ITEMS_POOL[6], quantity: 500 }, { ...ITEMS_POOL[4], quantity: 100 }] },
  ];

  const { projectShipmentEvent } = require('../projections/shipmentProjector');

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const shipmentId = `SHP-${(Date.now() + i).toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;
    const origin = randomFrom(ORIGINS);
    const destination = randomFrom(DESTINATIONS);
    const carrier = randomFrom(CARRIERS);
    const containerId = `CNTR${randomInt(100000, 999999)}`;
    let version = 0;

    // Event 1: SHIPMENT_CREATED
    version++;
    const e1 = await appendSeedEvent(shipmentId, 'SHIPMENT_CREATED', {
      origin, destination, carrier, containerId,
      estimatedDelivery: new Date(Date.now() + randomInt(7, 30) * 24 * 60 * 60 * 1000),
    }, version, admin, s.daysAgo + 2);
    await projectShipmentEvent(e1);

    // Event 2+: ITEM_ADDED for each item
    for (const item of s.items) {
      version++;
      const eItem = await appendSeedEvent(shipmentId, 'ITEM_ADDED', item, version, admin, s.daysAgo + 1.5);
      await projectShipmentEvent(eItem);
    }

    // CONTAINER_LOADED
    if (s.status !== 'PENDING') {
      version++;
      const eCont = await appendSeedEvent(shipmentId, 'CONTAINER_LOADED', { containerId }, version, admin, s.daysAgo + 1);
      await projectShipmentEvent(eCont);
    }

    // Temperature recordings
    const tempCount = s.tempAlerts ? randomInt(5, 10) : randomInt(2, 4);
    for (let t = 0; t < tempCount; t++) {
      const tempValue = s.tempAlerts
        ? randomInt(t < tempCount / 2 ? -5 : 10, t < tempCount / 2 ? 15 : 30)
        : randomInt(2, 8);
      const alert = s.tempAlerts && (tempValue > 8 || tempValue < 0);
      version++;
      const eTemp = await appendSeedEvent(shipmentId, 'TEMPERATURE_RECORDED',
        { value: tempValue, unit: 'C', sensor: `SENSOR-${randomInt(1, 5)}`, alert },
        version, admin, s.daysAgo - t * 0.5);
      await projectShipmentEvent(eTemp);
    }

    // Location updates
    if (['IN_TRANSIT', 'DELIVERED', 'DELAYED', 'AT_PORT'].includes(s.status)) {
      const waypoints = [
        { name: `Port of ${origin.city}`, city: origin.city, country: origin.country },
        { name: 'Mid-Ocean Waypoint', city: 'Pacific Ocean', country: 'International Waters' },
        { name: `Port of ${destination.city}`, city: destination.city, country: destination.country },
      ];
      for (const wp of waypoints) {
        version++;
        const eLoc = await appendSeedEvent(shipmentId, 'LOCATION_UPDATED', wp, version, admin, s.daysAgo - 1);
        await projectShipmentEvent(eLoc);
      }
    }

    // Status events
    if (s.status === 'IN_TRANSIT') {
      version++;
      const eTransit = await appendSeedEvent(shipmentId, 'IN_TRANSIT', { carrier }, version, admin, s.daysAgo - 1);
      await projectShipmentEvent(eTransit);
    }
    if (s.status === 'DELAYED') {
      version++;
      const eDelay = await appendSeedEvent(shipmentId, 'DELAYED',
        { reason: 'Customs inspection required', newEstimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        version, admin, s.daysAgo - 2);
      await projectShipmentEvent(eDelay);
    }
    if (s.status === 'DELIVERED') {
      version++;
      const eDel = await appendSeedEvent(shipmentId, 'DELIVERED',
        { deliveredAt: new Date(Date.now() - (s.daysAgo - 1) * 24 * 60 * 60 * 1000) },
        version, admin, s.daysAgo - 3);
      await projectShipmentEvent(eDel);
    }

    console.log(`  ✅ Shipment: ${shipmentId} (${s.status}) — ${version} events`);
  }
};

// ─── Legacy Audit Logs (preserved for existing dashboard) ────────────────
const seedAuditLogs = async (users) => {
  const existingCount = await AuditLog.countDocuments();
  if (existingCount > 10) return;

  const ACTIONS = ['LOGIN', 'LOGOUT', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'];
  const STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILURE'];
  const SEVERITIES = ['INFO', 'INFO', 'WARNING', 'SUCCESS'];

  const logs = Array.from({ length: 100 }, () => {
    const user = randomFrom(users);
    return {
      eventId: uuidv4(),
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: randomFrom(ACTIONS),
      resource: randomFrom(['Shipment', 'User', 'Report', 'Config']),
      severity: randomFrom(SEVERITIES),
      status: randomFrom(STATUSES),
      ipAddress: `192.168.${randomInt(1, 5)}.${randomInt(1, 254)}`,
      source: 'web',
      timestamp: new Date(Date.now() - randomInt(0, 14 * 24 * 60 * 60 * 1000)),
      riskScore: randomInt(0, 30),
    };
  });

  await AuditLog.insertMany(logs);
  console.log(`  ✅ Seeded ${logs.length} audit log entries`);
};

// ─── Main seed function ───────────────────────────────────────────────────
const seedAll = async () => {
  try {
    console.log('🌱 Seeding database...');
    const users = await seedUsers();
    const admin = users.find((u) => u.role === 'admin') || users[0];
    await seedAlertRules(admin);
    await seedShipments(users);
    await seedAuditLogs(users);
    console.log('✅ Seed complete\n');
  } catch (err) {
    console.error('❌ Seed error:', err);
  }
};

// ─── Standalone execution ─────────────────────────────────────────────────
const runStandalone = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audittrail');
  await seedAll();
  process.exit(0);
};

if (require.main === module) {
  runStandalone().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedAll, seedUsers, seedAlertRules, seedShipments };
