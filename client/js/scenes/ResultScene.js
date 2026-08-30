class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create() {
    const { width: w, height: h } = this.scale;
    this.arena = new Arena(this);
    const result = GameState.lastResult || { won: true, wpm: 0, accuracy: 100, maxCombo: 0, damage: 0 };

    const headline = result.draw ? 'DRAW!' : (result.won ? 'VICTORY!' : 'DEFEAT');
    const headlineColor = result.draw ? '#eaf6ff' : (result.won ? '#35e6ff' : '#ff4d6d');

    const title = UIKit.title(this, w / 2, h * 0.2, headline, 64);
    title.setColor(headlineColor);

    const subLabel = result.draw ? 'IT\'S A TIE' : (result.won ? `${(GameState.playerName || 'PLAYER 1').toUpperCase()} WINS` : `${(result.opponentName || 'OPPONENT').toUpperCase()} WINS`);
    UIKit.subtitle(this, w / 2, h * 0.2 + 50, subLabel, 20);

    UIKit.panel(this, w / 2, h * 0.5, 420, 220, 14);
    const statLines = [
      `WPM: ${result.wpm}`,
      `Accuracy: ${result.accuracy}%`,
      `Highest Combo: x${result.maxCombo}`,
      `Damage Dealt: ${result.damage}`
    ];
    statLines.forEach((line, i) => {
      this.add.text(w / 2, h * 0.5 - 70 + i * 40, line, {
        fontFamily: 'Rajdhani, sans-serif', fontSize: '22px', fontStyle: '700', color: '#cfe0ff'
      }).setOrigin(0.5);
    });

    UIKit.button(this, w / 2, h * 0.78, 'PLAY AGAIN', () => {
      if (GameState.mode === 'online') {
        Net.rematch();
        this.scene.start('WaitingScene');
      } else {
        this.scene.start('FightScene');
      }
    });

    UIKit.button(this, w / 2, h * 0.78 + 70, 'MAIN MENU', () => {
      if (GameState.mode === 'online') Net.leaveRoom();
      this.scene.start('MainMenuScene');
    }, { width: 320, height: 54, fontSize: 20 });
  }

  shutdown() {
    if (this.arena) this.arena.destroy();
  }
}
