const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { summarizeLogs } = require('../services/groq');

// GET /api/ai/summary — AI health summary of recent logs
router.get('/summary', async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const logs = await Log.find({ timestamp: { $gte: fiveMinAgo } }).lean();

    if (logs.length === 0) {
      return res.json({ status: 'HEALTHY', summary: 'No recent logs to analyze.', highlights: [] });
    }

    const summary = await summarizeLogs(logs);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
