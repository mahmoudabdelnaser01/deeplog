const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp:  { type: Date, default: Date.now, index: true },
  level:      { type: String, enum: ['INFO','WARNING','ERROR','CRITICAL'], index: true },
  source:     { type: String, index: true },
  ip:         { type: String, index: true },
  method:     { type: String },
  path:       { type: String },
  statusCode: { type: Number },
  userId:     { type: String },
  message:    { type: String },
  responseTime: { type: Number },
  metadata:   { type: mongoose.Schema.Types.Mixed }
}, { timestamps: false });

logSchema.index({ timestamp: -1, level: 1 });
logSchema.index({ ip: 1, timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);
