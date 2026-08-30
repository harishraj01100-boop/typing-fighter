class ModeSelectScene extends Phaser.Scene {
  constructor() { super('ModeSelectScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);

    UIKit.title(this, w / 2, h * 0.14, 'SELECT BATTLE', 42);

    const durations = [
      { label: '2 MINUTES', seconds: 120 },
      { label: '5 MINUTES', seconds: 300 },
      { label: '10 MINUTES', seconds: 600 }
    ];

    durations.forEach((d, i) => {
      UIKit.button(this, w / 2, h * 0.32 + i * 76, d.label, () => {
        GameState.duration = d.seconds;
        this._onDurationChosen();
      });
    });

    UIKit.button(this, 110, h - 50, '< BACK', () => this.scene.start('MainMenuScene'), { width: 160, height: 46, fontSize: 16 });
  }

  _onDurationChosen() {
    if (GameState.mode === 'practice') {
      this._showDifficultyPicker();
    } else {
      this.scene.start('LobbyScene');
    }
  }

  _showDifficultyPicker() {
    const { width: w, height: h } = this.scale;
    this.children.list.slice().forEach(c => { if (c.__keep) return; });

    const overlay = UIKit.panel(this, w / 2, h / 2, 460, 340);
    const title = UIKit.subtitle(this, w / 2, h / 2 - 130, 'CHOOSE AI DIFFICULTY', 22, '#eaf6ff');

    const diffs = ['easy', 'medium', 'hard', 'expert'];
    const buttons = diffs.map((d, i) => UIKit.button(this, w / 2, h / 2 - 60 + i * 62, d.toUpperCase(), () => {
      GameState.aiDifficulty = d;
      this.scene.start('FightScene');
    }, { width: 300, height: 50, fontSize: 20 }));

    this._diffGroup = [overlay, title, ...buttons];
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
