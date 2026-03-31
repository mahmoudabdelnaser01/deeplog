require('dotenv').config();
const mongoose = require('mongoose');
const Log = require('../backend/models/Log');

const SOURCES = ['auth-service', 'api-gateway', 'payment-service', 'user-service', 'product-service', 'order-service'];
const LEVELS  = ['INFO', 'INFO', 'INFO', 'INFO', 'WARNING', 'WARNING', 'ERROR', 'CRITICAL'];
const METHODS = ['GET', 'GET', 'GET', 'POST', 'POST', 'PUT', 'DELETE'];
const PATHS   = ['/api/users', '/api/products', '/api/orders', '/api/login', '/api/logout', '/api/payments', '/health'];
const MESSAGES = {
  INFO:     ['Request processed', 'User authenticated', 'Cache hit', 'Data fetched successfully'],
  WARNING:  ['Slow response time', 'High memory usage', 'Rate limit approaching', 'Deprecated endpoint called'],
  ERROR:    ['Failed login attempt', 'Database timeout', 'Invalid token', 'Service unavailable'],
  CRITICAL: ['Failed login attempt', 'Database connection lost', 'Out of memory', 'Failed login attempt']
};

const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt  = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const randomIP   = () => `${randomInt(1,255)}.${randomInt(1,255)}.${randomInt(1,255)}.${randomInt(1,255)}`;

// A few "attacker" IPs for realistic anomaly patterns
const ATTACKER_IPS = ['45.33.32.156', '192.168.99.100', '10.0.0.99'];

const generateLog = (timestamp) => {
  const level   = randomItem(LEVELS);
  const source  = randomItem(SOURCES);
  const isAttacker = Math.random() < 0.02;
  const ip      = isAttacker ? randomItem(ATTACKER_IPS) : randomIP();

  return {
    timestamp,
    level,
    source,
    ip,
    method:       randomItem(METHODS),
    path:         randomItem(PATHS),
    statusCode:   level === 'ERROR' || level === 'CRITICAL' ? randomItem([400, 401, 403, 500, 503]) : randomItem([200, 200, 200, 201, 204]),
    userId:       Math.random() > 0.3 ? `user_${randomInt(1, 10000)}` : null,
    message:      randomItem(MESSAGES[level]),
    responseTime: level === 'WARNING' ? randomInt(2000, 8000) : randomInt(10, 500),
    metadata:     {}
  };
};

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const TOTAL = 100000;
  const BATCH = 1000;
  const now   = Date.now();

  console.log(`🌱 Seeding ${TOTAL.toLocaleString()} logs...`);

  let inserted = 0;
  while (inserted < TOTAL) {
    const batch = [];
    for (let i = 0; i < BATCH; i++) {
      const ageMs    = Math.random() * 24 * 60 * 60 * 1000; // up to 24h ago
      const timestamp = new Date(now - ageMs);
      batch.push(generateLog(timestamp));
    }
    await Log.insertMany(batch, { ordered: false });
    inserted += BATCH;
    process.stdout.write(`\r   ${inserted.toLocaleString()} / ${TOTAL.toLocaleString()}`);
  }

  // Add a brute-force pattern (last 5 minutes)
  console.log('\n🔴 Adding brute-force attack pattern...');
  const bruteForce = Array.from({ length: 40 }, () => ({
    timestamp: new Date(now - randomInt(0, 5 * 60 * 1000)),
    level:     'ERROR',
    source:    'auth-service',
    ip:        '45.33.32.156',
    method:    'POST',
    path:      '/api/login',
    statusCode: 401,
    userId:    `user_${randomInt(1, 1000)}`,
    message:   'Failed login attempt',
    responseTime: randomInt(100, 300),
    metadata:  { attempts: randomInt(5, 20) }
  }));
  await Log.insertMany(bruteForce);

  console.log('\n✅ Done! Database seeded successfully.');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
