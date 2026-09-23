const dns = require('dns');
// Configure public DNS resolution fallback for environments where local SRV lookup fails
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (_) {}

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const AlertRule = require('../models/AlertRule');
const EventStore = require('../models/EventStore');
const Shipment = require('../models/Shipment');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { projectShipmentEvent, rebuildShipmentReadModel } = require('../projections/shipmentProjector');

// ─── Deterministic Demo Shipments Specification ───────────────────────────
const DEMO_SHIPMENTS = [
  {
    shipmentId: 'SHP-DEMO-001',
    origin: { city: 'Shanghai', country: 'China', port: 'CNSHA' },
    destination: { city: 'Hamburg', country: 'Germany', port: 'DEHAM' },
    carrier: 'Maersk Line',
    containerId: 'CNTR-SHA-HAM-881',
    item: { sku: 'ELEC-001', name: 'Laptop Computers', quantity: 500, unit: 'units', weight: 2.5, hazmat: false },
    events: [
      {
        eventType: 'SHIPMENT_CREATED',
        version: 1,
        daysAgo: 4,
        payload: {
          origin: { city: 'Shanghai', country: 'China', port: 'CNSHA' },
          destination: { city: 'Hamburg', country: 'Germany', port: 'DEHAM' },
          carrier: 'Maersk Line',
          containerId: 'CNTR-SHA-HAM-881',
          estimatedDelivery: new Date(Date.now() + 10 * 86400000),
          notes: 'Priority electronics consignment for European distribution center',
          tags: ['electronics', 'priority', 'cold-chain-exempt'],
        },
      },
      {
        eventType: 'ITEM_ADDED',
        version: 2,
        daysAgo: 3.5,
        payload: {
          sku: 'ELEC-001',
          name: 'Laptop Computers',
          quantity: 500,
          unit: 'units',
          weight: 2.5,
          hazmat: false,
        },
      },
      {
        eventType: 'CONTAINER_LOADED',
        version: 3,
        daysAgo: 3,
        payload: {
          containerId: 'CNTR-SHA-HAM-881',
        },
      },
      {
        eventType: 'LOCATION_UPDATED',
        version: 4,
        daysAgo: 2.5,
        payload: {
          name: 'Port of Shanghai Berth 4',
          city: 'Shanghai',
          country: 'China',
          lat: 31.2304,
          lng: 121.4737,
        },
      },
      {
        eventType: 'TEMPERATURE_RECORDED',
        version: 5,
        daysAgo: 2,
        payload: {
          value: 4.2,
          unit: 'C',
          sensor: 'SENSOR-SHA-01',
          alert: false,
        },
      },
      {
        eventType: 'LOCATION_UPDATED',
        version: 6,
        daysAgo: 1,
        payload: {
          name: 'Port of Hamburg Terminal',
          city: 'Hamburg',
          country: 'Germany',
          lat: 53.5511,
          lng: 9.9937,
        },
      },
      {
        eventType: 'DELIVERED',
        version: 7,
        daysAgo: 0.1, // Today
        payload: {
          deliveredAt: new Date(Date.now() - 2 * 3600 * 1000),
          recipient: 'Hamburg Central Logistics GmbH',
          notes: 'Delivered and inspected with zero transit damage',
        },
      },
    ],
  },
  {
    shipmentId: 'SHP-DEMO-002',
    origin: { city: 'Singapore', country: 'Singapore', port: 'SGSIN' },
    destination: { city: 'Rotterdam', country: 'Netherlands', port: 'NLRTM' },
    carrier: 'MSC',
    containerId: 'CNTR-SIN-RTM-429',
    item: { sku: 'PHARM-001', name: 'Medical Supplies', quantity: 1200, unit: 'boxes', weight: 5, hazmat: false },
    events: [
      {
        eventType: 'SHIPMENT_CREATED',
        version: 1,
        daysAgo: 3,
        payload: {
          origin: { city: 'Singapore', country: 'Singapore', port: 'SGSIN' },
          destination: { city: 'Rotterdam', country: 'Netherlands', port: 'NLRTM' },
          carrier: 'MSC',
          containerId: 'CNTR-SIN-RTM-429',
          estimatedDelivery: new Date(Date.now() + 14 * 86400000),
          notes: 'Active temperature-controlled medical vaccines batch',
          tags: ['pharma', 'critical', 'temperature-controlled'],
        },
      },
      {
        eventType: 'ITEM_ADDED',
        version: 2,
        daysAgo: 2.8,
        payload: {
          sku: 'PHARM-001',
          name: 'Medical Supplies',
          quantity: 1200,
          unit: 'boxes',
          weight: 5,
          hazmat: false,
        },
      },
      {
        eventType: 'CONTAINER_LOADED',
        version: 3,
        daysAgo: 2.2,
        payload: {
          containerId: 'CNTR-SIN-RTM-429',
        },
      },
      {
        eventType: 'LOCATION_UPDATED',
        version: 4,
        daysAgo: 1.8,
        payload: {
          name: 'Port of Singapore Terminal 3',
          city: 'Singapore',
          country: 'Singapore',
          lat: 1.29027,
          lng: 103.851959,
        },
      },
      {
        eventType: 'TEMPERATURE_RECORDED',
        version: 5,
        daysAgo: 1.2,
        payload: {
          value: 3.8,
          unit: 'C',
          sensor: 'SENSOR-SIN-02',
          alert: false,
        },
      },
      {
        eventType: 'IN_TRANSIT',
        version: 6,
        daysAgo: 0.8,
        payload: {
          carrier: 'MSC',
          vessel: 'MSC Oscar',
        },
      },
      {
        eventType: 'LOCATION_UPDATED',
        version: 7,
        daysAgo: 0.25, // Today
        payload: {
          name: 'Indian Ocean Transit Waypoint',
          city: 'Indian Ocean',
          country: 'International Waters',
          lat: 5.9221,
          lng: 80.217,
        },
      },
      {
        eventType: 'TEMPERATURE_RECORDED',
        version: 8,
        daysAgo: 0.05, // Today
        payload: {
          value: 4.1,
          unit: 'C',
          sensor: 'SENSOR-SIN-02',
          alert: false,
        },
      },
    ],
  },
  {
    shipmentId: 'SHP-DEMO-003',
    origin: { city: 'Mumbai', country: 'India', port: 'INBOM' },
    destination: { city: 'Dubai', country: 'UAE', port: 'AEDXB' },
    carrier: 'Hapag-Lloyd',
    containerId: 'CNTR-BOM-DXB-105',
    item: { sku: 'CHEM-001', name: 'Industrial Solvent', quantity: 40, unit: 'drums', weight: 200, hazmat: true },
    events: [
      {
        eventType: 'SHIPMENT_CREATED',
        version: 1,
        daysAgo: 3.2,
        payload: {
          origin: { city: 'Mumbai', country: 'India', port: 'INBOM' },
          destination: { city: 'Dubai', country: 'UAE', port: 'AEDXB' },
          carrier: 'Hapag-Lloyd',
          containerId: 'CNTR-BOM-DXB-105',
          estimatedDelivery: new Date(Date.now() + 6 * 86400000),
          notes: 'Flammable chemical grade solvent drums',
          tags: ['hazmat', 'chemical', 'inspected'],
        },
      },
      {
        eventType: 'ITEM_ADDED',
        version: 2,
        daysAgo: 2.7,
        payload: {
          sku: 'CHEM-001',
          name: 'Industrial Solvent',
          quantity: 40,
          unit: 'drums',
          weight: 200,
          hazmat: true,
        },
      },
      {
        eventType: 'CONTAINER_LOADED',
        version: 3,
        daysAgo: 2.1,
        payload: {
          containerId: 'CNTR-BOM-DXB-105',
        },
      },
      {
        eventType: 'LOCATION_UPDATED',
        version: 4,
        daysAgo: 1.5,
        payload: {
          name: 'Jawaharlal Nehru Port (JNPT)',
          city: 'Mumbai',
          country: 'India',
          lat: 18.9438,
          lng: 72.8354,
        },
      },
      {
        eventType: 'TEMPERATURE_RECORDED',
        version: 5,
        daysAgo: 0.3, // Today
        payload: {
          value: 16.8,
          unit: 'C',
          sensor: 'SENSOR-BOM-03',
          alert: true, // Triggers temperature alert logic
        },
      },
      {
        eventType: 'DELAYED',
        version: 6,
        daysAgo: 0.1, // Today
        payload: {
          reason: 'Customs hazardous material hold & temperature excursion investigation',
          newEstimatedDelivery: new Date(Date.now() + 5 * 86400000),
        },
      },
    ],
  },
];

