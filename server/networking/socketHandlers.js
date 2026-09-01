const ALLOWED_DURATIONS = [120, 300, 600];

function registerSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {

    socket.on('createRoom', ({ name, duration }) => {
      const room = roomManager.createRoom();
      const safeDuration = ALLOWED_DURATIONS.includes(duration) ? duration : 120;
      room.setDuration(safeDuration);
      const safeName = (name || 'Player 1').trim().slice(0, 14);
      const player = room.addPlayer(socket.id, safeName);
      socket.join(room.code);
      socket.data.roomCode = room.code;

      socket.emit('roomCreated', { code: room.code, you: player, state: room.publicState() });
    });

    socket.on('joinRoom', ({ name, code }) => {
      const cleanCode = (code || '').trim().toUpperCase();
      if (!cleanCode || cleanCode.length !== 5) {
        socket.emit('joinError', { message: 'Invalid room code. Please enter a 5-letter code.' });
        return;
      }

      const room = roomManager.getRoom(cleanCode);
      if (!room) {
        socket.emit('joinError', { message: 'Room not found. Check the code and try again.' });
        return;
      }
      if (room.isFull()) {
        socket.emit('joinError', { message: 'Room is already full.' });
        return;
      }
      if (room.status !== 'waiting') {
        socket.emit('joinError', { message: 'Match is already in progress in that room.' });
        return;
      }

      const safeName = (name || `Player 2`).trim().slice(0, 14);
      const player = room.addPlayer(socket.id, safeName);
      if (!player) {
        socket.emit('joinError', { message: 'Failed to join room. Please try again.' });
        return;
      }

      socket.join(room.code);
      socket.data.roomCode = room.code;

      socket.emit('roomJoined', { code: room.code, you: player, state: room.publicState() });
      io.to(room.code).emit('roomUpdate', room.publicState());
    });

    socket.on('playerReady', () => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayer(socket.id);
      if (!player) return;
      player.ready = true;
      io.to(room.code).emit('roomUpdate', room.publicState());

      if (room.allReady() && room.status === 'waiting') {
        room.startCountdown();
      }
    });

    socket.on('typingAttempt', (payload) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) return;
      room.submitAttempt(socket.id, payload || {});
    });

    // Lightweight live progress broadcast so the opponent sees you typing
    socket.on('typingProgress', ({ chars }) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) return;
      const opponent = room.getOpponent(socket.id);
      if (!opponent) return;
      io.to(opponent.socketId).emit('opponentTyping', { chars: Math.max(0, Math.min(40, chars | 0)) });
    });

    socket.on('leaveRoom', () => {
      cleanupSocket(socket, io, roomManager);
    });

    socket.on('rematchRequest', () => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayer(socket.id);
      if (!player) return;
      player.ready = false;
      player.hp = 100;
      room.status = 'waiting';
      io.to(room.code).emit('roomUpdate', room.publicState());
    });

    socket.on('disconnect', () => {
      cleanupSocket(socket, io, roomManager);
    });
  });

  // Safety net cleanup for orphaned rooms every 60 seconds
  setInterval(() => roomManager.cleanupStale(), 60000);
}

function cleanupSocket(socket, io, roomManager) {
  const room = roomManager.findRoomBySocket(socket.id);
  if (!room) return;

  const leavingPlayerId = socket.id;
  room.handleDisconnect(leavingPlayerId);
  socket.leave(room.code);

  // If room is now empty or has no connected players, remove it completely
  if (room.players.length === 0 || room.players.every(p => !p.connected)) {
    roomManager.removeRoom(room.code);
  } else {
    io.to(room.code).emit('opponentLeft', { playerId: leavingPlayerId });
    io.to(room.code).emit('roomUpdate', room.publicState());
  }
}

module.exports = { registerSocketHandlers, ALLOWED_DURATIONS };
