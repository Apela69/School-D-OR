/* app.js: School D'Or front end (talks to /api/*, the Cloudflare backend) */
const NS = 'http://www.w3.org/2000/svg';
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const k in a) { if (k === 'class') e.className = a[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), a[k]); else e.setAttribute(k, a[k]); } c.flat().forEach((x) => e.append(x && x.nodeType ? x : document.createTextNode(x == null ? '' : x))); return e; };
const ic = (n, c = '') => { const s = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use'); s.setAttribute('class', 'ic ' + c); u.setAttribute('href', '#i-' + n); s.append(u); return s; };
const $ = (s) => document.getElementById(s);
const ADMIN_ROUTE = location.pathname.replace(/\/+$/, '') === '/admin';
let admin = false, cur = ADMIN_ROUTE ? 'admin' : 'home', q = '', fresh = true, mine = {}, mineW = {}, last = '', ready = false, failed = false, pending = {}, okMsg = {}, editing = {}, wiDraft = {};
let cer = { mode: 'land', i: 0 }, seen = {}, skipAnim = (function () { try { return localStorage.getItem('sd_skip') === '1'; } catch (e) { return false; } })(), sceneOn = false;
const S = { players: [], awards: [], set: { revealed: false, deadline: 0, codeRequired: false, tts: false }, tally: {}, voters: 0, writeins: {}, winnerW: {}, special: { intro: null, outro: null } };
const locked = () => S.set.revealed || (S.set.deadline && Date.now() > S.set.deadline);
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2800); }
for (let i = 0; i < 10; i++) { const s = document.createElement('i'); s.className = 'spark'; s.style.cssText = 'left:' + Math.random() * 100 + '%;animation-duration:' + (9 + Math.random() * 9) + 's;animation-delay:' + Math.random() * 8 + 's'; document.body.append(s); }
function burst(el) { if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = el.getBoundingClientRect(), c = ['#F5D778', '#D4AF37', '#fff', '#8a6a1c']; for (let i = 0; i < 12; i++) { const s = document.createElement('i'); s.className = 'cf'; s.style.cssText = 'left:' + (r.left + r.width / 2) + 'px;top:' + r.top + 'px;--dx:' + ((Math.random() - .5) * 200) + 'px;--dy:' + (-60 - Math.random() * 120) + 'px;background:' + c[i % 4]; document.body.append(s); setTimeout(() => s.remove(), 950); } }
function confirmBox(title, text, okLabel = 'Confirm') {
  return new Promise((res) => {
    const m = $('modal'); m.replaceChildren(); let done = false;
    const close = (v) => { if (done) return; done = true; m.classList.remove('on'); document.removeEventListener('keydown', key); res(v); };
    const key = (e) => { if (e.key === 'Escape') close(false); };
    const ok = h('button', { class: 'btn wide', onclick: () => close(true) }, okLabel);
    m.append(h('div', { class: 'mbox', role: 'dialog', 'aria-modal': 'true' }, h('h3', {}, title), h('p', {}, text), h('div', { class: 'btns' }, ok, h('button', { class: 'btn out wide', onclick: () => close(false) }, 'Cancel'))));
    m.onclick = (e) => { if (e.target === m) close(false); };
    document.addEventListener('keydown', key); m.classList.add('on'); setTimeout(() => ok.focus(), 30);
  });
}
/* ---- data layer (same API as before, plus voice/music/write-in) ---- */
const KEY = 'sd_admin'; let akey = sessionStorage.getItem(KEY) || '';
async function api(path, opt = {}) { const r = await fetch('/api/' + path, { ...opt, headers: { ...(opt.headers || {}), ...(akey ? { 'X-Admin-Key': akey } : {}) }, credentials: 'same-origin' }); const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || 'Error'), { status: r.status }); return d; }
async function load() { try { const d = await api('state'), j = JSON.stringify(d); failed = false; if (ready && j === last) return; ready = true; last = j; Object.assign(S, d); mine = d.mine || {}; mineW = d.mineW || {}; admin = !!d.admin; render(); } catch (e) { if (!ready) { ready = true; failed = true; render(); } } }
const oops = (m) => toast(m || 'Couldn’t save'), jp = (m, b) => ({ method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const add = async (n, d) => { try { await api('admin/' + n, jp('POST', d)); load(); } catch (e) { oops(); } }, upd = async (n, id, d) => { try { await api('admin/' + n + '/' + id, jp('PATCH', d)); load(); } catch (e) { oops(); } }, del = async (n, id) => { try { await api('admin/' + n + '/' + id, { method: 'DELETE' }); load(); } catch (e) { oops(); } }, setS = async (d) => { try { await api('admin/settings', jp('PUT', d)); load(); } catch (e) { oops(); } };
const metaSet = async (id, d) => { try { await api('admin/meta/' + id, jp('PUT', d)); load(); } catch (e) { oops('Couldn’t save. Did you run migration-v2.sql in D1?'); } };
const tally = () => S.tally || {};
const playerById = (id) => S.players.find((p) => p.id === id);
const meta = (a) => (a && a.meta) || {};
const kindOf = (a) => (meta(a).kind === 'writein' ? 'writein' : 'pick');
const styleOf = (a) => sceneStyleFor(a.title, meta(a).style);
const DEFAULTS = {
  dor: 'Season after season, one name rises above the rest. The player of the year. This is the School D’Or.',
  puskas: 'One strike. One moment. The goal that made the whole playground stop. The Puskás Award, for the finest goal of the season.',
  glove: 'Between the posts, he stands alone. The Golden Glove: for the keeper who said no, when everyone else said goal.',
  maestro: 'He doesn’t always score. But every great goal starts with him. The Maestro: for the player who makes everyone around him better.',
  rising: 'Every legend starts somewhere. This award is for the player who came from nowhere, and made us all look twice.',
  joke: 'Every great league needs a moment nobody forgets. This one is for the miss, the slip, the fail that made the whole pitch laugh. Vote with a smile.',
  people: 'This one is different. No shortlist. No nominees. Just your voice. Who is the legend of the lunchtime pitch? Type their name, and let the people decide.',
};
const scriptOf = (a) => meta(a).script || DEFAULTS[styleOf(a)] || '';
const durOf = (a) => meta(a).duration || (styleOf(a) === 'people' ? 30 : 24);
function sceneCfg(a, i, n) { const m = meta(a); return { title: a.title, style: m.style, script: scriptOf(a), duration: durOf(a), voice: m.voice, voiceAt: m.voice_at == null ? 3 : m.voice_at, music: m.music, image: a.photo ? '/api/photo/' + a.photo : null, icon: a.icon, label: 'Award ' + (i + 1) + ' of ' + n, tts: S.set.tts }; }
function specialCfg(key) { const m = S.special[key] || {}; return key === 'intro' ? { title: 'School D’Or', style: 'story', script: m.script || INTRO_DEF, duration: m.duration || 26, voice: m.voice, voiceAt: m.voice_at == null ? 3 : m.voice_at, music: m.music, icon: 'trophy', label: 'Where Lunchtime Legends Are Made', tts: S.set.tts } : { title: 'Thank You', style: 'people', script: m.script || OUTRO_DEF, duration: m.duration || 15, voice: m.voice, voiceAt: m.voice_at == null ? 2 : m.voice_at, music: m.music, icon: 'crown', label: 'Your votes are in', tts: S.set.tts }; }
const INTRO_DEF = 'Every lunchtime, somewhere on this pitch, a legend is born. Tonight, we celebrate them. This is the School D’Or.', OUTRO_DEF = 'Your votes are in. The legends will be revealed. Thank you for being part of the School D’Or.';
async function playScene(cfg) { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; sceneOn = true; try { await runScene(cfg); } catch (e) { console.error(e); } sceneOn = false; }
/* ---- helpers ---- */
const ICONS = { trophy: () => ic('trophy'), star: () => ic('star'), crown: () => ic('crown'), boot: () => h('span', { style: 'filter:sepia(1) saturate(4) hue-rotate(-8deg) brightness(.95)' }, '👟'), glove: () => h('span', { style: 'filter:sepia(1) saturate(4) hue-rotate(-8deg) brightness(.95)' }, '🧤') };
const iconOf = (a) => (ICONS[a.icon] || ICONS.trophy)();
const num = (v) => (v == null || v === '' ? '–' : v), rate = (v) => (v == null || v === '' ? '–' : (+v).toFixed(1));
const photo = (p) => (p && p.photo ? h('img', { src: '/api/photo/' + p.photo, alt: p.name || '', loading: 'lazy' }) : ic('sil'));
const stat = (l, v) => h('div', { class: 'ps' }, h('b', {}, l === 'Rating' ? rate(v) : num(v)), h('small', {}, l));
function pcard(p, o = {}) { return h('div', { class: 'pc' + (o.cls || ''), style: '--i:' + Math.min(o.i || 0, 8) }, h('div', { class: 'in' }, h('div', { class: 'pimg' }, photo(p)), h('div', { class: 'pbody' }, o.badge || '', h('div', { class: 'pname' }, p.name), h('div', { class: 'psub' }, p.position || 'Player'), h('div', { class: 'pstats' }, stat('Goals', p.goals), stat('Assists', p.assists), stat('Rating', p.rating)), ...(o.extra || [])))); }
const head = (t, s) => [h('h2', { class: 't gt' }, t), h('p', { class: 'sub2' }, s || '')];
const state = () => (!ready ? h('div', { class: 'msg' }, 'Loading…') : failed ? h('div', { class: 'msg' }, 'Couldn’t reach the server. Please refresh the page.') : null);
const winnerOf = (a) => { const c = tally()[a.id] || {}; let b = null, m = 0; (a.nominees || []).forEach((id) => { if ((c[id] || 0) > m) { m = c[id]; b = playerById(id); } }); return b; };
/* ---- public views ---- */
function home() {
  return h('section', { class: 'hero' },
    h('div', { class: 'hv' }, h('div', { class: 'glow' }), h('img', { class: 'trophy', src: '/ball.jpg', alt: 'School D’Or trophy' })),
    h('div', {}, h('div', { class: 'eyebrow' }, 'Lunchtime Football Awards'), h('h1', { class: 'shine' }, 'SCHOOL D’OR'), h('p', { class: 'tagline' }, 'Where Lunchtime Legends Are Made'),
      h('div', { class: 'cta' }, h('button', { class: 'btn', onclick: () => go('awards') }, 'View Awards'), h('button', { class: 'btn out', onclick: () => go('players') }, 'Meet the Players'), h('button', { class: 'btn out', onclick: async () => { await playScene(specialCfg('intro')); } }, '▶ Watch the story'))));
}
function players() {
  const grid = h('div', { class: 'grid stg' });
  const fill = () => { const l = [...S.players].filter((p) => ((p.name || '') + ' ' + (p.position || '')).toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.rating || 0) - (a.rating || 0)); grid.replaceChildren(...(l.length ? l.map((p, i) => pcard(p, { i })) : [h('div', { class: 'msg' }, ready ? 'No players found.' : 'Loading…')])); };
  fill();
  return h('div', {}, ...head('Players', 'Every player in the running for School D’Or.'), state() || '', h('input', { class: 'sinp', type: 'search', placeholder: 'Search players', value: q, 'aria-label': 'Search players', oninput: (e) => { q = e.target.value; fill(); } }), grid);
}
function awards() {
  const lk = locked();
  return h('div', {}, ...head('Awards', 'The honours up for grabs this season.'), state() || '',
    S.awards.length ? h('div', { class: 'agrid stg' }, ...S.awards.map((a, i) => {
      const noms = (a.nominees || []).map(playerById).filter(Boolean), w = S.set.revealed ? (kindOf(a) === 'writein' ? (S.winnerW[a.id] ? { name: S.winnerW[a.id] } : null) : winnerOf(a)) : null, wi = kindOf(a) === 'writein';
      return h('article', { class: 'ac', style: '--i:' + Math.min(i, 8) }, h('div', { class: 'av' }, a.photo ? h('img', { src: '/api/photo/' + a.photo, alt: a.title, loading: 'lazy' }) : h('div', { class: 'ico' }, iconOf(a))),
        h('div', { class: 'ab' }, h('h3', {}, a.title),
          wi ? h('div', { class: 'stl' }, 'No nominees. Everyone types their own pick.') : noms.length ? h('div', { class: 'chips' }, ...noms.slice(0, 5).map((p) => h('i', {}, p.name)), noms.length > 5 ? h('i', {}, '+' + (noms.length - 5)) : '') : h('div', { class: 'stl' }, 'Nominees coming soon'),
          h('div', { class: w ? 'stl win' : 'stl' }, w ? '🏆 Winner: ' + w.name : lk ? 'Voting closed' : 'Voting open'),
          (wi || noms.length) && !lk ? h('button', { class: 'btn sm', onclick: () => { cur = 'voting'; $('nav').classList.remove('open'); openAward(i); } }, 'Vote Now') : ''));
    })) : (ready && !failed ? h('div', { class: 'msg' }, 'No awards yet. Check back soon.') : ''));
}
/* ---- the voting ceremony ---- */
function codeForm() { const ci = h('input', { placeholder: 'Voting code', 'aria-label': 'Voting code' }); return h('div', { class: 'panel' }, h('b', {}, 'Enter the voting code to unlock voting'), h('div', { class: 'arow', style: 'margin-top:.7rem' }, ci, h('button', { class: 'btn sm', onclick: () => { if (!ci.value.trim()) return; localStorage.setItem('sd_code', ci.value.trim()); render(); } }, 'Unlock'))); }
function voting() {
  const lk = locked(), n = S.awards.length;
  if (!ready || failed) return h('div', {}, ...head('Voting', ''), state());
  if (S.set.revealed) return resultsView();
  if (lk) return h('div', {}, ...head('Voting', 'Voting is closed.'), h('div', { class: 'msg' }, 'Thanks for taking part. The results will be revealed soon.'));
  if (!n) return h('div', {}, ...head('Voting', ''), h('div', { class: 'msg' }, 'Awards are being set up. Check back soon.'));
  const needCode = S.set.codeRequired && !localStorage.getItem('sd_code');
  if (cer.mode === 'scene') return h('div', { class: 'msg' }, 'Starting…');
  if (cer.mode === 'done') return doneView();
  if (cer.mode === 'vote' && S.awards[cer.i]) return voteStep(S.awards[cer.i], cer.i, needCode);
  // landing
  const doneN = S.awards.filter((a) => (kindOf(a) === 'writein' ? mineW[a.id] : mine[a.id])).length;
  return h('div', {}, ...head('Voting', 'Vote in each award, from the first all the way up to the biggest. One ballot per device. You can change your picks until voting closes.'), h('div', { class: 'cd', id: 'cd', hidden: '' }),
    needCode ? codeForm() : '',
    h('div', { class: 'sub2' }, 'Your ballot: ' + doneN + ' of ' + n + ' awards', h('div', { class: 'bar7', style: 'max-width:20rem' }, h('i', { style: 'width:' + doneN / n * 100 + '%' }))),
    h('div', { class: 'btns' }, h('button', { class: 'btn big', onclick: () => startCeremony() }, doneN ? 'Continue voting' : 'Start voting'), h('button', { class: 'btn out', onclick: async () => { await playScene(specialCfg('intro')); } }, '▶ Watch the story')),
    h('label', { class: 'tgl' }, h('input', { type: 'checkbox', checked: skipAnim ? '' : null, onchange: (e) => { skipAnim = e.target.checked; try { localStorage.setItem('sd_skip', skipAnim ? '1' : '0'); } catch (x) {} } }), 'Skip the animations'),
    h('div', { class: 'alist' }, ...S.awards.map((a, i) => { const dn = kindOf(a) === 'writein' ? mineW[a.id] : mine[a.id]; return h('button', { class: 'arowl' + (dn ? ' done' : ''), onclick: () => openAward(i) }, h('span', { class: 'n' }, i + 1), h('span', { class: 'tt' }, a.title), h('span', { class: 'st' }, dn ? '✓ Voted' : 'Not voted yet')); })));
}
function startCeremony() { const i = S.awards.findIndex((a) => !(kindOf(a) === 'writein' ? mineW[a.id] : mine[a.id])); openAward(i < 0 ? 0 : i); }
function openAward(i, noScroll) {
  const a = S.awards[i]; if (!a) return; cer = { mode: 'vote', i };
  if (!skipAnim && !seen[a.id] && ready) { cer.mode = 'scene'; render(); seen[a.id] = true; playScene(sceneCfg(a, i, S.awards.length)).then(() => { cer.mode = 'vote'; fresh = true; render(); scrollTo({ top: 0 }); }); }
  else { fresh = true; render(); if (!noScroll) scrollTo({ top: 0 }); }
}
function voteStep(a, i, needCode) {
  const n = S.awards.length, wi = kindOf(a) === 'writein', voted = wi ? mineW[a.id] : mine[a.id], t = tally();
  const hd = h('div', { class: 'vhead' }, h('div', { class: 'vk' }, 'Award ' + (i + 1) + ' of ' + n), a.photo ? h('img', { src: '/api/photo/' + a.photo, alt: a.title }) : h('div', { class: 'big' }, iconOf(a)), h('h2', { class: 'gt' }, a.title));
  let body;
  if (wi) body = writeinBox(a);
  else {
    const noms = (a.nominees || []).map(playerById).filter(Boolean);
    body = noms.length ? h('div', { class: 'grid stg' }, ...noms.map((p, r) => {
      const sel = mine[a.id] === p.id, has = !!mine[a.id];
      const b = h('button', { class: 'btn wide vbtn' + (sel ? ' ok' : '') }, sel ? '✓ Your vote' : has ? 'Change to this' : 'Vote');
      if (pending[a.id]) b.setAttribute('disabled', '');
      b.addEventListener('click', async () => { if (sel) return; if (needCode) { toast('Enter the voting code first'); return; } const old = has ? (playerById(mine[a.id]) || {}).name : '';
        const ok = await confirmBox(has ? 'Change your vote?' : 'Lock in your vote?', has ? 'Change your vote from ' + old + ' to ' + p.name + ' in ' + a.title + '?' : 'Vote for ' + p.name + ' in ' + a.title + '? You can still change it later until voting closes.', has ? 'Yes, change it' : 'Yes, lock it in'); if (ok) castVote(a, p, b); });
      return pcard(p, { i: r, cls: sel ? ' mine' : '', extra: [b] });
    })) : h('div', { class: 'msg' }, 'Nominees coming soon.');
  }
  const last = i === n - 1;
  return h('div', {}, h('div', { style: 'text-align:center' }, h('button', { class: 'btn out sm', onclick: () => { cer = { mode: 'land', i: 0 }; fresh = true; render(true); } }, '☰ All awards')), hd, needCode ? codeForm() : '', okMsg[a.id] && voted ? h('div', { class: 'okn' }, '✓ Vote recorded for ' + okMsg[a.id] + '. You can change it until voting closes.') : '', body,
    h('div', { class: 'vnav' }, i > 0 ? h('button', { class: 'btn out', onclick: () => openAward(i - 1) }, '← Back') : '',
      h('button', { class: 'btn' + (voted ? '' : ' out'), onclick: () => (last ? finishCeremony() : openAward(i + 1)) }, last ? 'Finish ✓' : voted ? 'Next award →' : 'Skip this award →')));
}
function writeinBox(a) {
  const cur = mineW[a.id], edit = !cur || editing[a.id], inp = h('input', { class: 'wi-in', placeholder: 'Type a name', maxlength: '40', value: wiDraft[a.id] != null ? wiDraft[a.id] : (cur || ''), 'aria-label': 'Type a name', list: 'plist', autocomplete: 'off' });
  inp.addEventListener('input', (e) => { wiDraft[a.id] = e.target.value; });
  const dl = h('datalist', { id: 'plist' }, ...S.players.map((p) => h('option', { value: p.name })));
  const go2 = async () => { const v = inp.value.trim(); if (v.length < 2) { toast('Please type a name'); return; } if (S.set.codeRequired && !localStorage.getItem('sd_code')) { toast('Enter the voting code first'); return; }
    const ok = await confirmBox(cur ? 'Change your answer?' : 'Lock in your answer?', (cur ? 'Change your answer from ' + cur + ' to ' : 'Your pick for ' + a.title + ' is ') + '“' + v + '”. You can change it later until voting closes.', cur ? 'Yes, change it' : 'Yes, lock it in'); if (ok) castWritein(a, v, btn); };
  const btn = h('button', { class: 'btn wide', onclick: go2 }, cur ? 'Change answer' : 'Lock in');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(); });
  if (!edit) return h('div', { class: 'wi' }, h('div', { class: 'lk' }, '✓ Your pick: ' + cur), h('button', { class: 'btn out', onclick: () => { editing[a.id] = true; render(true); } }, 'Change my answer'));
  return h('div', { class: 'wi' }, h('p', { class: 'sub2', style: 'text-align:center' }, 'Type the name of anyone you think deserves it. Spelling doesn’t need to be perfect.'), inp, dl, btn);
}
async function castVote(a, p, btn) {
  if (locked()) { toast('Voting is closed'); return; }
  if (pending[a.id]) return;
  const code = localStorage.getItem('sd_code') || ''; pending[a.id] = 1; btn.disabled = true; btn.textContent = 'Saving…';
  try { const d = await api('vote', jp('POST', { award: a.id, player: p.id, code })); mine = d.mine; okMsg[a.id] = p.name; burst(btn); toast('Vote recorded ✓'); if (window.AU && AU.ctx) AU.fx('sting', AU.now()); }
  catch (e) { if (e.status === 403) localStorage.removeItem('sd_code'); toast(e.message || 'Couldn’t vote'); }
  delete pending[a.id]; render(true);
}
async function castWritein(a, text, btn) {
  if (locked()) { toast('Voting is closed'); return; }
  if (pending[a.id]) return;
  const code = localStorage.getItem('sd_code') || ''; pending[a.id] = 1; btn.disabled = true; btn.textContent = 'Saving…';
  try { const d = await api('writein', jp('POST', { award: a.id, text, code })); mineW = d.mineW; okMsg[a.id] = mineW[a.id]; editing[a.id] = false; delete wiDraft[a.id]; burst(btn); toast('Answer recorded ✓'); if (window.AU && AU.ctx) AU.fx('sting', AU.now()); }
  catch (e) { if (e.status === 403) localStorage.removeItem('sd_code'); toast(e.message || 'Couldn’t save'); }
  delete pending[a.id]; render(true);
}
async function finishCeremony() {
  const o = S.special.outro;
  if (!skipAnim && !seen._outro) { seen._outro = true; cer.mode = 'scene'; render(); await playScene(specialCfg('outro')); }
  cer.mode = 'done'; fresh = true; render(); scrollTo({ top: 0 });
}
function doneView() {
  return h('div', { class: 'done-box' }, h('div', { class: 'vhead' }, h('div', { class: 'big' }, ic('crown')), h('h2', { class: 'gt' }, 'Thank you for voting')),
    h('p', { class: 'sub2', style: 'margin:0 auto' }, 'Your votes are locked in. You can still change them until voting closes.'),
    h('div', { class: 'sum' }, ...S.awards.map((a) => { const v = kindOf(a) === 'writein' ? mineW[a.id] : (playerById(mine[a.id]) || {}).name; return h('div', {}, h('span', {}, a.title), h('b', {}, v || '—')); })),
    h('div', { class: 'btns', style: 'justify-content:center' }, h('button', { class: 'btn', onclick: () => { cer = { mode: 'land', i: 0 }; fresh = true; render(); } }, 'Review my votes'), h('button', { class: 'btn out', onclick: () => go('home') }, 'Back to home')));
}
function resultsView() {
  const t = tally();
  return h('div', {}, ...head('Results', 'The votes are in. Here are your School D’Or winners.'), ...S.awards.map((a) => {
    if (kindOf(a) === 'writein') { const w = S.winnerW[a.id]; return h('section', { class: 'panel' }, h('div', { class: 'ph' }, iconOf(a), a.title), w ? h('div', { class: 'vhead' }, h('div', { class: 'vk' }, 'Winner'), h('h2', { class: 'gt' }, '🏆 ' + w)) : h('div', { class: 'msg' }, 'No votes were cast for this one.')); }
    const noms = (a.nominees || []).map(playerById).filter(Boolean), c = t[a.id] || {}, total = Object.values(c).reduce((x, y) => x + y, 0), mx = Math.max(0, ...Object.values(c)), list = [...noms].sort((x, y) => (c[y.id] || 0) - (c[x.id] || 0));
    return h('section', { class: 'panel', id: 'aw-' + a.id }, h('div', { class: 'ph' }, iconOf(a), a.title), list.length ? h('div', { class: 'grid stg' }, ...list.map((p, r) => { const w = mx > 0 && (c[p.id] || 0) === mx; return pcard(p, { i: r, cls: w ? ' win' : '', badge: r < 3 && (c[p.id] || 0) > 0 ? h('span', { class: 'medal' }, ['🥇', '🥈', '🥉'][r]) : '', extra: [h('div', { class: 'bar7' }, h('i', { style: 'width:' + (total ? (c[p.id] || 0) / total * 100 : 0) + '%' })), h('span', { class: 'cnt' }, (c[p.id] || 0) + ((c[p.id] || 0) === 1 ? ' vote' : ' votes'))] }); })) : h('div', { class: 'msg' }, 'No nominees.'));
  }));
}
/* ---- admin ---- */
const ICON_OPTS = Object.keys(ICONS).map((k) => [k, k]);
const STYLE_OPTS = [['auto', 'Auto (from the award name)'], ['dor', 'Grand slow-motion goal'], ['puskas', 'Long-range screamer'], ['glove', 'Keeper saves'], ['maestro', 'Passing move'], ['rising', 'Climbing the steps'], ['joke', 'Hilarious miss'], ['people', 'The crowd decides']];
const fld = (l, el) => h('label', { class: 'fld' }, h('span', {}, l), el);
const inp = (val, fn, type = 'text', ph = '') => h('input', { type, value: val == null ? '' : val, placeholder: ph, onchange: (e) => fn(type === 'number' ? (e.target.value === '' ? null : +e.target.value) : e.target.value) });
const ta = (val, fn) => { const t = h('textarea', { onchange: (e) => fn(e.target.value) }); t.value = val || ''; return t; };
const sel = (opts, val, fn) => { const s = h('select', { onchange: (e) => fn(e.target.value) }, ...opts.map(([v, l]) => h('option', { value: v }, l))); s.value = val; return s; };
const thumb = (o) => (o && o.photo ? h('img', { src: '/api/photo/' + o.photo, alt: '' }) : h('u'));
function pickFile(accept, cb) { const f = h('input', { type: 'file', accept }); f.onchange = () => { if (f.files[0]) cb(f.files[0]); }; f.click(); }
const shrink = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => { const s = Math.min(1, 900 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * s); c.height = Math.round(i.height * s); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); c.toBlob((b) => (b ? ok(b) : no()), 'image/jpeg', .88); }; i.onerror = no; i.src = r.result; }; r.onerror = no; r.readAsDataURL(f); });
function pick(kind, id) { pickFile('image/*', async (file) => { try { const r = await api('admin/upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: await shrink(file) }); await upd(kind, id, { photo: r.key }); toast('Picture saved 📸'); } catch (e) { toast('Upload failed'); } }); }
async function upAudio(file) {
  if (file.size > 1300000) { toast('That file is too big (max about 1.3 MB). Trim it or lower the quality.'); return null; }
  try { const r = await api('admin/audio', { method: 'POST', headers: { 'Content-Type': file.type || 'audio/mpeg' }, body: file }); return r.key; } catch (e) { toast(e.message || 'Upload failed'); return null; }
}
let pv = null;
function preview(id, bus) { const c = AU.init(); if (!c) { toast('Sound isn’t supported on this device'); return; } AU.buf(id).then((b) => { if (!b) { toast('Couldn’t play that file'); return; } if (pv) { try { pv.stop(); } catch (e) {} } const s = c.createBufferSource(); s.buffer = b; s.connect(bus === 'music' ? AU.music : AU.voice); s.start(); pv = s; }); }
function voiceBlock(id, m, def) {
  return h('div', { class: 'sub-card' }, h('h4', {}, '🎙️ Voiceover'),
    fld('What your friend says', ta(m.script || def, (v) => metaSet(id, { script: v }))),
    h('div', { class: 'fg' }, fld('Tone note for him', inp(m.tone, (v) => metaSet(id, { tone: v }), 'text', 'e.g. slow and deep')), fld('Voice starts at (seconds)', inp(m.voice_at == null ? 3 : m.voice_at, (v) => metaSet(id, { voice_at: v == null ? 3 : v }), 'number'))),
    h('div', { class: 'btns' }, h('span', { class: 'tag' + (m.voice ? ' ok' : '') }, m.voice ? 'Recording added ✓' : 'No recording yet'),
      h('button', { class: 'btn sm out', onclick: () => pickFile('audio/*,.mp3,.m4a,.wav,.aac', async (f) => { const k = await upAudio(f); if (k) { await metaSet(id, { voice: k }); toast('Voice added 🎙️'); } }) }, m.voice ? 'Replace recording' : 'Upload recording'),
      m.voice ? h('button', { class: 'btn sm out', onclick: () => preview(m.voice, 'voice') }, '▶ Play') : '', m.voice ? h('button', { class: 'btn sm danger', onclick: () => metaSet(id, { voice: null }) }, 'Remove') : ''));
}
function musicBlock(id, m) {
  return h('div', { class: 'sub-card' }, h('h4', {}, '🎵 Music (optional)'), h('div', { class: 'mut' }, 'No track uploaded = the built-in cinematic score plays. Only use music you have permission to use. Fill in the credit if the licence needs it.'),
    h('div', { class: 'fg' }, fld('Track title', inp(m.music_title, (v) => metaSet(id, { music_title: v }))), fld('Artist / credit', inp(m.music_credit, (v) => metaSet(id, { music_credit: v }))), fld('Link to the track page', inp(m.music_link, (v) => metaSet(id, { music_link: v }), 'text', 'https://…'))),
    h('div', { class: 'btns' }, h('span', { class: 'tag' + (m.music ? ' ok' : '') }, m.music ? 'Track added ✓' : 'Using built-in score'),
      h('button', { class: 'btn sm out', onclick: () => pickFile('audio/*,.mp3,.m4a,.wav,.aac', async (f) => { const k = await upAudio(f); if (k) { await metaSet(id, { music: k }); toast('Music added 🎵'); } }) }, m.music ? 'Replace track' : 'Upload track'),
      m.music ? h('button', { class: 'btn sm out', onclick: () => preview(m.music, 'music') }, '▶ Play') : '', m.music ? h('button', { class: 'btn sm danger', onclick: () => metaSet(id, { music: null, music_title: null, music_credit: null, music_link: null }) }, 'Remove') : ''));
}
const move = async (i, d) => { const ids = S.awards.map((a) => a.id), j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; try { await api('admin/order', jp('PUT', { ids })); load(); } catch (e) { oops(); } };
const alias = (award, norm, label) => api('admin/alias', jp('POST', { award, norm, label }));
async function mergeGroup(award, gr, target) { if (!target) { toast('Choose where to merge it'); return; } try { await Promise.all(gr.variants.map((v) => alias(award, v.norm, target))); toast('Merged'); load(); } catch (e) { oops(); } }
async function hideGroup(award, gr) { if (!confirm('Hide “' + gr.label + '” from the counts?')) return; try { await Promise.all(gr.variants.map((v) => alias(award, v.norm, ''))); load(); } catch (e) { oops(); } }
async function unhide(award, norm) { try { await alias(award, norm, null); load(); } catch (e) { oops(); } }
function writeinResults(a) {
  const g = S.writeins[a.id] || { groups: [], hidden: [] }, mx = Math.max(1, ...g.groups.map((x) => x.count));
  return h('div', { class: 'sub-card' }, h('h4', {}, 'Live name counts (only you can see this)'), g.groups.length ? '' : h('div', { class: 'mut' }, 'No answers yet.'),
    ...g.groups.map((gr, idx) => { const others = g.groups.filter((x) => x !== gr), ms = h('select', {}, h('option', { value: '' }, 'Merge into…'), ...others.map((o) => h('option', { value: o.label }, o.label)));
      return h('div', { class: 'grp' }, h('div', { class: 'top' }, h('span', {}, (idx === 0 ? '🏆 ' : '') + gr.label + (gr.playerId ? ' (matched a player)' : '')), h('b', {}, gr.count)), h('div', { class: 'bar7' }, h('i', { style: 'width:' + gr.count / mx * 100 + '%' })),
        h('div', { class: 'chips' }, ...gr.variants.map((v) => h('i', {}, v.raw + ' ×' + v.count))),
        h('div', { class: 'btns' }, ms, h('button', { class: 'btn sm out', onclick: () => mergeGroup(a.id, gr, ms.value) }, 'Merge'), h('button', { class: 'btn sm danger', onclick: () => hideGroup(a.id, gr) }, 'Hide'))); }),
    g.hidden.length ? h('div', {}, h('div', { class: 'mut' }, 'Hidden entries (tap to bring back):'), h('div', { class: 'btns' }, ...g.hidden.map((x) => h('button', { class: 'sel', onclick: () => unhide(a.id, x.norm) }, x.raw + ' ×' + x.count)))) : '');
}
function specialCard(key, id, title, note) {
  const m = S.special[key] || {}, def = key === 'intro' ? 'Every lunchtime, somewhere on this pitch, a legend is born. Tonight, we celebrate them. This is the School D’Or.' : 'Your votes are in. The legends will be revealed. Thank you for being part of the School D’Or.';
  return h('div', { class: 'acard' }, h('b', {}, title), h('div', { class: 'mut' }, note),
    h('div', { class: 'fg' }, fld('Length (seconds)', inp(m.duration || (key === 'intro' ? 26 : 15), (v) => metaSet(id, { duration: Math.max(12, Math.min(45, v || 24)) }), 'number'))),
    h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => playScene(specialCfg(key)) }, '▶ Preview animation')), voiceBlock(id, m, def), musicBlock(id, m));
}
function adminView() {
  if (!ready) return h('div', { class: 'msg' }, 'Loading…');
  if (!admin) return loginView();
  const dl = h('input', { type: 'datetime-local', 'aria-label': 'Voting deadline' }), code = h('input', { placeholder: 'Voting code (optional)', 'aria-label': 'Voting code' }), an = h('input', { placeholder: 'New award, e.g. Best Goalkeeper' }), as = sel(ICON_OPTS, 'trophy', () => {}), pn = h('input', { placeholder: 'Player name' }), pp = h('input', { placeholder: 'Position' });
  const sec = (t, ...c) => h('section', { class: 'asec' }, h('h3', {}, t), ...c), n = S.awards.length;
  return h('div', { class: 'ad' }, ...head('Admin Dashboard', (S.voters || 0) + ' voters so far · one ballot per device'),
    h('div', { class: 'btns noprint' }, h('button', { class: 'btn sm out', onclick: () => go('sheet') }, '📝 Recording sheet for your friend')),
    sec('Voting', h('div', { class: 'acard' },
      h('div', { class: 'btns' }, h('button', { class: 'btn sm', onclick: () => setS({ revealed: !S.set.revealed }) }, S.set.revealed ? 'Hide results & reopen voting' : 'Reveal results & close voting'), h('button', { class: 'btn sm out', onclick: () => setS({ tts: !S.set.tts }) }, 'Browser voice if no recording: ' + (S.set.tts ? 'ON' : 'OFF')), h('button', { class: 'btn sm out', onclick: logout }, 'Log out')),
      fld('Voting deadline', dl), h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => { if (!dl.value) { toast('Pick a date and time'); return; } setS({ deadline: new Date(dl.value).getTime() }); } }, 'Set deadline'), h('button', { class: 'btn sm out', onclick: () => setS({ deadline: 0 }) }, 'Clear deadline')),
      fld('Voting code', code), h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => setS({ code: code.value.trim() }) }, 'Set voting code'), h('button', { class: 'btn sm out', onclick: () => setS({ code: '' }) }, 'Remove code'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (confirm('Delete ALL votes? This cannot be undone.')) { try { await api('admin/reset-votes', { method: 'POST' }); load(); toast('Votes cleared'); } catch (e) { oops(); } } } }, 'Reset all votes')))),
    sec('Opening & thank-you', specialCard('intro', '_intro', 'Opening movie (“Watch the story” button)', 'Plays from the home page and the voting page.'), specialCard('outro', '_outro', 'Thank-you screen (after the last award)', 'Plays when someone finishes voting.')),
    sec('Awards (top of the list plays first, so put the biggest award last)', ...S.awards.map((a, i) => { const m = meta(a), wi = kindOf(a) === 'writein';
      return h('div', { class: 'acard' },
        h('div', { class: 'arow' }, h('span', { class: 'mut' }, '#' + (i + 1)), h('button', { class: 'btn sm out', 'aria-label': 'Move up', onclick: () => move(i, -1) }, '▲'), h('button', { class: 'btn sm out', 'aria-label': 'Move down', onclick: () => move(i, 1) }, '▼'), thumb(a), inp(a.title, (v) => upd('awards', a.id, { title: v }))),
        h('div', { class: 'fg' }, fld('Icon', sel(ICON_OPTS, a.icon || 'trophy', (v) => upd('awards', a.id, { icon: v }))), fld('Type', sel([['pick', 'Pick from nominees'], ['writein', 'Write-in (type a name)']], kindOf(a), (v) => metaSet(a.id, { kind: v }))), fld('Animation', sel(STYLE_OPTS, m.style || 'auto', (v) => metaSet(a.id, { style: v }))), fld('Length (seconds)', inp(durOf(a), (v) => metaSet(a.id, { duration: Math.max(12, Math.min(45, v || 24)) }), 'number'))),
        h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => pick('awards', a.id) }, '🖼 Award picture'), h('button', { class: 'btn sm out', onclick: () => playScene(sceneCfg(a, i, n)) }, '▶ Preview animation'), h('button', { class: 'btn sm danger', onclick: () => confirm('Delete this award?') && del('awards', a.id) }, 'Delete')),
        wi ? h('div', { class: 'mut' }, 'Write-in award: there are no nominees. Voters type a name.') : h('div', {}, h('div', { class: 'mut' }, 'Nominees (tap to add or remove)'), h('div', { class: 'btns', style: 'margin-top:.4rem' }, ...S.players.map((p) => { const on = (a.nominees || []).includes(p.id); return h('button', { class: 'sel' + (on ? ' on' : ''), onclick: () => upd('awards', a.id, { nominees: on ? a.nominees.filter((x) => x !== p.id) : [...(a.nominees || []), p.id] }) }, p.name); }))),
        voiceBlock(a.id, m, DEFAULTS[styleOf(a)] || ''), musicBlock(a.id, m), wi ? writeinResults(a) : '');
    }), h('div', { class: 'acard' }, h('b', {}, 'Add an award'), an, as, h('div', {}, h('button', { class: 'btn sm', onclick: () => { if (!an.value.trim()) { toast('Name the award'); return; } add('awards', { title: an.value.trim(), icon: as.value, nominees: [] }); an.value = ''; } }, 'Add award')))),
    sec('Live results', ...S.awards.filter((a) => kindOf(a) === 'pick').map((a) => { const c = tally()[a.id] || {}, noms = (a.nominees || []).map(playerById).filter(Boolean).sort((x, y) => (c[y.id] || 0) - (c[x.id] || 0)); return h('div', { class: 'acard' }, h('b', {}, a.title), noms.length ? h('div', {}, ...noms.map((p) => h('div', { class: 'grp' }, h('div', { class: 'top' }, h('span', {}, p.name), h('b', {}, c[p.id] || 0))))) : h('div', { class: 'mut' }, 'No nominees yet.')); })),
    sec('Players', ...S.players.map((p) => h('div', { class: 'acard' }, h('div', { class: 'arow' }, thumb(p), inp(p.name, (v) => upd('players', p.id, { name: v }))),
        h('div', { class: 'fg' }, fld('Position', inp(p.position, (v) => upd('players', p.id, { position: v }))), fld('Goals', inp(p.goals, (v) => upd('players', p.id, { goals: v }), 'number')), fld('Assists', inp(p.assists, (v) => upd('players', p.id, { assists: v }), 'number')), fld('Rating', inp(p.rating, (v) => upd('players', p.id, { rating: v }), 'number'))),
        h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => pick('players', p.id) }, '📷 Photo'), h('button', { class: 'btn sm danger', onclick: () => confirm('Delete ' + p.name + '?') && del('players', p.id) }, 'Delete')))),
      h('div', { class: 'acard' }, h('b', {}, 'Add a player'), pn, pp, h('div', {}, h('button', { class: 'btn sm', onclick: () => { if (!pn.value.trim()) { toast('Add a name'); return; } add('players', { name: pn.value.trim(), position: pp.value.trim(), goals: 0, assists: 0, rating: 0 }); pn.value = pp.value = ''; } }, 'Add player')))));
}
function sheetView() {
  if (!admin) return loginView();
  const items = [{ t: 'Opening movie', m: S.special.intro || {}, dur: (S.special.intro || {}).duration || 26, s: (S.special.intro || {}).script || INTRO_DEF }, ...S.awards.map((a) => ({ t: a.title, m: meta(a), dur: durOf(a), s: scriptOf(a) })), { t: 'Thank-you screen', m: S.special.outro || {}, dur: (S.special.outro || {}).duration || 15, s: (S.special.outro || {}).script || OUTRO_DEF }];
  return h('div', { class: 'sheet' }, ...head('Voiceover recording sheet', 'Read each line slowly and deeply, like a movie trailer.'),
    h('div', { class: 'btns noprint' }, h('button', { class: 'btn', onclick: () => window.print() }, 'Print / Save as PDF'), h('button', { class: 'btn out', onclick: () => go('admin') }, '← Back to admin')),
    h('div', { class: 'panel' }, h('b', {}, 'How to record'), h('p', { class: 'meta' }, 'Use a quiet room and hold the phone close. Record each line as its own clip (name them 1, 2, 3…). Start speaking straight away with no lead-in silence, because the website waits for the right moment. Pause for a beat between sentences. Keep each clip under the time shown, and send the clips back to upload in Admin.')),
    ...items.map((it, i) => { const words = it.s.split(/\s+/).filter(Boolean).length, target = Math.max(4, Math.round(words / 2.1)), at = it.m.voice_at == null ? 3 : it.m.voice_at, mxl = Math.max(6, it.dur - at - 8);
      return h('div', { class: 'item' }, h('h3', {}, (i + 1) + '. ' + it.t), h('div', { class: 'line' }, '“' + it.s + '”'), h('div', { class: 'meta' }, 'Tone: ' + (it.m.tone || 'slow, deep, cinematic. Pause after each sentence.')), h('div', { class: 'meta' }, 'Comes in ' + at + ' seconds into the animation (the website handles this).'), h('div', { class: 'meta' }, 'Length: about ' + target + ' seconds. Please stay under ' + mxl + ' seconds.')); }));
}
function loginView() {
  const pw = h('input', { type: 'password', placeholder: 'Admin password', autocomplete: 'current-password', 'aria-label': 'Admin password' }), msg = h('div', { class: 'lm' });
  const go2 = async () => { const k = pw.value; if (!k) return; akey = k; try { await api('admin/login', { method: 'POST' }); sessionStorage.setItem(KEY, k); last = ''; pw.blur(); await load(); toast('Welcome, admin'); render(true); } catch (e) { akey = ''; msg.textContent = 'Wrong password.'; } };
  pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(); });
  return h('div', { class: 'login' }, h('div', { class: 'panel' }, h('h2', { class: 't gt', style: 'margin-top:0' }, 'Admin'), h('p', { class: 'sub2' }, 'Sign in to manage School D’Or.'), pw, msg, h('button', { class: 'btn wide', onclick: go2 }, 'Sign in')));
}
function logout() { akey = ''; sessionStorage.removeItem(KEY); admin = false; last = ''; fresh = true; load(); render(true); }
/* ---- navigation, render, startup ---- */
const VIEWS = { home, players, awards, voting, admin: adminView, sheet: sheetView };
function go(v) { cur = v; if (v === 'voting' && cer.mode !== 'scene') cer = { mode: 'land', i: 0 }; fresh = true; $('nav').classList.remove('open'); $('burger').setAttribute('aria-expanded', 'false'); render(true); scrollTo({ top: 0 }); }
function creditsText() {
  const ms = [...S.awards.map((a) => a.meta), S.special.intro, S.special.outro].filter((m) => m && m.music && m.music_title), seenK = {}, out = [];
  ms.forEach((m) => { const k = m.music_title + '|' + m.music_credit; if (seenK[k]) return; seenK[k] = 1; out.push([m.music_title, m.music_credit, m.music_link]); });
  return out;
}
function render(force) {
  const a = document.activeElement;
  if (!force && a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName) && ((cur === 'admin' && admin && a.closest('.ad')) || a.classList.contains('wi-in'))) return;
  const names = [['home', 'Home'], ['players', 'Players'], ['awards', 'Awards'], ['voting', 'Voting'], ...(admin ? [['admin', 'Admin']] : [])];
  $('links').replaceChildren(...names.map(([k, t]) => h('button', { type: 'button', class: cur === k ? 'on' : '', 'aria-current': cur === k ? 'page' : 'false', onclick: () => go(k) }, t)));
  $('adm').hidden = admin && ADMIN_ROUTE;
  const cr = $('credits'), cs = creditsText(); cr.replaceChildren(...(cs.length ? ['Music: ', ...cs.flatMap(([t, c, l], i) => [i ? '; ' : '', l && /^https?:/.test(l) ? h('a', { href: l, target: '_blank', rel: 'noopener' }, t) : t, c ? ' by ' + c : ''])] : []));
  let el; try { el = VIEWS[cur](); } catch (e) { console.error(e); el = h('div', { class: 'msg' }, 'Something went wrong. Please refresh the page.'); }
  if (fresh) { el.classList.add('fade'); fresh = false; }
  $('v').replaceChildren(el); tick();
}
function tick() { const c = $('cd'); if (!c) return; if (!S.set.deadline) { c.hidden = true; return; } c.hidden = false; const ms = S.set.deadline - Date.now(); if (ms <= 0) { c.textContent = 'Voting closed'; return; } const s = Math.floor(ms / 1e3), p = (n) => String(n).padStart(2, '0'); c.replaceChildren('Voting closes in ', h('b', {}, Math.floor(s / 86400) + 'd ' + p(Math.floor(s % 86400 / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60))); }
setInterval(tick, 1000);
$('brand').onclick = () => go('home');
$('burger').onclick = () => { const n = $('nav'), o = n.classList.toggle('open'); $('burger').setAttribute('aria-expanded', o); };
$('adm').onclick = () => { if (admin || ADMIN_ROUTE) go('admin'); else location.href = '/admin/'; };
const snd = $('snd'); snd.textContent = AU.muted ? '🔇' : '🔊'; snd.onclick = () => { AU.setMuted(!AU.muted); snd.textContent = AU.muted ? '🔇' : '🔊'; };
document.addEventListener('click', (e) => { const n = $('nav'); if (n.classList.contains('open') && !n.contains(e.target)) { n.classList.remove('open'); $('burger').setAttribute('aria-expanded', 'false'); } });
/* site intro (3s, once per session, skippable, never blocks) */
function endIntro() { const i = $('intro'); if (!i || i.classList.contains('done')) return; i.classList.add('done'); setTimeout(() => { const x = $('intro'); if (x) x.remove(); }, 900); }
try {
  if (document.documentElement.classList.contains('noint')) { const i = $('intro'); if (i) i.remove(); }
  else { const p = $('iparts'); for (let k = 0; k < 16; k++) { const s = document.createElement('i'); s.style.cssText = 'left:' + (5 + Math.random() * 90) + '%;--dx:' + ((Math.random() - .5) * 80) + 'px;animation-duration:' + (4 + Math.random() * 4) + 's;animation-delay:' + (Math.random() * 2) + 's'; p.append(s); } $('skip').onclick = endIntro; setTimeout(endIntro, 3300); }
} catch (e) { const i = $('intro'); if (i) i.remove(); }
render(true); load(); setInterval(() => { if (!document.hidden && !sceneOn) load(); }, 15000);
