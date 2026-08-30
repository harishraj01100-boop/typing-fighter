const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const RoomManager = require('./rooms/RoomManager');
const { registerSocketHandlers } = require('./networking/socketHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Serve the client as static files. No database, no accounts.
app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: roomManager.rooms.size });
});

const roomManager = new RoomManager(io);
registerSocketHandlers(io, roomManager);

server.listen(PORT, () => {
  console.log('==================================================');
  console.log('  TYPING FIGHTER server running');
  console.log(`  http://localhost:${PORT}`);
  console.log('==================================================');
});
