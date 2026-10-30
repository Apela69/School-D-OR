CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT, position TEXT, goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0, rating REAL DEFAULT 0, photo TEXT, at INTEGER);
CREATE TABLE IF NOT EXISTS awards (id TEXT PRIMARY KEY, title TEXT, icon TEXT DEFAULT 'trophy', photo TEXT, nominees TEXT DEFAULT '[]', at INTEGER);
CREATE TABLE IF NOT EXISTS votes (device TEXT, award_id TEXT, player_id TEXT, t INTEGER, PRIMARY KEY (device, award_id));
CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS hits (ip TEXT, t INTEGER);
CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, data TEXT);

INSERT OR IGNORE INTO players (id, name, position, goals, assists, rating, at) VALUES
 ('p1', 'Romit', 'Forward', 24, 8, 8.9, 1),
 ('p2', 'Vinay', 'Midfielder', 18, 12, 8.6, 2),
 ('p3', 'Tawhid', 'Defender', 16, 7, 8.3, 3),
 ('p4', 'Ishaq', 'Forward', 14, 6, 8.1, 4),
 ('p5', 'Ranvir', 'Midfielder', 12, 10, 7.8, 5);
INSERT OR IGNORE INTO awards (id, title, icon, nominees, at) VALUES
 ('a1', 'Best Player', 'trophy', '["p1","p2","p3","p4","p5"]', 1),
 ('a2', 'Golden Boot', 'boot', '["p1","p2","p3","p4"]', 2),
 ('a3', 'Best Goalkeeper', 'glove', '[]', 3),
 ('a4', 'Young Player', 'star', '[]', 4);
CREATE TABLE IF NOT EXISTS award_meta (award_id TEXT PRIMARY KEY, kind TEXT DEFAULT 'pick', style TEXT DEFAULT 'auto', script TEXT, tone TEXT, duration INTEGER DEFAULT 24, voice TEXT, voice_at INTEGER DEFAULT 3, music TEXT, music_title TEXT, music_credit TEXT, music_link TEXT);
CREATE TABLE IF NOT EXISTS audio (id TEXT PRIMARY KEY, data TEXT, type TEXT);
CREATE TABLE IF NOT EXISTS writeins (device TEXT, award_id TEXT, raw TEXT, norm TEXT, t INTEGER, PRIMARY KEY (device, award_id));
CREATE TABLE IF NOT EXISTS aliases (award_id TEXT, norm TEXT, label TEXT, PRIMARY KEY (award_id, norm));
INSERT OR IGNORE INTO award_meta (award_id, kind, script, tone, duration) VALUES
 ('_intro', 'special', 'Every lunchtime, somewhere on this pitch, a legend is born. Tonight, we celebrate them. This is the School D’Or.', 'Slow, deep, cinematic. Pause after "legend is born".', 26),
 ('_outro', 'special', 'Your votes are in. The legends will be revealed. Thank you for being part of the School D’Or.', 'Warm and proud. Slow down on the last line.', 14);
