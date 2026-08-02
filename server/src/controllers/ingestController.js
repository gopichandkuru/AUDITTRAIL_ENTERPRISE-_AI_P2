const { v4: uuidv4 } = require('uuid');
const AuditLog = require('../models/AuditLog');
const AlertRule = require('../models/AlertRule');
const Notification = require('../models/Notification');

// POST /api/ingest — Ingest audit events from external services
const ingestEvents = async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    if (events.length === 0) {
      return res.status(400).json({ error: 'No events provided' });
    }

    if (events.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 events per request' });
    }

    const enriched = events.map(event => ({
      ...event,
      eventId: event.eventId || uuidv4(),
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      source: event.source || 'api',
    }));

    const inserted = await AuditLog.insertMany(enriched, { ordered: false });

    // Emit to connected clients
    if (req.io) {
      inserted.forEach(log => req.io.emit('new_log', log));
    }

    // Check alert rules
    await checkAlertRules(inserted, req.io);

    res.status(201).json({
      message: `Successfully ingested ${inserted.length} events`,
      count: inserted.length,
    });
  } catch (error) {
    // Handle duplicate key errors (duplicate eventIds)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Some events have duplicate eventIds' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Check alert rules against new logs
const checkAlertRules = async (logs, io) => {
  try {
    const activeRules = await AlertRule.find({ isActive: true });
    
    for (const rule of activeRules) {
      for (const log of logs) {
        let triggered = false;
        const { field, operator, value } = rule.condition;
        const logValue = log[field];

        switch (operator) {
          case 'equals': triggered = logValue === value; break;
          case 'contains': triggered = String(logValue || '').toLowerCase().includes(String(value).toLowerCase()); break;
          case 'gt': triggered = Number(logValue) > Number(value); break;
          case 'lt': triggered = Number(logValue) < Number(value); break;
          case 'in': triggered = Array.isArray(value) && value.includes(logValue); break;
          default: break;
        }

        if (triggered) {
          const notification = await Notification.create({
            title: `Alert: ${rule.name}`,
            message: `Rule triggered: ${rule.description || rule.name} — Event: ${log.action} by ${log.userName}`,
            severity: rule.severity,
            alertRuleId: rule._id,
            logId: log.eventId,
          });

          rule.triggerCount += 1;
          rule.lastTriggered = new Date();
          await rule.save();

          if (io) {
            io.emit('alert_triggered', notification);
          }
        }
      }
    }
  } catch (e) {
    console.error('Alert check error:', e.message);
  }
};

module.exports = { ingestEvents };
