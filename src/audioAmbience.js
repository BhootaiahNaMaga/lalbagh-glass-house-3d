/**
 * Pure Web Audio API garden soundscape (muted by default; starts on user toggle).
 * Features gentle tropical breeze, fountain trickle weighted by listener distance,
 * and subtle Bangalore morning birdsong / evening cricket chirps.
 */
export class GardenAudioAmbience {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.breezeGain = null;
    this.fountainGain = null;
    this.enabled = false;
    this.timeMode = 'morning';
    this.chirpTimer = 0;
  }

  _initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0;
    this.masterGain.connect(this.ctx.destination);

    // Pink-ish noise buffer (3 seconds looping)
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    // Breeze bed
    const breezeSrc = this.ctx.createBufferSource();
    breezeSrc.buffer = buffer;
    breezeSrc.loop = true;
    const breezeFilter = this.ctx.createBiquadFilter();
    breezeFilter.type = 'bandpass';
    breezeFilter.frequency.value = 420;
    breezeFilter.Q.value = 0.7;
    this.breezeGain = this.ctx.createGain();
    this.breezeGain.gain.value = 0.14;
    breezeSrc.connect(breezeFilter).connect(this.breezeGain).connect(this.masterGain);
    breezeSrc.start();

    // Fountain trickle bed
    const fountainSrc = this.ctx.createBufferSource();
    fountainSrc.buffer = buffer;
    fountainSrc.loop = true;
    const fountainFilter = this.ctx.createBiquadFilter();
    fountainFilter.type = 'bandpass';
    fountainFilter.frequency.value = 1850;
    fountainFilter.Q.value = 0.9;
    this.fountainGain = this.ctx.createGain();
    this.fountainGain.gain.value = 0.09;
    fountainSrc.connect(fountainFilter).connect(this.fountainGain).connect(this.masterGain);
    fountainSrc.start();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this._initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.45, this.ctx.currentTime, 0.35);
      }
    } else if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.25);
    }
  }

  setTimeMode(mode) {
    this.timeMode = mode;
  }

  _playBirdChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const baseFreq = 2200 + Math.random() * 1400;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.2 + Math.random() * 0.25), now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  _playCricketChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(4100 + Math.random() * 350, now);

    gain.gain.setValueAtTime(0.0001, now);
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.055;
      gain.gain.linearRampToValueAtTime(0.018, t + 0.015);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.045);
    }

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  update(dt, cameraPos) {
    if (!this.enabled || !this.ctx || !this.fountainGain) return;

    // Fountain proximity attenuation (fountain centered at (0, 0, 34))
    const dx = cameraPos.x;
    const dz = cameraPos.z - 34;
    const dist = Math.hypot(dx, dz);
    const insideGlassHouse = Math.abs(cameraPos.x) < 24 && Math.abs(cameraPos.z) < 21;
    const prox = Math.max(0.03, Math.min(0.28, 3.2 / (dist + 8))) * (insideGlassHouse ? 0.35 : 1.0);
    this.fountainGain.gain.setTargetAtTime(prox, this.ctx.currentTime, 0.2);

    this.chirpTimer -= dt;
    if (this.chirpTimer <= 0) {
      if (this.timeMode === 'night') {
        this._playCricketChirp();
        this.chirpTimer = 1.8 + Math.random() * 2.5;
      } else {
        this._playBirdChirp();
        this.chirpTimer = 1.4 + Math.random() * 3.0;
      }
    }
  }
}
