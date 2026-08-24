BEGIN TRANSACTION;

CREATE TABLE flight_price_queries_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  airline_code TEXT NOT NULL CHECK (airline_code IN ('9C', 'TG', 'ALL')),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  return_date TEXT NOT NULL,
  result_count INTEGER NOT NULL CHECK (result_count >= 0),
  results_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO flight_price_queries_next
  (id, airline_code, origin, destination, departure_date, return_date, result_count, results_json, created_at)
SELECT id, airline_code, origin, destination, departure_date, return_date, result_count, results_json, created_at
FROM flight_price_queries;

DROP TABLE flight_price_queries;
ALTER TABLE flight_price_queries_next RENAME TO flight_price_queries;
CREATE INDEX idx_flight_price_queries_airline_created
  ON flight_price_queries (airline_code, created_at DESC);

COMMIT;
