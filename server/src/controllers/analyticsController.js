const AuditLog = require('../models/AuditLog');

// GET /api/analytics/overview
const getOverview = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      timeSeriesData,
      severityByDay,
      topUsers,
      actionBreakdown,
      hourlyHeatmap,
    ] = await Promise.all([
      // Events per day
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] } },
            warning: { $sum: { $cond: [{ $eq: ['$severity', 'WARNING'] }, 1, 0] } },
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Severity breakdown by day
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              severity: '$severity',
            },
            count: { $sum: 1 },
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),

      // Top 10 most active users
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: { userId: '$userId', userName: '$userName' },
            count: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] } },
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Action type breakdown
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 }
      ]),

      // Hourly heatmap (hour x day-of-week)
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              hour: { $hour: '$timestamp' },
              dayOfWeek: { $dayOfWeek: '$timestamp' },
            },
            count: { $sum: 1 },
          }
        }
      ]),
    ]);

    res.json({
      timeSeriesData,
      severityByDay,
      topUsers: topUsers.map(u => ({
        userId: u._id.userId,
        userName: u._id.userName,
        count: u.count,
        critical: u.critical,
      })),
      actionBreakdown: actionBreakdown.map(a => ({ action: a._id, count: a.count })),
      hourlyHeatmap,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/analytics/risk
const getRiskOverview = async (req, res) => {
  try {
    const highRiskUsers = await AuditLog.aggregate([
      { $match: { riskScore: { $gt: 50 } } },
      {
        $group: {
          _id: { userId: '$userId', userName: '$userName', userEmail: '$userEmail' },
          avgRisk: { $avg: '$riskScore' },
          maxRisk: { $max: '$riskScore' },
          eventCount: { $sum: 1 },
        }
      },
      { $sort: { avgRisk: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      highRiskUsers: highRiskUsers.map(u => ({
        userId: u._id.userId,
        userName: u._id.userName,
        userEmail: u._id.userEmail,
        avgRisk: Math.round(u.avgRisk),
        maxRisk: u.maxRisk,
        eventCount: u.eventCount,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getOverview, getRiskOverview };
