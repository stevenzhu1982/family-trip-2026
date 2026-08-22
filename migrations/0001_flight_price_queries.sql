CREATE TABLE IF NOT EXISTS flight_price_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  airline_code TEXT NOT NULL CHECK (airline_code IN ('9C', 'TG')),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  return_date TEXT NOT NULL,
  result_count INTEGER NOT NULL CHECK (result_count >= 0),
  results_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_flight_price_queries_airline_created
  ON flight_price_queries (airline_code, created_at DESC);
