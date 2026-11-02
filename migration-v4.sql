-- School D'Or v4: award intro videos. Run this whole file once in the D1 Console.
-- It only ADDS one new table. Your players, awards, photos, votes and recordings are not touched. Safe to run more than once.
CREATE TABLE IF NOT EXISTS award_video (award_id TEXT PRIMARY KEY, key TEXT NOT NULL, mime TEXT, name TEXT, size INTEGER, duration REAL DEFAULT 0, trim_start REAL DEFAULT 0, trim_end REAL DEFAULT 0, at INTEGER);
