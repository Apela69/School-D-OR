/* scenes.js: the ceremony. Dramatic animated text + sound + voice, the trophy reveal, then the nominees.
   No video files: DOM + Web Animations API + Web Audio. */
const dm = (t, c, p, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; if (p) p.append(e); return e; };
const rnd = (a, b) => a + Math.random() * (b - a);
const FX_LIST = [['rise', 'Rise'], ['letters', 'Letter by letter'], ['slam', 'Slam'], ['wipe', 'Gold wipe'], ['glow', 'Glow'], ['split', 'Words fly in']];

function sceneStyleFor(title, key) {
  if (key && key !== 'auto' && DEFAULT_LINES[key]) return key;
  const t = String(title || '').toLowerCase();
  if (/glove|keeper|goalie|yashin/.test(t)) return 'glove';
  if (/pusk|goal of|screamer/.test(t)) return 'puskas';
  if (/maestro|playmaker|assist|xavi/.test(t)) return 'maestro';
  if (/rising|kopa|young|rookie|newcomer|improv|comeback/.test(t)) return 'rising';
  if (/clanger|spoon|mierda|worst|oscar|dive|room for|work.?on/.test(t)) return 'joke';
  if (/people|choice|legend|write/.test(t)) return 'people';
  return 'dor';
}
const DEFAULT_LINES = {
  story: [['Every four years…', 'rise'], ['a school stops to honour its legends.', 'letters'], ['Not for the trophies they were given.', 'wipe'], ['But for the lunchtimes they gave everything.', 'letters'], ['Sprinting. Sliding. Never giving up.', 'split'], ['Welcome to the…', 'rise']],
  outro: [['Your votes are in.', 'rise'], ['The legends will be revealed.', 'letters'], ['Thank you for being part of the story.', 'glow']],
  dor: [['Season after season, one name rises above the rest.', 'letters'], ['Skill. Heart. Consistency.', 'split'], ['The player of the year.', 'slam']],
  puskas: [['One strike.', 'slam'], ['One moment the whole playground froze.', 'letters'], ['The goal they will talk about for years.', 'wipe']],
  glove: [['Between the posts, he stands alone.', 'letters'], ['When everyone else shouted goal…', 'rise'], ['he said no.', 'slam']],
  maestro: [['He doesn’t always score.', 'rise'], ['But every great goal starts with him.', 'letters'], ['The one who makes everyone better.', 'glow']],
  rising: [['Nobody saw it coming.', 'rise'], ['From the back of the queue to the heart of the game.', 'letters'], ['The player who made us all look twice.', 'glow']],
  joke: [['Every league has a moment nobody forgets.', 'rise'], ['The miss. The slip. The fail that stopped the whole pitch.', 'letters'], ['Laugh. Then vote.', 'slam']],
  people: [['This one is different.', 'rise'], ['No shortlist. No nominees.', 'wipe'], ['Just your voice. Who is the legend of lunchtime?', 'letters']],
};
const estDur = (text) => Math.max(2, String(text || '').split(/\s+/).filter(Boolean).length * .42);
function defaultBeats(style) {
  const lines = DEFAULT_LINES[style] || DEFAULT_LINES.dor, sp = style === 'story' ? 2.4 : 2.7;
  return lines.map(([text, fx], i) => ({ text, fx, start: +(1 + i * sp).toFixed(2), vstart: null, audio: null, trim_in: 0, trim_out: 0, speed: 1, gain: 1, dur: sp - .25 }));
}
const clipSeconds = (len, b) => { const tin = Math.max(0, b.trim_in || 0), tout = b.trim_out > tin ? Math.min(b.trim_out, len) : len, sp = b.speed > 0 ? b.speed : 1; return Math.max(.05, (tout - tin) / sp); };
function sceneTiming(beats, minLen, lens = {}) {
  let end = 0;
  beats.forEach((b) => {
    if (b.text) end = Math.max(end, (b.start || 0) + (b.dur || estDur(b.text)));
    if (b.audio && lens[b.audio]) end = Math.max(end, (b.vstart == null ? b.start || 0 : b.vstart) + clipSeconds(lens[b.audio], b));
  });
  const R = Math.max(6.5, end + .7), D = Math.max(minLen || 0, R + 5.2);
  return { R, D, end };
}
const iconNode = (key) => { if (key === 'boot' || key === 'glove') { const s = dm('span', 'big'); s.textContent = key === 'boot' ? '👟' : '🧤'; s.style.filter = 'sepia(1) saturate(4) hue-rotate(-8deg)'; return s; } const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic big'); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + (key === 'star' || key === 'crown' ? key : 'trophy')); s.append(u); s.style.width = s.style.height = 'min(30vw,9rem)'; return s; };

function makePhase(c) {
  const P = { anims: [], timers: [], fxs: [], bus: c ? AU.child(AU.sfx) : null, vbus: c ? AU.child(AU.voice) : null, done: false, onDone: null,
    A(el, fr, o = {}) { const a = el.animate(fr, { fill: 'both', easing: 'ease-out', duration: 500, ...o }); this.anims.push(a); return a; },
    fx(ms, n, a) { this.fxs.push([ms, n, a]); },
    later(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
    window(el, t0, t1, total) { const f = (t) => Math.min(1, t / total); return this.A(el, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(t0) }, { opacity: 1, offset: f(t0 + 250) }, { opacity: 1, offset: f(t1 - 350) }, { opacity: 0, offset: f(t1) }, { opacity: 0, offset: 1 }], { delay: 0, duration: total, easing: 'linear' }); },
    start(t0) { if (c) this.fxs.forEach(([ms, n, a]) => AU.fx(n, t0 + ms / 1000, a, this.bus)); },
    end() { if (this.done) return; this.done = true; this.timers.forEach(clearTimeout); this.anims.forEach((a) => { try { a.cancel(); } catch (e) {} }); if (c) { AU.kill(this.bus); AU.kill(this.vbus); AU.undock(); } if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {} if (this.onDone) this.onDone(); },
  };
  return P;
}
function splitLetters(el, text, P, st, step, perLetterFx) {
  const words = String(text).split(' '); let idx = 0; const spans = [];
  words.forEach((w, wi) => { const wd = dm('span', 'word', el); [...w].forEach((ch) => { const s = dm('span', 'lt', wd, ch); spans.push(s); }); if (wi < words.length - 1) el.append(' '); });
  spans.forEach((s, i) => { P.A(s, [{ opacity: 0, transform: 'translateY(26px) scale(1.5)', filter: 'blur(9px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: st + i * step, duration: 560 }); if (perLetterFx && i < 36 && i % 2 === 0) P.fx(st + i * step, 'tick'); });
}

/* ---- phase A: the award intro (text, sound, voice, then the trophy reveal) ---- */
function introPhase(root, X, P) {
  const { beats, T, bufs, cfg } = X, total = T.D * 1000 + 2500, layer = dm('div', 'sc-layer', root), cam = dm('div', 'tx-cam', layer), tx = dm('div', 'tx', cam);
  P.A(cam, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }], { delay: 0, duration: T.D * 1000, easing: 'linear' });
  beats.forEach((b, i) => {
    const st = (b.start || 0) * 1000;
    if (b.text) {
      const dur = (b.dur || estDur(b.text)) * 1000, wrap = dm('div', 'tx-line', tx), inner = dm('div', 'tx-in' + (b.fx === 'slam' ? ' gold' : ''), wrap), rule = dm('div', 'tx-rule', wrap);
      P.window(wrap, st, st + dur + 300, total); P.A(rule, [{ transform: 'scaleX(0)', opacity: .9 }, { transform: 'scaleX(1)', opacity: .9 }], { delay: st + 450, duration: 800 });
      const fxn = b.fx || 'rise';
      if (fxn === 'letters') { splitLetters(inner, b.text, P, st, 34, true); P.fx(st, 'swish'); }
      else if (fxn === 'split') { inner.textContent = ''; b.text.split(' ').forEach((w, k) => { const s = dm('span', 'wd', inner, w); inner.append(' '); P.A(s, [{ opacity: 0, transform: `translateX(${k % 2 ? 150 : -150}px)`, filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: st + k * 110, duration: 700 }); }); P.fx(st, 'whoosh'); P.fx(st + 220, 'whoosh'); }
      else if (fxn === 'slam') { inner.textContent = b.text; P.A(inner, [{ opacity: 0, transform: 'scale(2.7)', filter: 'blur(14px)', offset: 0 }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0)', offset: .3 }, { transform: 'scale(1.035)', offset: .5 }, { transform: 'scale(1)', offset: 1 }], { delay: st, duration: 900 });
        P.A(tx, [{ transform: 'translate(0,0)' }, { transform: 'translate(-9px,5px)' }, { transform: 'translate(8px,-5px)' }, { transform: 'translate(-4px,3px)' }, { transform: 'translate(0,0)' }], { delay: st + 260, duration: 380, easing: 'linear' }); P.fx(st + 240, 'slam'); }
      else if (fxn === 'wipe') { inner.textContent = b.text; P.A(inner, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { delay: st, duration: 1000, easing: 'cubic-bezier(.6,0,.2,1)' }); const sw = dm('div', 'tx-sweep', wrap); P.A(sw, [{ left: '0%', opacity: 1 }, { left: '100%', opacity: 0 }], { delay: st, duration: 1000, easing: 'cubic-bezier(.6,0,.2,1)' }); P.fx(st, 'swish'); }
      else if (fxn === 'glow') { inner.textContent = b.text; P.A(inner, [{ opacity: 0, filter: 'blur(16px) brightness(2.4)' }, { opacity: 1, filter: 'blur(0) brightness(1)' }], { delay: st, duration: 1300 }); P.fx(st, 'sparkle'); }
      else { inner.textContent = b.text; P.A(inner, [{ opacity: 0, transform: 'translateY(46px) scale(.96)', filter: 'blur(10px)', letterSpacing: '.3em' }, { opacity: 1, transform: 'none', filter: 'blur(0)', letterSpacing: '.03em' }], { delay: st, duration: 1000 }); P.fx(st, 'rise'); }
    }
  });
  // trophy reveal
  const R = T.R * 1000, rays = dm('div', 'sc-rays', layer), rev = dm('div', 'sc-reveal', layer), flash = dm('div', 'sc-flash', layer);
  if (cfg.image) { const im = dm('img', '', rev); im.src = cfg.image; im.alt = ''; P.A(im, [{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { delay: R + 300, duration: 1100 }); }
  else { const ico = iconNode(cfg.icon); rev.append(ico); P.A(ico, [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { delay: R + 300, duration: 1100 }); }
  const ti = dm('div', 'sc-title', rev); [...String(cfg.title || '')].forEach((ch, i) => { const sp = dm('span', '', ti, ch); P.A(sp, [{ opacity: 0, transform: 'translateY(18px) scale(1.3)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: R + 700 + i * 55, duration: 600 }); });
  if (cfg.sub) { const lb = dm('div', 'k', rev, cfg.sub); P.A(lb, [{ opacity: 0 }, { opacity: 1 }], { delay: R + 1500, duration: 700 }); }
  P.A(rev, [{ opacity: 0 }, { opacity: 1 }], { delay: R, duration: 500 });
  P.A(flash, [{ opacity: 0 }, { opacity: .85, offset: .15 }, { opacity: 0 }], { delay: R - 50, duration: 900 });
  P.A(rays, [{ opacity: 0, transform: 'rotate(0deg)' }, { opacity: .9, transform: 'rotate(10deg)', offset: .12 }, { opacity: .45, transform: 'rotate(60deg)' }], { delay: R - 50, duration: 7500, easing: 'linear' });
  P.fx(R - 2800, 'drumroll', 2.7); P.fx(R, 'boom'); P.fx(R + 100, 'chime'); P.fx(R + 250, 'roar', 4); P.fx(R + 700, 'sparkle');
  for (let k = 0; k < 4; k++) P.fx(R - 4300 + k * 450, 'heartbeat');
  return layer;
}

/* ---- phase B: the nominees arrive one by one ---- */
function nomPhase(root, X, P) {
  const { cfg } = X, layer = dm('div', 'sc-layer', root), noms = cfg.nominees || [], n = noms.length;
  if (cfg.writein) {
    const t = dm('div', 'tx', layer), w = dm('div', 'tx-line', t), inner = dm('div', 'tx-in gold', w);
    inner.textContent = 'Who is your legend?'; P.window(w, 300, 3500, 4200); P.A(inner, [{ opacity: 0, transform: 'scale(2.4)', filter: 'blur(14px)', offset: 0 }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0)', offset: .35 }, { transform: 'scale(1.03)', offset: .55 }, { transform: 'scale(1)' }], { delay: 300, duration: 1000 }); P.fx(520, 'slam');
    const r = dm('div', 'tx-rule', w); P.A(r, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { delay: 900, duration: 800 });
    return 3.8;
  }
  const per = Math.max(1.15, Math.min(3.2, (12 - 3.3) / Math.max(1, n))), start = 1.0, label = dm('div', 'nm-label', layer, 'The nominees');
  P.A(label, [{ opacity: 0, letterSpacing: '.7em' }, { opacity: 1, letterSpacing: '.45em' }], { delay: 100, duration: 900 });
  const stage = dm('div', 'nm-stage', layer), pips = dm('div', 'nm-pips', layer);
  noms.forEach((p, i) => {
    const t = (start + i * per) * 1000, ex = (start + (i + 1) * per - .45) * 1000, card = dm('div', 'nm-card', stage), pip = dm('i', '', pips);
    const ph = dm('div', 'nm-photo', card); if (p.photo) { const im = dm('img', '', ph); im.src = '/api/photo/' + p.photo; im.alt = ''; } else { ph.innerHTML = '<svg class="ic" viewBox="0 0 100 100"><use href="#i-sil"/></svg>'; }
    const nm = dm('div', 'nm-name', card); [...p.name].forEach((ch, k) => { const s = dm('span', '', nm, ch); P.A(s, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { delay: t + 380 + k * 28, duration: 360 }); });
    const pos = dm('div', 'nm-pos', card, p.position || 'Player'); P.A(pos, [{ opacity: 0 }, { opacity: 1 }], { delay: t + 650, duration: 500 });
    const st = dm('div', 'nm-stats', card), vals = [['Goals', p.goals, 0], ['Assists', p.assists, 0], ['Rating', p.rating, 1]];
    vals.forEach(([lab, v, dec], k) => { const box = dm('div', 'ps', st), b = dm('b', '', box, '0'), sm = dm('small', '', box, lab); P.A(box, [{ opacity: 0, transform: 'translateY(16px) scale(.9)' }, { opacity: 1, transform: 'none' }], { delay: t + 750 + k * 170, duration: 450 });
      const target = +v || 0, begin = t + 850 + k * 170, ms = 850; P.later(begin, () => { const t0 = performance.now(); const step = (now) => { if (P.done || !b.isConnected) return; const u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3); b.textContent = (target * e).toFixed(dec); if (u < 1) requestAnimationFrame(step); else b.textContent = target.toFixed(dec); }; requestAnimationFrame(step); });
      for (let q = 0; q < 9; q++) P.fx(begin + q * 90, 'tick'); P.fx(begin + ms, 'pop'); });
    P.A(card, [{ opacity: 0, transform: 'translateX(70px) scale(.86) rotate(2deg)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: t, duration: 650 });
    P.A(card, [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateX(-70px) scale(.9)', filter: 'blur(8px)' }], { delay: ex, duration: 420, fill: 'forwards' });
    card.style.opacity = '0'; P.fx(t, 'whoosh'); P.fx(t + 300, 'hit');
    P.A(pip, [{ background: '#3a3320', transform: 'scale(1)' }, { background: '#F5D778', transform: 'scale(1.5)' }, { background: '#8a6a1c', transform: 'scale(1)' }], { delay: t, duration: per * 1000, easing: 'linear' });
  });
  const endT = (start + n * per) * 1000, strip = dm('div', 'nm-strip', layer);
  noms.forEach((p, k) => { const it = dm('div', 'nm-mini', strip), im = dm('div', 'ph', it); if (p.photo) { const i2 = dm('img', '', im); i2.src = '/api/photo/' + p.photo; i2.alt = ''; } dm('span', '', it, p.name); P.A(it, [{ opacity: 0, transform: 'translateY(24px) scale(.8)' }, { opacity: 1, transform: 'none' }], { delay: endT + 100 + k * 120, duration: 500 }); });
  const mk = dm('div', 'nm-make', layer, 'Make your choice.'); P.A(mk, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: endT + 500 + n * 90, duration: 700 }); P.fx(endT + 100, 'sparkle'); P.fx(endT + 600, 'chime');
  P.A(label, [{ opacity: 1 }, { opacity: 0 }], { delay: endT - 100, duration: 500 });
  return (endT + 2400 + n * 90) / 1000;
}

function runScene(cfg) {
  return new Promise(async (resolve) => {
    const c = AU.init(), root = dm('div'); root.id = 'scene'; document.body.append(root);
    const beats = (cfg.beats || []).map((b) => ({ ...b })), bufs = {}, lens = {}; let mbuf = null;
    if (c) await Promise.all([...[...new Set(beats.map((b) => b.audio).filter(Boolean))].map(async (id) => { const bf = await AU.buf(id); if (bf) { bufs[id] = bf; lens[id] = bf.duration; } }), (async () => { mbuf = await AU.buf(cfg.music); })()]);
    const T = sceneTiming(beats, cfg.minLen, lens), X = { beats, T, bufs, cfg };
    dm('div', 'sc-bg', root); dm('div', 'sc-bar top', root); dm('div', 'sc-bar bot', root);
    const parts = dm('div', 'sc-parts', root); for (let i = 0; i < 22; i++) { const p = dm('i', '', parts); p.style.cssText = `left:${rnd(2, 98)}%;--dx:${rnd(-60, 60)}px;animation-duration:${rnd(5, 10)}s;animation-delay:${rnd(0, 4)}s`; }
    const ctl = dm('div', 'sc-ctl', root), mute = dm('button', 'sc-btn', ctl, AU.muted ? '🔇' : '🔊'), skip = dm('button', 'sc-btn', ctl, 'Skip');
    mute.setAttribute('aria-label', 'Sound on or off'); skip.setAttribute('aria-label', 'Skip');
    let music = null, cur = null, finished = false; const t0 = c ? AU.now() + .25 : 0, hasNom = !cfg.skipNominees && ((cfg.nominees || []).length > 0 || cfg.writein);
    const nomEst = hasNom ? (cfg.writein ? 3.8 : 12.5) : 0;
    if (c) music = mbuf ? AU.track(mbuf, t0) : AU.score(t0, T.D + nomEst + 3, T.R, hasNom ? T.D : null);
    const finish = () => { if (finished) return; finished = true; if (cur) cur.end(); if (c) AU.fade(music, AU.now() + .05, 1.2); root.classList.remove('on'); setTimeout(() => { root.remove(); resolve(); }, 700); };
    skip.onclick = () => { if (cur) cur.end(); };
    mute.onclick = () => { AU.setMuted(!AU.muted); mute.textContent = AU.muted ? '🔇' : '🔊'; };
    const runB = () => {
      if (finished) return; if (!hasNom) { finish(); return; }
      const P = makePhase(c); cur = P; window.__scene = { phase: 'B', skip: () => P.end() };
      const len = nomPhase(root, X, P); P.start(c ? AU.now() + .1 : 0); P.later(len * 1000, () => P.end()); P.onDone = () => { root.querySelectorAll('.sc-layer').forEach((l) => l.remove()); finish(); };
    };
    const P = makePhase(c); cur = P; window.__scene = { phase: 'A', skip: () => P.end() };
    introPhase(root, X, P);
    beats.forEach((b) => { const vs = b.vstart == null ? b.start || 0 : b.vstart;
      if (c && b.audio && bufs[b.audio]) { const s = AU.playClip(bufs[b.audio], P.vbus, t0 + vs, b), L = AU.clipLen(bufs[b.audio], b); AU.duck(t0 + vs - .1, t0 + vs + L + .3); }
      else if (c && b.text && cfg.tts) P.later(vs * 1000, () => AU.speak(b.text)); });
    P.start(t0); P.later(T.D * 1000, () => P.end());
    P.onDone = () => { root.querySelectorAll('.sc-layer').forEach((l) => l.remove()); runB(); };
    requestAnimationFrame(() => root.classList.add('on'));
  });
}
