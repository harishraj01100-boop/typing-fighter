// ============================================================
// EffectsManager: centralizes all "juice" - hit sparks, screen
// shake, floating damage numbers, combo pop, impact flashes.
// Kept intentionally restrained so the typing word/input stays
// perfectly readable at all times.
// ============================================================

class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    if (!scene.textures.exists('__spark')) {
      const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('__spark', 8, 8);
      gfx.destroy();
    }
  }

  screenShake(intensity = 0.006, duration = 140) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  impactFlash(x, y, color = 0xffffff) {
    const flash = this.scene.add.circle(x, y, 6, color, 0.9);
    this.scene.tweens.add({
      targets: flash,
      radius: 60,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onUpdate: () => flash.setRadius(flash.radius),
      onComplete: () => flash.destroy()
    });
  }

  hitSparks(x, y, color = 0x35e6ff, count = 14) {
    const emitter = this.scene.add.particles(x, y, '__spark', {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: { min: 200, max: 420 },
      tint: color,
      quantity: count,
      emitting: false
    });
    emitter.explode(count);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  attackTrail(fromX, fromY, toX, toY, color = 0x35e6ff) {
    const line = this.scene.add.line(0, 0, fromX, fromY, toX, toY, color, 0.7);
    line.setLineWidth(4);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 180,
      onComplete: () => line.destroy()
    });
  }

  floatingDamage(x, y, damage, { critical = false, isSpecial = false } = {}) {
    const color = critical ? '#ffcc33' : (isSpecial ? '#c77bff' : '#ff4d6d');
    const fontSize = critical ? 40 : 30;
    const text = this.scene.add.text(x, y, `-${damage}`, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: '900',
      color,
      stroke: '#0a0a12',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });

    if (critical) {
      const label = this.scene.add.text(x, y - 30, 'CRITICAL!', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        fontStyle: '900',
        color: '#ffcc33',
        stroke: '#3a1a00',
        strokeThickness: 4
      }).setOrigin(0.5).setScale(0.5);
      this.scene.tweens.add({
        targets: label,
        scale: 1,
        y: y - 60,
        alpha: 0,
        duration: 650,
        ease: 'Back.easeOut',
        onComplete: () => label.destroy()
      });
    }
  }

  comboPop(x, y, combo) {
    if (combo < 2) return;
    const text = this.scene.add.text(x, y, `COMBO x${combo}`, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '26px',
      fontStyle: '900',
      color: '#35e6ff',
      stroke: '#001018',
      strokeThickness: 5
    }).setOrigin(0.5).setScale(0.6).setAlpha(0);

    this.scene.tweens.add({
      targets: text,
      scale: 1.15,
      alpha: 1,
      duration: 160,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          y: y - 30,
          alpha: 0,
          delay: 350,
          duration: 400,
          onComplete: () => text.destroy()
        });
      }
    });
  }

  specialBurst(x, y, color = 0xc77bff) {
    const ring = this.scene.add.circle(x, y, 10, color, 0);
    ring.setStrokeStyle(4, color, 1);
    this.scene.tweens.add({
      targets: ring,
      radius: 90,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onUpdate: () => ring.setRadius(ring.radius),
      onComplete: () => ring.destroy()
    });
    this.hitSparks(x, y, color, 22);
  }
}
