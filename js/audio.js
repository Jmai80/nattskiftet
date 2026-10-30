// Alla ljud genereras i realtid med Web Audio API – inga ljudfiler.
const NOTE_IDX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function noteFreq(n) {
  const m = n.match(/^([A-G]#?)(\d)$/);
  const midi = 12 * (+m[2] + 1) + NOTE_IDX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Egen melodi för speldosan (a-moll, 3/4-känsla)
const MELODY = ['E5', 'A5', 'C6', 'B5', 'A5', 'E5', 'F5', 'E5', 'D5', 'F5', 'A5', 'G#5', 'A5', 'B5', 'C6', 'B5',
  'A5', 'C6', 'E6', 'D6', 'C6', 'B5', 'A5', 'G#5', 'A5', 'E5', 'C5', 'D5', 'E5', null, 'A4', null];

function distCurve(k) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)); }
  return c;
}

export class Sfx {
  constructor() {
    this.ctx = null;
    this.loops = {};
    this.muted = false;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 6;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    const sr = ctx.sampleRate, len = sr * 2;
    this.white = ctx.createBuffer(1, len, sr);
    const w = this.white.getChannelData(0);
    for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
    this.brown = ctx.createBuffer(1, len, sr);
    const b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    this.curve = distCurve(60);
  }

