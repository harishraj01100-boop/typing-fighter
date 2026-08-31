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

  getServerUrl() {
    if (typeof window === 'undefined') return undefined;
    return window.SERVER_URL || localStorage.getItem('typing_fighter_server_url') || undefined;
  },

  connect() {
    if (this.socket) return this.socket;
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client library is not loaded.');
      return null;
    }
    const serverUrl = this.getServerUrl();
    this.socket = serverUrl 
      ? io(serverUrl, { autoConnect: true, transports: ['websocket', 'polling'] })
      : io({ autoConnect: true, transports: ['websocket', 'polling'] });
    return this.socket;
  },

  createRoom(duration) {
    const s = this.connect();
    if (s) s.emit('createRoom', { name: GameState.playerName, duration });
  },

  joinRoom(code) {
    const s = this.connect();
    if (s) s.emit('joinRoom', { name: GameState.playerName, code });
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
