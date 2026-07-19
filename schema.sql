CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_name TEXT NOT NULL,
  destinations TEXT NOT NULL DEFAULT '[]',
  destination_other TEXT NOT NULL DEFAULT '',
  adults INTEGER NOT NULL DEFAULT 0 CHECK (adults >= 0),
  elderly INTEGER NOT NULL DEFAULT 0 CHECK (elderly >= 0),
  children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  time_pref TEXT NOT NULL DEFAULT '[]',
  accommodation TEXT NOT NULL DEFAULT '',
  travel_style TEXT NOT NULL DEFAULT '',
  special_needs TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id TEXT NOT NULL UNIQUE,
  hotel TEXT NOT NULL CHECK (hotel IN ('concorde', 'hilton', 'days')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_votes_hotel ON votes(hotel);
