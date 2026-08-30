// ============================================================
// SoundManager: every sound is synthesized in real time with the
// Web Audio API. No external audio files, so nothing to license
// or download - keeps the game lightweight and 100% original.
// ============================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVolume = 0.35;
    this.sfxVolume = 0.6;
    this.musicNodes = [];
    this.musicPlaying = false;
    this._unlocked = false;

    const unlock = () => this._ensureContext();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  _ensureContext() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.ctx.destination);
    this._unlocked = true;
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  _tone({ freq = 440, duration = 0.15, type = 'sine', gain = 1, sweepTo = null, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 1), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  _noiseBurst({ duration = 0.12, gain = 0.5, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  // ---- SFX ----
  keyPress() { this._tone({ freq: 620 + Math.random() * 80, duration: 0.045, type: 'square', gain: 0.18 }); }
  keyMistake() { this._tone({ freq: 160, duration: 0.09, type: 'sawtooth', gain: 0.25 }); }
  wordComplete() { this._tone({ freq: 880, duration: 0.12, type: 'triangle', gain: 0.3, sweepTo: 1200 }); }
  attackLight() { this._tone({ freq: 300, duration: 0.14, type: 'square', gain: 0.35, sweepTo: 120 }); this._noiseBurst({ duration: 0.08, gain: 0.25 }); }
  attackHeavy() { this._tone({ freq: 220, duration: 0.25, type: 'sawtooth', gain: 0.4, sweepTo: 60 }); this._noiseBurst({ duration: 0.18, gain: 0.4 }); }
  criticalHit() {
    this._tone({ freq: 500, duration: 0.3, type: 'square', gain: 0.4, sweepTo: 900 });
    this._tone({ freq: 250, duration: 0.3, type: 'sawtooth', gain: 0.35, sweepTo: 50, delay: 0.04 });
    this._noiseBurst({ duration: 0.2, gain: 0.5, delay: 0.02 });
  }
  hitReceived() { this._noiseBurst({ duration: 0.15, gain: 0.45 }); this._tone({ freq: 140, duration: 0.15, type: 'sine', gain: 0.3, sweepTo: 60 }); }
  comboUp() { this._tone({ freq: 700 + Math.random() * 200, duration: 0.1, type: 'triangle', gain: 0.3, sweepTo: 1400 }); }
  countdownBeep() { this._tone({ freq: 440, duration: 0.2, type: 'sine', gain: 0.4 }); }
  fightShout() { this._tone({ freq: 200, duration: 0.4, type: 'sawtooth', gain: 0.5, sweepTo: 500 }); }
  victory() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone({ freq: f, duration: 0.3, type: 'triangle', gain: 0.35, delay: i * 0.14 }));
  }
  defeat() {
    [400, 340, 260, 180].forEach((f, i) => this._tone({ freq: f, duration: 0.35, type: 'sawtooth', gain: 0.3, delay: i * 0.15 }));
  }
  menuClick() { this._tone({ freq: 500, duration: 0.08, type: 'sine', gain: 0.25, sweepTo: 700 }); }
  menuHover() { this._tone({ freq: 350, duration: 0.04, type: 'sine', gain: 0.12 }); }

  // ---- Ambient background music: a slow evolving pad loop ----
  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    const notes = [110, 130.81, 146.83, 174.61]; // A2, C3, D3, F3 - dark minor tone
    const playPad = () => {
      if (!this.musicPlaying) return;
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.5);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + 6);
      const timeout = setTimeout(playPad, 2800 + Math.random() * 1200);
      this.musicNodes.push(timeout);
    };
    playPad();
  }

  stopMusic() {
    this.musicPlaying = false;
    this.musicNodes.forEach(clearTimeout);
    this.musicNodes = [];
  }
}

const AudioSystem = new SoundManager();