  get ok() { return !!this.ctx; }
  get now() { return this.ctx.currentTime; }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
    return this.muted;
  }

  pan(p = 0) {
    const n = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain();
    if (n.pan) n.pan.value = Math.max(-1, Math.min(1, p));
    n.connect(this.master);
    return n;
  }

  env(dest, t, attack, peak, release, hold = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    g.connect(dest);
    return g;
  }

  osc(type, f, dest, t, dur) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur);
    return o;
  }

  noise(dest, t, dur, { type = 'bandpass', f = 1000, q = 1, buf = null } = {}) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf || this.white;
    s.loop = true;
    const fl = this.ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    fl.Q.value = q;
    s.connect(fl);
    fl.connect(dest);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur);
    return { s, fl };
  }

  // ---------- byggstenar ----------
  thud(dest, t, vol) {
    const g = this.env(dest, t, 0.005, vol, 0.25);
    const o = this.osc('sine', 120, g, t, 0.32);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const g2 = this.env(dest, t, 0.002, vol * 0.5, 0.12);
    this.noise(g2, t, 0.16, { type: 'lowpass', f: 420 });
  }

  clang(dest, t, vol) {
    [[220, 1], [563, 0.6], [1127, 0.35], [1789, 0.2]].forEach(([f, a]) => {
      const g = this.env(dest, t, 0.003, vol * a, 0.6 + Math.random() * 0.6);
      this.osc('sine', f * (0.97 + Math.random() * 0.06), g, t, 1.4);
    });
  }

  click(p = 0, vol = 0.12) {
    if (!this.ok) return;
    const t = this.now, d = this.pan(p);
    const g = this.env(d, t, 0.001, vol, 0.03);
    this.noise(g, t, 0.05, { type: 'highpass', f: 2500 });
    const g2 = this.env(d, t, 0.001, vol * 0.5, 0.04);
    this.osc('square', 1600, g2, t, 0.05);
  }

  // ---------- spelljud ----------
  startAmbience() {
    if (!this.ok || this.loops.amb) return;
    const ctx = this.ctx, t = this.now;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 2);
    g.connect(this.master);
    const fan = ctx.createBufferSource(); fan.buffer = this.brown; fan.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const fg = ctx.createGain(); fg.gain.value = 0.22;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7.3;
    const lg = ctx.createGain(); lg.gain.value = 0.05;
    lfo.connect(lg); lg.connect(fg.gain);
    fan.connect(lp); lp.connect(fg); fg.connect(g);
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 50;
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 170;
    const hg = ctx.createGain(); hg.gain.value = 0.03;
    hum.connect(hf); hf.connect(hg); hg.connect(g);
    const dr = ctx.createOscillator(); dr.type = 'sine'; dr.frequency.value = 41.2;
    const dr2 = ctx.createOscillator(); dr2.type = 'sine'; dr2.frequency.value = 43.6;
    const dg = ctx.createGain(); dg.gain.value = 0.05;
    dr.connect(dg); dr2.connect(dg); dg.connect(g);
    [fan, lfo, hum, dr, dr2].forEach((n) => n.start());
    this.loops.amb = { g, nodes: [fan, lfo, hum, dr, dr2] };
  }

  stopLoop(key, fade = 0.2) {
    const L = this.loops[key];
    if (!L) return;
    delete this.loops[key];
    const t = this.now;
    L.g.gain.cancelScheduledValues(t);
    L.g.gain.setValueAtTime(L.g.gain.value, t);
    L.g.gain.linearRampToValueAtTime(0, t + fade);
    L.nodes.forEach((n) => { try { n.stop(t + fade + 0.05); } catch (e) { /* redan stoppad */ } });
  }

  stopLoops(fade = 0.3) {
    if (!this.ok) return;
    Object.keys(this.loops).forEach((k) => this.stopLoop(k, fade));
  }

  door(side, closing) {
    if (!this.ok) return;
    const t = this.now, d = this.pan(side === 'left' ? -0.75 : 0.75);
    const g = this.env(d, t, 0.02, 0.22, 0.3, 0.05);
    const { fl } = this.noise(g, t, 0.45, { type: 'bandpass', f: closing ? 1600 : 500, q: 3 });
    fl.frequency.exponentialRampToValueAtTime(closing ? 350 : 1600, t + 0.3);
    if (closing) { this.thud(d, t + 0.22, 0.9); this.clang(d, t + 0.22, 0.1); } else this.clang(d, t + 0.05, 0.05);
  }

  lightBuzz(side, on) {
    if (!this.ok) return;
    const key = 'light_' + side, p = side === 'left' ? -0.6 : 0.6;
    this.click(p, 0.1);
    if (on && !this.loops[key]) {
      const ctx = this.ctx, d = this.pan(p);
      const g = ctx.createGain(); g.gain.value = 0.035; g.connect(d);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 2;
      o.connect(bp); bp.connect(g);
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 60;
      const g2 = ctx.createGain(); g2.gain.value = 0.3;
      o2.connect(g2); g2.connect(g);
      o.start(); o2.start();
      this.loops[key] = { g, nodes: [o, o2] };
    } else if (!on) this.stopLoop(key, 0.04);
  }

  monitor(up) {
    if (!this.ok) return;
    const t = this.now, d = this.pan(0);
    const g = this.env(d, t, 0.03, 0.1, 0.22, 0.05);
    const { fl } = this.noise(g, t, 0.35, { type: 'bandpass', f: up ? 500 : 2200, q: 1.5 });
    fl.frequency.exponentialRampToValueAtTime(up ? 2200 : 500, t + 0.25);
    this.click(0, 0.08);
    if (up && !this.loops.static) {
      const ctx = this.ctx;
      const g2 = ctx.createGain(); g2.gain.value = 0.018; g2.connect(this.master);
      const s = ctx.createBufferSource(); s.buffer = this.white; s.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
      s.connect(hp); hp.connect(g2); s.start();
      this.loops.static = { g: g2, nodes: [s] };
    } else if (!up) this.stopLoop('static', 0.1);
  }

  camSwitch() {
    if (!this.ok) return;
    this.click(0, 0.1);
    const t = this.now, g = this.env(this.pan(0), t, 0.005, 0.12, 0.15);
    this.noise(g, t, 0.2, { type: 'bandpass', f: 3000, q: 0.8 });
  }

  disrupt() {
    if (!this.ok) return;
    const t = this.now, g = this.env(this.pan(0), t, 0.01, 0.2, 0.4, 0.2);
    this.noise(g, t, 0.7, { type: 'bandpass', f: 2200, q: 0.6 });
  }

  error() {
    if (!this.ok) return;
    const t = this.now, g = this.env(this.pan(0), t, 0.005, 0.08, 0.2, 0.05);
    this.osc('square', 95, g, t, 0.3);
  }

  steps(p, vol, n = 3, gap = 0.42) {
    if (!this.ok) return;
    const t = this.now + 0.05, d = this.pan(p);
    for (let i = 0; i < n; i++) this.thud(d, t + i * gap + Math.random() * 0.05, vol * (0.85 + Math.random() * 0.3));
    // servogny
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = this.env(d, t, 0.15, vol * 0.04, 0.5, n * gap * 0.6);
    lp.connect(g);
    const o = this.osc('sawtooth', 260, lp, t, n * gap + 1);
    o.frequency.linearRampToValueAtTime(380, t + n * gap);
  }

  run(p) {
    if (!this.ok) return;
    const t = this.now, d = this.pan(p);
    for (let i = 0; i < 12; i++) {
      const k = i / 11;
      this.thud(d, t + i * 0.2, 0.15 + k * 0.6);
    }
  }

  knock(p) {
    if (!this.ok) return;
    const t = this.now, d = this.pan(p);
    [0, 0.28, 0.5, 0.9].forEach((dt, i) => {
      this.thud(d, t + dt, 1.0 - i * 0.1);
      this.clang(d, t + dt, 0.18);
    });
  }

  sting() {
    if (!this.ok) return;
    const t = this.now, d = this.pan(0);
    const g = this.env(d, t, 0.01, 0.3, 1.6, 0.1);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    lp.connect(g);
    [98, 103.8, 146.8, 155.6, 196, 207.6].forEach((f) => {
      const o = this.osc('sawtooth', f, lp, t, 2);
      o.detune.value = Math.random() * 20 - 10;
    });
    const g2 = this.env(d, t, 0.005, 0.25, 0.25);
    this.noise(g2, t, 0.3, { type: 'bandpass', f: 1500, q: 0.7 });
  }

  scream() {
    if (!this.ok) return;
    const ctx = this.ctx, t = this.now, d = this.pan(0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.02);
    g.gain.setValueAtTime(0.85, t + 1.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    g.connect(d);
    const sh = ctx.createWaveShaper(); sh.curve = this.curve;
    sh.connect(g);
    [380, 520, 610, 830, 1100].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.7, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.3, t + 0.15);
      o.frequency.exponentialRampToValueAtTime(f * 0.85, t + 1.4);
      const fm = ctx.createOscillator(); fm.type = 'square'; fm.frequency.value = 22 + Math.random() * 30;
      const fmg = ctx.createGain(); fmg.gain.value = f * 0.15;
      fm.connect(fmg); fmg.connect(o.frequency);
      const og = ctx.createGain(); og.gain.value = 0.16;
      o.connect(og); og.connect(sh);
      o.start(t); fm.start(t); o.stop(t + 1.6); fm.stop(t + 1.6);
    });
    const ng = ctx.createGain(); ng.gain.value = 0.5; ng.connect(sh);
    this.noise(ng, t, 1.5, { type: 'bandpass', f: 1800, q: 0.5 });
  }

  powerDown() {
    if (!this.ok) return;
    const t = this.now, d = this.pan(0);
    const g = this.env(d, t, 0.01, 0.25, 1.8, 0.2);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; lp.connect(g);
    const o = this.osc('sawtooth', 180, lp, t, 2.2);
    o.frequency.exponentialRampToValueAtTime(25, t + 2);
    this.thud(d, t, 0.8);
    this.clang(d, t + 0.05, 0.08);
  }

  musicBox() {
    if (!this.ok) return () => {};
    const ctx = this.ctx;
    const out = ctx.createGain(); out.gain.value = 0.2;
    out.connect(this.pan(-0.75));
    const step = 0.32;
    let t = this.now + 0.4;
    for (let loop = 0; loop < 2; loop++) {
      for (const n of MELODY) {
        if (n) {
          const f = noteFreq(n);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.6, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
          g.connect(out);
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 16;
          o.connect(g); o.start(t); o.stop(t + 1);
          const g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g);
          const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01;
          o2.connect(g2); o2.start(t); o2.stop(t + 1);
        }
        t += step;
      }
    }
    return () => {
      const n = this.now;
      out.gain.cancelScheduledValues(n);
      out.gain.setValueAtTime(out.gain.value, n);
      out.gain.linearRampToValueAtTime(0, n + 0.15);
      setTimeout(() => out.disconnect(), 400);
    };
  }

  chime() {
    if (!this.ok) return;
    const t = this.now, d = this.pan(0);
    const bell = (f, at, vol) => {
      [[1, 1], [2.76, 0.4], [5.4, 0.15]].forEach(([m, a]) => {
        const g = this.env(d, at, 0.004, vol * a, 2.2);
        this.osc('sine', f * m, g, at, 2.5);
      });
    };
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(f, t + 0.2 + i * 0.45, 0.25));
    [1046.5, 1318.5, 1568].forEach((f) => bell(f, t + 2.2, 0.18));
    // jubel
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.connect(d);
    for (let i = 0; i < 30; i++) g.gain.setValueAtTime(0.04 + Math.random() * 0.08, t + 2.6 + i * 0.1);
    g.gain.linearRampToValueAtTime(0, t + 6);
    this.noise(g, t + 2.6, 3.5, { type: 'bandpass', f: 1400, q: 0.6 });
  }

  distant() {
    if (!this.ok) return;
    const t = this.now, p = Math.random() * 1.6 - 0.8, d = this.pan(p);
    const r = Math.random();
    if (r < 0.35) {
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(d);
      this.clang(lp, t, 0.05);
    } else if (r < 0.65) {
      this.steps(p, 0.06, 3, 0.5);
    } else {
      const g = this.env(d, t, 0.6, 0.05, 1.2, 0.5);
      const o = this.osc('sine', 70, g, t, 2.5);
      o.frequency.linearRampToValueAtTime(55, t + 2.3);
    }
  }
}
