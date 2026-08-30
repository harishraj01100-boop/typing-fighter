class FightScene extends Phaser.Scene {
  constructor() { super('FightScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.w = w; this.h = h;
    this.mode = GameState.mode;
    this.duration = GameState.duration;
    this.timeLeft = this.duration;
    this.matchOver = false;

    this.myName = GameState.playerName || 'Player 1';
    this.oppName = this.mode === 'online' ? (GameState.opponentName || 'Opponent') : 'AI OPPONENT';

    this.myHp = 100;
    this.oppHp = 100;
    this.myCombo = 0;
    this.myMaxCombo = 0;
    this.myTotalDamage = 0;
    this.currentWordId = 0;
    this.currentWord = '';
    this.currentIsSpecial = false;
    this.wordLocked = false; // true once THIS exchange has been resolved

    this.arena = new Arena(this);
    this.effects = new EffectsManager(this);

    this._buildFighters();
    this._buildHud();
    this._buildTypingArea();
    this._buildCountdownLayer();

    this.typing = new TypingSystem(this);
    this.typing.onProgress = (typed) => this._onProgress(typed);
    this.typing.onMistakeChar = () => this._onMistake();
    this.typing.onWordComplete = (typed, elapsedMs, mistakes) => this._onWordComplete(typed, elapsedMs, mistakes);

    if (this.mode === 'practice') {
      this.ai = new AIOpponent(GameState.aiDifficulty);
      this._startCountdownLocal();
    } else {
      this._bindOnlineEvents();
      if (GameState.pendingCountdown) {
        GameState.pendingCountdown = false;
      }
      // countdownStart may already have fired in WaitingScene right before
      // transition; server will still emit countdownTick/matchStart which
      // we listen for below, so nothing else to do here.
    }
  }

  // ---------------- BUILD ----------------

  _buildFighters() {
    const groundY = this.h * 0.78;
    this.playerFighter = new Fighter(this, this.w * 0.27, groundY, 1, 'ronin', 0x35e6ff);
    this.oppFighter = new Fighter(this, this.w * 0.73, groundY, -1, 'brute', 0xff4d6d);
  }

  _buildHud() {
    const w = this.w, h = this.h;

    // Player 1 (left) panel
    this.add.text(24, 20, this.myName.toUpperCase(), {
      fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontStyle: '700', color: '#35e6ff'
    });
    this.p1Bar = UIKit.hpBar(this, 24, 46, 300, 22, false);
    this.p1HpText = this.add.text(24 + 300, 46 + 11, '100', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#eaf6ff'
    }).setOrigin(1, 0.5).setX(24 + 300 - 8);

    // Player 2 (right) panel
    this.add.text(w - 24, 20, this.oppName.toUpperCase(), {
      fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontStyle: '700', color: '#ff4d6d'
    }).setOrigin(1, 0);
    this.p2Bar = UIKit.hpBar(this, w - 24 - 300, 46, 300, 22, true);

    // Timer
    this.timerText = this.add.text(w / 2, 34, this._formatTime(this.timeLeft), {
      fontFamily: 'Orbitron, sans-serif', fontSize: '34px', fontStyle: '900', color: '#eaf6ff'
    }).setOrigin(0.5);

    // Combo display (above player's own health area)
    this.comboText = this.add.text(24, 80, '', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontStyle: '700', color: '#35e6ff'
    });

    // Stats readout (bottom-left)
    this.statsText = this.add.text(24, h - 70, 'WPM: 0    Accuracy: 100%', {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color: '#8fa3c7'
    });

    // Opponent typing progress (cosmetic only)
    this.oppProgressBar = UIKit.hpBar(this, w - 24 - 180, 74, 180, 8, true);
    this.oppProgressBar.draw(0);
  }

  _buildTypingArea() {
    const w = this.w, h = this.h;
    const y = h * 0.5;

    UIKit.panel(this, w / 2, y + 60, Math.min(560, w * 0.7), 60, 12);
    this.wordText = this.add.text(w / 2, y, '', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '46px', fontStyle: '900', color: '#eaf6ff'
    }).setOrigin(0.5);

    this.typedHintText = this.add.text(w / 2, y + 60, 'Get ready...', {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '20px', fontStyle: '600', color: '#8fa3c7'
    }).setOrigin(0.5);
  }

  _buildCountdownLayer() {
    this.countdownText = this.add.text(this.w / 2, this.h / 2, '', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '120px', fontStyle: '900', color: '#eaf6ff',
      stroke: '#001018', strokeThickness: 8
    }).setOrigin(0.5).setDepth(50);
  }

  // ---------------- COUNTDOWN ----------------

  _startCountdownLocal() {
    const seq = ['3', '2', '1', 'FIGHT!'];
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        this.countdownText.setText('');
        this._startMatchLocal();
        return;
      }
      this.countdownText.setText(seq[i]).setScale(0.5).setAlpha(1);
      this.tweens.add({ targets: this.countdownText, scale: 1, duration: 260, ease: 'Back.easeOut' });
      if (seq[i] === 'FIGHT!') { AudioSystem.fightShout(); } else { AudioSystem.countdownBeep(); }
      i++;
      this.time.delayedCall(850, step);
    };
    step();
  }

  // ---------------- PRACTICE MODE ----------------

  _startMatchLocal() {
    this.playerFighter.playTypingReady();
    this.oppFighter.playTypingReady();
    this.typing.enable();

    this.localTimer = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.matchOver) return;
        this.timeLeft--;
        this.timerText.setText(this._formatTime(this.timeLeft));
        if (this.timeLeft <= 0) this._endMatch('timeout');
      }
    });

    this._issueWordLocal();
  }

  _issueWordLocal() {
    if (this.matchOver) return;
    this.wordLocked = false;
    const highestCombo = Math.max(this.myCombo, this.ai.combo);
    const { word, isSpecial } = WordSystem.getRandomWord(highestCombo);
    this._presentWord(word, isSpecial);

    // Kick off AI's attempt in parallel with the player's typing
    this._aiHandle = this.ai.attemptWord(word, (exact, elapsedMs, mistakes) => {
      this._resolveAiAttempt(word, isSpecial, elapsedMs, mistakes);
    });
  }

  _resolveAiAttempt(word, isSpecial, elapsedMs, mistakes) {
    if (this.wordLocked || this.matchOver) return;
    if (mistakes > 0 && Math.random() < 0.3) {
      // AI fumbled badly enough to lose this exchange entirely
      this.ai.combo = 0;
      return;
    }
    this.wordLocked = true;
    this.ai.combo += 1;
    if (this.ai.combo > this.ai.maxCombo) this.ai.maxCombo = this.ai.combo;

    const { accuracy } = CombatCalc.evaluateTyped(word, word, mistakes);
    const { damage, critical } = CombatCalc.calculateDamage({ word, elapsedMs, accuracy, combo: this.ai.combo, isSpecial });

    this.myCombo = 0;
    this.myHp = Math.max(0, this.myHp - damage);
    this._applyAttackVisuals({ attackerIsMe: false, damage, critical, isSpecial, word });

    if (this.myHp <= 0) { this._endMatch('ko', false); return; }
    this.time.delayedCall(900, () => this._issueWordLocal());
  }

  // ---------------- ONLINE MODE ----------------

  _bindOnlineEvents() {
    const socket = Net.connect();
    ['countdownStart','countdownTick','matchStart','newWord','attackResult','typingMiss','timerUpdate','matchEnd','opponentTyping','opponentLeft']
      .forEach(evt => socket.off(evt));

    socket.on('countdownStart', () => {
      this._startCountdownOnline();
    });
    socket.on('countdownTick', ({ value }) => {
      this.countdownText.setText(String(value)).setScale(0.5).setAlpha(1);
      this.tweens.add({ targets: this.countdownText, scale: 1, duration: 260, ease: 'Back.easeOut' });
      AudioSystem.countdownBeep();
    });
    socket.on('matchStart', (state) => {
      this.countdownText.setText('FIGHT!').setScale(0.5);
      this.tweens.add({ targets: this.countdownText, scale: 1, duration: 260, ease: 'Back.easeOut' });
      AudioSystem.fightShout();
      this.time.delayedCall(700, () => this.countdownText.setText(''));
      this.timeLeft = state.duration;
      this.timerText.setText(this._formatTime(this.timeLeft));
      this.playerFighter.playTypingReady();
      this.oppFighter.playTypingReady();
      this.typing.enable();
    });
    socket.on('newWord', ({ word, isSpecial, wordId }) => {
      this.currentWordId = wordId;
      this.wordLocked = false;
      this._presentWord(word, isSpecial);
      this.oppProgressBar.draw(0);
    });
    socket.on('opponentTyping', ({ chars }) => {
      const pct = this.currentWord ? Math.min(1, chars / this.currentWord.length) : 0;
      this.oppProgressBar.draw(pct);
    });
    socket.on('typingMiss', ({ playerId }) => {
      if (playerId === GameState.you?.id) {
        this.myCombo = 0;
        this._flashWordMistake();
      }
    });
    socket.on('attackResult', (result) => {
      this._handleOnlineAttackResult(result);
    });
    socket.on('timerUpdate', ({ timeLeft }) => {
      this.timeLeft = timeLeft;
      this.timerText.setText(this._formatTime(this.timeLeft));
    });
    socket.on('matchEnd', (payload) => {
      this._endMatchOnline(payload);
    });
    socket.on('opponentLeft', () => {
      if (!this.matchOver) this._endMatch('opponent_disconnected', true);
    });
  }

  _startCountdownOnline() {
    // Server drives the timing; nothing to do locally besides waiting for ticks.
  }

  _handleOnlineAttackResult(result) {
    const meAttacking = result.attackerId === GameState.you?.id;
    if (meAttacking) {
      this.myCombo = result.combo;
      if (this.myCombo > this.myMaxCombo) this.myMaxCombo = this.myCombo;
      this.myTotalDamage += result.damage;
      this.oppHp = result.defenderHp;
    } else {
      this.myCombo = 0;
      this.myHp = result.defenderHp;
    }

    this._applyAttackVisuals({
      attackerIsMe: meAttacking,
      damage: result.damage,
      critical: result.critical,
      isSpecial: result.isSpecial,
      word: result.word
    });
  }

  // ---------------- SHARED WORD / TYPING FLOW ----------------

  _presentWord(word, isSpecial) {
    this.currentWord = word;
    this.currentIsSpecial = isSpecial;
    this.typing.setWord(word);
    this.wordText.setText(word).setColor(isSpecial ? '#5a3d75' : '#3a4256');
    if (this._typedOverlay) this._typedOverlay.setText('');
    this.typedHintText.setText(isSpecial ? '★ SPECIAL WORD ★' : 'Type it exactly!').setColor(isSpecial ? '#c77bff' : '#8fa3c7');
    this.playerFighter.playTypingReady();
    this.oppFighter.playTypingReady();
  }

  _onProgress(typed) {
    const remaining = this.currentWord.slice(typed.length);
    // Render typed portion highlighted + remaining dimmed using a two-layer text trick:
    this._renderWordProgress(typed, remaining);
    AudioSystem.keyPress();

    if (this.mode === 'online') {
      Net.sendProgress(typed.length);
    }
  }

  _renderWordProgress(typed, remaining) {
    // Phaser BitmapText/Text doesn't support multi-color inline easily without
    // rich text plugins, so we approximate with two overlapping text objects.
    if (!this._typedOverlay) {
      this._typedOverlay = this.add.text(0, 0, '', {
        fontFamily: 'Orbitron, sans-serif', fontSize: '46px', fontStyle: '900', color: '#35e6ff'
      }).setOrigin(0, 0.5);
    }
    this.wordText.setText(this.currentWord);
    this.wordText.setColor(this.currentIsSpecial ? '#5a3d75' : '#3a4256');

    const fullWidth = this.wordText.width;
    const startX = this.wordText.x - fullWidth / 2;
    this._typedOverlay.setText(typed);
    this._typedOverlay.setPosition(startX, this.wordText.y);
    this._typedOverlay.setColor(this.currentIsSpecial ? '#c77bff' : '#35e6ff');
  }

  _onMistake() {
    AudioSystem.keyMistake();
    this._flashWordMistake();
  }

  _flashWordMistake() {
    this.cameras.main.flash(80, 255, 30, 60, false);
    this.tweens.add({ targets: this.wordText, x: this.w / 2 + 8, duration: 40, yoyo: true, repeat: 2 });
  }

  _onWordComplete(typed, elapsedMs, mistakes) {
    AudioSystem.wordComplete();
    this.typing.reset();
    if (this._typedOverlay) this._typedOverlay.setText('');

    if (this.mode === 'practice') {
      this._resolvePlayerAttemptLocal(typed, elapsedMs, mistakes);
    } else {
      Net.submitAttempt(this.currentWordId, typed, mistakes);
    }
  }

  _resolvePlayerAttemptLocal(typed, elapsedMs, mistakes) {
    if (this.wordLocked || this.matchOver) return;
    this.wordLocked = true;
    if (this._aiHandle) clearTimeout(this._aiHandle);

    const { accuracy } = CombatCalc.evaluateTyped(this.currentWord, typed, mistakes);
    this.myCombo += 1;
    if (this.myCombo > this.myMaxCombo) this.myMaxCombo = this.myCombo;

    const { damage, critical } = CombatCalc.calculateDamage({
      word: this.currentWord, elapsedMs, accuracy, combo: this.myCombo, isSpecial: this.currentIsSpecial
    });

    this.ai.combo = 0;
    this.oppHp = Math.max(0, this.oppHp - damage);
    this.myTotalDamage += damage;

    this._applyAttackVisuals({ attackerIsMe: true, damage, critical, isSpecial: this.currentIsSpecial, word: this.currentWord });

    if (this.oppHp <= 0) { this._endMatch('ko', true); return; }
    this.time.delayedCall(900, () => this._issueWordLocal());
  }

  // ---------------- VISUALS / RESOLUTION ----------------

  _applyAttackVisuals({ attackerIsMe, damage, critical, isSpecial, word }) {
    const attacker = attackerIsMe ? this.playerFighter : this.oppFighter;
    const defender = attackerIsMe ? this.oppFighter : this.playerFighter;
    const lenCat = WordSystem.lengthCategory(word);
    const impactX = defender.container.x;
    const impactY = defender.container.y - 40;

    attacker.playAttack(lenCat, isSpecial, () => {
      defender.playHitReaction(critical);
      const color = isSpecial ? 0xc77bff : (critical ? 0xffcc33 : (attackerIsMe ? 0x35e6ff : 0xff4d6d));
      this.effects.hitSparks(impactX, impactY, color, critical ? 22 : 12);
      this.effects.impactFlash(impactX, impactY, color);
      this.effects.floatingDamage(impactX, impactY - 20, damage, { critical, isSpecial });
      this.effects.screenShake(critical ? 0.012 : 0.006, critical ? 220 : 130);
      if (isSpecial) this.effects.specialBurst(impactX, impactY, 0xc77bff);

      if (critical) AudioSystem.criticalHit();
      else if (lenCat === 'long') AudioSystem.attackHeavy();
      else AudioSystem.attackLight();
      AudioSystem.hitReceived();
    });

    const comboOwnerCombo = attackerIsMe ? this.myCombo : (this.mode === 'practice' ? this.ai.combo : 0);
    if (comboOwnerCombo >= 3) {
      const cx = attackerIsMe ? this.w * 0.27 : this.w * 0.73;
      this.effects.comboPop(cx, this.h * 0.6, comboOwnerCombo);
      AudioSystem.comboUp();
    }

    this._refreshHud();
  }

  _refreshHud() {
    this.p1Bar.draw(this.myHp / 100);
    this.p2Bar.draw(this.oppHp / 100);
    this.p1HpText.setText(Math.max(0, Math.round(this.myHp)).toString());
    this.comboText.setText(this.myCombo > 1 ? `COMBO x${this.myCombo}` : '');
    const wpm = this.typing.getWPM();
    const acc = this.typing.getAccuracy();
    this.statsText.setText(`WPM: ${wpm}    Accuracy: ${acc}%`);
  }

  // ---------------- END OF MATCH ----------------

  _endMatch(reason, won) {
    if (this.matchOver) return;
    this.matchOver = true;
    this.typing.disable();
    if (this.localTimer) this.localTimer.remove();

    const winnerFighter = won ? this.playerFighter : this.oppFighter;
    const loserFighter = won ? this.oppFighter : this.playerFighter;
    winnerFighter.playVictory();
    loserFighter.playDefeat();
    won ? AudioSystem.victory() : AudioSystem.defeat();

    GameState.lastResult = {
      won,
      reason,
      wpm: this.typing.getWPM(),
      accuracy: this.typing.getAccuracy(),
      maxCombo: this.myMaxCombo,
      damage: this.myTotalDamage,
      opponentName: this.oppName
    };

    this.time.delayedCall(1600, () => this.scene.start('ResultScene'));
  }

  _endMatchOnline({ reason, winnerId, players }) {
    if (this.matchOver) return;
    this.matchOver = true;
    this.typing.disable();

    const me = players.find(p => p.id === GameState.you?.id);
    const won = winnerId === GameState.you?.id;
    const draw = winnerId === null;

    const winnerFighter = won ? this.playerFighter : this.oppFighter;
    const loserFighter = won ? this.oppFighter : this.playerFighter;
    if (!draw) { winnerFighter.playVictory(); loserFighter.playDefeat(); }
    won ? AudioSystem.victory() : AudioSystem.defeat();

    GameState.lastResult = {
      won, draw, reason,
      wpm: this.typing.getWPM(),
      accuracy: me ? me.accuracy : this.typing.getAccuracy(),
      maxCombo: me ? me.maxCombo : this.myMaxCombo,
      damage: me ? me.totalDamage : this.myTotalDamage,
      opponentName: this.oppName
    };

    this.time.delayedCall(1600, () => this.scene.start('ResultScene'));
  }

  _formatTime(seconds) {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  shutdown() {
    if (this.typing) this.typing.destroy();
    if (this.arena) this.arena.destroy();
    if (this._aiHandle) clearTimeout(this._aiHandle);
    if (this.localTimer) this.localTimer.remove();
  }
}
