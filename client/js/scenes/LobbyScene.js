class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);
    this.joinCode = '';
    this.errorText = null;
    this.serverConfigBtn = null;
    this.slotElements = [];

    UIKit.title(this, w / 2, h * 0.10, 'ONLINE BATTLE', 38);
    UIKit.subtitle(this, w / 2, h * 0.10 + 32, `Match length: ${GameState.duration / 60} minutes`, 15);

    // Server Info Tag in top-right / footer
    this._buildServerTag(w, h);

    // Create Room Button
    this.createBtn = UIKit.button(this, w / 2, h * 0.24, 'CREATE ROOM', () => this._createRoom());

    UIKit.subtitle(this, w / 2, h * 0.34, '— OR ENTER ROOM CODE —', 14, '#4c5a78');

    // Build the 5-slot interactive room code UI
    this._buildCodeSlots(w, h);

    // Action buttons under code slots (Paste & Clear)
    this._buildCodeActionButtons(w, h);

    // Join Room Button
    this.joinBtn = UIKit.button(this, w / 2, h * 0.63, 'JOIN ROOM', () => this._joinRoom());

    // Navigation Buttons
    UIKit.button(this, 110, h - 45, '< BACK', () => this.scene.start('ModeSelectScene'), { width: 150, height: 42, fontSize: 16 });
    UIKit.button(this, w - 110, h - 45, 'SETTINGS', () => this.scene.start('SettingsScene'), { width: 150, height: 42, fontSize: 16 });

    // Check if room code was passed in URL query param
    const initialCode = Net.getInitialRoomCode();
    if (initialCode) {
      this.joinCode = initialCode;
    }

    // Set up keyboard input & cursor blinking
    this._setupInputHandlers();
    this._updateCodeSlots();
    this._bindSocketEvents();
  }

  _buildCodeSlots(w, h) {
    const slotY = h * 0.44;
    const slotW = 54;
    const slotH = 64;
    const gap = 12;
    const totalW = 5 * slotW + 4 * gap;
    const startX = w / 2 - totalW / 2 + slotW / 2;

    this.slotsContainer = this.add.container(0, 0);

    for (let i = 0; i < 5; i++) {
      const slotX = startX + i * (slotW + gap);
      const bg = this.add.graphics();
      const text = this.add.text(slotX, slotY, '', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '28px',
        fontStyle: '700',
        color: '#35e6ff'
      }).setOrigin(0.5);

      const cursor = this.add.text(slotX, slotY + 2, '_', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '26px',
        fontStyle: '700',
        color: '#35e6ff'
      }).setOrigin(0.5);
      cursor.setVisible(false);

      this.slotsContainer.add([bg, text, cursor]);
      this.slotElements.push({ bg, text, cursor, x: slotX, y: slotY, w: slotW, h: slotH });
    }

    // Interactive hit zone for the whole code slots area
    const touchZone = this.add.zone(w / 2, slotY, totalW + 40, slotH + 20).setInteractive({ useHandCursor: true });
    touchZone.on('pointerdown', () => {
      this._focusInput();
    });
  }

  _buildCodeActionButtons(w, h) {
    const actionY = h * 0.525;

    // Paste from clipboard button
    this.pasteBtn = UIKit.button(this, w / 2 - 65, actionY, 'PASTE', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          const clean = (text || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
          if (clean) {
            this.joinCode = clean;
            this._updateCodeSlots();
            if (window.AudioSystem) AudioSystem.wordComplete();
            return;
          }
        }
      } catch (e) {
        /* Clipboard permission fallback */
      }

      // Fallback: Open in-game modal to paste/type
      UIKit.inputModal(this, {
        title: 'ENTER ROOM CODE',
        subtitle: 'Paste or type the 5-character room code:',
        value: this.joinCode,
        maxLength: 5,
        placeholder: 'ABCDE',
        onConfirm: (val) => {
          this.joinCode = (val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
          this._updateCodeSlots();
        }
      });
    }, { width: 115, height: 34, fontSize: 13 });

    // Clear button
    this.clearBtn = UIKit.button(this, w / 2 + 65, actionY, 'CLEAR', () => {
      this.joinCode = '';
      this._updateCodeSlots();
      this._focusInput();
      if (window.AudioSystem) AudioSystem.keyPress();
    }, { width: 115, height: 34, fontSize: 13 });
  }

  _updateCodeSlots() {
    const len = this.joinCode.length;

    for (let i = 0; i < 5; i++) {
      const { bg, text, cursor, x, y, w, h } = this.slotElements[i];
      const char = this.joinCode[i] || '';
      const isCurrentSlot = i === len;
      const isFilled = i < len;

      bg.clear();
      bg.fillStyle(isFilled ? 0x0e1826 : (isCurrentSlot ? 0x0c1322 : 0x070a12), 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);

      if (isFilled) {
        bg.lineStyle(2, 0x35e6ff, 1);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      } else if (isCurrentSlot) {
        bg.lineStyle(2, 0x35e6ff, 0.85);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      } else {
        bg.lineStyle(1.5, 0x1e2333, 0.7);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      }

      text.setText(char);
      text.setColor(isFilled ? '#eaf6ff' : '#35e6ff');
      cursor.setVisible(isCurrentSlot && !char);
    }

    // Sync with hidden mobile input if present
    const hidden = document.getElementById('hidden-typing-input');
    if (hidden && hidden.value !== this.joinCode) {
      hidden.value = this.joinCode;
    }
  }

  _setupInputHandlers() {
    // Blinking cursor timer
    this._cursorVisible = true;
    this._blinkTimer = this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        this._cursorVisible = !this._cursorVisible;
        const curIdx = this.joinCode.length;
        if (curIdx < 5 && this.slotElements[curIdx]) {
          this.slotElements[curIdx].cursor.setVisible(this._cursorVisible && !this.joinCode[curIdx]);
        }
      }
    });

    // Keyboard listener on desktop
    this._onKeyDown = (e) => {
      // If modal is open, ignore
      if (this.children.list.some(c => c.depth >= 2000)) return;

      if (e.key === 'Backspace') {
        if (this.joinCode.length > 0) {
          this.joinCode = this.joinCode.slice(0, -1);
          this._updateCodeSlots();
          if (window.AudioSystem) AudioSystem.keyPress();
        }
      } else if (e.key === 'Enter') {
        if (this.joinCode.length === 5) {
          this._joinRoom();
        }
      } else if (e.key === 'Escape') {
        if (this.joinCode.length > 0) {
          this.joinCode = '';
          this._updateCodeSlots();
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (/^[a-zA-Z0-9]$/.test(e.key) && this.joinCode.length < 5) {
          this.joinCode += e.key.toUpperCase();
          this._updateCodeSlots();
          if (window.AudioSystem) AudioSystem.keyPress();
        }
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    // Paste listener
    this._onPaste = (e) => {
      if (this.children.list.some(c => c.depth >= 2000)) return;
      const text = (e.clipboardData || window.clipboardData)?.getData('text');
      if (text) {
        const clean = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
        if (clean) {
          this.joinCode = clean;
          this._updateCodeSlots();
          if (window.AudioSystem) AudioSystem.wordComplete();
        }
      }
    };
    window.addEventListener('paste', this._onPaste);

    // Mobile / hidden input listener
    const hidden = document.getElementById('hidden-typing-input');
    if (hidden) {
      this._onHiddenInput = () => {
        const clean = (hidden.value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
        this.joinCode = clean;
        this._updateCodeSlots();
      };
      hidden.addEventListener('input', this._onHiddenInput);
    }

    this._focusInput();
  }

  _focusInput() {
    const hidden = document.getElementById('hidden-typing-input');
    if (hidden) {
      hidden.value = this.joinCode;
      try {
        hidden.focus({ preventScroll: true });
      } catch (e) {}
    }
  }

  _buildServerTag(w, h) {
    const serverUrl = Net.getActiveServerUrl();
    const shortUrl = serverUrl.replace(/^https?:\/\//i, '').slice(0, 24);
    
    this.serverTag = this.add.text(w / 2, h * 0.74, `Server: ${shortUrl}`, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontStyle: '600', color: '#8fa3c7'
    }).setOrigin(0.5);

    this._statusHandler = (status) => {
      if (!this.serverTag || !this.serverTag.active) return;
      if (status === 'connected') {
        this.serverTag.setText(`● Server: ${shortUrl} (Connected)`).setColor('#35ff9e');
      } else if (status === 'connecting') {
        this.serverTag.setText(`● Server: ${shortUrl} (Connecting...)`).setColor('#ffcc33');
      } else if (status === 'error') {
        this.serverTag.setText(`● Server: ${shortUrl} (Offline)`).setColor('#ff4d6d');
      }
    };
    Net.onStatusChange(this._statusHandler);
  }

  _showError(msg, showConfigBtn = false) {
    if (this.errorText) this.errorText.destroy();
    if (this.serverConfigBtn) this.serverConfigBtn.destroy();

    const { width: w, height: h } = this.scale;
    this.errorText = this.add.text(w / 2, h * 0.81, msg, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color: '#ff4d6d'
    }).setOrigin(0.5);

    if (showConfigBtn) {
      this.serverConfigBtn = UIKit.button(this, w / 2, h * 0.88, 'CONFIGURE SERVER URL', () => {
        const current = Net.getServerUrl() || Net.getActiveServerUrl();
        UIKit.inputModal(this, {
          title: 'MULTIPLAYER SERVER URL',
          subtitle: 'Enter your backend Server URL (e.g. https://your-server.onrender.com):',
          value: current,
          placeholder: 'https://...',
          onConfirm: (input) => {
            if (input !== null && input !== undefined) {
              Net.setServerUrl(input);
              this._showError('Reconnecting to server...');
              Net.testConnection().then(res => {
                if (res.ok) {
                  this._showError('');
                  if (this.serverTag) this.serverTag.setText(`● Connected: ${Net.getActiveServerUrl().slice(0, 24)}`).setColor('#35ff9e');
                } else {
                  this._showError(`Cannot connect: ${res.error}`, true);
                }
              });
            }
          }
        });
      }, { width: 260, height: 38, fontSize: 14 });
    }
  }

  _createRoom() {
    this._showError('Connecting & creating room...');
    const socket = Net.connect();
    if (!socket) {
      this._showError('Unable to connect to server.', true);
      return;
    }
    Net.createRoom(GameState.duration);
  }

  _joinRoom() {
    if (this.joinCode.length !== 5) {
      this._showError('Enter a valid 5-character room code.');
      return;
    }
    this._showError('Connecting & joining room...');
    const socket = Net.connect();
    if (!socket) {
      this._showError('Unable to connect to server.', true);
      return;
    }
    Net.joinRoom(this.joinCode);
  }

  _bindSocketEvents() {
    const socket = Net.connect();
    if (!socket) {
      this._showError('Cannot reach multiplayer server.', true);
      return;
    }

    socket.off('roomCreated');
    socket.off('roomJoined');
    socket.off('joinError');
    socket.off('connect_error');
    socket.off('connect');

    socket.on('connect', () => {
      if (this.errorText && this.errorText.text.includes('Connecting')) {
        this._showError('');
      }
    });

    socket.on('connect_error', () => {
      this._showError(`Cannot reach server (${Net.getActiveServerUrl()}).`, true);
    });

    socket.on('roomCreated', ({ code, you }) => {
      GameState.roomCode = code;
      GameState.isHost = true;
      GameState.you = you;
      this.scene.start('WaitingScene');
    });

    socket.on('roomJoined', ({ code, you }) => {
      GameState.roomCode = code;
      GameState.isHost = false;
      GameState.you = you;
      this.scene.start('WaitingScene');
    });

    socket.on('joinError', ({ message }) => this._showError(message, false));
  }

  shutdown() {
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
    if (this._onPaste) window.removeEventListener('paste', this._onPaste);
    const hidden = document.getElementById('hidden-typing-input');
    if (hidden && this._onHiddenInput) hidden.removeEventListener('input', this._onHiddenInput);
    if (this._blinkTimer) this._blinkTimer.remove();
    if (this._statusHandler) Net.offStatusChange(this._statusHandler);
    if (this.arena) this.arena.destroy();
  }
}
