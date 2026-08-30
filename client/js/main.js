// ============================================================
// Game bootstrap: Phaser 3 config, responsive scaling.
// ============================================================

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#05060a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 480, height: 270 },
    max: { width: 1920, height: 1080 }
  },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [
    BootScene,
    MainMenuScene,
    ModeSelectScene,
    HowToPlayScene,
    SettingsScene,
    LobbyScene,
    WaitingScene,
    FightScene,
    ResultScene
  ]
};

window.addEventListener('load', () => {
  window.game = new Phaser.Game(config);
});
