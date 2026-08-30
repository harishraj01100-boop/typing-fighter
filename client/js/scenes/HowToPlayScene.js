class HowToPlayScene extends Phaser.Scene {
  constructor() { super('HowToPlayScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);

    UIKit.title(this, w / 2, h * 0.12, 'HOW TO PLAY', 40);

    const lines = [
      'A word appears on screen — type it exactly, as fast and accurately as you can.',
      'Whoever completes the word first lands the attack. Mistakes break your combo!',
      'Damage depends on your SPEED, ACCURACY, and current COMBO streak.',
      'Longer words hit harder. Special power words (FIRE, THUNDER, SHADOW...) unleash bonus damage.',
      'Reduce your opponent\'s HP to zero — or have more HP when the clock hits 0 — to win.'
    ];

    const panel = UIKit.panel(this, w / 2, h * 0.5, Math.min(760, w * 0.85), 300);
    lines.forEach((line, i) => {
      this.add.text(w / 2, h * 0.5 - 105 + i * 46, line, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '19px',
        fontStyle: '600',
        color: '#cfe0ff',
        align: 'center',
        wordWrap: { width: Math.min(700, w * 0.78) }
      }).setOrigin(0.5);
    });

    UIKit.button(this, w / 2, h - 70, 'BACK TO MENU', () => this.scene.start('MainMenuScene'));
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
