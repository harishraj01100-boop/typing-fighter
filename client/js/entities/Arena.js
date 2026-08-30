// ============================================================
// Arena: an original dark, atmospheric rooftop/temple-inspired
// battle backdrop built entirely from Phaser Graphics/shapes with
// parallax depth layers, drifting particles and dynamic lighting.
// No external image assets required.
// ============================================================

class Arena {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.w = width;
    this.h = height;
    this.layers = [];
    this._build();
  }

  _build() {
    const s = this.scene;

    // Sky gradient
    const sky = s.add.graphics();
    sky.fillGradientStyle(0x0a0e1c, 0x0a0e1c, 0x1a1030, 0x120a1e, 1);
    sky.fillRect(0, 0, this.w, this.h);
    this.layers.push(sky);

    // Moon / glow orb
    const moon = s.add.circle(this.w * 0.78, this.h * 0.18, 46, 0x9fb8ff, 0.18);
    const moonCore = s.add.circle(this.w * 0.78, this.h * 0.18, 26, 0xdfe8ff, 0.5);
    this.layers.push(moon, moonCore);

    // Far mountains / skyline silhouette (slow parallax)
    this.farSkyline = this._skyline(0x120f1e, this.h * 0.62, 0.35, 60);
    // Mid rooftops
    this.midSkyline = this._skyline(0x0c0a16, this.h * 0.72, 0.55, 90);

    // Temple pillars flanking the arena for depth/framing
    this._pillar(this.w * 0.06, this.h);
    this._pillar(this.w * 0.94, this.h);

    // Ground platform
    const ground = s.add.graphics();
    ground.fillStyle(0x08060c, 1);
    ground.fillRect(0, this.h * 0.82, this.w, this.h * 0.18);
    ground.lineStyle(2, 0x35e6ff, 0.15);
    ground.lineBetween(0, this.h * 0.82, this.w, this.h * 0.82);
    this.layers.push(ground);

    // Floating ambient particles (dust / embers)
    this._buildParticles();

    // Subtle fog band for depth
    const fog = s.add.rectangle(this.w / 2, this.h * 0.76, this.w, 40, 0x1a1030, 0.25);
    this.layers.push(fog);
  }

  _skyline(color, baseY, alpha, jag) {
    const g = this.scene.add.graphics();
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(0, this.h);
    let x = 0;
    let y = baseY;
    g.lineTo(0, y);
    while (x < this.w) {
      x += 40 + Math.random() * 60;
      y = baseY - Math.random() * jag;
      g.lineTo(Math.min(x, this.w), y);
    }
    g.lineTo(this.w, this.h);
    g.closePath();
    g.fillPath();
    this.layers.push(g);
    return g;
  }

  _pillar(x, h) {
    const g = this.scene.add.graphics();
    g.fillStyle(0x0a0812, 0.9);
    g.fillRect(x - 14, h * 0.25, 28, h * 0.6);
    g.fillStyle(0x0a0812, 0.9);
    g.fillRect(x - 22, h * 0.22, 44, 14);
    g.lineStyle(1.5, 0x35e6ff, 0.12);
    g.strokeRect(x - 14, h * 0.25, 28, h * 0.6);
    this.layers.push(g);
  }

  _buildParticles() {
    const particles = this.scene.add.particles(0, 0, undefined, {});
    // Phaser 3.70 needs a texture; generate a tiny glow dot texture once
    if (!this.scene.textures.exists('__spark')) {
      const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('__spark', 8, 8);
      gfx.destroy();
    }
    this.ambientEmitter = this.scene.add.particles(0, 0, '__spark', {
      x: { min: 0, max: this.w },
      y: { min: 0, max: this.h * 0.8 },
      lifespan: { min: 4000, max: 9000 },
      speedY: { min: -6, max: -18 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.35, end: 0 },
      tint: [0x35e6ff, 0x8a5cff, 0xffffff],
      frequency: 220,
      quantity: 1
    });
  }

  destroy() {
    this.layers.forEach(l => l.destroy());
    if (this.ambientEmitter) this.ambientEmitter.destroy();
  }
}
