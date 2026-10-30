/* audio.js: Web Audio engine. Sound effects and the default score are made in code (no files).
   Uploaded music and voice clips are decoded and mixed with ducking (music dips while the voice speaks). */
const AU = {
  ctx: null, bufs: {}, muted: (function(){try{return localStorage.getItem('sd_mute')==='1'}catch(e){return false}})(), vol: .85,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try {
      const c = (this.ctx = new C());
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : this.vol;
      const comp = c.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(c.destination);
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
  // ---- sound effects ----
  fx(name, t, a) {
    if (!this.ctx) return;
    const F = {
      kick: () => { this.osc('sine', 150, 45, t, .2, 1); this.nz(t, .07, .4, { type: 'lowpass', f0: 1400 }); },
      thud: () => this.osc('sine', 90, 35, t, .4, 1),
      swish: () => { this.nz(t, .38, .5, { type: 'highpass', f0: 3500, attack: .03 }); this.nz(t, .3, .25, { f0: 2400, f1: 900, q: .8 }); },
      whoosh: () => this.nz(t, .9, .6, { f0: 300, f1: 3000, q: 1.2, attack: .4 }),
      roar: () => { const d = a || 3; this.nz(t, d, .7, { f0: 520, q: .4, attack: d * .35 }); this.nz(t + .1, d, .3, { f0: 1600, q: .3, attack: d * .4 }); },
      groan: () => this.nz(t, 1.6, .55, { f0: 650, f1: 240, q: .6, attack: .25 }),
      boom: () => { this.osc('sine', 70, 28, t, 2.4, 1.1); this.nz(t, 1.7, .6, { type: 'lowpass', f0: 420, f1: 80, attack: .02 }); },
      chime: () => [880, 1318, 1760, 2637].forEach((f, i) => this.osc('sine', f, f, t + i * .07, 2.4 - i * .35, .16)),
      whistle: () => { this.osc('triangle', 2700, 2760, t, .18, .3); this.osc('triangle', 2760, 2700, t + .24, .55, .3); },
      bonk: () => { this.osc('sine', 330, 120, t, .18, .7); this.nz(t, .05, .3, { f0: 900 }); },
      pop: () => this.osc('sine', 500, 1000, t, .12, .25),
      tap: () => this.osc('sine', 900, 650, t, .09, .2),
      sting: () => { this.osc('triangle', 440, 660, t, .25, .25); this.osc('triangle', 660, 880, t + .12, .4, .25); },
      drumroll: () => { const d = a || 2.5, n = Math.floor(d * 22); for (let i = 0; i < n; i++) this.nz(t + (i * d) / n, .07, .1 + .55 * (i / n), { f0: 240 + 200 * (i / n), q: 1.4 }); this.osc('sine', 80, 80, t, d, .2); },
      trombone: () => {
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(this.sfx);
        [[233, .45], [220, .45], [208, .45], [196, 1.3]].forEach(([f, d], i, arr) => { const st = t + arr.slice(0, i).reduce((s, x) => s + x[1], 0); this.osc('sawtooth', f, i === 3 ? f * .9 : f * .985, st, d, .22, lp); });
      },
    };
    (F[name] || (() => {}))();
  },
  // ---- music ----
  duck(t0, t1) {
    if (!this.ctx) return;
    this.music.gain.cancelScheduledValues(t0);
    this.music.gain.setTargetAtTime(.17, t0, .25);
    this.music.gain.setTargetAtTime(.55, t1, .45);
  },
  track(buf, t, len) {          // uploaded music: loops, fades in
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; s.loop = true;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 1.6);
    s.connect(g); g.connect(this.music); s.start(t);
    return { out: g, src: s };
  },
  score(t, len, rv) {           // default cinematic score made in code
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
    [130.8, 164.8, 196, 261.6, 329.6, 392].forEach((f, i) => {   // bright chord blooms on the reveal
      const o = c.createOscillator(), g = c.createGain(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + rv); g.gain.exponentialRampToValueAtTime(.075, t + rv + .08); g.gain.exponentialRampToValueAtTime(.0001, t + rv + 4.5);
      o.connect(g); g.connect(out); o.start(t + rv); o.stop(t + rv + 4.6);
    });
    return { out, src: { stop: (w) => srcs.forEach((o) => { try { o.stop(w); } catch (e) {} }) } };
  },
  fade(m, t, d) {
    if (!m) return;
    try { m.out.gain.cancelScheduledValues(t); m.out.gain.setValueAtTime(Math.max(m.out.gain.value, .0001), t); m.out.gain.exponentialRampToValueAtTime(.0001, t + d); m.src.stop(t + d + .1); } catch (e) {}
  },
  speak(text) {
    if (this.muted || !window.speechSynthesis || !text) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.pitch = .5; u.rate = .82; u.volume = 1; speechSynthesis.speak(u); } catch (e) {}
  },
};
