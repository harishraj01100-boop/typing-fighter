class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);

    UIKit.title(this, w / 2, h * 0.16, 'SETTINGS', 40);

    this._slider(w / 2, h * 0.38, 'MUSIC VOLUME', GameState.musicVolume, (v) => {
      GameState.musicVolume = v;
      AudioSystem.setMusicVolume(v);
    });

    this._slider(w / 2, h * 0.52, 'SFX VOLUME', GameState.sfxVolume, (v) => {
      GameState.sfxVolume = v;
      AudioSystem.setSfxVolume(v);
      AudioSystem.menuHover();
    });

    UIKit.subtitle(this, w / 2, h * 0.66, 'YOUR NAME', 16);
    this._nameField(w / 2, h * 0.72);

    UIKit.button(this, w / 2, h - 70, 'BACK TO MENU', () => this.scene.start('MainMenuScene'));
  }

  _slider(x, y, label, initial, onChange) {
    UIKit.subtitle(this, x, y - 34, label, 16);
    const trackWidth = 320;
    const track = this.add.rectangle(x, y, trackWidth, 6, 0x1e2333).setOrigin(0.5);
    const fill = this.add.rectangle(x - trackWidth / 2, y, trackWidth * initial, 6, 0x35e6ff).setOrigin(0, 0.5);
    const handle = this.add.circle(x - trackWidth / 2 + trackWidth * initial, y, 12, 0xeaf6ff).setInteractive({ draggable: true, useHandCursor: true });

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
    const box = UIKit.panel(this, x, y, 260, 44, 8);
    const text = this.add.text(x, y, GameState.playerName, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '20px', fontStyle: '700', color: '#eaf6ff'
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 260, 44).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      const name = prompt('Enter your name (max 12 chars):', GameState.playerName);
      if (name && name.trim()) {
        GameState.playerName = name.trim().slice(0, 12);
        text.setText(GameState.playerName);
      }
    });
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
