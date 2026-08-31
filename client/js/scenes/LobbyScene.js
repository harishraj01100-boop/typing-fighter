class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);
    this.joinCode = '';
    this.errorText = null;

    UIKit.title(this, w / 2, h * 0.14, 'ONLINE BATTLE', 38);
    UIKit.subtitle(this, w / 2, h * 0.14 + 34, `Match length: ${GameState.duration / 60} minutes`, 15);

    UIKit.button(this, w / 2, h * 0.32, 'CREATE ROOM', () => this._createRoom());

    UIKit.subtitle(this, w / 2, h * 0.44, '— OR —', 15, '#4c5a78');

    UIKit.panel(this, w / 2, h * 0.55, 320, 70, 10);
    UIKit.subtitle(this, w / 2, h * 0.55 - 24, 'ROOM CODE', 13);
    this.codeDisplay = this.add.text(w / 2, h * 0.55 + 6, '_ _ _ _ _', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '26px', fontStyle: '700', color: '#35e6ff', letterSpacing: 4
    }).setOrigin(0.5);

    const zone = this.add.zone(w / 2, h * 0.55, 320, 70).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      const code = prompt('Enter 5-character room code:', '');
      if (code) {
        this.joinCode = code.trim().toUpperCase().slice(0, 5);
        this.codeDisplay.setText(this.joinCode.padEnd(5, '_').split('').join(' '));
      }
    });

    UIKit.button(this, w / 2, h * 0.7, 'JOIN ROOM', () => this._joinRoom());

    UIKit.button(this, 110, h - 50, '< BACK', () => this.scene.start('ModeSelectScene'), { width: 160, height: 46, fontSize: 16 });

    this._bindSocketEvents();
  }

  _showError(msg) {
    if (this.errorText) this.errorText.destroy();
    this.errorText = this.add.text(this.scale.width / 2, this.scale.height * 0.82, msg, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color: '#ff4d6d'
    }).setOrigin(0.5);
  }

  _createRoom() {
    const socket = Net.connect();
    if (!socket) {
      this._showError('Unable to initialize connection.');
      return;
    }
    Net.createRoom(GameState.duration);
  }

  _joinRoom() {
    if (this.joinCode.length !== 5) { this._showError('Enter a valid 5-character room code.'); return; }
    const socket = Net.connect();
    if (!socket) {
      this._showError('Unable to initialize connection.');
      return;
    }
    Net.joinRoom(this.joinCode);
  }

  _bindSocketEvents() {
    const socket = Net.connect();
    if (!socket) return;

    socket.off('roomCreated');
    socket.off('roomJoined');
    socket.off('joinError');
    socket.off('connect_error');

    socket.on('connect_error', () => {
      this._showError('Cannot reach multiplayer server.');
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

    socket.on('joinError', ({ message }) => this._showError(message));
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
