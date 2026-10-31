-- School D'Or v3: run this whole file once in the D1 Console. It only ADDS new tables.
-- Your players, awards, photos and votes are not touched. Safe to run more than once.
CREATE TABLE IF NOT EXISTS award_meta (award_id TEXT PRIMARY KEY, kind TEXT DEFAULT 'pick', style TEXT DEFAULT 'auto', script TEXT, tone TEXT, duration INTEGER DEFAULT 24, voice TEXT, voice_at INTEGER DEFAULT 3, music TEXT, music_title TEXT, music_credit TEXT, music_link TEXT);
CREATE TABLE IF NOT EXISTS audio (id TEXT PRIMARY KEY, data TEXT, type TEXT);
CREATE TABLE IF NOT EXISTS writeins (device TEXT, award_id TEXT, raw TEXT, norm TEXT, t INTEGER, PRIMARY KEY (device, award_id));
CREATE TABLE IF NOT EXISTS aliases (award_id TEXT, norm TEXT, label TEXT, PRIMARY KEY (award_id, norm));
CREATE TABLE IF NOT EXISTS beats (id TEXT PRIMARY KEY, item TEXT, text TEXT, fx TEXT, start REAL DEFAULT 0, vstart REAL, audio TEXT, trim_in REAL DEFAULT 0, trim_out REAL DEFAULT 0, speed REAL DEFAULT 1, gain REAL DEFAULT 1, at INTEGER);
INSERT OR IGNORE INTO award_meta (award_id, kind, duration) VALUES ('_intro', 'special', 0), ('_outro', 'special', 0);
