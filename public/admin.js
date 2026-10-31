/* admin.js: the admin dashboard (tabs), voice studio, recorder, timeline and results */
const ADMIN_TABS = [['ceremony', 'Ceremony'], ['awards', 'Awards'], ['studio', 'Voice studio'], ['players', 'Players'], ['voting', 'Voting']];
let adminTab = 'ceremony', studioItem = '_intro'; const lens = {}, lensBusy = {};
const ICON_OPTS = Object.keys(ICONS).map((k) => [k, k]);
const SPEEDS = [['0.8', '0.8× slower'], ['0.9', '0.9×'], ['1', 'Normal speed'], ['1.1', '1.1×'], ['1.2', '1.2× faster'], ['1.3', '1.3×'], ['1.4', '1.4× fastest']];
const VOLS = [['0.6', 'Quieter'], ['1', 'Normal'], ['1.4', 'Louder'], ['1.8', 'Much louder']];
const fld = (l, el) => h('label', { class: 'fld' }, h('span', {}, l), el);
const inp = (val, fn, type = 'text', ph = '', step) => h('input', { type, value: val == null ? '' : val, placeholder: ph, ...(step ? { step } : {}), onchange: (e) => fn(type === 'number' ? (e.target.value === '' ? null : +e.target.value) : e.target.value) });
const numInp = (val, fn) => inp(val == null ? '' : +(+val).toFixed(2), fn, 'number', '', '0.1');
const ta = (val, fn) => { const t = h('textarea', { onchange: (e) => fn(e.target.value) }); t.value = val || ''; return t; };
const sel = (opts, val, fn) => { const s = h('select', { onchange: (e) => fn(e.target.value) }, ...opts.map(([v, l]) => h('option', { value: v }, l))); s.value = val; return s; };
const thumb = (o) => (o && o.photo ? h('img', { src: '/api/photo/' + o.photo, alt: '' }) : h('u'));
function pickFile(accept, cb) { const f = h('input', { type: 'file', accept }); f.onchange = () => { if (f.files[0]) cb(f.files[0]); }; f.click(); }
const shrink = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => { const s = Math.min(1, 900 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * s); c.height = Math.round(i.height * s); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); c.toBlob((b) => (b ? ok(b) : no()), 'image/jpeg', .88); }; i.onerror = no; i.src = r.result; }; r.onerror = no; r.readAsDataURL(f); });
function pick(kind, id) { pickFile('image/*', async (file) => { try { const r = await api('admin/upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: await shrink(file) }); await upd(kind, id, { photo: r.key }); toast('Picture saved 📸'); } catch (e) { toast('Upload failed'); } }); }
async function upAudioBlob(blob, type) {
  if (blob.size > 1300000) { toast('That file is too big (max about 1.3 MB). Use a shorter clip.'); return null; }
  try { const r = await api('admin/audio', { method: 'POST', headers: { 'Content-Type': type || blob.type || 'audio/mpeg' }, body: blob }); return r.key; } catch (e) { toast(e.message || 'Upload failed'); return null; }
}
let pv = null;
function preview(id, bus) { const c = AU.init(); if (!c) { toast('Sound isn’t supported on this device'); return; } AU.buf(id).then((b) => { if (!b) { toast('Couldn’t play that file'); return; } if (pv) { try { pv.stop(); } catch (e) {} } const s = c.createBufferSource(); s.buffer = b; s.connect(bus === 'music' ? AU.music : AU.voice); s.start(); pv = s; }); }
function playBeat(b) { const c = AU.init(); if (!c) return; AU.buf(b.audio).then((buf) => { if (!buf) { toast('Couldn’t play that clip'); return; } if (pv) { try { pv.stop(); } catch (e) {} } pv = AU.playClip(buf, AU.voice, AU.now(), b); }); }
function ensureLens(beats) { beats.forEach((b) => { if (!b.audio || lens[b.audio] || lensBusy[b.audio]) return; lensBusy[b.audio] = 1; if (!AU.init()) return; AU.buf(b.audio).then((bf) => { if (bf) { lens[b.audio] = bf.duration; render(true); } }); }); }
const shortTitle = (it) => (it.id === '_intro' ? 'Opening' : it.id === '_outro' ? 'Thank-you' : it.title);
const items = () => [{ id: '_intro', title: 'Opening: the School D’Or story', fixed: true }, ...S.awards.map((a) => ({ id: a.id, title: a.title, a })), { id: '_outro', title: 'Thank-you screen', fixed: true }];
const voiceStat = (id) => { const bs = beatsOf(id); return { total: bs.length, rec: bs.filter((b) => b.audio).length }; };
const move = async (i, d) => { const ids = S.awards.map((a) => a.id), j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; try { await api('admin/order', jp('PUT', { ids })); load(); } catch (e) { oops(); } };
const cfgFor = (it) => (it.id === '_intro' ? introCfg() : it.id === '_outro' ? outroCfg() : awardCfg(it.a));
async function previewAll() { for (const it of items()) { if (it.id === '_intro') await playScene(introCfg()); else await playScene(cfgFor(it)); } }
async function resetAward(a) { if (!confirm('Delete all votes for “' + a.title + '”? This cannot be undone.')) return; try { await api('admin/reset-votes', jp('POST', { award: a.id })); load(); toast('Votes cleared for ' + a.title); } catch (e) { oops(); } }
async function resetAll() { if (!confirm('Delete ALL votes for ALL awards? This cannot be undone.')) return; try { await api('admin/reset-votes', jp('POST', {})); load(); toast('All votes cleared'); } catch (e) { oops(); } }
const musicBlock = (id, m) => h('div', { class: 'sub-card' }, h('h4', {}, '🎵 Music (optional)'), h('div', { class: 'mut' }, 'Leave empty and the built-in cinematic score plays. Only use music you have permission to use, and fill in the credit if the licence needs it.'),
  h('div', { class: 'fg' }, fld('Track title', inp(m.music_title, (v) => metaSet(id, { music_title: v }))), fld('Artist / credit', inp(m.music_credit, (v) => metaSet(id, { music_credit: v }))), fld('Link to the track page', inp(m.music_link, (v) => metaSet(id, { music_link: v }), 'text', 'https://…'))),
  h('div', { class: 'btns' }, h('span', { class: 'tag' + (m.music ? ' ok' : '') }, m.music ? 'Track added ✓' : 'Using built-in score'),
    h('button', { class: 'btn sm out', onclick: () => pickFile('audio/*,.mp3,.m4a,.wav,.aac', async (f) => { const k = await upAudioBlob(f); if (k) { await metaSet(id, { music: k }); toast('Music added 🎵'); } }) }, m.music ? 'Replace track' : 'Upload track'),
    m.music ? h('button', { class: 'btn sm out', onclick: () => preview(m.music, 'music') }, '▶ Play') : '', m.music ? h('button', { class: 'btn sm danger', onclick: () => metaSet(id, { music: null, music_title: null, music_credit: null, music_link: null }) }, 'Remove') : ''));
/* ---------- tabs ---------- */
function adminView() {
  if (!ready) return h('div', { class: 'msg' }, 'Loading…');
  if (!admin) return loginView();
  const body = { ceremony: tabCeremony, awards: tabAwards, studio: tabStudio, players: tabPlayers, voting: tabVoting }[adminTab]();
  return h('div', { class: 'ad' }, h('div', { class: 'tabs noprint' }, ...ADMIN_TABS.map(([k, t]) => h('button', { class: adminTab === k ? 'on' : '', onclick: () => { adminTab = k; render(true); scrollTo({ top: 0 }); } }, t))), body);
}
function tabCeremony() {
  const its = items();
  return h('div', {}, ...head('Ceremony', 'This is the order voters see. The School D’Or story always plays first, then each award from the top of the list down. Put the biggest award last.'),
    h('div', { class: 'btns' }, h('button', { class: 'btn', onclick: previewAll }, '▶ Preview the whole ceremony')),
    ...its.map((it, idx) => { const v = voiceStat(it.id), m = itemMeta(it.id), a = it.a, ai = idx - 1;
      const info = [a ? (kindOf(a) === 'writein' ? 'Typed names' : (a.nominees || []).length + ' nominees') : null, v.total ? '🎙 ' + v.rec + '/' + v.total + ' lines recorded' : 'default text, no voice yet', m.music ? '🎵 own music' : null].filter(Boolean).join(' · ');
      return h('div', { class: 'acard' }, h('div', { class: 'arow' }, h('b', { class: 'gt', style: 'min-width:1.6rem' }, idx === 0 ? '▶' : idx === its.length - 1 ? '■' : String(idx)), h('div', { style: 'flex:1' }, h('div', { style: 'font-weight:600' }, it.title), h('div', { class: 'mut' }, info))),
        h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => playScene(cfgFor(it)) }, '▶ Preview'), h('button', { class: 'btn sm out', onclick: () => { studioItem = it.id; adminTab = 'studio'; render(true); scrollTo({ top: 0 }); } }, '✎ Text & voice'),
          a ? h('button', { class: 'btn sm out', 'aria-label': 'Move up', onclick: () => move(ai, -1) }, '▲') : '', a ? h('button', { class: 'btn sm out', 'aria-label': 'Move down', onclick: () => move(ai, 1) }, '▼') : '')); }));
}
function tabAwards() {
  const an = h('input', { placeholder: 'New award name, e.g. Best Goalkeeper' }), as = sel(ICON_OPTS, 'trophy', () => {}), ak = sel([['pick', 'Pick from nominees'], ['writein', 'Write-in (people type a name)']], 'pick', () => {});
  return h('div', {}, ...head('Awards', 'Create awards, choose nominees and pictures. The public never sees this list until the ceremony.'),
    ...S.awards.map((a, i) => { const wi = kindOf(a) === 'writein';
      return h('div', { class: 'acard' }, h('div', { class: 'arow' }, h('span', { class: 'mut' }, '#' + (i + 1)), thumb(a), inp(a.title, (v) => upd('awards', a.id, { title: v }))),
        h('div', { class: 'fg' }, fld('Icon', sel(ICON_OPTS, a.icon || 'trophy', (v) => upd('awards', a.id, { icon: v }))), fld('Type', sel([['pick', 'Pick from nominees'], ['writein', 'Write-in (type a name)']], kindOf(a), (v) => metaSet(a.id, { kind: v }))), fld('Animation text style', sel([['auto', 'Auto (from the award name)'], ['dor', 'Player of the year'], ['puskas', 'Goal of the year'], ['glove', 'Goalkeeper'], ['maestro', 'Playmaker'], ['rising', 'Rising star'], ['joke', 'Joke award'], ['people', 'People’s choice']], meta(a).style || 'auto', (v) => metaSet(a.id, { style: v })))),
        h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => pick('awards', a.id) }, '🖼 Award picture'), h('button', { class: 'btn sm out', onclick: () => { studioItem = a.id; adminTab = 'studio'; render(true); } }, '✎ Text & voice'), h('button', { class: 'btn sm danger', onclick: () => resetAward(a) }, 'Reset votes'), h('button', { class: 'btn sm danger', onclick: () => confirm('Delete this award?') && del('awards', a.id) }, 'Delete')),
        wi ? h('div', { class: 'mut' }, 'Write-in award: there are no nominees. Voters type a name, and you see the smart counts in the Voting tab.') : h('div', {}, h('div', { class: 'mut' }, 'Nominees (tap to add or remove)'), h('div', { class: 'btns', style: 'margin-top:.4rem' }, ...S.players.map((p) => { const on = (a.nominees || []).includes(p.id); return h('button', { class: 'sel' + (on ? ' on' : ''), onclick: () => upd('awards', a.id, { nominees: on ? a.nominees.filter((x) => x !== p.id) : [...(a.nominees || []), p.id] }) }, p.name); }))));
    }),
    h('div', { class: 'acard' }, h('b', {}, 'Add an award'), an, h('div', { class: 'fg' }, fld('Icon', as), fld('Type', ak)), h('div', {}, h('button', { class: 'btn sm', onclick: async () => { if (!an.value.trim()) { toast('Name the award'); return; } const r = await add('awards', { title: an.value.trim(), icon: as.value, nominees: [] }); if (r && ak.value === 'writein') await metaSet(r.id, { kind: 'writein', style: 'people' }); an.value = ''; } }, 'Add award'))));
}
function tabPlayers() {
  const pn = h('input', { placeholder: 'Player name' }), pp = h('input', { placeholder: 'Position' });
  return h('div', {}, ...head('Players', 'Add players, their stats and their photos.'),
    ...S.players.map((p) => h('div', { class: 'acard' }, h('div', { class: 'arow' }, thumb(p), inp(p.name, (v) => upd('players', p.id, { name: v }))),
      h('div', { class: 'fg' }, fld('Position', inp(p.position, (v) => upd('players', p.id, { position: v }))), fld('Goals', inp(p.goals, (v) => upd('players', p.id, { goals: v }), 'number')), fld('Assists', inp(p.assists, (v) => upd('players', p.id, { assists: v }), 'number')), fld('Rating', inp(p.rating, (v) => upd('players', p.id, { rating: v }), 'number'))),
      h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => pick('players', p.id) }, '📷 Photo'), h('button', { class: 'btn sm danger', onclick: () => confirm('Delete ' + p.name + '?') && del('players', p.id) }, 'Delete')))),
    h('div', { class: 'acard' }, h('b', {}, 'Add a player'), pn, pp, h('div', {}, h('button', { class: 'btn sm', onclick: () => { if (!pn.value.trim()) { toast('Add a name'); return; } add('players', { name: pn.value.trim(), position: pp.value.trim(), goals: 0, assists: 0, rating: 0 }); pn.value = pp.value = ''; } }, 'Add player'))));
}
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
function tabVoting() {
  const dl = h('input', { type: 'datetime-local', 'aria-label': 'Voting deadline' }), code = h('input', { placeholder: 'Voting code (optional)', 'aria-label': 'Voting code' }), t = tally();
  return h('div', {}, ...head('Voting & results', (S.voters || 0) + ' voters so far · one ballot per device'),
    h('div', { class: 'acard' },
      h('div', { class: 'btns' }, h('button', { class: 'btn sm', onclick: () => setS({ revealed: !S.set.revealed }) }, S.set.revealed ? 'Hide results & reopen voting' : 'Reveal results & close voting'), h('button', { class: 'btn sm out', onclick: () => setS({ tts: !S.set.tts }) }, 'Robot voice if no recording: ' + (S.set.tts ? 'ON' : 'OFF')), h('button', { class: 'btn sm out', onclick: logout }, 'Log out')),
      fld('Voting deadline', dl), h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => { if (!dl.value) { toast('Pick a date and time'); return; } setS({ deadline: new Date(dl.value).getTime() }); } }, 'Set deadline'), h('button', { class: 'btn sm out', onclick: () => setS({ deadline: 0 }) }, 'Clear deadline')),
      fld('Voting code', code), h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => setS({ code: code.value.trim() }) }, 'Set voting code'), h('button', { class: 'btn sm out', onclick: () => setS({ code: '' }) }, 'Remove code'))),
    h('div', { class: 'asec' }, h('h3', {}, 'Live results (only you can see this)'),
      ...S.awards.map((a) => { const wi = kindOf(a) === 'writein', c = t[a.id] || {}, noms = (a.nominees || []).map(playerById).filter(Boolean).sort((x, y) => (c[y.id] || 0) - (c[x.id] || 0));
        return h('div', { class: 'acard' }, h('div', { class: 'arow' }, h('b', { style: 'flex:1' }, a.title), h('button', { class: 'btn sm danger', onclick: () => resetAward(a) }, 'Reset votes')),
          wi ? writeinResults(a) : noms.length ? h('div', {}, ...noms.map((p) => h('div', { class: 'grp' }, h('div', { class: 'top' }, h('span', {}, p.name), h('b', {}, c[p.id] || 0))))) : h('div', { class: 'mut' }, 'No nominees yet.')); })),
    h('div', { class: 'acard' }, h('b', {}, 'Danger zone'), h('div', { class: 'mut' }, 'Removes every vote for every award. Players, awards and recordings are kept.'), h('div', {}, h('button', { class: 'btn sm danger', onclick: resetAll }, 'Reset ALL votes'))));
}
/* ---------- voice studio ---------- */
async function createBeats(id, quiet) {
  if (beatsOf(id).length) return;
  try { for (const b of defaultBeats(defaultStyleFor(id))) await api('admin/beats', jp('POST', { item: id, text: b.text, fx: b.fx, start: b.start })); await load(); if (!quiet) toast('Timeline ready to edit'); } catch (e) { oops('Couldn’t save. Did you run migration-v3.sql in D1?'); }
}
async function addLine(id) { const bs = beatsOf(id), end = bs.length ? Math.max(...bs.map((b) => b.start + b.dur)) : 1; await add('beats', { item: id, text: 'New line', fx: 'rise', start: +(end + .4).toFixed(1) }); }
async function resetItem(id) { if (!confirm('Delete this timeline (all lines and recordings) and go back to the default text?')) return; try { for (const b of beatsOf(id)) await api('admin/beats/' + b.id, { method: 'DELETE' }); await load(); } catch (e) { oops(); } }
function tabStudio() {
  const its = items(); if (!its.find((x) => x.id === studioItem)) studioItem = '_intro';
  const chips = its.map((it) => { const v = voiceStat(it.id); return h('button', { class: 'sel' + (it.id === studioItem ? ' on' : ''), onclick: () => { studioItem = it.id; render(true); } }, (v.total && v.rec === v.total ? '✓ ' : v.rec ? '◐ ' : '') + shortTitle(it)); });
  return h('div', {}, ...head('Voice studio', 'Pick what to edit. Each line of text can have its own voice clip that you can record, move, trim and speed up.'), h('div', { class: 'chipbar' }, ...chips), studioPanel(its.find((x) => x.id === studioItem)));
}
function studioPanel(it) {
  const id = it.id, saved = beatsOf(id), custom = saved.length > 0, bs = beatsFor(id); ensureLens(bs);
  const T = sceneTiming(bs, 0, lens);
  return h('div', { class: 'studio' }, h('h3', { class: 'gt', style: 'font:700 1.4rem Cinzel,serif;margin:.4rem 0' }, it.title),
    h('div', { class: 'btns' }, h('button', { class: 'btn sm', onclick: () => playScene(cfgFor(it)) }, '▶ Preview'), h('button', { class: 'btn sm out', onclick: () => voiceSession(id) }, '🎙 Record all lines'), h('button', { class: 'btn sm out', onclick: () => go('sheet') }, '📝 Recording sheet')),
    custom ? '' : h('div', { class: 'msg' }, 'This item is using the built-in wording. Tap Customise to edit the lines, record your friend’s voice and place each clip.', h('div', { style: 'margin-top:.7rem' }, h('button', { class: 'btn sm', onclick: () => createBeats(id) }, 'Customise this timeline'))),
    timeline(bs, T, custom),
    ...(custom ? bs.map((b, i) => beatCard(b, i, id)) : []),
    custom ? h('div', { class: 'btns' }, h('button', { class: 'btn sm out', onclick: () => addLine(id) }, '+ Add a line'), h('button', { class: 'btn sm danger', onclick: () => resetItem(id) }, 'Reset to default text')) : '',
    musicBlock(id, itemMeta(id)));
}
function timeline(bs, T, custom) {
  const D = T.D, wrap = h('div', { class: 'tl' }), ruler = h('div', { class: 'tl-ruler' }), lt = h('div', { class: 'tl-lane' }, h('span', { class: 'tl-lbl' }, 'Text')), lv = h('div', { class: 'tl-lane' }, h('span', { class: 'tl-lbl' }, 'Voice'));
  const step = D > 40 ? 10 : 5; for (let s = 0; s <= D; s += step) ruler.append(h('i', { style: 'left:' + s / D * 100 + '%' }, s + 's'));
  const lane = (el, b, kind, startKey, wsec, label) => {
    const st = kind === 'text' ? b.start : (b.vstart == null ? b.start : b.vstart), blk = h('div', { class: 'tlb ' + kind + (custom ? ' drag' : ''), style: 'left:' + st / D * 100 + '%;width:' + Math.max(2.5, wsec / D * 100) + '%' }, h('span', {}, label));
    if (custom) blk.addEventListener('pointerdown', (e) => { e.preventDefault(); blk.setPointerCapture(e.pointerId); const r = el.getBoundingClientRect(), x0 = e.clientX, s0 = st; let ns = s0;
      const mv = (ev) => { ns = Math.max(0, Math.min(D - .5, s0 + (ev.clientX - x0) / r.width * D)); blk.style.left = ns / D * 100 + '%'; }, up = () => { blk.removeEventListener('pointermove', mv); blk.removeEventListener('pointerup', up); ns = Math.round(ns * 10) / 10; if (Math.abs(ns - s0) > .04) upd('beats', b.id, { [startKey]: ns }); };
      blk.addEventListener('pointermove', mv); blk.addEventListener('pointerup', up); });
    el.append(blk);
  };
  bs.forEach((b) => { if (b.text) lane(lt, b, 'text', 'start', b.dur, b.text.slice(0, 22)); if (b.audio) lane(lv, b, 'voice', 'vstart', lens[b.audio] ? clipSeconds(lens[b.audio], b) : 2, '🎙'); });
  const mk = h('div', { class: 'tl-reveal', style: 'left:' + T.R / D * 100 + '%' }, h('span', { style: T.R / D > .7 ? 'left:auto;right:.35rem' : '' }, '🏆 trophy'));
  wrap.append(ruler, lt, lv, mk, h('div', { class: 'mut', style: 'margin-top:.4rem' }, custom ? 'Drag a block left or right to move it. The trophy appears after the last line and voice finish (' + T.R.toFixed(1) + 's).' : 'Preview of the built-in timing (' + T.R.toFixed(1) + 's to the trophy).'));
  return wrap;
}
function beatCard(b, i, item) {
  const vs = b.vstart == null ? b.start : b.vstart;
  return h('div', { class: 'acard beat' }, h('div', { class: 'arow' }, h('b', {}, 'Line ' + (i + 1)), h('span', { style: 'flex:1' }), h('button', { class: 'btn sm danger', onclick: () => confirm('Delete this line?') && del('beats', b.id) }, 'Delete')),
    ta(b.text, (v) => upd('beats', b.id, { text: v })),
    h('div', { class: 'fg' }, fld('Animation', sel(FX_LIST, b.fx || 'rise', (v) => upd('beats', b.id, { fx: v }))), fld('Text appears at (seconds)', numInp(b.start, (v) => upd('beats', b.id, { start: Math.max(0, v || 0) })))),
    h('div', { class: 'sub-card' }, h('h4', {}, '🎙️ Voice for this line'),
      h('div', { class: 'btns' }, h('span', { class: 'tag' + (b.audio ? ' ok' : '') }, b.audio ? 'Recorded ✓' : 'No voice yet'), h('button', { class: 'btn sm', onclick: () => recordLine(b) }, b.audio ? '🎙 Re-record' : '🎙 Record'),
        h('button', { class: 'btn sm out', onclick: () => pickFile('audio/*,.mp3,.m4a,.wav,.aac', async (f) => { const k = await upAudioBlob(f); if (k) { await upd('beats', b.id, { audio: k, trim_in: 0, trim_out: 0 }); toast('Voice added'); } }) }, 'Upload file'),
        b.audio ? h('button', { class: 'btn sm out', onclick: () => playBeat(b) }, '▶ Play') : '', b.audio ? h('button', { class: 'btn sm danger', onclick: () => upd('beats', b.id, { audio: null, trim_in: 0, trim_out: 0 }) }, 'Remove') : ''),
      b.audio ? h('div', { style: 'display:grid;gap:.6rem' }, h('div', { class: 'fg' }, fld('Voice starts at (seconds)', numInp(vs, (v) => upd('beats', b.id, { vstart: Math.max(0, v || 0) }))), fld('Speed', sel(SPEEDS, String(b.speed), (v) => upd('beats', b.id, { speed: +v }))), fld('Volume', sel(VOLS, String(b.gain), (v) => upd('beats', b.id, { gain: +v })))), waveform(b)) : ''));
}
function waveform(b) {
  const wrap = h('div', { class: 'wave' }), len = lens[b.audio], buf = AU.bufs[b.audio];
  if (!len || !buf) { wrap.append(h('div', { class: 'mut' }, 'Loading waveform…')); return wrap; }
  const cv = h('canvas', { width: 640, height: 80 }), g = cv.getContext('2d'), d = buf.getChannelData(0), bins = 160, per = Math.floor(d.length / bins);
  g.fillStyle = '#d4af37'; for (let i = 0; i < bins; i++) { let pk = 0; for (let k = 0; k < per; k += 8) pk = Math.max(pk, Math.abs(d[i * per + k] || 0)); const hh = Math.max(2, pk * 76); g.fillRect(i * 4, 40 - hh / 2, 3, hh); }
  const cur = { in: b.trim_in || 0, out: b.trim_out > (b.trim_in || 0) ? Math.min(b.trim_out, len) : len };
  const sh1 = h('div', { class: 'shade' }), sh2 = h('div', { class: 'shade' }), hl = h('div', { class: 'hd' }), hr = h('div', { class: 'hd' }), lab = h('div', { class: 'mut' });
  const paint = () => { sh1.style.cssText = 'left:0;width:' + cur.in / len * 100 + '%'; sh2.style.cssText = 'left:' + cur.out / len * 100 + '%;right:0'; hl.style.left = cur.in / len * 100 + '%'; hr.style.left = cur.out / len * 100 + '%'; lab.textContent = 'Keeping ' + cur.in.toFixed(2) + 's to ' + cur.out.toFixed(2) + 's of ' + len.toFixed(1) + 's. Drag the gold handles to trim.'; };
  const drag = (el, which) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); const r = wrap.getBoundingClientRect();
    const mv = (ev) => { let t = Math.min(len, Math.max(0, (ev.clientX - r.left) / r.width * len)); if (which === 'in') t = Math.min(t, cur.out - .1); else t = Math.max(t, cur.in + .1); cur[which] = t; paint(); };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); upd('beats', b.id, { trim_in: +cur.in.toFixed(3), trim_out: cur.out >= len - .03 ? 0 : +cur.out.toFixed(3) }); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); });
  drag(hl, 'in'); drag(hr, 'out'); paint(); wrap.append(cv, sh1, sh2, hl, hr); return h('div', {}, wrap, lab);
}
/* ---------- recorder ---------- */
function closeModal() { const m = $('modal'); m.classList.remove('on'); m.replaceChildren(); }
function recordLine(b, o = {}) {
  return new Promise((resolve) => {
    const m = $('modal'); m.replaceChildren(); m.classList.add('on'); m.onclick = null;
    let phase = 'ready', stream = null, mr = null, chunks = [], wav = null, wbuf = null, timer = null, t0 = 0, src = null, done = false;
    const stop = () => { clearInterval(timer); try { if (mr && mr.state !== 'inactive') mr.stop(); } catch (e) {} if (stream) stream.getTracks().forEach((t) => t.stop()); };
    const fin = (r) => { if (done) return; done = true; stop(); try { if (src) src.stop(); } catch (e) {} closeModal(); resolve(r); };
    const draw = () => {
      const box = h('div', { class: 'mbox rec' }, h('div', { class: 'mut' }, o.total ? 'Line ' + (o.idx + 1) + ' of ' + o.total : 'Record a line'), h('div', { class: 'prompt' }, b.text || '(no text)'));
      if (phase === 'ready') box.append(h('p', { class: 'mut' }, 'Read the line slowly and deeply. Start speaking right away.'), h('button', { class: 'btn wide big', onclick: begin }, '● Record'),
        h('button', { class: 'btn out wide', onclick: () => pickFile('audio/*,.mp3,.m4a,.wav,.aac', async (f) => { const k = await upAudioBlob(f); if (k) { await upd('beats', b.id, { audio: k, trim_in: 0, trim_out: 0 }); fin('kept'); } }) }, 'Upload a file instead'));
      if (phase === 'rec') { const tt = h('div', { class: 'recdot' }, '● Recording… 0.0s'); box.append(tt, h('button', { class: 'btn wide big', onclick: finishRec }, '■ Stop')); timer = setInterval(() => { const s = (performance.now() - t0) / 1000; tt.textContent = '● Recording… ' + s.toFixed(1) + 's'; if (s > 25) finishRec(); }, 100); }
      if (phase === 'review') box.append(h('p', { class: 'mut' }, 'Silence at the start and end was trimmed automatically (' + (wbuf ? wbuf.duration.toFixed(1) : '?') + 's).'), h('button', { class: 'btn out wide', onclick: playRec }, '▶ Listen'), h('button', { class: 'btn wide', onclick: keep }, '✓ Keep it' + (o.total ? ' & next' : '')), h('button', { class: 'btn out wide', onclick: () => { phase = 'ready'; draw(); } }, '↺ Try again'));
      if (phase === 'err') box.append(h('p', { class: 'lm' }, 'Couldn’t use the microphone. Allow microphone access in your browser, or upload a file instead.'), h('button', { class: 'btn out wide', onclick: () => { phase = 'ready'; draw(); } }, 'Back'));
      const row = h('div', { class: 'btns', style: 'justify-content:center;margin-top:.8rem' }); if (o.total) row.append(h('button', { class: 'btn sm out', onclick: () => fin('skip') }, 'Skip this line')); row.append(h('button', { class: 'btn sm out', onclick: () => fin('close') }, o.total ? 'Stop session' : 'Close')); box.append(row);
      m.replaceChildren(box);
    };
    async function begin() { try { stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } }); chunks = []; mr = new MediaRecorder(stream); mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); }; mr.onstop = async () => { try { AU.init(); const ab = await new Blob(chunks, { type: mr.mimeType }).arrayBuffer(); const dec = await AU.decode(ab); wav = AU.toWav(dec); wbuf = await AU.decode(await wav.arrayBuffer()); phase = 'review'; } catch (e) { phase = 'err'; } if (!done) draw(); }; mr.start(); t0 = performance.now(); phase = 'rec'; draw(); } catch (e) { phase = 'err'; draw(); } }
    function finishRec() { clearInterval(timer); if (mr && mr.state !== 'inactive') mr.stop(); if (stream) stream.getTracks().forEach((t) => t.stop()); }
    function playRec() { if (!wbuf || !AU.init()) return; try { if (src) src.stop(); } catch (e) {} src = AU.ctx.createBufferSource(); src.buffer = wbuf; src.connect(AU.voice); src.start(); }
    async function keep() { const k = await upAudioBlob(wav, 'audio/wav'); if (!k) return; await upd('beats', b.id, { audio: k, trim_in: 0, trim_out: 0 }); toast('Saved 🎙️'); fin('kept'); }
    draw();
  });
}
async function voiceSession(id) {
  await createBeats(id, true);
  const total = beatsOf(id).length;
  for (let i = 0; i < total; i++) { const b = beatsOf(id)[i]; if (!b || !b.text) continue; const r = await recordLine(b, { idx: i, total }); if (r === 'close') break; }
  closeModal(); toast('Recording session finished');
}
/* ---------- recording sheet, login ---------- */
function sheetView() {
  if (!admin) return loginView();
  const its = items();
  return h('div', { class: 'sheet' }, ...head('Voiceover recording sheet', 'Read each line slowly and deeply, like a movie trailer.'),
    h('div', { class: 'btns noprint' }, h('button', { class: 'btn', onclick: () => window.print() }, 'Print / Save as PDF'), h('button', { class: 'btn out', onclick: () => { adminTab = 'studio'; go('admin'); } }, '← Back to the studio')),
    h('div', { class: 'panel' }, h('b', {}, 'How to record'), h('p', { class: 'meta' }, 'Use a quiet room and hold the phone close. Record one line at a time. You can do a few now and the rest later, and you can re-record any line. Pause briefly before and after each line (the studio trims the silence), and speak slowly.')),
    ...its.map((it, n) => h('div', { class: 'item' }, h('h3', {}, (n + 1) + '. ' + it.title), ...beatsFor(it.id).filter((b) => b.text).map((b, i) => h('div', {}, h('div', { class: 'line' }, '“' + b.text + '”'), h('div', { class: 'meta' }, 'Line ' + (i + 1) + ' · comes in about ' + (b.vstart == null ? b.start : b.vstart).toFixed(1) + 's · about ' + Math.max(2, Math.round(b.text.split(/\s+/).length / 2.1)) + ' seconds long'))))));
}
function loginView() {
  const pw = h('input', { type: 'password', placeholder: 'Admin password', autocomplete: 'current-password', 'aria-label': 'Admin password' }), msg = h('div', { class: 'lm' });
  const go2 = async () => { const k = pw.value; if (!k) return; akey = k; try { await api('admin/login', { method: 'POST' }); sessionStorage.setItem(KEY, k); last = ''; pw.blur(); await load(); toast('Welcome, admin'); render(true); } catch (e) { akey = ''; msg.textContent = 'Wrong password.'; } };
  pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(); });
  return h('div', { class: 'login' }, h('div', { class: 'panel' }, h('h2', { class: 't gt', style: 'margin-top:0' }, 'Admin'), h('p', { class: 'sub2' }, 'Sign in to manage School D’Or.'), pw, msg, h('button', { class: 'btn wide', onclick: go2 }, 'Sign in')));
}
function logout() { akey = ''; sessionStorage.removeItem(KEY); admin = false; last = ''; fresh = true; load(); render(true); }
