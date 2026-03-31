require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./services/db');
const { runAllDetectors } = require('./services/anomalyDetector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Attach io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/logs',   require('./routes/logs'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/ai',     require('./routes/ai'));

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔴 Client disconnected: ${socket.id}`));
});

// Auto-run anomaly detection every 2 minutes
setInterval(() => runAllDetectors(io), 2 * 60 * 1000);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 DeepLog running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 API:       http://localhost:${PORT}/api/logs\n`);
  });
});
