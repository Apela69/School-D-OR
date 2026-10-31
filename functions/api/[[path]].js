// School D'Or API: Cloudflare Pages Functions + D1 (binding DB) + secret ADMIN_PASSWORD.

const J = (d, s = 200, h = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });

const TABLES = {
  players: ['name', 'position', 'goals', 'assists', 'rating', 'photo'],
  awards: ['title', 'icon', 'photo', 'nominees'],
  beats: ['item', 'text', 'fx', 'start', 'vstart', 'audio', 'trim_in', 'trim_out', 'speed', 'gain'],
};
const NUM_COLS = ['start', 'vstart', 'trim_in', 'trim_out', 'speed', 'gain'];
const META_COLS = ['kind', 'style', 'script', 'tone', 'duration', 'voice', 'voice_at', 'music', 'music_title', 'music_credit', 'music_link'];

const cookie = (req, n) => {
  const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + n + '=([^;]+)'));
  return m ? m[1] : null;
};
const isAdmin = (req, env) => !!env.ADMIN_PASSWORD && req.headers.get('X-Admin-Key') === env.ADMIN_PASSWORD;

async function settings(env) {
  const { results } = await env.DB.prepare('SELECT k, v FROM settings').all();
  const s = {};
  results.forEach((r) => (s[r.k] = r.v));
  return s;
}
const isLocked = (s) => s.revealed === '1' || (+s.deadline && Date.now() > +s.deadline);

async function myVotes(env, dev) {
  const mine = {};
  if (dev) {
    const { results } = await env.DB.prepare('SELECT award_id a, player_id p FROM votes WHERE device = ?').bind(dev).all();
    results.forEach((x) => (mine[x.a] = x.p));
  }
  return mine;
}
async function myWriteins(env, dev) {
  const mine = {};
  if (dev) {
    try {
      const { results } = await env.DB.prepare('SELECT award_id a, raw FROM writeins WHERE device = ?').bind(dev).all();
      results.forEach((x) => (mine[x.a] = x.raw));
    } catch (e) {}
  }
  return mine;
}
async function safeAll(env, sql, ...args) {
  try { return (await env.DB.prepare(sql).bind(...args).all()).results; } catch (e) { return []; }
}

// Shared checks for any ballot: closed? voting code? rate limit?
async function gate(req, env, b) {
  const s = await settings(env);
  if (isLocked(s)) return J({ error: 'Voting is closed' }, 403);
  if (s.code && String(b.code || '').trim().toLowerCase() !== s.code.toLowerCase()) return J({ error: 'Wrong voting code' }, 403);
  const ip = req.headers.get('CF-Connecting-IP') || 'x';
  const now = Date.now();
  await env.DB.prepare('DELETE FROM hits WHERE t < ?').bind(now - 600000).run();
  const hits = (await env.DB.prepare('SELECT COUNT(*) c FROM hits WHERE ip = ? AND t > ?').bind(ip, now - 60000).first()).c;
  if (hits >= 120) return J({ error: 'Too many votes, slow down' }, 429);
  await env.DB.prepare('INSERT INTO hits(ip, t) VALUES(?, ?)').bind(ip, now).run();
  return null;
}
function deviceFor(req) {
  let dev = cookie(req, 'sd_dev');
  let hdr = {};
  if (!dev || !/^[a-f0-9-]{36}$/.test(dev)) {
    dev = crypto.randomUUID();
    hdr = { 'Set-Cookie': `sd_dev=${dev}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` };
  }
  return { dev, hdr };
}

