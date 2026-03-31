const Log = require('../models/Log');
const Alert = require('../models/Alert');
const { analyzeAnomaly } = require('./groq');

// Detect brute force: same IP, 10+ failed logins in 5 min
const detectBruteForce = async (io) => {
  const fiveMinAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const results = await Log.aggregate([
    {
      $match: {
        timestamp: { $gte: fiveMinAgo },
        message: { $regex: /failed login/i }
      }
    },
    {
      $group: {
        _id: '$ip',
        count: { $sum: 1 },
        userIds: { $addToSet: '$userId' }
      }
    },
    { $match: { count: { $gte: 10 } } },
    { $sort: { count: -1 } }
  ]);

  for (const r of results) {
    const existing = await Alert.findOne({
      type: 'BRUTE_FORCE',
      ip: r._id,
      createdAt: { $gte: fiveMinAgo }
    });
    if (existing) continue;

    const aiResult = await analyzeAnomaly({
      type: 'Brute Force',
      ip: r._id,
      failedAttempts: r.count,
      targetAccounts: r.userIds.length,
      timeWindow: '5 minutes'
    });

    const alert = await Alert.create({
      type: 'BRUTE_FORCE',
      severity: aiResult.severity || 'HIGH',
      title: `Brute Force from ${r._id}`,
      description: `${r.count} failed login attempts targeting ${r.userIds.length} accounts`,
      aiAnalysis: aiResult.explanation,
      ip: r._id,
      affectedLogs: r.count
    });

    if (io) io.emit('new_alert', alert);
  }
};

// Detect DDoS: same IP, 500+ requests in 1 min
const detectDDoS = async (io) => {
  const oneMinAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const results = await Log.aggregate([
    { $match: { timestamp: { $gte: oneMinAgo } } },
    { $group: { _id: '$ip', count: { $sum: 1 } } },
    { $match: { count: { $gte: 500 } } },
    { $sort: { count: -1 } }
  ]);

  for (const r of results) {
    const existing = await Alert.findOne({
      type: 'DDOS',
      ip: r._id,
      createdAt: { $gte: oneMinAgo }
    });
    if (existing) continue;

    const aiResult = await analyzeAnomaly({
      type: 'Potential DDoS',
      ip: r._id,
      requestCount: r.count,
      timeWindow: '1 minute'
    });

    const alert = await Alert.create({
      type: 'DDOS',
      severity: 'CRITICAL',
      title: `DDoS Suspected from ${r._id}`,
      description: `${r.count} requests in the last minute`,
      aiAnalysis: aiResult.explanation,
      ip: r._id,
      affectedLogs: r.count
    });

    if (io) io.emit('new_alert', alert);
  }
};

// Detect error spike: >30% error rate in last 2 min
const detectErrorSpike = async (io) => {
  const twoMinAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const results = await Log.aggregate([
    { $match: { timestamp: { $gte: twoMinAgo } } },
    {
      $group: {
        _id: '$source',
        total: { $sum: 1 },
        errors: {
          $sum: {
            $cond: [{ $in: ['$level', ['ERROR', 'CRITICAL']] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        errorRate: { $divide: ['$errors', '$total'] }
      }
    },
    { $match: { errorRate: { $gte: 0.3 }, total: { $gte: 20 } } }
  ]);

  for (const r of results) {
    const existing = await Alert.findOne({
      type: 'SPIKE',
      'metadata.source': r._id,
      createdAt: { $gte: twoMinAgo }
    });
    if (existing) continue;

    const aiResult = await analyzeAnomaly({
      type: 'Error Rate Spike',
      service: r._id,
      errorRate: `${(r.errorRate * 100).toFixed(1)}%`,
      totalRequests: r.total,
      errors: r.errors
    });

    const alert = await Alert.create({
      type: 'SPIKE',
      severity: 'HIGH',
      title: `Error Spike in ${r._id}`,
      description: `${(r.errorRate * 100).toFixed(1)}% error rate (${r.errors}/${r.total} requests)`,
      aiAnalysis: aiResult.explanation,
      affectedLogs: r.errors
    });

    if (io) io.emit('new_alert', alert);
  }
};

const runAllDetectors = async (io) => {
  //await Alert.deleteMany({});
  //console.log("🗑️ Cleared old alerts to force new AI analysis");

  await Promise.allSettled([
    detectBruteForce(io),
    detectDDoS(io),
    detectErrorSpike(io)
  ]);
};

module.exports = { runAllDetectors };
