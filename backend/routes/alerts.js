const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { runAllDetectors } = require('../services/anomalyDetector');

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/scan — trigger manual AI scan
router.post('/scan', async (req, res) => {
  try {
    await runAllDetectors(req.io);
    res.json({ message: 'Scan complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
