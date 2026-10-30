-- School D'Or v2: adds NEW tables only. Your existing tables and data are not touched.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS award_meta (award_id TEXT PRIMARY KEY, kind TEXT DEFAULT 'pick', style TEXT DEFAULT 'auto', script TEXT, tone TEXT, duration INTEGER DEFAULT 24, voice TEXT, voice_at INTEGER DEFAULT 3, music TEXT, music_title TEXT, music_credit TEXT, music_link TEXT);
CREATE TABLE IF NOT EXISTS audio (id TEXT PRIMARY KEY, data TEXT, type TEXT);
CREATE TABLE IF NOT EXISTS writeins (device TEXT, award_id TEXT, raw TEXT, norm TEXT, t INTEGER, PRIMARY KEY (device, award_id));
CREATE TABLE IF NOT EXISTS aliases (award_id TEXT, norm TEXT, label TEXT, PRIMARY KEY (award_id, norm));
INSERT OR IGNORE INTO award_meta (award_id, kind, script, tone, duration) VALUES
 ('_intro', 'special', 'Every lunchtime, somewhere on this pitch, a legend is born. Tonight, we celebrate them. This is the School D’Or.', 'Slow, deep, cinematic. Pause after "legend is born".', 26),
 ('_outro', 'special', 'Your votes are in. The legends will be revealed. Thank you for being part of the School D’Or.', 'Warm and proud. Slow down on the last line.', 14);
