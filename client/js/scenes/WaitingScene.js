class WaitingScene extends Phaser.Scene {
  constructor() { super('WaitingScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);

    UIKit.title(this, w / 2, h * 0.14, 'WAITING FOR OPPONENT...', 30);

    UIKit.panel(this, w / 2, h * 0.28, 260, 70, 10);
    UIKit.subtitle(this, w / 2, h * 0.28 - 20, 'ROOM CODE — share with a friend', 13);
    this.add.text(w / 2, h * 0.28 + 8, GameState.roomCode || '-----', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '30px', fontStyle: '900', color: '#35e6ff', letterSpacing: 6
    }).setOrigin(0.5);

    this.p1Panel = this._playerCard(w * 0.3, h * 0.55, 'PLAYER 1');
    this.p2Panel = this._playerCard(w * 0.7, h * 0.55, 'PLAYER 2');

    this.readyBtn = UIKit.button(this, w / 2, h * 0.78, 'READY UP', () => {
      Net.ready();
      this.readyBtn.disableInteractive();
      this.readyBtnText.setText('WAITING FOR MATCH...');
    });
    this.readyBtnText = this.readyBtn.list[1];

    UIKit.button(this, 110, h - 50, '< LEAVE', () => {
      Net.leaveRoom();
      this.scene.start('LobbyScene');
    }, { width: 160, height: 46, fontSize: 16 });

    this._bindSocketEvents();
  }

  _playerCard(x, y, label) {
    UIKit.panel(this, x, y, 220, 120, 12);
    const nameText = this.add.text(x, y - 30, label, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontStyle: '700', color: '#eaf6ff'
    }).setOrigin(0.5);
    const statusText = this.add.text(x, y + 10, 'WAITING...', {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color: '#8fa3c7'
    }).setOrigin(0.5);
    return { nameText, statusText };
  }

  _bindSocketEvents() {
    const socket = Net.connect();
    socket.off('roomUpdate');
    socket.off('countdownStart');
    socket.off('countdownTick');
    socket.off('matchStart');
    socket.off('opponentLeft');

    socket.on('roomUpdate', (state) => this._renderState(state));

    socket.on('opponentLeft', () => {
      this._showMessage('Opponent left the room.');
    });

    socket.on('countdownStart', () => {
      GameState.pendingCountdown = true;
      this.scene.start('FightScene');
    });

    if (GameState.you) this._renderState({ players: [GameState.you] });
  }

  _renderState(state) {
    const players = state.players || [];
    const cards = [this.p1Panel, this.p2Panel];
    for (let i = 0; i < 2; i++) {
      const p = players[i];
      const card = cards[i];
      if (!p) {
        card.nameText.setText(`PLAYER ${i + 1}`);
        card.statusText.setText('WAITING...').setColor('#8fa3c7');
        continue;
      }
      card.nameText.setText(p.name.toUpperCase());
      if (p.id === GameState.you?.id) {
        GameState.opponentName = players.find(pl => pl.id !== p.id)?.name || 'Opponent';
      }
      card.statusText.setText(p.ready ? 'READY' : 'NOT READY').setColor(p.ready ? '#35e6ff' : '#8fa3c7');
    }
  }

  _showMessage(msg) {
    if (this._msg) this._msg.destroy();
    this._msg = this.add.text(this.scale.width / 2, this.scale.height * 0.9, msg, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color: '#ff4d6d'
    }).setOrigin(0.5);
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