// ---- smart name matching for the write-in award ----
const normName = (s) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
}
const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);
// Like sim(), but also treats "smiith" and "mr smith" as the same: every real word of the shorter name must closely match a word of the longer one.
function nameSim(a, b) {
  let s = sim(a, b);
  const ta = a.split(' ').filter((t) => t.length >= 3);
  const tb = b.split(' ').filter((t) => t.length >= 3);
  if (ta.length && tb.length) {
    const [S, L] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    if (S.every((x) => L.some((y) => sim(x, y) >= 0.8))) s = Math.max(s, 0.85);
  }
  return s;
}
function matchPlayer(norm, pn) {
  let best = null, bs = 0, tie = false;
  const toks = norm.split(' ').filter((t) => t.length >= 3);
  for (const p of pn) {
    let s = sim(norm, p.norm);
    for (const t of p.norm.split(' ')) if (t.length >= 3) s = Math.max(s, sim(norm, t) * 0.97);
    for (const t of toks) s = Math.max(s, sim(t, p.norm) * 0.97);
    if (s > bs + 1e-9) { bs = s; best = p; tie = false; }
    else if (Math.abs(s - bs) < 1e-9 && best && s > 0) tie = true;
  }
  return bs >= 0.8 && !tie ? best : null;
}
function groupWriteins(rows, players, aliases) {
  const pn = players.map((p) => ({ id: p.id, name: p.name, norm: normName(p.name) }));
  const groups = [];
  const hidden = {};
  const put = (key, label, pid, r) => {
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label, playerId: pid || null, count: 0, variants: {} }; groups.push(g); }
    g.count++;
    const v = g.variants[r.norm] || (g.variants[r.norm] = { norm: r.norm, count: 0, raws: {} });
    v.count++;
    v.raws[r.raw] = (v.raws[r.raw] || 0) + 1;
  };
  for (const r of rows) {
    if (!r.norm) continue;
    if (r.norm in aliases) {
      const L = aliases[r.norm];
      if (L === '') { (hidden[r.norm] = hidden[r.norm] || { norm: r.norm, count: 0, raw: r.raw }).count++; continue; }
      const p = pn.find((x) => x.name === L);
      put('L:' + normName(L), L, p && p.id, r);
      continue;
    }
    const p = matchPlayer(r.norm, pn);
    if (p) { put('P:' + p.id, p.name, p.id, r); continue; }
    const g = groups.find((x) => !x.playerId && x.key.startsWith('N:') && nameSim(x.key.slice(2), r.norm) >= 0.8);
    put(g ? g.key : 'N:' + r.norm, g ? g.label : null, null, r);
  }
  const byLabel = {};
  for (const g of groups) {
    const vs = Object.values(g.variants).sort((a, b) => b.count - a.count);
    const label = g.label || Object.entries(vs[0].raws).sort((a, b) => b[1] - a[1])[0][0];
    const k = normName(label);
    const o = byLabel[k] || (byLabel[k] = { key: k, label, playerId: g.playerId, count: 0, variants: [] });
    o.count += g.count;
    vs.forEach((v) => o.variants.push({ norm: v.norm, count: v.count, raw: Object.entries(v.raws).sort((a, b) => b[1] - a[1])[0][0] }));
  }
  return { groups: Object.values(byLabel).sort((a, b) => b.count - a.count), hidden: Object.values(hidden) };
}

const b64 = (buf) => {
  let s = '';
  for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192));
  return btoa(s);
};
const unb64 = (str) => {
  const bin = atob(str);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
};

