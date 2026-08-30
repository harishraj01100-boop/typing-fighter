// ============================================================
// Fighter: an original, entirely procedurally-drawn shadow-style
// silhouette fighter (no external art assets, no copied designs).
// Built from layered Graphics shapes inside a Container so limbs
// can be tweened independently for punches, kicks and reactions.
//
// Two distinct silhouettes:
//   'ronin'  - lean, angular, twin blade-like forearm fins   (Player 1, cyan rim light)
//   'brute'  - broad-shouldered, heavier stance, spiked pauldron (Player 2, crimson rim light)
// ============================================================

class Fighter {
  constructor(scene, x, y, facing = 1, archetype = 'ronin', rimColor = 0x35e6ff) {
    this.scene = scene;
    this.facing = facing; // 1 = faces right, -1 = faces left
    this.archetype = archetype;
    this.rimColor = rimColor;
    this.baseX = x;
    this.baseY = y;

    this.container = scene.add.container(x, y);
    this.container.setScale(facing, 1);

    this.parts = {};
    this._buildBody();
    this._idleTween = null;
    this.isKO = false;

    this.playIdle();
  }

  _limbColor() { return 0x0b0d14; }

  _buildBody() {
    const c = this.container;
    const isBrute = this.archetype === 'brute';

    const bodyColor = 0x090b10;
    const rim = this.rimColor;

    // Back leg
    this.parts.backLeg = this.scene.add.graphics();
    this._drawLimb(this.parts.backLeg, isBrute ? 16 : 12, 70, bodyColor, rim);
    this.parts.backLeg.setPosition(-10, 10);
    c.add(this.parts.backLeg);

    // Front leg
    this.parts.frontLeg = this.scene.add.graphics();
    this._drawLimb(this.parts.frontLeg, isBrute ? 18 : 13, 74, bodyColor, rim);
    this.parts.frontLeg.setPosition(14, 12);
    c.add(this.parts.frontLeg);

    // Torso (container so it can lean/twist)
    this.parts.torso = this.scene.add.container(0, -30);
    c.add(this.parts.torso);

    const torsoG = this.scene.add.graphics();
    const torsoW = isBrute ? 46 : 34;
    const torsoH = isBrute ? 62 : 56;
    torsoG.fillStyle(bodyColor, 1);
    torsoG.fillRoundedRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH, 14);
    torsoG.lineStyle(2, rim, 0.85);
    torsoG.strokeRoundedRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH, 14);
    this.parts.torso.add(torsoG);
    this.parts.torsoGraphic = torsoG;

    // Shoulder spikes for the brute archetype
    if (isBrute) {
      const spikes = this.scene.add.graphics();
      spikes.fillStyle(bodyColor, 1);
      spikes.lineStyle(2, rim, 0.9);
      [[-torsoW/2-4,-torsoH/2+4],[torsoW/2+4,-torsoH/2+4]].forEach(([sx,sy])=>{
        spikes.beginPath();
        spikes.moveTo(sx, sy);
        spikes.lineTo(sx + (sx<0?-14:14), sy - 6);
        spikes.lineTo(sx, sy + 14);
        spikes.closePath();
        spikes.fillPath();
        spikes.strokePath();
      });
      this.parts.torso.add(spikes);
    }

    // Head
    this.parts.head = this.scene.add.container(0, -torsoH / 2 - 16);
    this.parts.torso.add(this.parts.head);
    const headG = this.scene.add.graphics();
    headG.fillStyle(bodyColor, 1);
    if (isBrute) {
      headG.fillRoundedRect(-15, -16, 30, 32, 8);
    } else {
      headG.fillEllipse(0, 0, 26, 32);
    }
    headG.lineStyle(2, rim, 0.9);
    if (isBrute) headG.strokeRoundedRect(-15, -16, 30, 32, 8);
    else headG.strokeEllipse(0, 0, 26, 32);
    // Glowing eye slit(s) - the only "face" detail, keeps it stylized/shadow-like
    headG.fillStyle(rim, 1);
    if (isBrute) {
      headG.fillRect(-10, -2, 20, 3);
    } else {
      headG.fillEllipse(6, -2, 5, 3);
    }
    this.parts.head.add(headG);
    this.parts.headGlow = headG;

    // Back arm
    this.parts.backArm = this.scene.add.container(-torsoW / 2 + 2, -torsoH / 2 + 10);
    this.parts.torso.add(this.parts.backArm);
    this._drawArm(this.parts.backArm, isBrute ? 15 : 10, isBrute ? 46 : 40, bodyColor, rim, isBrute);

    // Front arm
    this.parts.frontArm = this.scene.add.container(torsoW / 2 - 2, -torsoH / 2 + 10);
    this.parts.torso.add(this.parts.frontArm);
    this._drawArm(this.parts.frontArm, isBrute ? 16 : 11, isBrute ? 48 : 42, bodyColor, rim, isBrute);

    // Ambient rim glow aura beneath the character for atmosphere
    this.parts.groundGlow = this.scene.add.ellipse(0, 44, isBrute ? 90 : 76, 18, rim, 0.12);
    c.addAt(this.parts.groundGlow, 0);

    // Store default rotations for reset
    this._defaults = {
      torsoRot: 0, headRot: 0,
      backArmRot: isBrute ? 0.2 : 0.15, frontArmRot: isBrute ? -0.3 : -0.25,
      backLegRot: 0.08, frontLegRot: -0.1
    };
    this.parts.torso.rotation = this._defaults.torsoRot;
    this.parts.backArm.rotation = this._defaults.backArmRot;
    this.parts.frontArm.rotation = this._defaults.frontArmRot;
    this.parts.backLeg.rotation = this._defaults.backLegRot;
    this.parts.frontLeg.rotation = this._defaults.frontLegRot;
  }

  _drawLimb(g, width, length, color, rim) {
    g.fillStyle(color, 1);
    g.fillRoundedRect(-width / 2, 0, width, length, width / 2);
    g.lineStyle(1.5, rim, 0.5);
    g.strokeRoundedRect(-width / 2, 0, width, length, width / 2);
  }

  _drawArm(container, width, length, color, rim, isBrute) {
    const g = this.scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-width / 2, 0, width, length, width / 2);
    g.lineStyle(1.5, rim, 0.6);
    g.strokeRoundedRect(-width / 2, 0, width, length, width / 2);

    // Blade-like forearm fin for the ronin archetype (purely stylistic silhouette detail)
    if (!isBrute) {
      g.fillStyle(rim, 0.55);
      g.beginPath();
      g.moveTo(width / 2, length * 0.5);
      g.lineTo(width / 2 + 10, length * 0.62);
      g.lineTo(width / 2, length * 0.78);
      g.closePath();
      g.fillPath();
    } else {
      // Knuckle guard block for the brute archetype
      g.fillStyle(rim, 0.5);
      g.fillRoundedRect(-width / 2 - 2, length - 8, width + 4, 12, 4);
    }
    container.add(g);
    container.__graphic = g;
  }

  // ---------------- ANIMATIONS ----------------

  playIdle() {
    if (this.isKO) return;
    this._killIdle();
    const t = this.parts.torso;
    this._idleTween = this.scene.tweens.add({
      targets: t,
      y: -32,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.scene.tweens.add({
      targets: [this.parts.backArm, this.parts.frontArm],
      rotation: '+=0.04',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  playTypingReady() {
    if (this.isKO) return;
    this._killIdle();
    // Slight forward lean + faster micro-shift = "focused, ready to strike"
    this.scene.tweens.add({
      targets: this.parts.torso,
      rotation: this.facing >= 0 ? 0.05 : -0.05,
      duration: 220,
      ease: 'Quad.easeOut'
    });
    this.scene.tweens.add({
      targets: this.parts.frontArm,
      rotation: this._defaults.frontArmRot - 0.15,
      duration: 220
    });
  }

  playAttack(lengthCategory = 'medium', isSpecial = false, onImpact = null) {
    if (this.isKO) return;
    this._killIdle();
    const arm = this.parts.frontArm;
    const torso = this.parts.torso;

    const power = { short: 0.9, medium: 1.15, long: 1.4 }[lengthCategory] || 1.1;
    const duration = { short: 90, medium: 130, long: 170 }[lengthCategory] || 120;

    const tl = this.scene.tweens.chain ? null : null; // (Phaser 3.70 timeline via sequential tweens)

    // Wind-up
    this.scene.tweens.add({
      targets: arm,
      rotation: this._defaults.frontArmRot + 0.6 * power,
      x: '+=0',
      duration: duration * 0.5,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Strike
        this.scene.tweens.add({
          targets: [this.container],
          x: this.baseX + this.facing * 18 * power,
          duration: duration * 0.4,
          ease: 'Quad.easeOut',
          yoyo: true,
          hold: 40,
          onYoyo: () => { if (onImpact) onImpact(); },
          onComplete: () => { this.container.x = this.baseX; }
        });
        this.scene.tweens.add({
          targets: arm,
          rotation: this._defaults.frontArmRot - 1.1 * power,
          duration: duration * 0.35,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: arm,
              rotation: this._defaults.frontArmRot,
              duration: 220,
              ease: 'Back.easeOut',
              onComplete: () => this.playIdle()
            });
          }
        });
      }
    });

    if (isSpecial) {
      this.scene.tweens.add({
        targets: torso,
        scaleX: 1.08, scaleY: 1.08,
        duration: 150, yoyo: true
      });
    }
  }

  playHitReaction(critical = false) {
    this._killIdle();
    const knockback = critical ? 26 : 14;
    this.scene.tweens.add({
      targets: this.container,
      x: this.baseX - this.facing * knockback,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => { this.container.x = this.baseX; this.playIdle(); }
    });
    this.scene.tweens.add({
      targets: this.parts.torso,
      rotation: (this.facing >= 0 ? -1 : 1) * (critical ? 0.3 : 0.16),
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    // Quick red damage flash tint
    this._flashDamage();
  }

  _flashDamage() {
    const graphic = this.parts.torsoGraphic;
    const original = 0x090b10;
    graphic.clear();
    const isBrute = this.archetype === 'brute';
    const torsoW = isBrute ? 46 : 34;
    const torsoH = isBrute ? 62 : 56;
    graphic.fillStyle(0xff3355, 1);
    graphic.fillRoundedRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH, 14);
    graphic.lineStyle(2, this.rimColor, 0.85);
    graphic.strokeRoundedRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH, 14);
    this.scene.time.delayedCall(110, () => {
      graphic.clear();
      graphic.fillStyle(original, 1);
      graphic.fillRoundedRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH, 14);
      graphic.lineStyle(2, this.rimColor, 0.85);
      graphic.strokeRoundedRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH, 14);
    });
  }

  playVictory() {
    this._killIdle();
    this.scene.tweens.add({
      targets: this.parts.backArm,
      rotation: -1.4,
      duration: 300,
      ease: 'Back.easeOut'
    });
    this.scene.tweens.add({
      targets: this.parts.frontArm,
      rotation: -2.0,
      duration: 300,
      ease: 'Back.easeOut'
    });
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 10,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  playDefeat() {
    this.isKO = true;
    this._killIdle();
    this.scene.tweens.add({
      targets: this.container,
      rotation: (this.facing >= 0 ? 1 : -1) * 1.4,
      y: this.container.y + 20,
      alpha: 0.55,
      duration: 600,
      ease: 'Back.easeIn'
    });
  }

  _killIdle() {
    this.scene.tweens.killTweensOf(this.parts.torso);
    this.scene.tweens.killTweensOf([this.parts.backArm, this.parts.frontArm]);
  }

  destroy() {
    this.container.destroy();
  }
}
