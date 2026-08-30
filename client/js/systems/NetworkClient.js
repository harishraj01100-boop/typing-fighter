// ============================================================
// NetworkClient: wraps the Socket.IO connection. GameState holds
// cross-scene data (selected duration, room info, last result...).
// ============================================================

const GameState = {
  playerName: 'Player',
  duration: 120,
  mode: 'practice',       // 'practice' | 'online'
  aiDifficulty: 'medium',
  roomCode: null,
  isHost: false,
  you: null,
  opponentName: 'Opponent',
  lastResult: null,
  musicVolume: 0.35,
  sfxVolume: 0.6
};

const Net = {
  socket: null,

  connect() {
    if (this.socket) return this.socket;
    this.socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });
    return this.socket;
  },

  createRoom(duration) {
    this.connect();
    this.socket.emit('createRoom', { name: GameState.playerName, duration });
  },

  joinRoom(code) {
    this.connect();
    this.socket.emit('joinRoom', { name: GameState.playerName, code });
  },

  ready() {
    if (this.socket) this.socket.emit('playerReady');
  },

  submitAttempt(wordId, typed, mistakes) {
    if (this.socket) this.socket.emit('typingAttempt', { wordId, typed, mistakes });
  },

  sendProgress(chars) {
    if (this.socket) this.socket.emit('typingProgress', { chars });
  },

  leaveRoom() {
    if (this.socket) this.socket.emit('leaveRoom');
  },

  rematch() {
    if (this.socket) this.socket.emit('rematchRequest');
  }
};
