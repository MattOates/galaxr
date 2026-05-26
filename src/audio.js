/**
 * AudioManager — synthesised sound effects using Web Audio API.
 * No asset files needed; all sounds are procedurally generated.
 */
export class AudioManager {
  constructor() {
    this._ctx   = null;
    this._ready = false;
    this._gainMaster = null;

    // Lazy-initialise AudioContext on first user gesture
    this._init();
  }

  _init() {
    try {
      this._ctx         = new (window.AudioContext || window.webkitAudioContext)();
      this._gainMaster  = this._ctx.createGain();
      this._gainMaster.gain.value = 0.5;
      this._gainMaster.connect(this._ctx.destination);
      this._ready = true;
    } catch (_) {
      // Audio not available
    }
  }

  _resume() {
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
  }

  // ─── Helper: play a tone burst ─────────────────────────────────────────────
  _tone({ freq = 440, type = 'square', duration = 0.15, gain = 0.3,
          freqEnd = null, gainEnd = 0, attack = 0.01, delay = 0 } = {}) {
    if (!this._ready) return;
    this._resume();

    const t   = this._ctx.currentTime + delay;
    const osc = this._ctx.createOscillator();
    const g   = this._ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), t + duration);

    osc.connect(g);
    g.connect(this._gainMaster);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  _noise({ duration = 0.1, gain = 0.2, gainEnd = 0, attack = 0.002, delay = 0,
           lowpass = 4000 } = {}) {
    if (!this._ready) return;
    this._resume();

    const t   = this._ctx.currentTime + delay;
    const buf = this._ctx.createBuffer(1, this._ctx.sampleRate * duration, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = this._ctx.createBufferSource();
    src.buffer = buf;

    const filt = this._ctx.createBiquadFilter();
    filt.type            = 'lowpass';
    filt.frequency.value = lowpass;

    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), t + duration);

    src.connect(filt);
    filt.connect(g);
    g.connect(this._gainMaster);
    src.start(t);
  }

  // ─── Sound effects ──────────────────────────────────────────────────────────
  playShoot(mode = 'SINGLE') {
    switch (mode) {
      case 'SINGLE':
        this._tone({ freq: 1200, freqEnd: 400, type: 'sawtooth', duration: 0.08, gain: 0.18, gainEnd: 0 });
        break;
      case 'DUAL':
        this._tone({ freq: 1400, freqEnd: 500, type: 'sawtooth', duration: 0.08, gain: 0.12 });
        this._tone({ freq: 1200, freqEnd: 400, type: 'sawtooth', duration: 0.08, gain: 0.12, delay: 0.02 });
        break;
      case 'RAPID':
        this._tone({ freq: 2000, freqEnd: 800, type: 'square', duration: 0.05, gain: 0.15 });
        break;
      case 'SPREAD':
        this._tone({ freq: 900,  freqEnd: 300, type: 'sawtooth', duration: 0.1, gain: 0.1 });
        this._tone({ freq: 1100, freqEnd: 400, type: 'sawtooth', duration: 0.1, gain: 0.1, delay: 0.01 });
        this._tone({ freq: 700,  freqEnd: 250, type: 'sawtooth', duration: 0.1, gain: 0.1, delay: 0.02 });
        break;
      case 'MISSILE':
        this._noise({ duration: 0.25, gain: 0.3, gainEnd: 0.1, lowpass: 2000 });
        this._tone({ freq: 300, freqEnd: 600, type: 'sawtooth', duration: 0.25, gain: 0.15 });
        break;
    }
  }

  playExplosion() {
    this._noise({ duration: 0.4, gain: 0.5, gainEnd: 0, attack: 0.005, lowpass: 1500 });
    this._tone({ freq: 120, freqEnd: 30, type: 'sine', duration: 0.4, gain: 0.3, gainEnd: 0 });
  }

  playHit() {
    this._noise({ duration: 0.12, gain: 0.25, gainEnd: 0, lowpass: 3000 });
  }

  playDamage() {
    this._noise({ duration: 0.3, gain: 0.6, gainEnd: 0, attack: 0.005, lowpass: 800 });
    this._tone({ freq: 80, freqEnd: 40, type: 'sawtooth', duration: 0.3, gain: 0.4 });
  }

  playPowerUp() {
    [0, 0.05, 0.1, 0.15, 0.2].forEach((delay, i) => {
      this._tone({
        freq: 440 * Math.pow(1.5, i),
        type: 'sine',
        duration: 0.15,
        gain: 0.25,
        delay,
      });
    });
  }

  playWaveStart() {
    [0, 0.12, 0.24].forEach((delay, i) => {
      this._tone({
        freq: 220 * Math.pow(2, i),
        type: 'square',
        duration: 0.18,
        gain: 0.2,
        delay,
      });
    });
  }

  playGameOver() {
    [440, 330, 220, 110].forEach((freq, i) => {
      this._tone({
        freq,
        type: 'sawtooth',
        duration: 0.3,
        gain: 0.3,
        freqEnd: freq * 0.5,
        delay: i * 0.25,
      });
    });
  }
}
