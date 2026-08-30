const ALLOWED_DURATIONS = [120, 300, 600];

function registerSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {

    socket.on('createRoom', ({ name, duration }) => {
      const room = roomManager.createRoom();
      const safeDuration = ALLOWED_DURATIONS.includes(duration) ? duration : 120;
      room.setDuration(safeDuration);
      const player = room.addPlayer(socket.id, name);
      socket.join(room.code);
      socket.data.roomCode = room.code;

      socket.emit('roomCreated', { code: room.code, you: player, state: room.publicState() });
    });

    socket.on('joinRoom', ({ name, code }) => {
      const room = roomManager.getRoom(code);
      if (!room) {
        socket.emit('joinError', { message: 'Room not found. Check the code and try again.' });
        return;
      }
      if (room.isFull()) {
        socket.emit('joinError', { message: 'Room is already full.' });
        return;
      }
      if (room.status !== 'waiting') {
        socket.emit('joinError', { message: 'Match already in progress.' });
        return;
      }

      const player = room.addPlayer(socket.id, name);
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
    // (purely cosmetic - never trusted for damage/results)
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

  // Safety net cleanup for orphaned rooms
  setInterval(() => roomManager.cleanupStale(), 60000);
}

function cleanupSocket(socket, io, roomManager) {
  const room = roomManager.findRoomBySocket(socket.id);
  if (!room) return;
  room.handleDisconnect(socket.id);
  io.to(room.code).emit('roomUpdate', room.publicState());
  io.to(room.code).emit('opponentLeft', { playerId: socket.id });
  socket.leave(room.code);

  // If nobody is left connected, drop the room from memory immediately
  if (room.players.every(p => !p.connected)) {
    roomManager.removeRoom(room.code);
  }
}

module.exports = { registerSocketHandlers, ALLOWED_DURATIONS };