// ─── Helper Functions ──────────────────────────────────────────────────────
const seedUsersIfMissing = async () => {
  const users = [
    { name: 'Admin User',       email: 'admin@audittrail.io',   password: 'admin123',   role: 'admin',   department: 'IT Security' },
    { name: 'Sarah Chen',       email: 'sarah@audittrail.io',   password: 'auditor123', role: 'manager', department: 'Logistics' },
    { name: 'Marcus Johnson',   email: 'marcus@audittrail.io',  password: 'viewer123',  role: 'viewer',  department: 'Finance' },
    { name: 'Emily Rodriguez',  email: 'emily@audittrail.io',   password: 'viewer123',  role: 'viewer',  department: 'Operations' },
    { name: 'James Kim',        email: 'james@audittrail.io',   password: 'viewer123',  role: 'manager', department: 'Supply Chain' },
  ];

  const created = [];
  for (const u of users) {
    let existing = await User.findOne({ email: u.email });
    if (!existing) {
      existing = await User.create({ ...u, apiKey: uuidv4() });
      console.log(`  ✅ Created user: ${u.email} (${u.role})`);
    }
    created.push(existing);
  }
  return created;
};

const seedAlertRulesIfMissing = async (adminUser) => {
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
      console.log(`  ✅ Created alert rule: ${r.name}`);
    }
  }
};