export async function onRequest({ request: req, env, params }) {
  const p = params.path || [];
  const route = p[0];
  const m = req.method;
  try {
    // ---- photos & audio ----
    if (route === 'photo' && m === 'GET') {
      const r = await env.DB.prepare('SELECT data FROM photos WHERE id = ?').bind(p[1] || '').first();
      if (!r) return new Response('Not found', { status: 404 });
      return new Response(unb64(r.data), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    if (route === 'audio' && m === 'GET') {
      const r = await env.DB.prepare('SELECT data, type FROM audio WHERE id = ?').bind(p[1] || '').first();
      if (!r) return new Response('Not found', { status: 404 });
      return new Response(unb64(r.data), { headers: { 'Content-Type': r.type || 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }

    // ---- public state ----
    if (route === 'state' && m === 'GET') {
      const s = await settings(env);
      const admin = isAdmin(req, env);
      const players = (await env.DB.prepare('SELECT * FROM players ORDER BY at').all()).results;
      const metaRows = await safeAll(env, 'SELECT * FROM award_meta');
      const M = {};
      metaRows.forEach((x) => (M[x.award_id] = x));
      const awards = (await env.DB.prepare('SELECT * FROM awards ORDER BY at').all()).results.map((a) => ({ ...a, nominees: JSON.parse(a.nominees || '[]'), meta: M[a.id] || null }));
      const tally = {};
      let voters = 0;
      if (admin || s.revealed === '1') {
        const r = (await env.DB.prepare('SELECT award_id a, player_id p, COUNT(*) c FROM votes GROUP BY award_id, player_id').all()).results;
        r.forEach((x) => ((tally[x.a] = tally[x.a] || {})[x.p] = x.c));
      }
      if (admin) voters = (await env.DB.prepare('SELECT COUNT(DISTINCT device) c FROM votes').first()).c;

      // write-in awards: only the admin sees counts; the public sees the winner once revealed
      const writeins = {};
      const winnerW = {};
      const wAwards = awards.filter((a) => a.meta && a.meta.kind === 'writein');
      if (wAwards.length && (admin || s.revealed === '1')) {
        const rows = await safeAll(env, 'SELECT award_id, raw, norm FROM writeins');
        const al = await safeAll(env, 'SELECT award_id, norm, label FROM aliases');
        for (const a of wAwards) {
          const amap = {};
          al.filter((x) => x.award_id === a.id).forEach((x) => (amap[x.norm] = x.label));
          const g = groupWriteins(rows.filter((x) => x.award_id === a.id), players, amap);
          if (admin) writeins[a.id] = g;
          if (s.revealed === '1' && g.groups[0]) winnerW[a.id] = g.groups[0].label;
        }
      }
      const beats = await safeAll(env, 'SELECT * FROM beats ORDER BY start');
      const dev = cookie(req, 'sd_dev');
      return J({
        players, awards, beats, tally, voters, admin, writeins, winnerW,
        special: { intro: M._intro || null, outro: M._outro || null },
        mine: await myVotes(env, dev), mineW: await myWriteins(env, dev),
        set: { revealed: s.revealed === '1', deadline: +s.deadline || 0, codeRequired: !!s.code, tts: s.tts === '1' },
      });
    }

    // ---- pick-a-nominee vote (one ballot per device per award, changeable until closed) ----
    if (route === 'vote' && m === 'POST') {
      const b = await req.json();
      const blocked = await gate(req, env, b);
      if (blocked) return blocked;
      const a = await env.DB.prepare('SELECT nominees FROM awards WHERE id = ?').bind(String(b.award)).first();
      if (!a || !JSON.parse(a.nominees || '[]').includes(b.player)) return J({ error: 'Invalid vote' }, 400);
      const { dev, hdr } = deviceFor(req);
      await env.DB.prepare(
        'INSERT INTO votes(device, award_id, player_id, t) VALUES(?, ?, ?, ?) ON CONFLICT(device, award_id) DO UPDATE SET player_id = excluded.player_id, t = excluded.t'
      ).bind(dev, String(b.award), String(b.player), Date.now()).run();
      return J({ ok: true, mine: await myVotes(env, dev) }, 200, hdr);
    }

    // ---- write-in vote (People's Choice style) ----
    if (route === 'writein' && m === 'POST') {
      const b = await req.json();
      const blocked = await gate(req, env, b);
      if (blocked) return blocked;
      const meta = await env.DB.prepare('SELECT kind FROM award_meta WHERE award_id = ?').bind(String(b.award)).first();
      const exists = await env.DB.prepare('SELECT id FROM awards WHERE id = ?').bind(String(b.award)).first();
      if (!exists || !meta || meta.kind !== 'writein') return J({ error: 'Invalid vote' }, 400);
      const raw = String(b.text || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
      const norm = normName(raw);
      if (raw.length < 2 || !norm) return J({ error: 'Please type a name' }, 400);
      const { dev, hdr } = deviceFor(req);
      await env.DB.prepare(
        'INSERT INTO writeins(device, award_id, raw, norm, t) VALUES(?, ?, ?, ?, ?) ON CONFLICT(device, award_id) DO UPDATE SET raw = excluded.raw, norm = excluded.norm, t = excluded.t'
      ).bind(dev, String(b.award), raw, norm, Date.now()).run();
      return J({ ok: true, mineW: await myWriteins(env, dev) }, 200, hdr);
    }

    // ---- admin ----
    if (route === 'admin') {
      if (!isAdmin(req, env)) return J({ error: 'Not allowed' }, 401);
      const sub = p[1];
      const id = p[2];

      if (sub === 'login') return J({ ok: true });

      if (sub === 'upload' && m === 'POST') {
        const buf = new Uint8Array(await req.arrayBuffer());
        if (!buf.length || buf.length > 1200000) return J({ error: 'Image too big' }, 413);
        const key = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO photos(id, data) VALUES(?, ?)').bind(key, b64(buf)).run();
        return J({ key });
      }

      if (sub === 'audio' && m === 'POST') {
        const buf = new Uint8Array(await req.arrayBuffer());
        if (!buf.length) return J({ error: 'Empty file' }, 400);
        if (buf.length > 1300000) return J({ error: 'Audio file too big (max about 1.3 MB). Trim or compress it.' }, 413);
        let type = (req.headers.get('Content-Type') || '').split(';')[0];
        if (!/^(audio|video)\//.test(type)) type = 'audio/mpeg';
        const key = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO audio(id, data, type) VALUES(?, ?, ?)').bind(key, b64(buf), type).run();
        return J({ key });
      }

      if (sub === 'meta' && m === 'PUT' && id) {
        const b = await req.json();
        const f = META_COLS.filter((c) => c in b);
        if (f.length) {
          await env.DB.prepare(
            `INSERT INTO award_meta(award_id${f.map((c) => ', ' + c).join('')}) VALUES(?${f.map(() => ', ?').join('')}) ON CONFLICT(award_id) DO UPDATE SET ${f.map((c) => c + ' = excluded.' + c).join(', ')}`
          ).bind(id, ...f.map((c) => b[c])).run();
        }
        return J({ ok: true });
      }

      if (sub === 'order' && m === 'PUT') {
        const b = await req.json();
        const ids = Array.isArray(b.ids) ? b.ids : [];
        for (let i = 0; i < ids.length; i++) await env.DB.prepare('UPDATE awards SET at = ? WHERE id = ?').bind(i + 1, String(ids[i])).run();
        return J({ ok: true });
      }

      if (sub === 'alias' && m === 'POST') {
        const b = await req.json();
        const award = String(b.award || '');
        const norm = normName(b.norm);
        if (!award || !norm) return J({ error: 'Bad request' }, 400);
        if (b.label === null || b.label === undefined) await env.DB.prepare('DELETE FROM aliases WHERE award_id = ? AND norm = ?').bind(award, norm).run();
        else await env.DB.prepare('INSERT INTO aliases(award_id, norm, label) VALUES(?, ?, ?) ON CONFLICT(award_id, norm) DO UPDATE SET label = excluded.label').bind(award, norm, String(b.label)).run();
        return J({ ok: true });
      }

      if (sub === 'settings' && m === 'PUT') {
        const b = await req.json();
        for (const k of ['revealed', 'deadline', 'code', 'tts']) {
          if (k in b) {
            const v = k === 'revealed' || k === 'tts' ? (b[k] ? '1' : '0') : String(b[k] ?? '');
            await env.DB.prepare('INSERT INTO settings(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, v).run();
          }
        }
        return J({ ok: true });
      }

      if (sub === 'reset-votes' && m === 'POST') {
        let b = {};
        try { b = await req.json(); } catch (e) {}
        if (b.award) {
          await env.DB.prepare('DELETE FROM votes WHERE award_id = ?').bind(String(b.award)).run();
          try { await env.DB.prepare('DELETE FROM writeins WHERE award_id = ?').bind(String(b.award)).run(); } catch (e) {}
        } else {
          await env.DB.prepare('DELETE FROM votes').run();
          try { await env.DB.prepare('DELETE FROM writeins').run(); } catch (e) {}
        }
        return J({ ok: true });
      }

      const cols = TABLES[sub];
      if (!cols) return J({ error: 'Not found' }, 404);
      const val = (c, v) => (c === 'nominees' ? JSON.stringify(Array.isArray(v) ? v : []) : NUM_COLS.includes(c) ? (v === null || v === undefined ? null : Number(v) || 0) : v);

      if (m === 'POST') {
        const b = await req.json();
        const f = cols.filter((c) => c in b);
        const i = crypto.randomUUID().slice(0, 8);
        await env.DB.prepare(`INSERT INTO ${sub}(id, at${f.map((c) => ', ' + c).join('')}) VALUES(?, ?${f.map(() => ', ?').join('')})`)
          .bind(i, Date.now(), ...f.map((c) => val(c, b[c]))).run();
        return J({ id: i });
      }
      if (m === 'PATCH' && id) {
        const b = await req.json();
        const f = cols.filter((c) => c in b);
        if (!f.length) return J({ ok: true });
        await env.DB.prepare(`UPDATE ${sub} SET ${f.map((c) => c + ' = ?').join(', ')} WHERE id = ?`)
          .bind(...f.map((c) => val(c, b[c])), id).run();
        return J({ ok: true });
      }
      if (m === 'DELETE' && id) {
        await env.DB.prepare(`DELETE FROM ${sub} WHERE id = ?`).bind(id).run();
        if (sub === 'players' || sub === 'awards') await env.DB.prepare(`DELETE FROM votes WHERE ${sub === 'players' ? 'player_id' : 'award_id'} = ?`).bind(id).run();
        if (sub === 'awards') {
          for (const t of ['award_meta', 'writeins', 'aliases']) {
            try { await env.DB.prepare(`DELETE FROM ${t} WHERE award_id = ?`).bind(id).run(); } catch (e) {}
          }
          try { await env.DB.prepare('DELETE FROM beats WHERE item = ?').bind(id).run(); } catch (e) {}
        }
        return J({ ok: true });
      }
    }
    return J({ error: 'Not found' }, 404);
  } catch (e) {
    return J({ error: 'Server error' }, 500);
  }
}
