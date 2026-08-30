// ============================================================
// UIKit: small helpers so every menu shares the same polished,
// modern look without repeating layout code in every scene.
// ============================================================

const UIKit = {
  COLORS: {
    accent: 0x35e6ff,
    accent2: 0xc77bff,
    danger: 0xff4d6d,
    panel: 0x0c0e16,
    panelLine: 0x1e2333
  },

  title(scene, x, y, text, size = 56) {
    return scene.add.text(x, y, text, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: `${size}px`,
      fontStyle: '900',
      color: '#eaf6ff',
      stroke: '#001018',
      strokeThickness: 6
    }).setOrigin(0.5);
  },

  subtitle(scene, x, y, text, size = 18, color = '#8fa3c7') {
    return scene.add.text(x, y, text, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: `${size}px`,
      fontStyle: '600',
      color
    }).setOrigin(0.5);
  },

  button(scene, x, y, label, onClick, opts = {}) {
    const width = opts.width || 320;
    const height = opts.height || 62;
    const fontSize = opts.fontSize || 24;

    const container = scene.add.container(x, y);
    const bg = scene.add.graphics();
    const drawBg = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x162034 : 0x0c101c, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      bg.lineStyle(2, hover ? UIKit.COLORS.accent : UIKit.COLORS.panelLine, hover ? 1 : 0.8);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    };
    drawBg(false);

    const text = scene.add.text(0, 0, label, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: '700',
      color: '#eaf6ff'
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => { drawBg(true); text.setColor('#35e6ff'); if (window.AudioSystem) AudioSystem.menuHover(); scene.tweens.add({ targets: container, scale: 1.03, duration: 100 }); });
    container.on('pointerout', () => { drawBg(false); text.setColor('#eaf6ff'); scene.tweens.add({ targets: container, scale: 1, duration: 100 }); });
    container.on('pointerdown', () => { scene.tweens.add({ targets: container, scale: 0.97, duration: 60, yoyo: true }); if (window.AudioSystem) AudioSystem.menuClick(); if (onClick) onClick(); });

    return container;
  },

  panel(scene, x, y, width, height, radius = 16) {
    const g = scene.add.graphics();
    g.fillStyle(UIKit.COLORS.panel, 0.92);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
    g.lineStyle(2, UIKit.COLORS.panelLine, 1);
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius);
    return g;
  },

  hpBar(scene, x, y, width, height, alignRight = false) {
    const bg = scene.add.graphics();
    bg.fillStyle(0x11141f, 1);
    bg.fillRoundedRect(x, y, width, height, 6);
    bg.lineStyle(2, 0x1e2333, 1);
    bg.strokeRoundedRect(x, y, width, height, 6);

    const fill = scene.add.graphics();

    const draw = (pct) => {
      fill.clear();
      pct = Phaser.Math.Clamp(pct, 0, 1);
      const w = Math.max(0, (width - 6) * pct);
      const color = pct > 0.5 ? 0x35e6ff : (pct > 0.25 ? 0xffcc33 : 0xff4d6d);
      if (w > 0) {
        if (alignRight) {
          fill.fillStyle(color, 1);
          fill.fillRoundedRect(x + width - 3 - w, y + 3, w, height - 6, 4);
        } else {
          fill.fillStyle(color, 1);
          fill.fillRoundedRect(x + 3, y + 3, w, height - 6, 4);
        }
      }
    };
    draw(1);
    return { bg, fill, draw };
  }
};
