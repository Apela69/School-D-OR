/* app.js: School D'Or front end (talks to /api/*). The admin screens live in admin.js */
const NS = 'http://www.w3.org/2000/svg';
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const k in a) { if (k === 'class') e.className = a[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), a[k]); else e.setAttribute(k, a[k]); } c.flat().forEach((x) => e.append(x && x.nodeType ? x : document.createTextNode(x == null ? '' : x))); return e; };
const ic = (n, c = '') => { const s = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use'); s.setAttribute('class', 'ic ' + c); u.setAttribute('href', '#i-' + n); s.append(u); return s; };
const $ = (s) => document.getElementById(s);
const ADMIN_ROUTE = location.pathname.replace(/\/+$/, '') === '/admin';
let admin = false, cur = ADMIN_ROUTE ? 'admin' : 'home', q = '', fresh = true, mine = {}, mineW = {}, last = '', ready = false, failed = false, pending = {}, okMsg = {}, editing = {}, wiDraft = {}, sceneOn = false;
let cer = { mode: 'land', i: 0 };
const S = { players: [], awards: [], beats: [], set: { revealed: false, deadline: 0, codeRequired: false, tts: false }, tally: {}, voters: 0, writeins: {}, winnerW: {}, special: { intro: null, outro: null } };
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
/* ---- data layer ---- */
const KEY = 'sd_admin'; let akey = sessionStorage.getItem(KEY) || '';
async function api(path, opt = {}) { const r = await fetch('/api/' + path, { ...opt, headers: { ...(opt.headers || {}), ...(akey ? { 'X-Admin-Key': akey } : {}) }, credentials: 'same-origin' }); const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || 'Error'), { status: r.status }); return d; }
async function load() { try { const d = await api('state'), j = JSON.stringify(d); failed = false; if (ready && j === last) return; ready = true; last = j; Object.assign(S, d); mine = d.mine || {}; mineW = d.mineW || {}; admin = !!d.admin; render(); } catch (e) { if (!ready) { ready = true; failed = true; render(); } } }
const oops = (m) => toast(m || 'Couldn’t save'), jp = (m, b) => ({ method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const add = async (n, d) => { try { const r = await api('admin/' + n, jp('POST', d)); load(); return r; } catch (e) { oops(n === 'beats' ? 'Couldn’t save. Did you run migration-v3.sql in D1?' : ''); } };
const upd = async (n, id, d) => { try { await api('admin/' + n + '/' + id, jp('PATCH', d)); load(); } catch (e) { oops(); } };
const del = async (n, id) => { try { await api('admin/' + n + '/' + id, { method: 'DELETE' }); load(); } catch (e) { oops(); } };
const setS = async (d) => { try { await api('admin/settings', jp('PUT', d)); load(); } catch (e) { oops(); } };
const metaSet = async (id, d) => { try { await api('admin/meta/' + id, jp('PUT', d)); load(); } catch (e) { oops('Couldn’t save. Did you run migration-v3.sql in D1?'); } };
const tally = () => S.tally || {};
const playerById = (id) => S.players.find((p) => p.id === id);
const meta = (a) => (a && a.meta) || {};
const kindOf = (a) => (meta(a).kind === 'writein' ? 'writein' : 'pick');
const styleOf = (a) => sceneStyleFor(a.title, meta(a).style);
/* ---- ceremony content: every item (opening, awards, thank-you) is a list of "beats" (a line of text + optional voice clip) ---- */
const normB = (b) => ({ ...b, start: +b.start || 0, vstart: b.vstart == null ? null : +b.vstart, trim_in: +b.trim_in || 0, trim_out: +b.trim_out || 0, speed: +b.speed || 1, gain: +b.gain || 1, dur: estDur(b.text) });
const beatsOf = (item) => S.beats.filter((b) => b.item === item).map(normB).sort((x, y) => x.start - y.start);
function defaultStyleFor(item) { if (item === '_intro') return 'story'; if (item === '_outro') return 'outro'; const a = S.awards.find((x) => x.id === item); return a ? styleOf(a) : 'dor'; }
const beatsFor = (item) => { const s = beatsOf(item); return s.length ? s : defaultBeats(defaultStyleFor(item)); };
const itemMeta = (item) => (item === '_intro' ? S.special.intro : item === '_outro' ? S.special.outro : (S.awards.find((x) => x.id === item) || {}).meta) || {};
const awardCfg = (a) => ({ title: a.title, icon: a.icon, image: a.photo ? '/api/photo/' + a.photo : null, music: meta(a).music, beats: beatsFor(a.id), nominees: kindOf(a) === 'writein' ? [] : (a.nominees || []).map(playerById).filter(Boolean), writein: kindOf(a) === 'writein', tts: S.set.tts });
const introCfg = () => ({ title: 'School D’Or', icon: 'trophy', image: '/ball.jpg', sub: 'Where Lunchtime Legends Are Made', music: itemMeta('_intro').music, beats: beatsFor('_intro'), skipNominees: true, tts: S.set.tts });
const outroCfg = () => ({ title: 'Thank You', icon: 'crown', sub: 'Your votes are in', music: itemMeta('_outro').music, beats: beatsFor('_outro'), skipNominees: true, tts: S.set.tts });
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
const hasVotedAward = (a) => (kindOf(a) === 'writein' ? !!mineW[a.id] : !!mine[a.id]);
/* ---- public pages ---- */
function home() {
  return h('section', { class: 'hero' },
    h('div', { class: 'hv' }, h('div', { class: 'glow' }), h('img', { class: 'trophy', src: '/ball.jpg', alt: 'School D’Or trophy' })),
    h('div', {}, h('div', { class: 'eyebrow' }, 'Lunchtime Football Awards'), h('h1', { class: 'shine' }, 'SCHOOL D’OR'), h('p', { class: 'tagline' }, 'Where Lunchtime Legends Are Made'),
      h('div', { class: 'cta' }, h('button', { class: 'btn', onclick: () => go('awards') }, 'View Awards'), h('button', { class: 'btn out', onclick: () => go('players') }, 'Meet the Players'), h('button', { class: 'btn out', onclick: async () => { await playScene(introCfg()); } }, '▶ Watch the story'))));
}
function players() {
  const grid = h('div', { class: 'grid stg' });
  const fill = () => { const l = [...S.players].filter((p) => ((p.name || '') + ' ' + (p.position || '')).toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.rating || 0) - (a.rating || 0)); grid.replaceChildren(...(l.length ? l.map((p, i) => pcard(p, { i })) : [h('div', { class: 'msg' }, ready ? 'No players found.' : 'Loading…')])); };
  fill();
  return h('div', {}, ...head('Players', 'Every player in the running for School D’Or.'), state() || '', h('input', { class: 'sinp', type: 'search', placeholder: 'Search players', value: q, 'aria-label': 'Search players', oninput: (e) => { q = e.target.value; fill(); } }), grid);
}
function awards() {
  if (!S.set.revealed) {   // the awards are a secret until the ceremony
    const lk = locked(), started = Object.keys(mine).length || Object.keys(mineW).length;
    return h('div', { class: 'mystery' }, h('div', { class: 'mi' }, ic('trophy')), h('h2', { class: 't gt' }, 'The awards are a secret'), h('p', { class: 'sub2', style: 'margin:0 auto 1.4rem;text-align:center' }, lk ? 'Voting has closed. The winners will be revealed soon.' : 'You will discover each one during the ceremony, just before you vote.'),
      lk ? '' : h('button', { class: 'btn big', onclick: () => go('voting') }, started ? 'Continue voting' : 'Start voting'));
  }
  return h('div', {}, ...head('Awards', 'The winners of the School D’Or.'), state() || '',
    S.awards.length ? h('div', { class: 'agrid stg' }, ...S.awards.map((a, i) => { const wi = kindOf(a) === 'writein', w = wi ? (S.winnerW[a.id] ? { name: S.winnerW[a.id] } : null) : winnerOf(a);
      return h('article', { class: 'ac', style: '--i:' + Math.min(i, 8) }, h('div', { class: 'av' }, a.photo ? h('img', { src: '/api/photo/' + a.photo, alt: a.title, loading: 'lazy' }) : h('div', { class: 'ico' }, iconOf(a))), h('div', { class: 'ab' }, h('h3', {}, a.title), h('div', { class: w ? 'stl win' : 'stl' }, w ? '🏆 Winner: ' + w.name : 'No winner yet'))); })) : h('div', { class: 'msg' }, 'No awards yet.'));
}
/* ---- the voting ceremony ---- */
function codeForm() { const ci = h('input', { placeholder: 'Voting code', 'aria-label': 'Voting code' }); return h('div', { class: 'panel' }, h('b', {}, 'Enter the voting code to unlock voting'), h('div', { class: 'arow', style: 'margin-top:.7rem' }, ci, h('button', { class: 'btn sm', onclick: () => { if (!ci.value.trim()) return; localStorage.setItem('sd_code', ci.value.trim()); render(true); } }, 'Unlock'))); }
function voting() {
  const lk = locked(), n = S.awards.length;
  if (!ready || failed) return h('div', {}, ...head('Voting', ''), state());
  if (S.set.revealed) return resultsView();
  if (lk) return h('div', {}, ...head('Voting', 'Voting is closed.'), h('div', { class: 'msg' }, 'Thanks for taking part. The results will be revealed soon.'));
  if (!n) return h('div', {}, ...head('Voting', ''), h('div', { class: 'msg' }, 'The ceremony is being prepared. Check back soon.'));
  const needCode = S.set.codeRequired && !localStorage.getItem('sd_code');
  if (cer.mode === 'scene') return h('div', { class: 'msg' }, 'Starting…');
  if (cer.mode === 'lock') return lockView();
  if (cer.mode === 'done') return doneView();
  if ((cer.mode === 'vote' || cer.mode === 'edit') && S.awards[cer.i]) return voteStep(S.awards[cer.i], cer.i, needCode);
  const started = Object.keys(mine).length || Object.keys(mineW).length;
  return h('div', { class: 'mystery' }, h('div', { class: 'mi' }, ic('crown')), h('h2', { class: 't gt' }, 'Ready to vote?'), h('p', { class: 'sub2', style: 'margin:0 auto 1.2rem;text-align:center' }, 'Turn your sound up. One ballot per device, and each vote locks in as you go.'),
    h('div', { class: 'cd', id: 'cd', hidden: '' }), needCode ? codeForm() : '',
    h('button', { class: 'btn big', onclick: () => startCeremony() }, started ? 'Continue voting' : 'Start voting'));
}
const firstUnvoted = () => S.awards.findIndex((a) => !hasVotedAward(a));
async function startCeremony() {
  if (S.set.codeRequired && !localStorage.getItem('sd_code')) { toast('Enter the voting code first'); return; }
  const target = firstUnvoted();
  cer = { mode: 'scene', i: -1 }; render(true);
  await playScene(introCfg());                       // the School D'Or story always plays first
  if (cer.mode !== 'scene') return;
  if (target < 0 && Object.keys(mine).length + Object.keys(mineW).length) { cer.mode = 'done'; fresh = true; render(true); scrollTo({ top: 0 }); return; }
  goAward(target < 0 ? 0 : target);
}
async function goAward(i) {
  clearTimeout(cer.t);
  if (i >= S.awards.length) return finishCeremony();
  cer = { mode: 'scene', i }; render(true);
  await playScene(awardCfg(S.awards[i]));
  if (cer.mode !== 'scene' || cer.i !== i) return;
  cer.mode = 'vote'; fresh = true; render(true); scrollTo({ top: 0 });
}
function editAward(i) { cer = { mode: 'edit', i }; fresh = true; render(true); scrollTo({ top: 0 }); }
function leaveVoting() { clearTimeout(cer.t); cer = { mode: 'land', i: 0 }; go('home'); }
function voteStep(a, i, needCode) {
  const wi = kindOf(a) === 'writein', edit = cer.mode === 'edit', voted = hasVotedAward(a);
  const hd = h('div', { class: 'vhead' }, a.photo ? h('img', { src: '/api/photo/' + a.photo, alt: a.title }) : h('div', { class: 'big' }, iconOf(a)), h('h2', { class: 'gt' }, a.title));
  let body;
  if (wi) body = writeinBox(a);
  else {
    const noms = (a.nominees || []).map(playerById).filter(Boolean);
    body = noms.length ? h('div', { class: 'grid stg' }, ...noms.map((p, r) => {
      const sel = mine[a.id] === p.id, has = !!mine[a.id];
      const b = h('button', { class: 'btn wide vbtn' + (sel ? ' ok' : '') }, sel ? '✓ Your vote' : has ? 'Change to this' : 'Vote');
      if (pending[a.id]) b.setAttribute('disabled', '');
      b.addEventListener('click', async () => { if (sel) return; if (needCode) { toast('Enter the voting code first'); return; } const old = has ? (playerById(mine[a.id]) || {}).name : '';
        const ok = await confirmBox(has ? 'Change your vote?' : 'Lock in your vote?', has ? 'Change your vote from ' + old + ' to ' + p.name + ' in ' + a.title + '?' : 'Vote for ' + p.name + ' in ' + a.title + '?', has ? 'Yes, change it' : 'Yes, lock it in'); if (ok) castVote(a, p, b); });
      return pcard(p, { i: r, cls: sel ? ' mine' : '', extra: [b] });
    })) : h('div', { class: 'msg' }, 'Nominees coming soon.');
  }
  return h('div', {}, hd, needCode ? codeForm() : '', body,
    edit ? h('div', { class: 'vnav' }, h('button', { class: 'btn', onclick: () => { cer.mode = 'done'; fresh = true; render(true); } }, '← Back to my votes'))
      : h('div', { class: 'skipl' }, h('button', { onclick: () => goAward(i + 1) }, voted ? 'Next award →' : 'Skip this award')));
}
function writeinBox(a) {
  const cur0 = mineW[a.id], inp = h('input', { class: 'wi-in', placeholder: 'Type a name', maxlength: '40', value: wiDraft[a.id] != null ? wiDraft[a.id] : (cur0 || ''), 'aria-label': 'Type a name', list: 'plist', autocomplete: 'off' });
  inp.addEventListener('input', (e) => { wiDraft[a.id] = e.target.value; });
  const dl = h('datalist', { id: 'plist' }, ...S.players.map((p) => h('option', { value: p.name })));
  const go2 = async () => { const v = inp.value.trim(); if (v.length < 2) { toast('Please type a name'); return; } if (S.set.codeRequired && !localStorage.getItem('sd_code')) { toast('Enter the voting code first'); return; }
    const ok = await confirmBox(cur0 ? 'Change your answer?' : 'Lock in your answer?', (cur0 ? 'Change your answer from ' + cur0 + ' to ' : 'Your pick for ' + a.title + ' is ') + '“' + v + '”.', cur0 ? 'Yes, change it' : 'Yes, lock it in'); if (ok) castWritein(a, v, btn); };
  const btn = h('button', { class: 'btn wide', onclick: go2 }, cur0 ? 'Change answer' : 'Lock in');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(); });
  return h('div', { class: 'wi' }, h('p', { class: 'sub2', style: 'text-align:center' }, 'Type the name of anyone you think deserves it. Spelling doesn’t need to be perfect.'), cur0 ? h('div', { class: 'lk' }, '✓ Your pick: ' + cur0) : '', inp, dl, btn);
}
function afterLock(a) {
  if (cer.mode === 'edit') { cer.mode = 'done'; fresh = true; render(true); return; }
  const i = cer.i; cer.mode = 'lock'; fresh = true; render(true);
  cer.t = setTimeout(() => { if (cer.mode === 'lock' && cer.i === i) goAward(i + 1); }, 1700);   // straight on to the next award
}
async function castVote(a, p, btn) {
  if (locked()) { toast('Voting is closed'); return; }
  if (pending[a.id]) return;
  const code = localStorage.getItem('sd_code') || ''; pending[a.id] = 1; btn.disabled = true; btn.textContent = 'Saving…';
  try { const d = await api('vote', jp('POST', { award: a.id, player: p.id, code })); mine = d.mine; okMsg[a.id] = p.name; burst(btn); if (window.AU && AU.ctx) AU.fx('sting', AU.now()); delete pending[a.id]; afterLock(a); return; }
  catch (e) { if (e.status === 403) localStorage.removeItem('sd_code'); toast(e.message || 'Couldn’t vote'); }
  delete pending[a.id]; render(true);
}
async function castWritein(a, text, btn) {
  if (locked()) { toast('Voting is closed'); return; }
  if (pending[a.id]) return;
  const code = localStorage.getItem('sd_code') || ''; pending[a.id] = 1; btn.disabled = true; btn.textContent = 'Saving…';
  try { const d = await api('writein', jp('POST', { award: a.id, text, code })); mineW = d.mineW; okMsg[a.id] = mineW[a.id]; delete wiDraft[a.id]; burst(btn); if (window.AU && AU.ctx) AU.fx('sting', AU.now()); delete pending[a.id]; afterLock(a); return; }
  catch (e) { if (e.status === 403) localStorage.removeItem('sd_code'); toast(e.message || 'Couldn’t save'); }
  delete pending[a.id]; render(true);
}
function lockView() { const a = S.awards[cer.i] || {}; return h('div', { class: 'lockv fade' }, h('div', { class: 'big' }, '✓'), h('h2', { class: 'gt' }, 'Locked in'), h('p', { class: 'sub2', style: 'margin:0 auto' }, (okMsg[a.id] || '') + ' · ' + (a.title || '')), h('p', { class: 'sub2', style: 'margin:1.4rem auto 0' }, 'Next up…')); }
async function finishCeremony() {
  cer = { mode: 'scene', i: S.awards.length }; render(true);
  await playScene(outroCfg());
  cer.mode = 'done'; fresh = true; render(true); scrollTo({ top: 0 });
}
function doneView() {
  return h('div', { class: 'done-box' }, h('div', { class: 'vhead' }, h('div', { class: 'big' }, ic('crown')), h('h2', { class: 'gt' }, 'Thank you for voting')),
    h('p', { class: 'sub2', style: 'margin:0 auto' }, 'Your votes are locked in. You can still change any of them until voting closes.'),
    h('div', { class: 'sum' }, ...S.awards.map((a, i) => { const v = kindOf(a) === 'writein' ? mineW[a.id] : (playerById(mine[a.id]) || {}).name; return h('div', {}, h('span', {}, a.title), h('span', { class: 'btns', style: 'gap:.6rem;flex-wrap:nowrap' }, h('b', {}, v || '—'), h('button', { class: 'btn sm out', onclick: () => editAward(i) }, v ? 'Change' : 'Vote'))); })),
    h('div', { class: 'btns', style: 'justify-content:center' }, h('button', { class: 'btn', onclick: () => leaveVoting() }, 'Back to home')));
}
function resultsView() {
  const t = tally();
  return h('div', {}, ...head('Results', 'The votes are in. Here are your School D’Or winners.'), ...S.awards.map((a) => {
    if (kindOf(a) === 'writein') { const w = S.winnerW[a.id]; return h('section', { class: 'panel' }, h('div', { class: 'ph' }, iconOf(a), a.title), w ? h('div', { class: 'vhead' }, h('div', { class: 'vk' }, 'Winner'), h('h2', { class: 'gt' }, '🏆 ' + w)) : h('div', { class: 'msg' }, 'No votes were cast for this one.')); }
    const noms = (a.nominees || []).map(playerById).filter(Boolean), c = t[a.id] || {}, total = Object.values(c).reduce((x, y) => x + y, 0), mx = Math.max(0, ...Object.values(c)), list = [...noms].sort((x, y) => (c[y.id] || 0) - (c[x.id] || 0));
    return h('section', { class: 'panel', id: 'aw-' + a.id }, h('div', { class: 'ph' }, iconOf(a), a.title), list.length ? h('div', { class: 'grid stg' }, ...list.map((p, r) => { const w = mx > 0 && (c[p.id] || 0) === mx; return pcard(p, { i: r, cls: w ? ' win' : '', badge: r < 3 && (c[p.id] || 0) > 0 ? h('span', { class: 'medal' }, ['🥇', '🥈', '🥉'][r]) : '', extra: [h('div', { class: 'bar7' }, h('i', { style: 'width:' + (total ? (c[p.id] || 0) / total * 100 : 0) + '%' })), h('span', { class: 'cnt' }, (c[p.id] || 0) + ((c[p.id] || 0) === 1 ? ' vote' : ' votes'))] }); })) : h('div', { class: 'msg' }, 'No nominees.'));
  }));
}
/* ---- navigation, render, startup ---- */
const VIEWS = { home, players, awards, voting, admin: () => adminView(), sheet: () => sheetView() };
function go(v) { cur = v; if (v === 'voting' && !['scene'].includes(cer.mode)) { clearTimeout(cer.t); cer = { mode: 'land', i: 0 }; } fresh = true; $('nav').classList.remove('open'); $('burger').setAttribute('aria-expanded', 'false'); render(true); scrollTo({ top: 0 }); }
function creditsText() {
  const ms = [...S.awards.map((a) => a.meta), S.special.intro, S.special.outro].filter((m) => m && m.music && m.music_title), seenK = {}, out = [];
  ms.forEach((m) => { const k = m.music_title + '|' + m.music_credit; if (seenK[k]) return; seenK[k] = 1; out.push([m.music_title, m.music_credit, m.music_link]); });
  return out;
}
function render(force) {
  const a = document.activeElement;
  if (!force && a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName) && ((cur === 'admin' && admin && a.closest('.ad')) || a.classList.contains('wi-in'))) return;
  document.body.classList.toggle('cer', cur === 'voting' && ['scene', 'vote', 'lock', 'edit'].includes(cer.mode));
  const names = [['home', 'Home'], ['players', 'Players'], ['awards', 'Awards'], ['voting', 'Voting'], ...(admin ? [['admin', 'Admin']] : [])];
  $('links').replaceChildren(...names.map(([k, t]) => h('button', { type: 'button', class: cur === k ? 'on' : '', 'aria-current': cur === k ? 'page' : 'false', onclick: () => go(k) }, t)));
  $('adm').hidden = admin && ADMIN_ROUTE;
  const cr = $('credits'), cs = creditsText(); cr.replaceChildren(...(cs.length ? ['Music: ', ...cs.flatMap(([t, c, l], i) => [i ? '; ' : '', l && /^https?:/.test(l) ? h('a', { href: l, target: '_blank', rel: 'noopener' }, t) : t, c ? ' by ' + c : ''])] : []));
  let el; try { el = VIEWS[cur](); } catch (e) { console.error(e); el = h('div', { class: 'msg' }, 'Something went wrong. Please refresh the page.'); }
  if (fresh) { el.classList.add('fade'); fresh = false; }
  $('v').replaceChildren(el); tick();
}
function tick() { const c = $('cd'); if (!c) return; if (!S.set.deadline) { c.hidden = true; return; } c.hidden = false; const ms = S.set.deadline - Date.now(); if (ms <= 0) { c.textContent = 'Voting closed'; return; } const s = Math.floor(ms / 1e3), p = (n) => String(n).padStart(2, '0'); c.replaceChildren('Voting closes in ', h('b', {}, Math.floor(s / 86400) + 'd ' + p(Math.floor(s % 86400 / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60))); }
function endIntro() { const i = $('intro'); if (!i || i.classList.contains('done')) return; i.classList.add('done'); setTimeout(() => { const x = $('intro'); if (x) x.remove(); }, 900); }
document.addEventListener('DOMContentLoaded', () => {
  setInterval(tick, 1000);
  $('brand').onclick = () => { if (document.body.classList.contains('cer')) return; go('home'); };
  $('burger').onclick = () => { const n = $('nav'), o = n.classList.toggle('open'); $('burger').setAttribute('aria-expanded', o); };
  $('adm').onclick = () => { if (admin || ADMIN_ROUTE) go('admin'); else location.href = '/admin/'; };
  $('leave').onclick = async () => { if (await confirmBox('Leave voting?', 'Your locked votes are saved. You can come back any time.', 'Leave')) leaveVoting(); };
  const snd = $('snd'); snd.textContent = AU.muted ? '🔇' : '🔊'; snd.onclick = () => { AU.setMuted(!AU.muted); snd.textContent = AU.muted ? '🔇' : '🔊'; };
  document.addEventListener('click', (e) => { const n = $('nav'); if (n.classList.contains('open') && !n.contains(e.target)) { n.classList.remove('open'); $('burger').setAttribute('aria-expanded', 'false'); } });
  try {
    if (document.documentElement.classList.contains('noint')) { const i = $('intro'); if (i) i.remove(); }
    else { const p = $('iparts'); for (let k = 0; k < 16; k++) { const s = document.createElement('i'); s.style.cssText = 'left:' + (5 + Math.random() * 90) + '%;--dx:' + ((Math.random() - .5) * 80) + 'px;animation-duration:' + (4 + Math.random() * 4) + 's;animation-delay:' + (Math.random() * 2) + 's'; p.append(s); } $('skip').onclick = endIntro; setTimeout(endIntro, 3300); }
  } catch (e) { const i = $('intro'); if (i) i.remove(); }
  render(true); load(); setInterval(() => { if (!document.hidden && !sceneOn && cer.mode !== 'scene') load(); }, 15000);
});
