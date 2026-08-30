const { getRandomWord } = require('../game/words');
const { calculateDamage, evaluateTyped } = require('../game/combat');

const MAX_HP = 100;
const RECENT_WORD_MEMORY = 6;
const NEXT_WORD_DELAY_MS = 900;

class Room {
  constructor(code, io) {
    this.code = code;
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
    this.wordLockResolved = false;
    this.createdAt = Date.now();
  }

  addPlayer(socketId, name) {
    if (this.players.length >= 2) return null;
    const player = {
      id: socketId,
      socketId,
      name: name || `Player${this.players.length + 1}`,
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

  getPlayer(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  getOpponent(socketId) {
    return this.players.find(p => p.socketId !== socketId);
  }

  isFull() {
    return this.players.length === 2;
  }

  allReady() {
    return this.players.length === 2 && this.players.every(p => p.ready);
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
        id: p.id, name: p.name, hp: p.hp, combo: p.combo, maxCombo: p.maxCombo,
        ready: p.ready, connected: p.connected
      }))
    };
  }

  startCountdown() {
    this.status = 'countdown';
    this.broadcast('countdownStart', { seconds: 3 });
    let n = 3;
    const tick = () => {
      if (n <= 0) {
        this.startMatch();
        return;
      }
      this.broadcast('countdownTick', { value: n });
      n--;
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 900);
  }

  startMatch() {
    this.status = 'fighting';
    this.timeLeft = this.duration;
    this.players.forEach(p => { p.hp = MAX_HP; p.combo = 0; p.maxCombo = 0; p.correctWords = 0; p.totalWords = 0; p.totalDamage = 0; });
    this.broadcast('matchStart', this.publicState());
    this.issueNextWord();

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

    setTimeout(() => this.issueNextWord(), NEXT_WORD_DELAY_MS);
  }

  endMatch(reason, winnerId = null) {
    if (this.status === 'ended') return;
    this.status = 'ended';
    if (this.timerHandle) clearInterval(this.timerHandle);

    let winner = winnerId;
    if (!winner) {
      if (this.players.length === 2) {
        const [a, b] = this.players;
        if (a.hp === b.hp) winner = null; // draw
        else winner = a.hp > b.hp ? a.socketId : b.socketId;
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
    }
  }

  destroy() {
    if (this.timerHandle) clearInterval(this.timerHandle);
  }
}

module.exports = Room;
