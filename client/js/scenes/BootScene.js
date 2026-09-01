class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    // Shared tiny glow-dot texture used by all particle effects
    if (!this.textures.exists('__spark')) {
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('__spark', 8, 8);
      gfx.destroy();
    }

    // Wake up sleeping cloud server early in background
    if (typeof Net !== 'undefined' && Net.wakeUpServer) {
      Net.wakeUpServer();
    }

    this.scene.start('MainMenuScene');
  }
}
