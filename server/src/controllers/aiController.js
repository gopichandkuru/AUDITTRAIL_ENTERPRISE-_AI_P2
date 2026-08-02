const AuditLog = require('../models/AuditLog');

let genAI = null;
let model = null;

const initAI = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return false;
  }
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    return true;
  } catch (e) {
    return false;
  }
};

const isAIAvailable = () => {
  if (model) return true;
  return initAI();
};

// POST /api/ai/query — Natural language to DB query
const naturalLanguageQuery = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    // Build a sample log for context
    const sampleLog = await AuditLog.findOne().lean();

    let filter = {};
    let explanation = '';

    if (isAIAvailable()) {
      const prompt = `You are an expert MongoDB query builder for an audit log system.
Given the user's natural language query, return ONLY a valid JSON MongoDB filter object.
Do NOT include any explanation, markdown, or code fences. Just raw JSON.

Available fields: userId, userName, userEmail, userRole, action, resource, severity (INFO/WARNING/CRITICAL/SUCCESS), status (SUCCESS/FAILURE), flagged, timestamp, ipAddress, riskScore.

Common actions: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXPORT, LOGIN_FAILED, REGISTER, PERMISSION_CHANGE, BULK_DELETE, DATA_EXPORT.

User query: "${query}"

Return ONLY the MongoDB filter JSON:`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      try {
        // Strip any accidental markdown fences
        const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
        filter = JSON.parse(cleaned);
      } catch (e) {
        filter = {};
      }

      explanation = `AI interpreted: "${query}" and built a MongoDB filter.`;
    } else {
      // Fallback: simple keyword parsing
      const q = query.toLowerCase();
      if (q.includes('failed login') || q.includes('login failed')) {
        filter = { action: 'LOGIN_FAILED' };
        explanation = 'Showing failed login attempts';
      } else if (q.includes('critical')) {
        filter = { severity: 'CRITICAL' };
        explanation = 'Showing critical severity events';
      } else if (q.includes('delete')) {
        filter = { action: { $in: ['DELETE', 'BULK_DELETE'] } };
        explanation = 'Showing delete events';
      } else if (q.includes('today')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter = { timestamp: { $gte: today } };
        explanation = 'Showing today\'s events';
      } else if (q.includes('yesterday')) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const endYesterday = new Date(yesterday);
        endYesterday.setHours(23, 59, 59, 999);
        filter = { timestamp: { $gte: yesterday, $lte: endYesterday } };
        explanation = 'Showing yesterday\'s events';
      } else if (q.includes('flagged')) {
        filter = { flagged: true };
        explanation = 'Showing flagged events';
      } else {
        filter = {};
        explanation = 'Showing all events (no specific filter matched)';
      }
    }

    // Handle date string conversion
    const processFilter = (f) => {
      if (f && f.timestamp) {
        if (f.timestamp.$gte && typeof f.timestamp.$gte === 'string') {
          f.timestamp.$gte = new Date(f.timestamp.$gte);
        }
        if (f.timestamp.$lte && typeof f.timestamp.$lte === 'string') {
          f.timestamp.$lte = new Date(f.timestamp.$lte);
        }
      }
      return f;
    };

    const processedFilter = processFilter(filter);

    const logs = await AuditLog.find(processedFilter)
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json({ logs, filter: processedFilter, explanation, count: logs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/ai/anomalies — Detect anomalies in recent logs
const detectAnomalies = async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await AuditLog.find({ timestamp: { $gte: last24h } })
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    if (recentLogs.length === 0) {
      return res.json({ anomalies: [], summary: 'No recent logs to analyze.' });
    }

    // Statistical anomaly detection (always runs)
    const anomalies = [];

    // 1. High failure rate per user
    const userFailures = {};
    recentLogs.forEach(log => {
      if (log.status === 'FAILURE') {
        userFailures[log.userId] = (userFailures[log.userId] || 0) + 1;
      }
    });
    Object.entries(userFailures).forEach(([userId, count]) => {
      if (count >= 3) {
        const user = recentLogs.find(l => l.userId === userId);
        anomalies.push({
          type: 'HIGH_FAILURE_RATE',
          severity: 'WARNING',
          title: 'High Failure Rate Detected',
          description: `User "${user?.userName || userId}" had ${count} failed events in the last 24h`,
          userId,
          count,
          riskScore: Math.min(90, 40 + count * 10),
        });
      }
    });

    // 2. Off-hours access (before 6am or after 10pm UTC)
    const offHoursLogs = recentLogs.filter(log => {
      const hour = new Date(log.timestamp).getUTCHours();
      return hour < 6 || hour >= 22;
    });
    if (offHoursLogs.length > 0) {
      const offHoursUsers = [...new Set(offHoursLogs.map(l => l.userName))];
      anomalies.push({
        type: 'OFF_HOURS_ACCESS',
        severity: offHoursLogs.length > 5 ? 'CRITICAL' : 'WARNING',
        title: 'Off-Hours Access Detected',
        description: `${offHoursLogs.length} events occurred outside business hours by: ${offHoursUsers.slice(0, 3).join(', ')}`,
        count: offHoursLogs.length,
        riskScore: Math.min(85, 30 + offHoursLogs.length * 5),
      });
    }

    // 3. Bulk delete operations
    const bulkDeletes = recentLogs.filter(l => l.action === 'BULK_DELETE' || l.action === 'DELETE');
    if (bulkDeletes.length >= 3) {
      anomalies.push({
        type: 'BULK_DELETION',
        severity: 'CRITICAL',
        title: 'Multiple Delete Operations',
        description: `${bulkDeletes.length} delete operations detected in last 24h`,
        count: bulkDeletes.length,
        riskScore: 80,
      });
    }

    // 4. Privilege escalation
    const privEscLogs = recentLogs.filter(l => l.action === 'PERMISSION_CHANGE' || l.action === 'ROLE_CHANGE');
    if (privEscLogs.length > 0) {
      anomalies.push({
        type: 'PRIVILEGE_ESCALATION',
        severity: 'CRITICAL',
        title: 'Privilege Escalation Detected',
        description: `${privEscLogs.length} permission/role change(s) detected`,
        count: privEscLogs.length,
        riskScore: 90,
      });
    }

    // AI-enhanced summary
    let aiSummary = `Analyzed ${recentLogs.length} events in the last 24 hours. Found ${anomalies.length} anomalies.`;

    if (isAIAvailable() && recentLogs.length > 0) {
      try {
        const logSample = recentLogs.slice(0, 30).map(l =>
          `[${l.severity}] ${l.action} by ${l.userName} on ${l.resource} at ${new Date(l.timestamp).toISOString()}`
        ).join('\n');

        const prompt = `You are a cybersecurity analyst reviewing audit logs. Provide a concise 2-3 sentence executive summary of the following recent activity patterns and any security concerns. Be specific and professional.

Recent audit events (sample of ${recentLogs.length} total):
${logSample}

Detected anomalies: ${anomalies.map(a => a.title).join(', ') || 'None'}

Executive Summary:`;

        const result = await model.generateContent(prompt);
        aiSummary = result.response.text().trim();
      } catch (e) {
        // Use default summary
      }
    }

    res.json({ anomalies, summary: aiSummary, analyzedCount: recentLogs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/ai/summarize — Summarize a time range
const summarizeActivity = async (req, res) => {
  try {
    const { startDate, endDate, scope = 'general' } = req.body;
    
    const filter = {};
    if (startDate) filter.timestamp = { ...filter.timestamp, $gte: new Date(startDate) };
    if (endDate) filter.timestamp = { ...filter.timestamp, $lte: new Date(endDate) };

    const [logs, stats] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).limit(100).lean(),
      AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] } },
            warningCount: { $sum: { $cond: [{ $eq: ['$severity', 'WARNING'] }, 1, 0] } },
            failureCount: { $sum: { $cond: [{ $eq: ['$status', 'FAILURE'] }, 1, 0] } },
            flaggedCount: { $sum: { $cond: ['$flagged', 1, 0] } },
            avgRisk: { $avg: '$riskScore' },
          }
        }
      ]),
    ]);

    const s = stats[0] || { total: 0, criticalCount: 0, warningCount: 0, failureCount: 0, flaggedCount: 0, avgRisk: 0 };
    const uniqueUsers = [...new Set(logs.map(l => l.userName))];
    const topActions = {};
    logs.forEach(l => { topActions[l.action] = (topActions[l.action] || 0) + 1; });

    let summary = '';

    if (isAIAvailable()) {
      const prompt = `Generate a professional executive summary report for audit log activity.

Statistics:
- Total Events: ${s.total}
- Critical Events: ${s.criticalCount}
- Warnings: ${s.warningCount}
- Failures: ${s.failureCount}
- Flagged Events: ${s.flaggedCount}
- Average Risk Score: ${Math.round(s.avgRisk || 0)}/100
- Unique Users Active: ${uniqueUsers.length}
- Top Actions: ${Object.entries(topActions).sort(([,a],[,b])=>b-a).slice(0,5).map(([k,v])=>`${k}(${v})`).join(', ')}

Compliance scope: ${scope}

Write a 3-4 paragraph executive summary including: overall activity overview, key security observations, risk assessment, and compliance notes. Be professional and specific.`;

      try {
        const result = await model.generateContent(prompt);
        summary = result.response.text().trim();
      } catch (e) {
        summary = `Audit Summary: ${s.total} events recorded. ${s.criticalCount} critical events and ${s.warningCount} warnings detected. ${s.failureCount} operation failures. Average risk score: ${Math.round(s.avgRisk || 0)}/100. ${uniqueUsers.length} unique users were active during this period.`;
      }
    } else {
      summary = `Audit Summary: ${s.total} events recorded. ${s.criticalCount} critical events and ${s.warningCount} warnings detected. ${s.failureCount} operation failures. Average risk score: ${Math.round(s.avgRisk || 0)}/100. ${uniqueUsers.length} unique users were active during this period.`;
    }

    res.json({ summary, stats: s, uniqueUsers: uniqueUsers.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/ai/risk-scores — Compute user risk scores
const getUserRiskScores = async (req, res) => {
  try {
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const userStats = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: last7d } } },
      {
        $group: {
          _id: { userId: '$userId', userName: '$userName', userEmail: '$userEmail', userRole: '$userRole' },
          totalEvents: { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ['$status', 'FAILURE'] }, 1, 0] } },
          criticals: { $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] } },
          avgRisk: { $avg: '$riskScore' },
          actions: { $addToSet: '$action' },
        }
      },
    ]);

    const riskScores = userStats.map(u => {
      let score = Math.round(u.avgRisk || 0);
      // Boost score based on behavior
      if (u.failures > 5) score = Math.min(100, score + 20);
      if (u.criticals > 3) score = Math.min(100, score + 25);
      if (u.actions.includes('BULK_DELETE')) score = Math.min(100, score + 30);
      if (u.actions.includes('PERMISSION_CHANGE')) score = Math.min(100, score + 20);

      return {
        userId: u._id.userId,
        userName: u._id.userName,
        userEmail: u._id.userEmail,
        userRole: u._id.userRole,
        riskScore: score,
        riskLevel: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
        totalEvents: u.totalEvents,
        failures: u.failures,
        criticals: u.criticals,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    res.json({ riskScores });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { naturalLanguageQuery, detectAnomalies, summarizeActivity, getUserRiskScores };
