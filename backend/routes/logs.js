const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

// POST /api/logs — ingest a new log
router.post('/', async (req, res) => {
  try {
    const log = await Log.create(req.body);
    req.io.emit('new_log', log);
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/logs — paginated log list with filters
router.get('/', async (req, res) => {
  try {
    const { level, source, ip, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (source) filter.source = source;
    if (ip) filter.ip = ip;

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Log.countDocuments(filter);
    res.json({ logs, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/stats — aggregated statistics
router.get('/stats', async (req, res) => {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000); // last 1 hour

    const [levelStats, sourceStats, timelineStats, topIPs] = await Promise.all([
      // Logs by level
      Log.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]),

      // Logs by source
      Log.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]),

      // Timeline: logs per minute for last 30 min
      Log.aggregate([
        { $match: { timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%H:%M', date: '$timestamp' }
            },
            count: { $sum: 1 },
            errors: {
              $sum: { $cond: [{ $in: ['$level', ['ERROR', 'CRITICAL']] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Top suspicious IPs
      Log.aggregate([
        {
          $match: {
            timestamp: { $gte: since },
            level: { $in: ['ERROR', 'CRITICAL', 'WARNING'] }
          }
        },
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const totalLogs = await Log.countDocuments({ timestamp: { $gte: since } });

    res.json({ levelStats, sourceStats, timelineStats, topIPs, totalLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
