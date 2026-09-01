const { getRandomWord } = require('../game/words');
const { calculateDamage, evaluateTyped } = require('../game/combat');

const MAX_HP = 100;
const RECENT_WORD_MEMORY = 6;
const NEXT_WORD_DELAY_MS = 900;

class Room {
  constructor(code, io) {
    this.code = (code || '').toUpperCase();
    this.io = io;
    this.players = []; // { id, socketId, name, hp, combo, maxCombo, correctWords, totalWords, totalDamage, ready, connected }
    this.duration = 120; // seconds, set at creation
    this.status = 'waiting'; // waiting | countdown | fighting | ended
    this.currentWord = null;
    this.currentWordIsSpecial = false;
    this.wordIssuedAt = 0;
    this.wordId = 0;
    this.recentWords = [];
    this.timeLeft = 0;
    this.timerHandle = null;
    this.countdownHandle = null;
    this.nextWordHandle = null;
    this.wordLockResolved = false;
    this.createdAt = Date.now();
  }

  addPlayer(socketId, name) {
    if (this.players.length >= 2) return null;
    // Check if player already exists
    const existing = this.getPlayer(socketId);
    if (existing) {
      existing.connected = true;
      if (name) existing.name = name;
      return existing;
    }

    const player = {
      id: socketId,
      socketId,
      name: (name || `Player ${this.players.length + 1}`).trim().slice(0, 14),
      hp: MAX_HP,
      combo: 0,
      maxCombo: 0,
      correctWords: 0,
      totalWords: 0,
      totalDamage: 0,
      ready: false,
      connected: true
    };
    this.players.push(player);
    return player;
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex(p => p.socketId === socketId);
    if (idx !== -1) {
      const removed = this.players.splice(idx, 1)[0];
      return removed;
    }
    return null;
  }

