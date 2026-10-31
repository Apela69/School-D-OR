/* audio.js: Web Audio engine. Effects and the default score are made in code (no files).
   Voice clips are mixed with trim, speed and gain; music ducks while someone speaks. */
const AU = {
  ctx: null, bufs: {}, muted: (function () { try { return localStorage.getItem('sd_mute') === '1'; } catch (e) { return false; } })(), vol: .85,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try {
      const c = (this.ctx = new C());
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol;
      const comp = c.createDynamicsCompressor(); this.master.connect(comp); comp.connect(c.destination);
      [['music', .55], ['voice', 1], ['sfx', .8]].forEach(([k, v]) => { const g = c.createGain(); g.gain.value = v; g.connect(this.master); this[k] = g; });
      const n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = n;
      if (c.state === 'suspended') c.resume();
      return c;
    } catch (e) { this.ctx = null; return null; }
  },
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('sd_mute', m ? '1' : '0'); } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.vol, this.ctx.currentTime, .05);
    if (m && window.speechSynthesis) speechSynthesis.cancel();
  },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  async buf(id) {
    if (!this.ctx || !id) return null;
    if (this.bufs[id]) return this.bufs[id];
    try {
      const r = await fetch('/api/audio/' + id);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return (this.bufs[id] = await new Promise((ok, no) => this.ctx.decodeAudioData(ab, ok, no)));
    } catch (e) { return null; }
  },
  decode(ab) { return new Promise((ok, no) => this.ctx.decodeAudioData(ab, ok, no)); },
  // a child bus that can be silenced instantly (used when a phase is skipped)
  child(parent) { const g = this.ctx.createGain(); g.connect(parent); return g; },
  kill(g) { if (!g) return; try { g.gain.cancelScheduledValues(0); g.gain.setTargetAtTime(0, this.ctx.currentTime, .02); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 300); } catch (e) {} },
  // ---- building blocks ----
  osc(type, f0, f1, t, dur, peak, bus) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.012, dur / 4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfx); o.start(t); o.stop(t + dur + .05);
  },
  nz(t, dur, peak, o = {}) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    const f0 = o.f0 || 1000, f1 = o.f1 || f0, att = o.attack || .01;
    s.buffer = this.noise; s.loop = true; f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.bus || this.sfx); s.start(t); s.stop(t + dur + .05);
  },
  // ---- sound effects (out = optional bus so a phase can silence its own effects) ----
  fx(name, t, a, out) {
    if (!this.ctx) return;
    const o = (type, f0, f1, tt, d, p) => this.osc(type, f0, f1, tt, d, p, out), n = (tt, d, p, opt) => this.nz(tt, d, p, { ...opt, bus: out });
    const F = {
      kick: () => { o('sine', 150, 45, t, .2, 1); n(t, .07, .4, { type: 'lowpass', f0: 1400 }); },
      hit: () => { o('sine', 120, 38, t, .45, 1); n(t, .12, .55, { type: 'lowpass', f0: 2200 }); },
      thud: () => o('sine', 90, 35, t, .4, 1),
      swish: () => { n(t, .38, .5, { type: 'highpass', f0: 3500, attack: .03 }); n(t, .3, .25, { f0: 2400, f1: 900, q: .8 }); },
      whoosh: () => n(t, .9, .55, { f0: 300, f1: 3000, q: 1.2, attack: .4 }),
      rise: () => n(t, 1.1, .3, { f0: 500, f1: 2600, q: 1, attack: .6 }),
      slam: () => { o('sine', 80, 26, t, 1.6, 1.1); n(t, .9, .55, { type: 'lowpass', f0: 600, f1: 90, attack: .01 }); n(t, .12, .5, { f0: 3000 }); },
      roar: () => { const d = a || 3; n(t, d, .7, { f0: 520, q: .4, attack: d * .35 }); n(t + .1, d, .3, { f0: 1600, q: .3, attack: d * .4 }); },
      boom: () => { o('sine', 70, 28, t, 2.4, 1.1); n(t, 1.7, .6, { type: 'lowpass', f0: 420, f1: 80, attack: .02 }); },
      chime: () => [880, 1318, 1760, 2637].forEach((f, i) => o('sine', f, f, t + i * .07, 2.4 - i * .35, .16)),
      sparkle: () => [2093, 2637, 3136, 3951].forEach((f, i) => o('sine', f, f, t + i * .05, .5, .07)),
      whistle: () => { o('triangle', 2700, 2760, t, .18, .3); o('triangle', 2760, 2700, t + .24, .55, .3); },
      tick: () => o('square', 1800, 1300, t, .03, .06),
      pop: () => o('sine', 500, 1000, t, .12, .25),
      tap: () => o('sine', 900, 650, t, .09, .2),
      sting: () => { o('triangle', 440, 660, t, .25, .25); o('triangle', 660, 880, t + .12, .4, .25); },
      drumroll: () => { const d = a || 2.5, k = Math.floor(d * 22); for (let i = 0; i < k; i++) n(t + (i * d) / k, .07, .1 + .55 * (i / k), { f0: 240 + 200 * (i / k), q: 1.4 }); o('sine', 80, 80, t, d, .2); },
      heartbeat: () => { o('sine', 90, 40, t, .22, .6); o('sine', 80, 38, t + .24, .26, .45); },
    };
    (F[name] || (() => {}))();
  },
  // ---- music ----
  duck(t0, t1) {
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(.17, t0, .25);
    this.music.gain.setTargetAtTime(.55, t1, .45);
  },
  undock() { if (this.ctx) { this.music.gain.cancelScheduledValues(0); this.music.gain.setTargetAtTime(.55, this.ctx.currentTime, .15); } },
  track(buf, t) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; s.loop = true;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 1.6);
    s.connect(g); g.connect(this.music); s.start(t);
    return { out: g, src: s };
  },
  score(t, len, rv, nom) {
    const c = this.ctx, out = c.createGain();
    out.gain.setValueAtTime(.0001, t); out.gain.exponentialRampToValueAtTime(1, t + 2.2); out.connect(this.music);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(380, t); lp.frequency.exponentialRampToValueAtTime(2600, t + Math.max(rv, 2)); lp.connect(out);
    const srcs = [];
    [[55, 'sawtooth', .17], [82.4, 'sawtooth', .11], [110, 'triangle', .15], [164.8, 'triangle', .07]].forEach(([f, ty, v], i) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = ty; o.frequency.value = f; o.detune.value = i % 2 ? 7 : -7; g.gain.value = v;
      o.connect(g); g.connect(lp); o.start(t); srcs.push(o);
    });
    let tt = t + 1.5, step = 1.15;
    while (tt < t + rv - 1.5) { this.osc('sine', 92, 38, tt, .32, .5, out); tt += step; step = Math.max(.42, step * .93); }
    this.nz(t + rv - 3.4, 3.4, .45, { f0: 200, f1: 5200, q: 1.5, attack: 3.2, bus: out });
    [130.8, 164.8, 196, 261.6, 329.6, 392].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + rv); g.gain.exponentialRampToValueAtTime(.075, t + rv + .08); g.gain.exponentialRampToValueAtTime(.03, t + rv + 4.5);
      o.connect(g); g.connect(out); o.start(t + rv); srcs.push(o);
    });
    if (nom != null) for (let k = t + nom; k < t + len; k += .6) this.osc('sine', 100, 46, k, .22, .32, out);   // steady pulse under the nominees
    return { out, src: { stop: (w) => srcs.forEach((o) => { try { o.stop(w); } catch (e) {} }) } };
  },
  fade(m, t, d) {
    if (!m) return;
    try { m.out.gain.cancelScheduledValues(t); m.out.gain.setValueAtTime(Math.max(m.out.gain.value, .0001), t); m.out.gain.exponentialRampToValueAtTime(.0001, t + d); m.src.stop(t + d + .1); } catch (e) {}
  },
  // ---- voice clips: trim, speed and volume ----
  clipLen(buf, b) { const tin = Math.max(0, b.trim_in || 0), tout = b.trim_out > tin ? Math.min(b.trim_out, buf.duration) : buf.duration, sp = b.speed > 0 ? b.speed : 1; return Math.max(.05, (tout - tin) / sp); },
  playClip(buf, out, when, b) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), tin = Math.max(0, b.trim_in || 0), tout = b.trim_out > tin ? Math.min(b.trim_out, buf.duration) : buf.duration;
    s.buffer = buf; s.playbackRate.value = b.speed > 0 ? b.speed : 1; g.gain.value = b.gain > 0 ? b.gain : 1;
    s.connect(g); g.connect(out || this.voice); s.start(Math.max(when, c.currentTime), tin, Math.max(.05, tout - tin));
    return s;
  },
  // ---- recording helpers: clean WAV (plays on every phone) ----
  toWav(buf, rate = 24000) {
    const src = buf.getChannelData(0), ratio = buf.sampleRate / rate, n = Math.floor(src.length / ratio), out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const p = i * ratio, i0 = Math.floor(p), f = p - i0; out[i] = src[i0] * (1 - f) + (src[Math.min(i0 + 1, src.length - 1)] || 0) * f; }
    let a = 0, z = n; const th = .012;                                   // trim silence at both ends (keep a little air)
    while (a < n && Math.abs(out[a]) < th) a++;
    while (z > a && Math.abs(out[z - 1]) < th) z--;
    a = Math.max(0, a - Math.floor(rate * .06)); z = Math.min(n, z + Math.floor(rate * .12));
    let pk = 0; for (let i = a; i < z; i++) pk = Math.max(pk, Math.abs(out[i]));
    const g = pk > 0 ? .92 / pk : 1, len = Math.max(1, z - a), ab = new ArrayBuffer(44 + len * 2), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, out[a + i] * g)) * 32767, true);
    return new Blob([ab], { type: 'audio/wav' });
  },
  speak(text) {
    if (this.muted || !window.speechSynthesis || !text) return;
    try { const u = new SpeechSynthesisUtterance(text); u.pitch = .5; u.rate = .82; u.volume = 1; speechSynthesis.speak(u); } catch (e) {}
  },
};
