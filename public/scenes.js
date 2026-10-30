/* scenes.js: cinematic award animations. Pure SVG + Web Animations API (no video files).
   Every visual is driven by delays on animations, so a scene is fully deterministic. */
const SVN = 'http://www.w3.org/2000/svg', G = 450;
const sv = (t, a = {}, p) => { const e = document.createElementNS(SVN, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.append(e); return e; };
const dm = (t, c, p, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; if (p) p.append(e); return e; };
const rnd = (a, b) => a + Math.random() * (b - a);
const T = (x, y, r) => `translate(${x}px,${y}px)` + (r != null ? ` rotate(${r}deg)` : '');
const rotF = (d) => ({ transform: `rotate(${d}deg)` });

function sceneStyleFor(title, key) {
  if (key && key !== 'auto' && STYLES[key]) return key;
  const t = String(title || '').toLowerCase();
  if (/glove|keeper|goalie|yashin/.test(t)) return 'glove';
  if (/pusk|goal of|screamer/.test(t)) return 'puskas';
  if (/maestro|playmaker|assist|xavi/.test(t)) return 'maestro';
  if (/rising|kopa|young|rookie|newcomer|improv|comeback/.test(t)) return 'rising';
  if (/clanger|spoon|mierda|worst|oscar|dive|room for|work.?on/.test(t)) return 'joke';
  if (/people|choice|legend|write/.test(t)) return 'people';
  return 'dor';
}

// ---------- building blocks ----------
function backdrop(X, o = {}) {
  const cam = X.cam;
  const defs = sv('defs', {}, X.svg);
  defs.innerHTML = '<radialGradient id="bgrad" cx="35%" cy="30%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f3e3a6"/><stop offset="1" stop-color="#b8902a"/></radialGradient>' +
    '<linearGradient id="grd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a0c"/><stop offset="1" stop-color="#050402"/></linearGradient>' +
    '<radialGradient id="flg"><stop offset="0" stop-color="#fff4c4" stop-opacity=".95"/><stop offset="1" stop-color="#F5D778" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c4" stop-opacity=".5"/><stop offset="1" stop-color="#F5D778" stop-opacity="0"/></linearGradient>';
  // warm backlight so black silhouettes read as shadows
  sv('ellipse', { cx: 500, cy: 330, rx: 620, ry: 260, fill: 'url(#flg)', opacity: o.dim ? .16 : .3 }, cam);
  if (o.crowd !== false) {
    const cg = sv('g', { opacity: .75 }, cam);
    for (let i = 0; i < 60; i++) { const x = 6 + i * 16.7, y = 372 + (i % 3) * 8; sv('circle', { cx: x, cy: y, r: 6.5, fill: '#060403' }, cg); sv('rect', { x: x - 8, y: y + 5, width: 16, height: 80, fill: '#060403' }, cg); }
  }
  [[110, 40], [370, 18], [630, 18], [890, 40]].forEach(([x, y], i) => {
    const l = sv('circle', { cx: x, cy: y, r: 46, fill: 'url(#flg)' }, cam);
    X.A(l, [{ opacity: .55 }, { opacity: 1 }, { opacity: .6 }], { duration: 2400 + i * 300, iterations: Infinity });
    sv('polygon', { points: `${x - 8},${y} ${x + 8},${y} ${x + 110},${G} ${x - 110},${G}`, fill: 'url(#beam)', opacity: .22 }, cam);
  });
  sv('rect', { x: -300, y: G, width: 1600, height: 300, fill: 'url(#grd)' }, cam);
  sv('line', { x1: -300, y1: G, x2: 1300, y2: G, stroke: '#F5D778', 'stroke-opacity': .5, 'stroke-width': 2 }, cam);
  let net = null;
  if (o.goal !== false) {
    const gg = sv('g', {}, cam);
    net = sv('g', {}, gg);
    for (let x = 850; x <= 935; x += 12) sv('line', { x1: x, y1: 250, x2: x, y2: G, stroke: '#fff', 'stroke-opacity': .22 }, net);
    for (let y = 250; y <= G; y += 14) sv('line', { x1: 840, y1: y, x2: 935, y2: y, stroke: '#fff', 'stroke-opacity': .22 }, net);
    const f = { stroke: '#F5D778', 'stroke-width': 5, 'stroke-linecap': 'round', style: 'filter:drop-shadow(0 0 6px #F5D778)' };
    sv('line', { x1: 840, y1: G, x2: 840, y2: 250, ...f }, gg); sv('line', { x1: 840, y1: 250, x2: 935, y2: 250, ...f }, gg); sv('line', { x1: 935, y1: 250, x2: 935, y2: G, ...f, 'stroke-width': 3 }, gg);
  }
  return { net };
}
function rig(X, parent, { x, y, s = .9, flip = 1, color = '#050403' }) {
  const place = sv('g', { transform: `translate(${x} ${y == null ? G - 84 * s : y})` }, parent);
  const mv = sv('g', {}, place), fl = sv('g', { transform: `scale(${s * flip} ${s})` }, mv);
  const body = sv('g', { style: 'filter:drop-shadow(0 0 3px #F5D778cc)' }, fl);
  const st = { stroke: color, 'stroke-linecap': 'round', fill: 'none' };
  const J = (p, jx, jy) => { const o = sv('g', { transform: `translate(${jx} ${jy})` }, p); return sv('g', {}, o); };
  const L = (p, len, w) => sv('line', { x1: 0, y1: 0, x2: 0, y2: len, ...st, 'stroke-width': w }, p);
  const torso = sv('g', {}, body);
  sv('line', { x1: 0, y1: 0, x2: 0, y2: -62, ...st, 'stroke-width': 19 }, torso);
  sv('circle', { cx: 0, cy: -84, r: 13, fill: color }, torso);
  const aL = J(torso, 0, -54), fL = J(aL, 0, 29); L(aL, 29, 11); L(fL, 27, 10);
  const aR = J(torso, 0, -54), fR = J(aR, 0, 29); L(aR, 29, 11); L(fR, 27, 10);
  const tL = J(body, 0, 0), sL = J(tL, 0, 42); L(tL, 42, 15); L(sL, 42, 13); sv('line', { x1: 0, y1: 42, x2: 13, y2: 44, ...st, 'stroke-width': 10 }, sL);
  const tR = J(body, 0, 0), sR = J(tR, 0, 42); L(tR, 42, 15); L(sR, 42, 13); sv('line', { x1: 0, y1: 42, x2: 13, y2: 44, ...st, 'stroke-width': 10 }, sR);
  const r = { place, mv, fl, body, torso, aL, fL, aR, fR, tL, sL, tR, sR, s, x };
  setPose(r, STAND);
  return r;
}
const STAND = { aL: 10, fL: -28, aR: -10, fR: -34, tL: 5, sL: -3, tR: -5, sR: -2, torso: 4 };
function setPose(r, p) { for (const k in p) r[k].style.transform = `rotate(${p[k]}deg)`; }
function ball(X, parent, x, y, r = 8) {
  const m = sv('g', { transform: `translate(${x} ${y})` }, parent), mv = sv('g', {}, m);
  sv('circle', { r, fill: 'url(#bgrad)', stroke: '#b8902a', 'stroke-width': 1.2, style: 'filter:drop-shadow(0 0 5px #fff8)' }, mv);
  sv('path', { d: `M0 ${-r * .45} l${r * .43} ${r * .32} l${-r * .16} ${r * .5} h${-r * .54} l${-r * .16} ${-r * .5}z`, fill: '#2a1d05', opacity: .75 }, mv);
  return { mv, x, y, r };
}
const F = { fill: 'forwards' };
function run(X, r, t0, dur, period = 420) {
  const n = Math.max(1, Math.ceil(dur / period)), A = X.A;
  const cyc = (el, fr, off) => A(el, fr, { delay: t0 + off, duration: period, iterations: n, easing: 'linear', ...F });
  const th = (a, b) => [rotF(a), rotF(b), rotF(a)];
  const sh = [{ transform: 'rotate(20deg)', offset: 0 }, { transform: 'rotate(88deg)', offset: .25 }, { transform: 'rotate(15deg)', offset: .5 }, { transform: 'rotate(5deg)', offset: .75 }, { transform: 'rotate(20deg)', offset: 1 }];
  cyc(r.tL, th(40, -40), 0); cyc(r.tR, th(-40, 40), 0);
  cyc(r.sL, sh, 0); cyc(r.sR, sh, period / 2);
  cyc(r.aL, th(-38, 38), 0); cyc(r.aR, th(38, -38), 0);
  A(r.torso, [rotF(10), rotF(10)], { delay: t0, duration: dur, ...F });
  A(r.body, [{ transform: T(0, 0) }, { transform: T(0, -5) }, { transform: T(0, 0) }], { delay: t0, duration: period / 2, iterations: n * 2, ...F });
}
function stand(X, r, t) { const A = X.A; ['aL', 'fL', 'aR', 'fR', 'tL', 'sL', 'tR', 'sR', 'torso'].forEach((k) => A(r[k], [rotF(STAND[k]), rotF(STAND[k])], { delay: t, duration: 50, ...F })); A(r.body, [{ transform: T(0, 0) }, { transform: T(0, 0) }], { delay: t, duration: 50, ...F }); }
function mx(X, r, t0, dur, x0, x1, y0 = 0, y1 = 0, easing = 'linear') { return X.A(r.mv, [{ transform: T(x0, y0) }, { transform: T(x1, y1) }], { delay: t0, duration: dur, easing, ...F }); }
function dribble(X, b, t0, dur, x0, x1) {
  const n = Math.max(2, Math.round(dur / 280)), fr = [];
  for (let i = 0; i <= n; i++) fr.push({ transform: T(x0 + ((x1 - x0) * i) / n, i % 2 ? -11 : 0) });
  X.A(b.mv, fr, { delay: t0, duration: dur, easing: 'linear', ...F });
}
function fly(X, b, t0, dur, [wx0, wy0], [wx1, wy1], h, o = {}) {
  const rx0 = wx0 - b.x, ry0 = wy0 - b.y, rx1 = wx1 - b.x, ry1 = wy1 - b.y, fr = [], n = 16;
  for (let i = 0; i <= n; i++) { const u = i / n; fr.push({ transform: T(rx0 + (rx1 - rx0) * u, ry0 + (ry1 - ry0) * u - 4 * h * u * (1 - u)) + (o.shrink ? ` scale(${1 - (1 - o.shrink) * u})` : '') }); }
  return X.A(b.mv, fr, { delay: t0, duration: dur, easing: 'linear', ...o.opt, ...F });
}
function kick(X, r, t0, len = 720) {
  const A = X.A, o = { delay: t0, duration: len, ...F };
  A(r.tR, [{ transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(58deg)', offset: .3 }, { transform: 'rotate(-85deg)', offset: .55 }, { transform: 'rotate(-30deg)', offset: .8 }, { transform: 'rotate(-5deg)', offset: 1 }], o);
  A(r.sR, [{ transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(105deg)', offset: .3 }, { transform: 'rotate(-4deg)', offset: .55 }, { transform: 'rotate(30deg)', offset: .8 }, { transform: 'rotate(0deg)', offset: 1 }], o);
  A(r.torso, [{ transform: 'rotate(6deg)', offset: 0 }, { transform: 'rotate(-8deg)', offset: .3 }, { transform: 'rotate(16deg)', offset: .55 }, { transform: 'rotate(8deg)', offset: 1 }], o);
  A(r.aL, [rotF(10), rotF(-60), rotF(40), rotF(10)], o); A(r.aR, [rotF(-10), rotF(50), rotF(-50), rotF(-10)], o);
  return t0 + len * .55;
}
function cheer(X, r, t0, dur = 1800) {
  const A = X.A, o = { delay: t0, duration: dur, ...F };
  A(r.aL, [rotF(10), rotF(-165), rotF(-150), rotF(-165)], o); A(r.aR, [rotF(-10), rotF(-165), rotF(-175), rotF(-165)], o);
  A(r.fL, [rotF(-28), rotF(-10), rotF(-10)], o); A(r.fR, [rotF(-34), rotF(-10), rotF(-10)], o);
  A(r.torso, [rotF(4), rotF(-8), rotF(-8)], o);
  { const cx = r.cx || 0, cy = r.cy || 0; A(r.mv, [{ transform: T(cx, cy) }, { transform: T(cx, cy - 44) }, { transform: T(cx, cy) }, { transform: T(cx, cy - 30) }, { transform: T(cx, cy) }], { delay: t0, duration: dur * .8, ...F }); }
}
function fall(X, r, t0, dur, dx = 34) {
  X.A(r.mv, [{ transform: T(0, 0, 0) }, { transform: T(dx, 70, -88) }], { delay: t0, duration: dur, easing: 'ease-in', ...F });
}
function keeper(X, x = 892) { const k = rig(X, X.cam, { x, s: .95, flip: -1 }); setPose(k, { aL: -50, fL: -20, aR: -60, fR: -20, tL: 12, sL: -6, tR: -12, sR: -6, torso: 0 }); return k; }
function dive(X, k, t0, dur, dx, dy, deg) {
  const A = X.A, o = { delay: t0, duration: dur, easing: 'ease-out', ...F };
  A(k.mv, [{ transform: T(0, 0, 0) }, { transform: T(dx, dy, deg) }], o);
  A(k.aL, [rotF(-50), rotF(-170)], o); A(k.aR, [rotF(-60), rotF(-165)], o); A(k.fL, [rotF(-20), rotF(0)], o); A(k.fR, [rotF(-20), rotF(0)], o);
}
function wobble(X, net, t) { if (net) X.A(net, [{ transform: T(0, 0) }, { transform: T(16, 0) }, { transform: T(-5, 0) }, { transform: T(0, 0) }], { delay: t, duration: 700 }); }
const vis = (X, el, t0, t1) => { const D = X.D + 4000, f = (t) => Math.min(1, t / D); X.A(el, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(t0) }, { opacity: 1, offset: f(t0 + 350) }, { opacity: 1, offset: f(t1 - 350) }, { opacity: 0, offset: f(t1) }, { opacity: 0, offset: 1 }], { delay: 0, duration: D, fill: 'both', easing: 'linear' }); };
function burstStars(X, parent, x, y, t0, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, l = sv('line', { x1: 0, y1: 0, x2: 14, y2: 0, stroke: '#F5D778', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0, transform: `translate(${x} ${y}) rotate(${(a * 180) / Math.PI})` }, parent);
    X.A(l, [{ opacity: 1, transform: `translate(${x}px,${y}px) rotate(${(a * 180) / Math.PI}deg) translateX(6px)` }, { opacity: 0, transform: `translate(${x}px,${y}px) rotate(${(a * 180) / Math.PI}deg) translateX(60px)` }], { delay: t0, duration: 700, easing: 'ease-out', fill: 'both' });
  }
}

// ---------- the eight award styles ----------
const STYLES = {
  dor(X) {   // grand: slow-motion solo goal
    const { U, W, cam } = X, bd = backdrop(X), kp = keeper(X);
    const p = rig(X, cam, { x: 110 }), d1 = rig(X, cam, { x: 400, flip: -1 }), d2 = rig(X, cam, { x: 620, flip: -1 }), b = ball(X, cam, 150, G - 8);
    [d1, d2].forEach((d) => setPose(d, { ...STAND, aL: -35, aR: -55, torso: -3 }));
    run(X, p, U(0), W * .32); mx(X, p, U(0), W * .32, 0, 220); dribble(X, b, U(0), W * .32, 0, 220);
    fall(X, d1, U(.27), W * .1);
    run(X, p, U(.32), W * .3); mx(X, p, U(.32), W * .3, 220, 440); dribble(X, b, U(.32), W * .3, 220, 440);
    fall(X, d2, U(.57), W * .1); X.fx(U(.58), 'whoosh');
    stand(X, p, U(.62)); const imp = kick(X, p, U(.66)); X.fx(imp, 'kick');
    fly(X, b, imp, W * .2, [590, G - 8], [905, 272], 90); wobble(X, bd.net, imp + W * .2); X.fx(imp + W * .2, 'swish'); X.fx(imp + W * .2, 'roar', 3.5);
    dive(X, kp, imp + W * .08, W * .12, -60, 40, -70);
    p.cx = 440; cheer(X, p, U(.9), 1900);
    X.A(cam, [{ transform: 'scale(1)', transformOrigin: '500px 330px' }, { transform: 'scale(1.18)', transformOrigin: '500px 330px' }], { delay: U(.62), duration: W * .38, easing: 'ease-in-out', ...F });
  },
  puskas(X) {   // long-range volley
    const { U, W, cam } = X, bd = backdrop(X), kp = keeper(X);
    const p = rig(X, cam, { x: 170, s: 1 }), b = ball(X, cam, 215, G - 8);
    setPose(p, STAND); X.fx(U(0), 'whistle');
    mx(X, p, U(0), W * .3, 0, 60); run(X, p, U(0), W * .3);
    stand(X, p, U(.34)); const imp = kick(X, p, U(.4), 800); X.fx(imp, 'kick');
    for (let i = 0; i < 6; i++) { const g = ball(X, cam, 215, G - 8, 8 - i * .8); g.mv.style.opacity = '0'; fly(X, g, imp + i * 45, W * .34, [275, G - 8], [915, 268], 160, { opt: { easing: 'linear' } }); X.A(g.mv, [{ opacity: 0 }, { opacity: .5 / (i + 1) }, { opacity: 0 }], { delay: imp + i * 45, duration: W * .34, ...F }); }
    fly(X, b, imp, W * .34, [275, G - 8], [915, 268], 160);
    X.A(cam, [{ transform: 'translate(0px,0px) scale(1)', transformOrigin: '500px 330px' }, { transform: 'translate(-90px,10px) scale(1.25)', transformOrigin: '500px 330px' }], { delay: imp, duration: W * .34, easing: 'ease-in', ...F });
    X.fx(imp + 200, 'whoosh'); const hit = imp + W * .34; dive(X, kp, hit - W * .12, W * .12, -40, -60, -62);
    wobble(X, bd.net, hit); X.fx(hit, 'swish'); X.fx(hit, 'roar', 3.5); X.fx(hit, 'boom');
    burstStars(X, cam, 915, 268, hit, 10); p.cx = 60; cheer(X, p, hit + 500, 1800);
  },
  glove(X) {   // two big saves
    const { U, W, cam } = X, bd = backdrop(X), kp = keeper(X, 880), s1 = rig(X, cam, { x: 330 }), b1 = ball(X, cam, 380, G - 8), b2 = ball(X, cam, 380, G - 8);
    X.fx(U(0), 'whistle');
    const i1 = kick(X, s1, U(.08)); X.fx(i1, 'kick'); fly(X, b1, i1, W * .26, [440, G - 8], [905, 430], 40);
    dive(X, kp, i1 + W * .08, W * .16, -70, 58, -78); X.fx(i1 + W * .26, 'thud');
    fly(X, b1, i1 + W * .26, W * .2, [905, 430], [640, 190], 70, { shrink: .8 }); burstStars(X, cam, 905, 425, i1 + W * .26, 9);
    stand(X, kp, U(.5)); X.A(kp.mv, [{ transform: T(-70, 58, -78) }, { transform: T(0, 0, 0) }], { delay: U(.5), duration: 600, ...F });
    stand(X, s1, U(.5)); const i2 = kick(X, s1, U(.58)); X.fx(i2, 'kick'); fly(X, b2, i2, W * .22, [440, G - 8], [900, 262], 90);
    dive(X, kp, i2 + W * .09, W * .13, -48, -92, -52); X.fx(i2 + W * .22, 'thud'); X.fx(i2 + W * .22, 'roar', 3);
    fly(X, b2, i2 + W * .22, W * .18, [900, 262], [760, 70], 60, { shrink: .7 }); burstStars(X, cam, 896, 258, i2 + W * .22, 12);
    cheer(X, kp, U(.92), 1700);
  },
  maestro(X) {   // passing move
    const { U, W, cam } = X, bd = backdrop(X), xs = [180, 400, 600, 760], P = xs.map((x) => rig(X, cam, { x, s: .9 })), b = ball(X, cam, xs[0] + 36, G - 8);
    const trail = (x0, x1, h, t0, dur) => { const pth = sv('path', { d: `M${x0} ${G - 8} Q${(x0 + x1) / 2} ${G - 8 - h * 2} ${x1} ${G - 8}`, stroke: '#F5D778', 'stroke-width': 3, fill: 'none', 'stroke-dasharray': '1200', 'stroke-dashoffset': '1200', opacity: .8, style: 'filter:drop-shadow(0 0 5px #F5D778)' }, cam); X.A(pth, [{ strokeDashoffset: 1200, opacity: .9 }, { strokeDashoffset: 0, opacity: .9 }, { strokeDashoffset: 0, opacity: 0 }], { delay: t0, duration: dur * 2.2, easing: 'ease-out', ...F }); };
    let t = U(.04), dur = W * .15; X.fx(t - 100, 'whistle');
    for (let i = 0; i < 3; i++) {
      const a = xs[i] + 36, c = xs[i + 1] + 36, imp = kick(X, P[i], t, 600); X.fx(imp, 'kick'); trail(a, c, 70, imp, dur);
      fly(X, b, imp, dur, [a, G - 8], [c, G - 8], 70); X.fx(imp + dur, 'pop'); stand(X, P[i], t + 900);
      t += dur + 380;
    }
    const imp = kick(X, P[3], t, 700); X.fx(imp, 'kick'); fly(X, b, imp, W * .17, [xs[3] + 36, G - 8], [905, 300], 60); wobble(X, bd.net, imp + W * .17); X.fx(imp + W * .17, 'swish'); X.fx(imp + W * .17, 'roar', 3);
    P.forEach((r, i) => { r.cx = 0; cheer(X, r, imp + W * .2 + i * 90, 1700); });
    const kp = keeper(X, 905); dive(X, kp, imp + W * .06, W * .1, -30, 20, -40);
  },
  rising(X) {   // climbing the steps
    const { U, W, cam } = X; backdrop(X, { goal: false });
    const steps = [[330, 410], [450, 378], [570, 346], [690, 314]];
    steps.forEach(([x, y], i) => { const r = sv('rect', { x: x - 58, y, width: 116, height: G - y, fill: '#0a0805', stroke: '#F5D778', 'stroke-opacity': .6, 'stroke-width': 2 }, cam); X.A(r, [{ opacity: 0, transform: T(0, 40) }, { opacity: 1, transform: T(0, 0) }], { delay: U(0) + i * 180, duration: 500, easing: 'ease-out', ...F }); });
    const p = rig(X, cam, { x: 150, y: G - 84 * .7, s: .7 }); X.fx(U(0), 'whistle'); run(X, p, U(.02), W * .18, 360); mx(X, p, U(.02), W * .18, 0, 110);
    steps.forEach(([x, y], i) => {
      const t = U(.2 + i * .16), top = y - 84 * (.7 + i * .12), prev = i ? steps[i - 1] : [150 + 110, G]; const x0 = (i ? prev[0] : 260) - 150, x1 = x - 150;
      X.A(p.mv, [{ transform: T(x0, i ? steps[i - 1][1] - G : 0) }, { transform: T((x0 + x1) / 2, y - G - 90) }, { transform: T(x1, y - G) }], { delay: t, duration: W * .13, easing: 'ease-out', ...F });
      X.fx(t + W * .13, 'pop'); burstStars(X, cam, x, y - 130, t + W * .13, 8);
      X.A(p.fl, [{ transform: `scale(${.7 + i * .12})` }, { transform: `scale(${.7 + (i + 1) * .12})` }], { delay: t, duration: W * .13, ...F });
      if (i < 3) stand(X, p, t + W * .13);
    });
    p.cx = 690 - 150; p.cy = 314 - G; cheer(X, p, U(.9), 1800);
    const star = sv('polygon', { points: '0,-26 8,-8 28,-8 12,4 18,24 0,12 -18,24 -12,4 -28,-8 -8,-8', fill: '#F5D778', style: 'filter:drop-shadow(0 0 12px #F5D778)', opacity: 0 }, cam);
    X.A(star, [{ opacity: 0, transform: T(690, 120) + ' scale(.2)' }, { opacity: 1, transform: T(690, 130) + ' scale(1.6)' }], { delay: U(.78), duration: 900, ...F }); X.fx(U(.78), 'chime');
  },
  joke(X) {   // the glorious miss
    const { U, W, cam } = X, bd = backdrop(X), kp = keeper(X), p = rig(X, cam, { x: 260 }), b = ball(X, cam, 310, G - 8);
    X.fx(U(0), 'whistle'); run(X, p, U(0), W * .16, 400); mx(X, p, U(0), W * .16, -120, 0);
    stand(X, p, U(.18)); const imp = kick(X, p, U(.2)); X.fx(imp, 'kick');
    fly(X, b, imp, W * .3, [370, G - 8], [1180, -240], 330, { shrink: .35 });
    X.A(kp.mv, [{ transform: T(0, 0) }, { transform: T(0, 0) }], { delay: imp, duration: 100, ...F });
    X.fx(imp + W * .22, 'groan');
    const fl = U(.58); X.fx(fl, 'trombone');
    X.A(p.mv, [{ transform: T(0, 0, 0) }, { transform: T(-10, 8, 0) }, { transform: T(-40, 66, 88) }], { delay: fl, duration: 900, easing: 'ease-in', ...F });
    X.A(p.aL, [rotF(10), rotF(-120)], { delay: fl, duration: 700, ...F }); X.A(p.aR, [rotF(-10), rotF(-140)], { delay: fl, duration: 700, ...F });
    const b2 = ball(X, cam, 300, -140); fly(X, b2, fl + 1100, 900, [300, -140], [286, G - 140], 0); X.fx(fl + 1950, 'bonk');
    X.A(b2.mv, [{ opacity: 0 }, { opacity: 1 }], { delay: fl + 1000, duration: 100, ...F }); b2.mv.style.opacity = '0';
    fly(X, b2, fl + 2000, 700, [286, G - 140], [330, G - 8], 60);
    const q = sv('text', { x: 255, y: 250, 'font-size': 90, fill: '#F5D778', 'font-family': 'Cinzel,serif', 'font-weight': 800, opacity: 0, style: 'filter:drop-shadow(0 0 10px #F5D778)' }, cam); q.textContent = '?';
    X.A(q, [{ opacity: 0, transform: T(0, 20) }, { opacity: 1, transform: T(0, -10) }, { opacity: 1, transform: T(0, -10) }], { delay: fl + 400, duration: 800, ...F });
  },
  people(X) {   // the crowd decides
    const { U, W, cam } = X; backdrop(X, { goal: false, crowd: false, dim: true });
    const rows = [[300, .5, 26], [365, .65, 20], [440, .8, 16]], figs = [];
    rows.forEach(([y, s, n], ri) => { for (let i = 0; i < n; i++) {
      const x = 20 + (i + (ri % 2) * .5) * (960 / n), g = sv('g', { transform: `translate(${x} ${y}) scale(${s})` }, cam), bb = sv('g', {}, g);
      sv('circle', { cx: 0, cy: -34, r: 11, fill: '#050403' }, bb); sv('path', { d: 'M-17 0 Q-17 -22 0 -22 Q17 -22 17 0 Z', fill: '#050403' }, bb);
      const mkArm = (sx) => { const o = sv('g', { transform: `translate(${sx} -16)` }, bb), a = sv('g', {}, o); sv('line', { x1: 0, y1: 0, x2: 0, y2: 26, stroke: '#050403', 'stroke-width': 7, 'stroke-linecap': 'round' }, a); return a; };
      const l = mkArm(-13), r = mkArm(13), dl = rnd(0, 1200), up = U(.55) + rnd(0, 900);
      X.A(l, [rotF(8), rotF(-150), rotF(-115), rotF(-150)], { delay: Math.min(dl + U(.15), U(.55)) , duration: 1100, iterations: 8, ...F });
      X.A(r, [rotF(-8), rotF(150), rotF(115), rotF(150)], { delay: Math.min(dl + U(.2), U(.55)), duration: 1000, iterations: 8, ...F });
      X.A(bb, [{ transform: T(0, 0) }, { transform: T(0, -7) }, { transform: T(0, 0) }], { delay: U(.1) + dl, duration: 560, iterations: 24, ...F });
      figs.push(bb); } });
    const beam = sv('polygon', { points: '-90,-40 90,-40 330,460 -330,460', fill: 'url(#beam)', opacity: .5, style: 'mix-blend-mode:screen' }, cam);
    X.A(beam, [{ transform: T(120, 0) }, { transform: T(880, 0) }, { transform: T(500, 0) }], { delay: U(.08), duration: W * .8, easing: 'ease-in-out', ...F });
    X.fx(U(0), 'whistle'); X.fx(U(.04), 'roar', X.W / 1000 * .9);
    const q = sv('text', { x: 500, y: 250, 'text-anchor': 'middle', 'font-size': 240, fill: '#F5D778', 'font-family': 'Cinzel,serif', 'font-weight': 800, opacity: 0, style: 'filter:drop-shadow(0 0 22px #F5D778)' }, cam); q.textContent = '?';
    X.A(q, [{ opacity: 0, transform: T(0, 60) + ' scale(.6)' }, { opacity: 1, transform: T(0, 0) + ' scale(1)' }], { delay: U(.62), duration: 1100, easing: 'ease-out', ...F });
    X.A(q, [{ transform: T(0, 0) }, { transform: T(0, -14) }, { transform: T(0, 0) }], { delay: U(.62) + 1100, duration: 1800, iterations: 8 });
  },
  story(X) {   // opening movie: the work behind every nominee
    const { U, W, cam } = X, bd = backdrop(X), v = [0, 1, 2].map(() => sv('g', { opacity: 0 }, cam));
    vis(X, v[0], U(0), U(.34)); vis(X, v[1], U(.34), U(.68)); vis(X, v[2], U(.68), U(1.02));
    X.fx(U(0), 'whistle');
    // 1) slalom
    const p = rig(X, v[0], { x: 90 }), b = ball(X, v[0], 130, G - 8); [380, 480, 580, 680, 780].forEach((x) => sv('polygon', { points: `${x - 10},${G} ${x + 10},${G} ${x},${G - 26}`, fill: '#F5D778', opacity: .9 }, v[0]));
    run(X, p, U(.02), W * .28, 380); mx(X, p, U(.02), W * .28, 0, 760); dribble(X, b, U(.02), W * .28, 0, 760);
    const fr = []; for (let i = 0; i <= 10; i++) fr.push(i % 2 ? { transform: 'rotate(18deg)' } : { transform: 'rotate(2deg)' }); X.A(p.torso, fr, { delay: U(.02), duration: W * .28, easing: 'linear', ...F });
    // 2) shooting practice, three balls
    const s = rig(X, v[1], { x: 500 }); [0, 1, 2].forEach((i) => {
      const bb = ball(X, v[1], 550, G - 8), t0 = U(.37 + i * .1), imp = kick(X, s, t0, 700); X.fx(imp, 'kick'); fly(X, bb, imp, W * .09, [550, G - 8], [905, [420, 300, 360][i]], [30, 70, 50][i]); wobble(X, bd.net, imp + W * .09); X.fx(imp + W * .09, 'swish'); if (i < 2) stand(X, s, t0 + 800);
    });
    // 3) sprint, then arm to the sky
    const r = rig(X, v[2], { x: 80 }); run(X, r, U(.7), W * .24, 330); mx(X, r, U(.7), W * .24, 0, 740); X.fx(U(.7), 'whoosh');
    for (let i = 0; i < 9; i++) { const l = sv('line', { x1: 0, y1: 0, x2: 90 + rnd(0, 60), y2: 0, stroke: '#F5D778', 'stroke-width': 2, opacity: 0 }, v[2]); const y = 300 + i * 16; X.A(l, [{ opacity: 0, transform: T(60, y) }, { opacity: .5, transform: T(300, y) }, { opacity: 0, transform: T(560, y) }], { delay: U(.7) + i * 140, duration: 900, easing: 'ease-out', ...F }); }
    stand(X, r, U(.96)); X.A(r.aR, [rotF(-10), rotF(-170)], { delay: U(.97), duration: 500, ...F }); X.A(r.fR, [rotF(-34), rotF(-5)], { delay: U(.97), duration: 500, ...F }); burstStars(X, v[2], 820, 250, U(.97), 10);
  },
};
STYLES.rising.vb = '0 95 1000 425'; STYLES.people.vb = '0 150 1000 380';
STYLES.outro = STYLES.dor;

// ---------- the scene player ----------
const iconNode = (key) => { if (key === 'boot' || key === 'glove') { const s = dm('span', 'big'); s.textContent = key === 'boot' ? '👟' : '🧤'; s.style.filter = 'sepia(1) saturate(4) hue-rotate(-8deg)'; return s; } const s = document.createElementNS(SVN, 'svg'); s.setAttribute('class', 'ic big'); const u = document.createElementNS(SVN, 'use'); u.setAttribute('href', '#i-' + (key === 'star' || key === 'crown' ? key : 'trophy')); s.append(u); s.style.width = s.style.height = 'min(30vw,9rem)'; return s; };
const sentences = (t) => String(t || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

function runScene(cfg) {
  return new Promise(async (resolve) => {
    const X = { anims: [], timers: [], fxs: [], cfg }, S = {}, root = dm('div'), c = AU.init();
    root.id = 'scene'; document.body.append(root);
    const styleKey = sceneStyleFor(cfg.title, cfg.style);
    let vbuf = null, mbuf = null;
    if (c) [vbuf, mbuf] = await Promise.all([AU.buf(cfg.voice), AU.buf(cfg.music)]);
    const words = String(cfg.script || '').split(/\s+/).filter(Boolean).length;
    const vdur = vbuf ? vbuf.duration * 1000 : words * 430, voiceAt = (cfg.voiceAt == null ? 3 : cfg.voiceAt) * 1000;
    let D = Math.max(12000, (cfg.duration || 24) * 1000);
    if (cfg.script || vbuf) D = Math.max(D, voiceAt + vdur + 8200);
    D = Math.min(D, 48000);
    Object.assign(X, { D, R: D - 7000, A0: 2400 }); X.W = X.R - X.A0 - 500; X.U = (u) => X.A0 + u * X.W;
    X.A = (el, fr, o = {}) => { const a = el.animate(fr, { fill: 'both', easing: 'ease-in-out', duration: 500, ...o }); X.anims.push(a); return a; };
    X.fx = (ms, name, arg) => X.fxs.push([ms, name, arg]);
    // layers
    dm('div', 'sc-bg', root); const rays = dm('div', 'sc-rays', root), parts = dm('div', 'sc-parts', root);
    for (let i = 0; i < 20; i++) { const p = dm('i', '', parts); p.style.cssText = `left:${rnd(2, 98)}%;--dx:${rnd(-60, 60)}px;animation-duration:${rnd(5, 10)}s;animation-delay:${rnd(0, 4)}s`; }
    const stage = dm('div', 'sc-stage', root);
    const svg = sv('svg', { viewBox: (STYLES[styleKey] && STYLES[styleKey].vb) || '0 168 1000 350', preserveAspectRatio: 'xMidYMid meet' }, stage), cam = sv('g', {}, svg);
    X.svg = svg; X.cam = cam; cam.style.transformOrigin = '500px 330px';
    try { STYLES[styleKey](X); } catch (e) { console.error('scene style failed', e); }
    // captions
    const cap = dm('div', 'sc-cap', root), ss = sentences(cfg.script), tw = Math.max(1, words);
    let acc = 0;
    ss.forEach((s, i) => { const wc = s.split(/\s+/).length, st = voiceAt + (acc / tw) * vdur, en = voiceAt + ((acc + wc) / tw) * vdur + 500; acc += wc;
      const p = dm('p', '', cap, s), f = (t) => Math.min(1, t / D);
      X.A(p, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(st) }, { opacity: 1, offset: f(st + 350) }, { opacity: 1, offset: f(Math.max(st + 400, en - 350)) }, { opacity: 0, offset: f(Math.max(st + 450, en)) }, { opacity: 0, offset: 1 }], { delay: 0, duration: D, easing: 'linear' }); });
    // reveal
    const R = X.R, rev = dm('div', 'sc-reveal', root), flash = dm('div', 'sc-flash', root);
    if (cfg.image) { const im = dm('img', '', rev); im.src = cfg.image; im.alt = ''; X.A(im, [{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { delay: R + 300, duration: 1100, easing: 'ease-out', ...F }); }
    else { const ico = iconNode(cfg.icon); rev.append(ico); X.A(ico, [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { delay: R + 300, duration: 1100, easing: 'ease-out', ...F }); }
    const ti = dm('div', 'sc-title', rev); [...String(cfg.title || '')].forEach((ch, i) => { const sp = dm('span', '', ti, ch); X.A(sp, [{ opacity: 0, transform: 'translateY(18px) scale(1.3)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: R + 700 + i * 55, duration: 600, easing: 'ease-out', ...F }); });
    const lb = dm('div', 'k', rev, cfg.label || ''); X.A(lb, [{ opacity: 0 }, { opacity: 1 }], { delay: R + 1600, duration: 700, ...F });
    X.A(rev, [{ opacity: 0 }, { opacity: 1 }], { delay: R, duration: 500, ...F });
    X.A(flash, [{ opacity: 0 }, { opacity: .85, offset: .15 }, { opacity: 0 }], { delay: R - 50, duration: 900, easing: 'ease-out', ...F });
    X.A(rays, [{ opacity: 0, transform: 'rotate(0deg)' }, { opacity: .9, transform: 'rotate(10deg)', offset: .12 }, { opacity: .45, transform: 'rotate(60deg)' }], { delay: R - 50, duration: 7500, easing: 'linear', ...F });
    X.A(stage, [{ opacity: 1 }, { opacity: 1, offset: .0001 }, { opacity: .18 }], { delay: R, duration: 900, ...F });
    // controls
    const lab = dm('div', 'sc-lbl', root, cfg.label || ''), ctl = dm('div', 'sc-ctl', root);
    const mute = dm('button', 'sc-btn', ctl, AU.muted ? '🔇' : '🔊'), skip = dm('button', 'sc-btn', ctl, 'Skip');
    mute.setAttribute('aria-label', 'Sound on or off'); skip.setAttribute('aria-label', 'Skip animation');
    // audio
    const t0 = c ? AU.now() + .25 : 0; let music = null, done = false, tts = null;
    if (c) {
      music = mbuf ? AU.track(mbuf, t0, D / 1000) : AU.score(t0, D / 1000, X.R / 1000);
      if (vbuf) { const s = c.createBufferSource(); s.buffer = vbuf; s.connect(AU.voice); s.start(t0 + voiceAt / 1000); AU.duck(t0 + voiceAt / 1000 - .1, t0 + (voiceAt + vdur) / 1000 + .3); }
      X.fx(R - 2900, 'drumroll', 2.8); X.fx(R, 'boom'); X.fx(R + 100, 'chime'); X.fx(R + 200, 'roar', 4);
      X.fxs.forEach(([ms, n, a]) => AU.fx(n, t0 + ms / 1000, a));
      if (!vbuf && cfg.tts && cfg.script && !AU.muted) tts = setTimeout(() => AU.speak(cfg.script), voiceAt);
    }
    const finish = () => {
      if (done) return; done = true; clearTimeout(tts); clearTimeout(endT);
      if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {}
      if (c) AU.fade(music, AU.now() + .05, 1.1);
      root.classList.remove('on'); setTimeout(() => { root.remove(); resolve(); }, 650);
    };
    skip.onclick = finish; mute.onclick = () => { AU.setMuted(!AU.muted); mute.textContent = AU.muted ? '🔇' : '🔊'; };
    const endT = setTimeout(finish, D + 400);
    requestAnimationFrame(() => root.classList.add('on'));
    window.__scene = { X, D, finish };
  });
}