const seedNotificationsIfMissing = async (alertRules) => {
  const existingCount = await Notification.countDocuments();
  if (existingCount > 0) return;

  const tempRule = await AlertRule.findOne({ name: 'Temperature Alert' });
  const delayRule = await AlertRule.findOne({ name: 'Shipment Delayed' });

  await Notification.create([
    {
      title: 'Temperature Excursion Alert',
      message: 'Shipment SHP-DEMO-003 sensor SENSOR-BOM-03 registered 16.8°C (threshold: 8°C)',
      severity: 'WARNING',
      alertRuleId: tempRule?._id,
      read: false,
    },
    {
      title: 'Shipment Delayed: Customs Inspection',
      message: 'Shipment SHP-DEMO-003 held for regulatory hazardous cargo verification in Mumbai',
      severity: 'CRITICAL',
      alertRuleId: delayRule?._id,
      read: false,
    },
  ]);
  console.log('  ✅ Seeded demo notifications');
};

const seedAuditLogsIfMissing = async (users) => {
  const existingCount = await AuditLog.countDocuments();
  if (existingCount > 0) return;

  const admin = users[0];
  const logs = [
    {
      eventId: uuidv4(),
      userId: admin._id.toString(),
      userName: admin.name,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'LOGIN',
      resource: 'User',
      resourceId: admin._id.toString(),
      severity: 'INFO',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      source: 'web',
      timestamp: new Date(Date.now() - 2 * 86400000),
      riskScore: 5,
    },
    {
      eventId: uuidv4(),
      userId: admin._id.toString(),
      userName: admin.name,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'CREATE',
      resource: 'Shipment',
      resourceId: 'SHP-DEMO-001',
      severity: 'INFO',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      source: 'web',
      timestamp: new Date(Date.now() - 86400000),
      riskScore: 10,
    },
  ];

  await AuditLog.insertMany(logs);
  console.log('  ✅ Seeded baseline audit log entries');
};

