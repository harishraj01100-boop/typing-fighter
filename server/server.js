const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const RoomManager = require('./rooms/RoomManager');
const { registerSocketHandlers } = require('./networking/socketHandlers');

const app = express();
const server = http.createServer(app);

// Enable CORS for all HTTP requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize RoomManager & Socket Handlers before routes
const roomManager = new RoomManager(io);
registerSocketHandlers(io, roomManager);

// Serve the client as static files. No database, no accounts.
app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'typing-fighter-server',
    timestamp: Date.now(),
    rooms: roomManager.rooms.size
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: roomManager.rooms.size,
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, HOST, () => {
  console.log('==================================================');
  console.log('  TYPING FIGHTER server running');
  console.log(`  Listening on http://${HOST}:${PORT}`);
  console.log(`  Health check: http://${HOST}:${PORT}/health`);
  console.log('==================================================');
});
