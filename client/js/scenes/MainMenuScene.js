class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);

    UIKit.title(this, w / 2, h * 0.22, 'TYPING FIGHTER', 62);
    UIKit.subtitle(this, w / 2, h * 0.22 + 46, 'TYPE FAST. TYPE TRUE. STRIKE FIRST.', 18);

    const startY = h * 0.45;
    const gap = 76;

    UIKit.button(this, w / 2, startY, 'PLAY ONLINE', () => {
      GameState.mode = 'online';
      this.scene.start('ModeSelectScene');
    });

    UIKit.button(this, w / 2, startY + gap, 'PRACTICE', () => {
      GameState.mode = 'practice';
      this.scene.start('ModeSelectScene');
    });

    UIKit.button(this, w / 2, startY + gap * 2, 'HOW TO PLAY', () => {
      this.scene.start('HowToPlayScene');
    });

    UIKit.button(this, w / 2, startY + gap * 3, 'SETTINGS', () => {
      this.scene.start('SettingsScene');
    });

    UIKit.subtitle(this, w / 2, h - 24, 'v1.0 — an original fan-made competitive typing arena', 13, '#4c5a78');

    AudioSystem.startMusic();
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
