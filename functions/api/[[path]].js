// School D'Or API: runs on Cloudflare Pages Functions with a D1 database bound as DB.
// Needs one secret: ADMIN_PASSWORD.

const J = (d, s = 200, h = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });

const TABLES = {
  players: ['name', 'position', 'goals', 'assists', 'rating', 'photo'],
  awards: ['title', 'icon', 'photo', 'nominees'],
};

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

export async function onRequest({ request: req, env, params }) {
  const p = params.path || [];
  const route = p[0];
  const m = req.method;
  try {
    // ---- photos ----
    if (route === 'photo' && m === 'GET') {
      const r = await env.DB.prepare('SELECT data FROM photos WHERE id = ?').bind(p[1] || '').first();
      if (!r) return new Response('Not found', { status: 404 });
      const bin = atob(r.data);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return new Response(u, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }

    // ---- public state ----
    if (route === 'state' && m === 'GET') {
      const s = await settings(env);
      const admin = isAdmin(req, env);
      const players = (await env.DB.prepare('SELECT * FROM players ORDER BY at').all()).results;
      const awards = (await env.DB.prepare('SELECT * FROM awards ORDER BY at').all()).results.map((a) => ({ ...a, nominees: JSON.parse(a.nominees || '[]') }));
      const tally = {};
      let voters = 0;
      if (admin || s.revealed === '1') {
        const r = (await env.DB.prepare('SELECT award_id a, player_id p, COUNT(*) c FROM votes GROUP BY award_id, player_id').all()).results;
        r.forEach((x) => ((tally[x.a] = tally[x.a] || {})[x.p] = x.c));
      }
      if (admin) voters = (await env.DB.prepare('SELECT COUNT(DISTINCT device) c FROM votes').first()).c;
      const mine = await myVotes(env, cookie(req, 'sd_dev'));
      return J({ players, awards, tally, voters, mine, admin, set: { revealed: s.revealed === '1', deadline: +s.deadline || 0, codeRequired: !!s.code } });
    }

    // ---- voting (one ballot per device, changeable until voting closes) ----
    if (route === 'vote' && m === 'POST') {
      const b = await req.json();
      const s = await settings(env);
      if (isLocked(s)) return J({ error: 'Voting is closed' }, 403);
      if (s.code && String(b.code || '').trim().toLowerCase() !== s.code.toLowerCase()) return J({ error: 'Wrong voting code' }, 403);

      // basic per-IP rate limit (generous, because a whole school can share one IP)
      const ip = req.headers.get('CF-Connecting-IP') || 'x';
      const now = Date.now();
      await env.DB.prepare('DELETE FROM hits WHERE t < ?').bind(now - 600000).run();
      const hits = (await env.DB.prepare('SELECT COUNT(*) c FROM hits WHERE ip = ? AND t > ?').bind(ip, now - 60000).first()).c;
      if (hits >= 120) return J({ error: 'Too many votes, slow down' }, 429);
      await env.DB.prepare('INSERT INTO hits(ip, t) VALUES(?, ?)').bind(ip, now).run();

      const a = await env.DB.prepare('SELECT nominees FROM awards WHERE id = ?').bind(String(b.award)).first();
      if (!a || !JSON.parse(a.nominees || '[]').includes(b.player)) return J({ error: 'Invalid vote' }, 400);

      let dev = cookie(req, 'sd_dev');
      let hdr = {};
      if (!dev || !/^[a-f0-9-]{36}$/.test(dev)) {
        dev = crypto.randomUUID();
        hdr = { 'Set-Cookie': `sd_dev=${dev}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` };
      }
      await env.DB.prepare(
        'INSERT INTO votes(device, award_id, player_id, t) VALUES(?, ?, ?, ?) ON CONFLICT(device, award_id) DO UPDATE SET player_id = excluded.player_id, t = excluded.t'
      ).bind(dev, String(b.award), String(b.player), now).run();
      return J({ ok: true, mine: await myVotes(env, dev) }, 200, hdr);
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
        let s = '';
        for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192));
        const key = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO photos(id, data) VALUES(?, ?)').bind(key, btoa(s)).run();
        return J({ key });
      }

      if (sub === 'settings' && m === 'PUT') {
        const b = await req.json();
        for (const k of ['revealed', 'deadline', 'code']) {
          if (k in b) {
            const v = k === 'revealed' ? (b[k] ? '1' : '0') : String(b[k] ?? '');
            await env.DB.prepare('INSERT INTO settings(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, v).run();
          }
        }
        return J({ ok: true });
      }

      if (sub === 'reset-votes' && m === 'POST') {
        await env.DB.prepare('DELETE FROM votes').run();
        return J({ ok: true });
      }

      const cols = TABLES[sub];
      if (!cols) return J({ error: 'Not found' }, 404);
      const val = (c, v) => (c === 'nominees' ? JSON.stringify(Array.isArray(v) ? v : []) : v);

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
        await env.DB.prepare(`DELETE FROM votes WHERE ${sub === 'players' ? 'player_id' : 'award_id'} = ?`).bind(id).run();
        return J({ ok: true });
      }
    }
    return J({ error: 'Not found' }, 404);
  } catch (e) {
    return J({ error: 'Server error' }, 500);
  }
}