  getPlayer(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  getOpponent(socketId) {
    return this.players.find(p => p.socketId !== socketId);
  }

  isFull() {
    return this.players.length >= 2;
  }

  allReady() {
    return this.players.length === 2 && this.players.every(p => p.ready && p.connected);
  }

  setDuration(seconds) {
    this.duration = seconds;
    this.timeLeft = seconds;
  }

  broadcast(event, payload) {
    this.io.to(this.code).emit(event, payload);
  }

  publicState() {
    return {
      code: this.code,
      status: this.status,
      duration: this.duration,
      timeLeft: this.timeLeft,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        hp: p.hp,
        combo: p.combo,
        maxCombo: p.maxCombo,
        ready: p.ready,
        connected: p.connected
      }))
    };
  }

  startCountdown() {
    if (this.status === 'countdown' || this.status === 'fighting') return;
    this.status = 'countdown';
    this.broadcast('countdownStart', { seconds: 3 });

    let n = 3;
    const tick = () => {
      if (this.status !== 'countdown') return;
      if (n <= 0) {
        this.startMatch();
        return;
      }
      this.broadcast('countdownTick', { value: n });
      n--;
      this.countdownHandle = setTimeout(tick, 1000);
    };
    this.countdownHandle = setTimeout(tick, 900);
  }

  startMatch() {
    if (this.status === 'fighting') return;
    this.status = 'fighting';
    this.timeLeft = this.duration;
    this.players.forEach(p => {
      p.hp = MAX_HP;
      p.combo = 0;
      p.maxCombo = 0;
      p.correctWords = 0;
      p.totalWords = 0;
      p.totalDamage = 0;
    });

    this.broadcast('matchStart', this.publicState());
    this.issueNextWord();

    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = setInterval(() => {
      if (this.status !== 'fighting') return;
      this.timeLeft -= 1;
      this.broadcast('timerUpdate', { timeLeft: this.timeLeft });
      if (this.timeLeft <= 0) {
        this.endMatch('timeout');
      }
    }, 1000);
  }

  issueNextWord() {
    if (this.status !== 'fighting') return;
    const highestCombo = Math.max(...this.players.map(p => p.combo), 0);
    const { word, isSpecial } = getRandomWord(this.recentWords, highestCombo);
    this.currentWord = word;
    this.currentWordIsSpecial = isSpecial;
    this.wordIssuedAt = Date.now();
    this.wordId += 1;
    this.wordLockResolved = false;

    this.recentWords.push(word.toLowerCase());
    if (this.recentWords.length > RECENT_WORD_MEMORY) this.recentWords.shift();

    this.broadcast('newWord', { word, isSpecial, wordId: this.wordId });
  }

  /**
   * Called when a player submits their typed attempt for the current word.
   * Server validates timing/accuracy and decides the outcome authoritatively.
   */
  submitAttempt(socketId, { wordId, typed, mistakes }) {
    if (this.status !== 'fighting') return;
    if (wordId !== this.wordId) return; // stale submission, ignore
    if (this.wordLockResolved) return; // word already resolved this tick

    const player = this.getPlayer(socketId);
    const opponent = this.getOpponent(socketId);
    if (!player || !opponent) return;

    const elapsedMs = Date.now() - this.wordIssuedAt;
    const { exact, accuracy } = evaluateTyped(this.currentWord, (typed || '').trim(), mistakes);

    player.totalWords += 1;

    if (!exact) {
      // Mistake breaks combo, no attack, no lock (opponent can still land it)
      player.combo = 0;
      this.broadcast('typingMiss', { playerId: socketId });
      return;
    }

    // First correct submission wins the exchange
    this.wordLockResolved = true;
    player.combo += 1;
    player.correctWords += 1;
    if (player.combo > player.maxCombo) player.maxCombo = player.combo;

    const { damage, critical, breakdown } = calculateDamage({
      word: this.currentWord,
      elapsedMs,
      accuracy,
      combo: player.combo,
      isSpecial: this.currentWordIsSpecial
    });

    opponent.hp = Math.max(0, opponent.hp - damage);
    player.totalDamage += damage;

    this.broadcast('attackResult', {
      attackerId: socketId,
      defenderId: opponent.socketId,
      word: this.currentWord,
      isSpecial: this.currentWordIsSpecial,
      damage,
      critical,
      accuracy,
      elapsedMs,
      combo: player.combo,
      defenderHp: opponent.hp,
      breakdown
    });

    if (opponent.hp <= 0) {
      this.endMatch('ko', socketId);
      return;
    }

    if (this.nextWordHandle) clearTimeout(this.nextWordHandle);
    this.nextWordHandle = setTimeout(() => this.issueNextWord(), NEXT_WORD_DELAY_MS);
  }

  endMatch(reason, winnerId = null) {
    if (this.status === 'ended') return;
    this.status = 'ended';
    if (this.timerHandle) clearInterval(this.timerHandle);
    if (this.countdownHandle) clearTimeout(this.countdownHandle);
    if (this.nextWordHandle) clearTimeout(this.nextWordHandle);

    let winner = winnerId;
    if (!winner) {
      if (this.players.length === 2) {
        const [a, b] = this.players;
        if (a.hp === b.hp) winner = null; // draw
        else winner = a.hp > b.hp ? a.socketId : b.socketId;
      } else if (this.players.length === 1) {
        winner = this.players[0].socketId;
      }
    }

    this.broadcast('matchEnd', {
      reason,
      winnerId: winner,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        hp: p.hp,
        maxCombo: p.maxCombo,
        correctWords: p.correctWords,
        totalWords: p.totalWords,
        totalDamage: p.totalDamage,
        accuracy: p.totalWords > 0 ? Math.round((p.correctWords / p.totalWords) * 100) : 100
      }))
    });
  }

  handleDisconnect(socketId) {
    const player = this.getPlayer(socketId);
    if (player) player.connected = false;

    if (this.status === 'fighting') {
      const opponent = this.getOpponent(socketId);
      if (opponent) this.endMatch('opponent_disconnected', opponent.socketId);
    } else if (this.status === 'countdown') {
      // Cancel countdown if someone disconnected
      if (this.countdownHandle) clearTimeout(this.countdownHandle);
      this.status = 'waiting';
      this.players.forEach(p => { p.ready = false; });
      this.removePlayer(socketId);
      this.broadcast('roomUpdate', this.publicState());
    } else if (this.status === 'waiting') {
      // In waiting room, remove disconnected player to free the slot
      this.removePlayer(socketId);
    }
  }

  destroy() {
    if (this.timerHandle) clearInterval(this.timerHandle);
    if (this.countdownHandle) clearTimeout(this.countdownHandle);
    if (this.nextWordHandle) clearTimeout(this.nextWordHandle);
  }
}

module.exports = Room;
