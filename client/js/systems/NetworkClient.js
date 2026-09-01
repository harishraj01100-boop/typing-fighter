// ============================================================
// NetworkClient: wraps the Socket.IO connection. GameState holds
// cross-scene data (selected duration, room info, last result...).
// ============================================================

const DEFAULT_CLOUD_SERVER = 'https://typing-fighter.onrender.com';

const GameState = {
  playerName: (typeof localStorage !== 'undefined' && localStorage.getItem('typing_fighter_name')) || 'Player',
  duration: 120,
  mode: 'practice',       // 'practice' | 'online'
  aiDifficulty: 'medium',
  roomCode: null,
  isHost: false,
  you: null,
  opponentName: 'Opponent',
  lastResult: null,
  musicVolume: 0.35,
  sfxVolume: 0.6,
  pendingCountdown: false
};

const Net = {
  socket: null,
  connectionStatus: 'disconnected', // 'connected' | 'connecting' | 'disconnected' | 'error'
  lastLatency: null,
  statusListeners: new Set(),

  onStatusChange(cb) {
    if (typeof cb === 'function') {
      this.statusListeners.add(cb);
      if (this.socket && this.socket.connected) {
        this.connectionStatus = 'connected';
      }
      cb(this.connectionStatus, this.getActiveServerUrl());
    }
  },

  offStatusChange(cb) {
    this.statusListeners.delete(cb);
  },

  _setStatus(status) {
    this.connectionStatus = status;
    const url = this.getActiveServerUrl();
    for (const cb of this.statusListeners) {
      try { cb(status, url); } catch (e) { console.error(e); }
    }
  },

  getInitialRoomCode() {
    if (typeof window === 'undefined' || !window.location) return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('room') || params.get('join') || params.get('code');
      return code ? code.trim().toUpperCase().slice(0, 5) : null;
    } catch (e) {
      return null;
    }
  },

  getServerUrl() {
    if (typeof window === 'undefined' || !window.location) return DEFAULT_CLOUD_SERVER;

    // 1. URL Query Param: ?server=https://...
    try {
      const params = new URLSearchParams(window.location.search);
      const serverParam = params.get('server');
      if (serverParam) {
        let clean = serverParam.trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;
        localStorage.setItem('typing_fighter_server_url', clean);
        return clean;
      }
    } catch (e) {}

    // 2. Saved in localStorage
    const saved = localStorage.getItem('typing_fighter_server_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }

    // 3. Injected via window.SERVER_URL
    if (window.SERVER_URL && window.SERVER_URL.trim()) {
      return window.SERVER_URL.trim().replace(/\/+$/, '');
    }

    // 4. Default heuristics based on current hostname
    const host = window.location.hostname || '';
    const port = window.location.port || '';

    // Local static / dev servers
    if (host === 'localhost' || host === '127.0.0.1') {
      if (port && port !== '3000') {
        return `http://${host}:3000`;
      }
      return `http://${host}:${port || 3000}`;
    }

    // Hosted directly on a Node server (Render, Railway, Fly, Koyeb)
    if (host.endsWith('onrender.com') || host.endsWith('railway.app') || host.endsWith('fly.dev') || host.endsWith('koyeb.app')) {
      return window.location.origin;
    }

    // Static hosts (Vercel, GitHub Pages, Netlify, Cloudflare Pages, etc.)
    // Point directly to the live Render backend
    return DEFAULT_CLOUD_SERVER;
  },

  getActiveServerUrl() {
    return this.getServerUrl() || DEFAULT_CLOUD_SERVER;
  },

  setServerUrl(url) {
    if (typeof window === 'undefined') return;
    if (!url || !url.trim()) {
      localStorage.removeItem('typing_fighter_server_url');
    } else {
      let clean = url.trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(clean) && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
        clean = 'https://' + clean;
      }
      localStorage.setItem('typing_fighter_server_url', clean);
    }
    this.reconnect();
  },

  wakeUpServer(url) {
    const target = (url || this.getActiveServerUrl()).trim().replace(/\/+$/, '');
    try {
      fetch(`${target}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        signal: AbortSignal.timeout(35000)
      }).then(res => {
        if (res.ok && this.connectionStatus !== 'connected') {
          if (!this.socket || !this.socket.connected) {
            this.reconnect();
          }
        }
      }).catch(() => {});
    } catch (e) {}
  },

  reconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (e) {}
      this.socket = null;
    }
    return this.connect(true);
  },

  connect(force = false) {
    if (this.socket && !force) {
      if (this.socket.connected) {
        this._setStatus('connected');
      }
      return this.socket;
    }

    if (typeof io === 'undefined') {
      console.warn('Socket.IO client library is not loaded.');
      this._setStatus('error');
      return null;
    }

    if (this.socket && force) {
      try {
        this.socket.disconnect();
      } catch (e) {}
      this.socket = null;
    }

    this._setStatus('connecting');
    const serverUrl = this.getActiveServerUrl();

    // Trigger background wake-up ping for sleeping Render instances
    this.wakeUpServer(serverUrl);

    try {
      const opts = {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        timeout: 25000,
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 5000
      };

      this.socket = io(serverUrl, opts);

      if (this.socket.connected) {
        this._setStatus('connected');
      }

      this.socket.on('connect', () => {
        this._setStatus('connected');
      });

      this.socket.on('connect_error', (err) => {
        console.warn('Socket connect_error to', serverUrl, ':', err?.message || err);
        this._setStatus('error');
      });

      this.socket.on('disconnect', (reason) => {
        this._setStatus('disconnected');
      });

      return this.socket;
    } catch (e) {
      console.error('Failed to initialize socket:', e);
      this._setStatus('error');
      return null;
    }
  },

  async testConnection(url) {
    let target = (url || this.getActiveServerUrl()).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(target) && !target.startsWith('localhost') && !target.startsWith('127.0.0.1')) {
      target = 'https://' + target;
    }

    const start = performance.now();
    try {
      const res = await fetch(`${target}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) {
        const data = await res.json();
        const latency = Math.round(performance.now() - start);
        return { ok: true, latency, data };
      }
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (e) {
      return { ok: false, error: e.message || 'Connection timeout or network error' };
    }
  },

  createRoom(duration) {
    const s = this.connect();
    if (s) s.emit('createRoom', { name: GameState.playerName, duration });
  },

  joinRoom(code) {
    const s = this.connect();
    if (s) s.emit('joinRoom', { name: GameState.playerName, code: (code || '').trim().toUpperCase() });
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
