import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/api/flight-prices.js";

function database() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const statement = {
        bind(...values) {
          calls.push({ sql, values });
          return statement;
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
  };
}

function itinerary({ price, carrier = "TG", connecting = false }) {
  const outbound = [{
    marketing_carrier_code: carrier,
    flight_number: "663",
    departure_airport: "PVG",
    arrival_airport: "BKK",
    departure_time_local: "2027-02-10T08:15:00+08:00",
    arrival_time_local: "2027-02-10T12:15:00+07:00",
  }];
  if (connecting) outbound.push({ ...outbound[0], departure_airport: "BKK", arrival_airport: "CNX" });
  return {
    ignav_id: `id-${price}`,
    price: { amount: price, currency: "CNY", status: "verified" },
    cabin_class: "economy",
    bags: { checked: "1 件" },
    outbound: { carrier: "泰国航空", duration_minutes: 300, segments: outbound },
    inbound: { carrier: "泰国航空", duration_minutes: 280, segments: [{
      marketing_carrier_code: carrier,
      flight_number: "662",
      departure_airport: "BKK",
      arrival_airport: "PVG",
      departure_time_local: "2027-02-18T10:10:00+07:00",
      arrival_time_local: "2027-02-18T15:40:00+08:00",
    }] },
  };
}

test("flight price endpoint filters both legs to direct selected-airline flights, sorts, and records the snapshot", async () => {
  const previousFetch = globalThis.fetch;
  const DB = database();
  let providerRequest;
  globalThis.fetch = async (_url, init) => {
    providerRequest = init;
    return new Response(JSON.stringify({ itineraries: [
      itinerary({ price: 3200 }),
      itinerary({ price: 2500 }),
      itinerary({ price: 1800, connecting: true }),
      itinerary({ price: 1600, carrier: "CA" }),
    ] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const request = new Request("https://example.test/api/flight-prices?airline=thai", { headers: { Origin: "https://example.test" } });
    const response = await onRequest({ request, env: { IGNAV_API_KEY: "test-key", DB } });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload.results.map(({ price }) => price), [2500, 3200]);
    assert.equal(payload.results[0].outbound.flightNumber, "TG663");
    assert.deepEqual(JSON.parse(providerRequest.body), {
      origin: "PVG", destination: "BKK", departure_date: "2027-02-10", return_date: "2027-02-18",
      adults: 1, market: "CN", max_stops: 0, allow_self_transfer: false, airlines_include: ["TG"],
    });
    assert.ok(DB.calls.some(({ sql, values }) => sql.includes("INSERT INTO flight_price_queries") && values[0] === "TG" && values[5] === 2));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("flight price endpoint reports missing provider configuration without attempting a request", async () => {
  const request = new Request("https://example.test/api/flight-prices?airline=spring");
  const response = await onRequest({ request, env: { DB: database() } });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "Flight search is not configured");
});
