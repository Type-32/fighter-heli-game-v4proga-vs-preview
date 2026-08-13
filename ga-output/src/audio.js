export class AudioFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startRotor();
  }

  startRotor() {
    const c = this.ctx;
    this.rotorFilter = c.createBiquadFilter();
    this.rotorFilter.type = 'lowpass';
    this.rotorFilter.frequency.value = 380;
    this.rotorGain = c.createGain();
    this.rotorGain.gain.value = 0;
    this.rotorFilter.connect(this.rotorGain);
    this.rotorGain.connect(this.master);
    this.rotorOsc = c.createOscillator();
    this.rotorOsc.type = 'sawtooth';
    this.rotorOsc.frequency.value = 26;
    this.rotorOsc2 = c.createOscillator();
    this.rotorOsc2.type = 'sawtooth';
    this.rotorOsc2.frequency.value = 38;
    this.rotorOsc2.detune.value = 8;
    this.rotorOsc.connect(this.rotorFilter);
    this.rotorOsc2.connect(this.rotorFilter);
    this.lfo = c.createOscillator();
    this.lfo.frequency.value = 2.6;
    this.lfoGain = c.createGain();
    this.lfoGain.gain.value = 0.02;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.rotorGain.gain);

    this.engineFilter = c.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 600;
    this.engineGain = c.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc = c.createOscillator();
    this.engineOsc.type = 'triangle';
    this.engineOsc.frequency.value = 66;
    this.engineOsc.connect(this.engineFilter);

    this.windFilter = c.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 300;
    this.windFilter.Q.value = 0.7;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    this.windSrc = c.createBufferSource();
    this.windSrc.buffer = this.noiseBuffer;
    this.windSrc.loop = true;
    this.windSrc.connect(this.windFilter);

    this.rotorOsc.start();
    this.rotorOsc2.start();
    this.lfo.start();
    this.engineOsc.start();
    this.windSrc.start();
  }

  setRotor(rpm, throttle) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rotorGain.gain.setTargetAtTime(this.enabled ? 0.05 + 0.1 * rpm : 0, t, 0.08);
    this.rotorOsc.frequency.setTargetAtTime(22 + 46 * rpm, t, 0.1);
    this.rotorOsc2.frequency.setTargetAtTime(33 + 58 * rpm, t, 0.1);
    this.lfo.frequency.setTargetAtTime(2 + 4 * rpm, t, 0.2);
    this.engineGain.gain.setTargetAtTime(this.enabled ? 0.02 + 0.06 * throttle : 0, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(60 + 90 * throttle, t, 0.1);
    this.windGain.gain.setTargetAtTime(this.enabled ? 0.012 + 0.03 * rpm : 0, t, 0.1);
  }

  burst({ dur, filter, f0, f1, q = 1, gain }) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(f1, 30), t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  shoot() {
    this.burst({ dur: 0.09, filter: 'highpass', f0: 1400, f1: 1600, gain: 0.4 });
  }

  rocket() {
    this.burst({ dur: 0.6, filter: 'bandpass', f0: 350, f1: 1700, q: 0.8, gain: 0.3 });
  }

  missile() {
    this.burst({ dur: 1.1, filter: 'bandpass', f0: 500, f1: 2600, q: 0.7, gain: 0.35 });
  }

  explosion(scale = 1) {
    this.burst({ dur: 1.3, filter: 'lowpass', f0: 420, f1: 70, gain: 0.9 * Math.min(scale, 2) });
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(75, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.7 * Math.min(scale, 2), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.7);
  }

  hitAlarm() {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const t = c.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 850;
      const g = c.createGain();
      g.gain.setValueAtTime(0.12, t + i * 0.13);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.08);
      o.connect(g);
      g.connect(this.master);
      o.start(t + i * 0.13);
      o.stop(t + i * 0.13 + 0.1);
    }
  }

  lockBeep() {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = 1500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.06);
  }
}
