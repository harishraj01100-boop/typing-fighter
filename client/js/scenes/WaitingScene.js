class WaitingScene extends Phaser.Scene {
  constructor() { super('WaitingScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);

    this.titleText = UIKit.title(this, w / 2, h * 0.12, 'WAITING FOR OPPONENT...', 28);

    UIKit.panel(this, w / 2, h * 0.25, 280, 64, 10);
    UIKit.subtitle(this, w / 2, h * 0.25 - 18, 'ROOM CODE', 12);
    this.codeText = this.add.text(w / 2, h * 0.25 + 8, GameState.roomCode || '-----', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '28px', fontStyle: '900', color: '#35e6ff', letterSpacing: 6
    }).setOrigin(0.5);

    // Copy Invite Link / Code Button
    this.copyBtn = UIKit.button(this, w / 2, h * 0.35, 'COPY INVITE LINK', () => {
      this._copyInviteLink();
    }, { width: 220, height: 36, fontSize: 14 });

    this.p1Panel = this._playerCard(w * 0.3, h * 0.54, 'PLAYER 1');
    this.p2Panel = this._playerCard(w * 0.7, h * 0.54, 'PLAYER 2');

    this.readyBtn = UIKit.button(this, w / 2, h * 0.76, 'READY UP', () => {
      Net.ready();
      this.readyBtn.disableInteractive();
      this.readyBtnText.setText('WAITING FOR OPPONENT...');
    });
    this.readyBtnText = this.readyBtn.list[1];

    UIKit.button(this, 110, h - 45, '< LEAVE', () => {
      Net.leaveRoom();
      this.scene.start('LobbyScene');
    }, { width: 150, height: 42, fontSize: 16 });

    this._bindSocketEvents();
  }

  _copyInviteLink() {
    let url = window.location.href.split('?')[0];
    const server = Net.getServerUrl();
    let shareUrl = `${url}?room=${GameState.roomCode}`;
    if (server) shareUrl += `&server=${encodeURIComponent(server)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this._showMessage('Invite link copied to clipboard!', '#35ff9e');
        if (window.AudioSystem) AudioSystem.wordComplete();
      }).catch(() => {
        UIKit.inputModal(this, {
          title: 'INVITE LINK',
          subtitle: 'Copy and share this room link with your friend:',
          value: shareUrl,
          readOnly: true,
          confirmText: 'CLOSE'
        });
      });
    } else {
      UIKit.inputModal(this, {
        title: 'INVITE LINK',
        subtitle: 'Copy and share this room link with your friend:',
        value: shareUrl,
        readOnly: true,
        confirmText: 'CLOSE'
      });
    }
  }

  _playerCard(x, y, label) {
    UIKit.panel(this, x, y, 220, 110, 12);
    const nameText = this.add.text(x, y - 25, label, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '17px', fontStyle: '700', color: '#eaf6ff'
    }).setOrigin(0.5);
    const statusText = this.add.text(x, y + 15, 'WAITING...', {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color: '#8fa3c7'
    }).setOrigin(0.5);
    return { nameText, statusText };
  }

  _bindSocketEvents() {
    const socket = Net.connect();
    if (!socket) return;

    socket.off('roomUpdate');
    socket.off('countdownStart');
    socket.off('countdownTick');
    socket.off('matchStart');
    socket.off('opponentLeft');

    socket.on('roomUpdate', (state) => this._renderState(state));

    socket.on('opponentLeft', () => {
      this._showMessage('Opponent left the room.', '#ff4d6d');
      this.p2Panel.nameText.setText('PLAYER 2');
      this.p2Panel.statusText.setText('WAITING...').setColor('#8fa3c7');
      this.titleText.setText('WAITING FOR OPPONENT...');
      this.readyBtn.setInteractive();
      this.readyBtnText.setText('READY UP');
    });

    socket.on('countdownStart', () => {
      GameState.pendingCountdown = true;
      this.scene.start('FightScene');
    });

    if (GameState.you) this._renderState({ players: [GameState.you] });
  }

  _renderState(state) {
    const players = (state && state.players) || [];
    const cards = [this.p1Panel, this.p2Panel];

    if (players.length === 2) {
      this.titleText.setText('BOTH PLAYERS CONNECTED');
    } else {
      this.titleText.setText('WAITING FOR OPPONENT...');
    }

    for (let i = 0; i < 2; i++) {
      const p = players[i];
      const card = cards[i];
      if (!p || !p.connected) {
        card.nameText.setText(`PLAYER ${i + 1}`);
        card.statusText.setText('WAITING...').setColor('#8fa3c7');
        continue;
      }
      card.nameText.setText(p.name.toUpperCase());
      if (p.id === GameState.you?.id) {
        const opp = players.find(pl => pl.id !== p.id);
        GameState.opponentName = opp ? opp.name : 'Opponent';
      }
      card.statusText.setText(p.ready ? 'READY' : 'NOT READY').setColor(p.ready ? '#35ff9e' : '#ffcc33');
    }
  }

  _showMessage(msg, color = '#ff4d6d') {
    if (this._msg) this._msg.destroy();
    this._msg = this.add.text(this.scale.width / 2, this.scale.height * 0.88, msg, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color
    }).setOrigin(0.5);
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
