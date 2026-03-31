require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Log = require('../backend/models/Log');

const CSV_PATH = path.join(__dirname, '../data/CICIDS2017_Sample_300K.csv');

// Map CICIDS2017 label to our log level
const labelToLevel = (label) => {
  const l = label.trim().toUpperCase();
  if (l === 'BENIGN') return 'INFO';
  if (l.includes('DOS') || l.includes('DDOS')) return 'CRITICAL';
  if (l.includes('BRUTE') || l.includes('BOTNET')) return 'ERROR';
  return 'WARNING';
};

// Map CICIDS2017 label to alert-style message
const labelToMessage = (label) => {
  const l = label.trim().toUpperCase();
  if (l === 'BENIGN') return 'Normal traffic';
  if (l.includes('DDOS')) return 'DDoS attack detected';
  if (l.includes('DOS')) return 'DoS attack detected';
  if (l.includes('BRUTE')) return 'Failed login attempt';
  if (l.includes('BOTNET')) return 'Botnet activity detected';
  if (l.includes('PORT')) return 'Port scan detected';
  if (l.includes('WEB')) return 'Web attack detected';
  if (l.includes('INFILTRAT')) return 'Infiltration attempt detected';
  return `Suspicious activity: ${label.trim()}`;
};

const randomIP = () =>
  `${Math.floor(Math.random()*255)+1}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

const SOURCES = ['api-gateway', 'auth-service', 'network-monitor', 'firewall', 'ids-sensor'];

const import_csv = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear old logs
  await Log.deleteMany({});
  console.log('🗑️  Cleared old logs');

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH),
    crlfDelay: Infinity
  });

  let headers = null;
  let batch = [];
  let total = 0;
  const BATCH_SIZE = 500;
  const now = Date.now();

  for await (const line of rl) {
    if (!headers) {
      headers = line.split(',').map(h => h.trim().replace(/\s+/g, '_').toLowerCase());
      continue;
    }

    const values = line.split(',');
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((h, i) => { row[h] = values[i]?.trim(); });

    const label = row['label'] || 'BENIGN';
    const level = labelToLevel(label);

    // Spread timestamps over last 24 hours
    const ageMs = Math.random() * 24 * 60 * 60 * 1000;
    const timestamp = new Date(now - ageMs);

    batch.push({
      timestamp,
      level,
      source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
      ip: row['source_ip'] || row['src_ip'] || randomIP(),
      method: 'NETWORK',
      path: '/traffic',
      statusCode: level === 'INFO' ? 200 : level === 'WARNING' ? 400 : 500,
      message: labelToMessage(label),
      responseTime: parseFloat(row['flow_duration'] || row['flow_dur'] || Math.random() * 1000),
      metadata: {
        label: label,
        protocol: row['protocol'] || row['proto'],
        srcPort: row['source_port'] || row['src_port'],
        dstPort: row['destination_port'] || row['dst_port'],
        flowBytes: row['total_fwd_packets'] || row['tot_fwd_pkts'],
      }
    });

    if (batch.length >= BATCH_SIZE) {
      await Log.insertMany(batch, { ordered: false });
      total += batch.length;
      batch = [];
      process.stdout.write(`\r   Imported: ${total.toLocaleString()}`);
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await Log.insertMany(batch, { ordered: false });
    total += batch.length;
  }

  console.log(`\n✅ Done! Imported ${total.toLocaleString()} records from CICIDS2017`);
  await mongoose.disconnect();
  process.exit(0);
};

import_csv().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});