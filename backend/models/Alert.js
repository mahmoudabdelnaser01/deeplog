const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type:        { type: String, enum: ['BRUTE_FORCE','DDOS','ANOMALY','SPIKE','SUSPICIOUS_IP'], required: true },
  severity:    { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], required: true },
  title:       { type: String, required: true },
  description: { type: String },
  aiAnalysis:  { type: String },
  ip:          { type: String },
  affectedLogs:{ type: Number },
  resolved:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
