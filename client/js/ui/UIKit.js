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
  },

  inputModal(scene, opts = {}) {
    const { width: w, height: h } = scene.scale;
    const title = opts.title || 'ENTER VALUE';
    const subtitle = opts.subtitle || '';
    let value = (opts.value !== undefined && opts.value !== null ? opts.value : '').toString();
    const maxLength = opts.maxLength || 120;
    const readOnly = !!opts.readOnly;
    const confirmText = opts.confirmText || (readOnly ? 'OK' : 'CONFIRM');
    const cancelText = opts.cancelText || 'CANCEL';
    const placeholder = opts.placeholder || '';

    // Container for all modal elements
    const modalContainer = scene.add.container(0, 0).setDepth(2000);

    // Semi-transparent backdrop that blocks underlying clicks
    const backdrop = scene.add.graphics();
    backdrop.fillStyle(0x020408, 0.85);
    backdrop.fillRect(0, 0, w, h);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    modalContainer.add(backdrop);

    // Modal Card
    const cardW = Math.min(540, w * 0.9);
    const cardH = 260;
    const cardX = w / 2;
    const cardY = h / 2;

    const cardBg = scene.add.graphics();
    cardBg.fillStyle(0x0c101c, 0.98);
    cardBg.fillRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 14);
    cardBg.lineStyle(2, UIKit.COLORS.accent, 0.9);
    cardBg.strokeRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 14);
    modalContainer.add(cardBg);

    // Title & Subtitle
    const titleText = scene.add.text(cardX, cardY - cardH / 2 + 34, title, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      fontStyle: '800',
      color: '#eaf6ff'
    }).setOrigin(0.5);
    modalContainer.add(titleText);

    if (subtitle) {
      const subText = scene.add.text(cardX, cardY - cardH / 2 + 64, subtitle, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '14px',
        fontStyle: '600',
        color: '#8fa3c7',
        align: 'center',
        wordWrap: { width: cardW - 50 }
      }).setOrigin(0.5);
      modalContainer.add(subText);
    }

    // Input Box
    const inputW = cardW - 60;
    const inputH = 46;
    const inputY = cardY + 5;
    const inputBg = scene.add.graphics();
    inputBg.fillStyle(0x06080f, 1);
    inputBg.fillRoundedRect(cardX - inputW / 2, inputY - inputH / 2, inputW, inputH, 8);
    inputBg.lineStyle(2, UIKit.COLORS.accent, 0.7);
    inputBg.strokeRoundedRect(cardX - inputW / 2, inputY - inputH / 2, inputW, inputH, 8);
    modalContainer.add(inputBg);

    const valText = scene.add.text(cardX - inputW / 2 + 14, inputY, '', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '18px',
      fontStyle: '700',
      color: '#35e6ff'
    }).setOrigin(0, 0.5);
    modalContainer.add(valText);

    const cursor = scene.add.text(cardX - inputW / 2 + 14, inputY - 1, '|', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '20px',
      color: '#35e6ff'
    }).setOrigin(0, 0.5);
    if (!readOnly) modalContainer.add(cursor);

    const cursorTween = scene.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 350,
      yoyo: true,
      repeat: -1
    });

    const updateDisplay = (newVal) => {
      value = newVal.slice(0, maxLength);
      let disp = value;
      if (!disp && placeholder && !readOnly) {
        valText.setText(placeholder).setColor('#4c5a78');
        cursor.x = cardX - inputW / 2 + 14;
        return;
      }
      valText.setColor('#35e6ff');
      valText.setText(disp);
      // If overflowing width, visually trim display
      const maxTextW = inputW - 32;
      if (valText.width > maxTextW) {
        while (valText.width > maxTextW && disp.length > 3) {
          disp = disp.slice(1);
          valText.setText('...' + disp);
        }
      }
      cursor.x = cardX - inputW / 2 + 14 + (valText.text ? valText.width + 2 : 0);
    };
    updateDisplay(value);

    // Mobile / hidden input support
    const hiddenInput = document.getElementById('hidden-typing-input');
    let onHiddenInput = null;
    if (hiddenInput && !readOnly) {
      hiddenInput.value = value;
      hiddenInput.focus({ preventScroll: true });
      onHiddenInput = () => {
        updateDisplay(hiddenInput.value);
      };
      hiddenInput.addEventListener('input', onHiddenInput);
    }

    let isClosing = false;
    const closeModal = (confirmed) => {
      if (isClosing) return;
      isClosing = true;
      cursorTween.stop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
      if (hiddenInput && onHiddenInput) {
        hiddenInput.removeEventListener('input', onHiddenInput);
        hiddenInput.blur();
      }

      scene.tweens.add({
        targets: modalContainer,
        alpha: 0,
        scale: 0.95,
        duration: 100,
        onComplete: () => {
          modalContainer.destroy();
          if (confirmed && opts.onConfirm) {
            opts.onConfirm(value);
          } else if (!confirmed && opts.onCancel) {
            opts.onCancel();
          }
        }
      });
    };

    const onKeyDown = (e) => {
      e.stopPropagation();
      if (readOnly) {
        if (e.key === 'Escape' || e.key === 'Enter') closeModal(true);
        return;
      }
      if (e.key === 'Enter') {
        closeModal(true);
      } else if (e.key === 'Escape') {
        closeModal(false);
      } else if (e.key === 'Backspace') {
        updateDisplay(value.slice(0, -1));
        if (hiddenInput) hiddenInput.value = value;
        if (window.AudioSystem) AudioSystem.keyPress();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (value.length < maxLength) {
          updateDisplay(value + e.key);
          if (hiddenInput) hiddenInput.value = value;
          if (window.AudioSystem) AudioSystem.keyPress();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const onPaste = (e) => {
      if (readOnly) return;
      e.stopPropagation();
      const paste = (e.clipboardData || window.clipboardData)?.getData('text');
      if (paste) {
        updateDisplay(value + paste.trim());
        if (hiddenInput) hiddenInput.value = value;
        if (window.AudioSystem) AudioSystem.keyPress();
      }
    };
    window.addEventListener('paste', onPaste);

    // Modal Buttons
    const btnY = cardY + cardH / 2 - 38;
    if (readOnly) {
      const okBtn = UIKit.button(scene, cardX, btnY, confirmText, () => closeModal(true), {
        width: 160, height: 38, fontSize: 15
      });
      modalContainer.add(okBtn);
    } else {
      const cancelBtn = UIKit.button(scene, cardX - 95, btnY, cancelText, () => closeModal(false), {
        width: 150, height: 38, fontSize: 15
      });
      const confirmBtn = UIKit.button(scene, cardX + 95, btnY, confirmText, () => closeModal(true), {
        width: 150, height: 38, fontSize: 15
      });
      modalContainer.add([cancelBtn, confirmBtn]);
    }

    // Interactive card to refocus hidden input on click
    const cardZone = scene.add.zone(cardX, cardY, cardW, cardH).setInteractive();
    cardZone.on('pointerdown', () => {
      if (hiddenInput && !readOnly) hiddenInput.focus({ preventScroll: true });
    });
    modalContainer.add(cardZone);

    modalContainer.setAlpha(0);
    modalContainer.setScale(0.95);
    scene.tweens.add({
      targets: modalContainer,
      alpha: 1,
      scale: 1,
      duration: 120,
      ease: 'Quad.easeOut'
    });

    return modalContainer;
  }
};