// ─── Main Idempotent Demo Seed Operation ──────────────────────────────────
const seedDemoData = async () => {
  console.log('📦 Starting production demo data seed...');

  // 1. Ensure users exist
  const users = await seedUsersIfMissing();
  const admin = users.find((u) => u.role === 'admin') || users[0];

  // 2. Ensure alert rules exist
  await seedAlertRulesIfMissing(admin);

  // 3. Process the 3 demo shipments idempotently
  let shipmentsCreated = 0;
  let eventsCreated = 0;

  for (const demo of DEMO_SHIPMENTS) {
    const existingEventsCount = await EventStore.countDocuments({ aggregateId: demo.shipmentId });
    if (existingEventsCount > 0) {
      console.log(`  ⏭️  Shipment ${demo.shipmentId} already has ${existingEventsCount} events. Ensuring read model is projected...`);
      await rebuildShipmentReadModel(demo.shipmentId);
      continue;
    }

    console.log(`  🚀 Creating demo shipment: ${demo.shipmentId} (${demo.origin.city} → ${demo.destination.city})`);
    shipmentsCreated++;

    for (const evt of demo.events) {
      const timestamp = new Date(Date.now() - evt.daysAgo * 86400000);
      const createdEvent = await EventStore.create({
        aggregateId: demo.shipmentId,
        aggregateType: 'Shipment',
        eventType: evt.eventType,
        version: evt.version,
        payload: evt.payload,
        metadata: {
          userId: admin._id.toString(),
          userName: admin.name,
          userRole: admin.role,
          ipAddress: '127.0.0.1',
          source: 'seed:demo',
        },
        timestamp,
      });

      // Project onto Shipment ReadModel
      await projectShipmentEvent(createdEvent);
      eventsCreated++;
    }

    // Verify ReadModel state after events are projected
    const projected = await Shipment.findOne({ shipmentId: demo.shipmentId }).lean();
    console.log(`  ✅ Projected ${demo.shipmentId}: status=${projected?.status}, events=${projected?.eventCount}, tempAlerts=${projected?.temperatureAlertCount}`);
  }

  // 4. Seed notifications and audit logs if empty
  await seedNotificationsIfMissing();
  await seedAuditLogsIfMissing(users);

  console.log(`\n🎉 Seed execution completed:`);
  console.log(`   Shipments created this run: ${shipmentsCreated}`);
  console.log(`   Events created this run:    ${eventsCreated}`);

  return { shipmentsCreated, eventsCreated };
};

// ─── Standalone Runner ────────────────────────────────────────────────────
const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri === 'memory') {
    throw new Error('Valid MONGODB_URI environment variable required for production demo seed.');
  }

  console.log(`🔗 Connecting to MongoDB: ${uri.replace(/:([^:@]+)@/, ':****@')}...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });

  console.log('✅ Connected to MongoDB successfully.');
  const summary = await seedDemoData();

  // Print current database totals for verification
  const totalShipments = await Shipment.countDocuments({ isDeleted: false });
  const totalEvents = await EventStore.countDocuments({ aggregateType: 'Shipment' });
  const delivered = await Shipment.countDocuments({ status: 'DELIVERED', isDeleted: false });
  const inTransit = await Shipment.countDocuments({ status: 'IN_TRANSIT', isDeleted: false });
  const delayed = await Shipment.countDocuments({ status: 'DELAYED', isDeleted: false });
  const tempAlerts = await Shipment.countDocuments({ temperatureAlertCount: { $gt: 0 }, isDeleted: false });

  console.log('\n📊 Database Summary After Seed:');
  console.log(`   Total Shipments:    ${totalShipments}`);
  console.log(`   Total Events:       ${totalEvents}`);
  console.log(`   Delivered:          ${delivered}`);
  console.log(`   In Transit:         ${inTransit}`);
  console.log(`   Delayed:            ${delayed}`);
  console.log(`   Temperature Alerts: ${tempAlerts}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB. Done.\n');
  return summary;
};

if (require.main === module) {
  run().catch((err) => {
    console.error('❌ Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedDemoData, DEMO_SHIPMENTS, run };
