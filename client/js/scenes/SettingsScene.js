class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);

    UIKit.title(this, w / 2, h * 0.1, 'SETTINGS', 38);

    // Left Column: Audio & Player
    const col1X = w * 0.32;
    this._slider(col1X, h * 0.26, 'MUSIC VOLUME', GameState.musicVolume, (v) => {
      GameState.musicVolume = v;
      AudioSystem.setMusicVolume(v);
    });

    this._slider(col1X, h * 0.40, 'SFX VOLUME', GameState.sfxVolume, (v) => {
      GameState.sfxVolume = v;
      AudioSystem.setSfxVolume(v);
      AudioSystem.menuHover();
    });

    UIKit.subtitle(this, col1X, h * 0.53, 'PLAYER NAME', 15);
    this._nameField(col1X, h * 0.60);

    // Right Column: Multiplayer Server
    const col2X = w * 0.68;
    this._serverSettings(col2X, h * 0.26);

    UIKit.button(this, w / 2, h - 55, 'BACK TO MENU', () => this.scene.start('MainMenuScene'), {
      width: 260, height: 48, fontSize: 18
    });
  }

  _slider(x, y, label, initial, onChange) {
    UIKit.subtitle(this, x, y - 28, label, 15);
    const trackWidth = 280;
    const track = this.add.rectangle(x, y, trackWidth, 6, 0x1e2333).setOrigin(0.5);
    const fill = this.add.rectangle(x - trackWidth / 2, y, trackWidth * initial, 6, 0x35e6ff).setOrigin(0, 0.5);
    const handle = this.add.circle(x - trackWidth / 2 + trackWidth * initial, y, 11, 0xeaf6ff).setInteractive({ draggable: true, useHandCursor: true });

    this.input.setDraggable(handle);
    handle.on('drag', (pointer, dragX) => {
      const min = x - trackWidth / 2;
      const max = x + trackWidth / 2;
      const clamped = Phaser.Math.Clamp(dragX, min, max);
      handle.x = clamped;
      const pct = (clamped - min) / trackWidth;
      fill.width = trackWidth * pct;
      onChange(pct);
    });
  }

  _nameField(x, y) {
    UIKit.panel(this, x, y, 280, 44, 8);
    const text = this.add.text(x, y, GameState.playerName, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '20px', fontStyle: '700', color: '#eaf6ff'
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 280, 44).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      UIKit.inputModal(this, {
        title: 'PLAYER NAME',
        subtitle: 'Enter your fighter display name (max 14 characters):',
        value: GameState.playerName,
        maxLength: 14,
        placeholder: 'Player',
        onConfirm: (name) => {
          if (name && name.trim()) {
            GameState.playerName = name.trim().slice(0, 14);
            localStorage.setItem('typing_fighter_name', GameState.playerName);
            text.setText(GameState.playerName);
          }
        }
      });
    });
  }

  _serverSettings(x, y) {
    UIKit.subtitle(this, x, y - 28, 'MULTIPLAYER SERVER URL', 15);

    UIKit.panel(this, x, y + 15, 340, 60, 8);

    const getDisplayUrl = () => {
      const active = Net.getActiveServerUrl();
      if (active.length > 32) return active.slice(0, 29) + '...';
      return active;
    };

    this.serverUrlText = this.add.text(x, y + 6, getDisplayUrl(), {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontStyle: '700', color: '#35e6ff'
    }).setOrigin(0.5);

    this.serverStatusBadge = this.add.text(x, y + 30, 'Checking status...', {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontStyle: '600', color: '#8fa3c7'
    }).setOrigin(0.5);

    const updateStatusUI = (status, url) => {
      this.serverUrlText.setText(getDisplayUrl());
      if (status === 'connected') {
        this.serverStatusBadge.setText('● ONLINE (Connected)').setColor('#35ff9e');
      } else if (status === 'connecting') {
        this.serverStatusBadge.setText('● CONNECTING...').setColor('#ffcc33');
      } else if (status === 'error') {
        this.serverStatusBadge.setText('● OFFLINE / UNREACHABLE').setColor('#ff4d6d');
      } else {
        this.serverStatusBadge.setText('● DISCONNECTED').setColor('#8fa3c7');
      }
    };

    this._statusHandler = (status, url) => updateStatusUI(status, url);
    Net.onStatusChange(this._statusHandler);

    // Initial connection ping check
    Net.testConnection().then(res => {
      if (res.ok) {
        this.serverStatusBadge.setText(`● ONLINE (${res.latency}ms)`).setColor('#35ff9e');
      } else {
        this.serverStatusBadge.setText(`● UNREACHABLE: ${res.error}`).setColor('#ff4d6d');
      }
    });

    // Button: Set Custom Server
    UIKit.button(this, x, y + 80, 'SET SERVER URL', () => {
      const current = Net.getServerUrl() || Net.getActiveServerUrl();
      UIKit.inputModal(this, {
        title: 'MULTIPLAYER SERVER URL',
        subtitle: 'Enter backend Server URL (e.g. https://your-server.onrender.com):',
        value: current,
        placeholder: 'https://...',
        onConfirm: (input) => {
          if (input !== null && input !== undefined) {
            Net.setServerUrl(input);
            this.serverUrlText.setText(getDisplayUrl());
            this.serverStatusBadge.setText('● Connecting...').setColor('#ffcc33');
            Net.testConnection().then(res => {
              if (res.ok) {
                this.serverStatusBadge.setText(`● ONLINE (${res.latency}ms)`).setColor('#35ff9e');
              } else {
                this.serverStatusBadge.setText(`● UNREACHABLE: ${res.error}`).setColor('#ff4d6d');
              }
            });
          }
        }
      });
    }, { width: 340, height: 44, fontSize: 16 });

    // Button: Test Connection & Reset
    UIKit.button(this, x - 90, y + 135, 'TEST PING', () => {
      this.serverStatusBadge.setText('Testing ping...').setColor('#ffcc33');
      Net.testConnection().then(res => {
        if (res.ok) {
          this.serverStatusBadge.setText(`● ONLINE (${res.latency}ms)`).setColor('#35ff9e');
          if (window.AudioSystem) AudioSystem.wordComplete();
        } else {
          this.serverStatusBadge.setText(`● ERROR: ${res.error}`).setColor('#ff4d6d');
          if (window.AudioSystem) AudioSystem.keyMistake();
        }
      });
    }, { width: 150, height: 40, fontSize: 14 });

    UIKit.button(this, x + 90, y + 135, 'RESET DEFAULT', () => {
      Net.setServerUrl('');
      this.serverUrlText.setText(getDisplayUrl());
      this.serverStatusBadge.setText('Reset to default').setColor('#8fa3c7');
    }, { width: 150, height: 40, fontSize: 14 });
  }

  shutdown() {
    if (this._statusHandler) Net.offStatusChange(this._statusHandler);
    if (this.arena) this.arena.destroy();
  }
}
