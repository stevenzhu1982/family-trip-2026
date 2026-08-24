import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/api/flight-prices.js";

function database() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const statement = {
        bind(...values) { calls.push({ sql, values }); return statement; },
        async run() { return { success: true }; },
      };
      return statement;
    },
  };
}

function roundTrip({ price, carrier = "9C", connecting = false }) {
  const outbound = [{ marketing_carrier_code: carrier, flight_number: "7289", departure_airport: "PVG", arrival_airport: "BKK", departure_time_local: "2027-02-10T17:00:00+08:00", arrival_time_local: "2027-02-10T20:45:00+07:00" }];
  if (connecting) outbound.push({ ...outbound[0], departure_airport: "BKK", arrival_airport: "CNX" });
  return {
    price: { amount: price, currency: "CNY" }, cabin_class: "economy",
    outbound: { carrier: "春秋航空", duration_minutes: 285, segments: outbound },
    inbound: { carrier: "春秋航空", duration_minutes: 255, segments: [{ marketing_carrier_code: carrier, flight_number: "7294", departure_airport: "BKK", arrival_airport: "PVG", departure_time_local: "2027-02-18T01:15:00+07:00", arrival_time_local: "2027-02-18T06:30:00+08:00" }] },
  };
}

test("spring endpoint filters both legs to direct selected-airline flights, sorts, and records the snapshot", async () => {
  const previousFetch = globalThis.fetch;
  const DB = database();
  const providerRequests = [];
  globalThis.fetch = async (_url, init) => {
    providerRequests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ itineraries: [
      roundTrip({ price: 3200 }), roundTrip({ price: 2500 }),
      roundTrip({ price: 1800, connecting: true }), roundTrip({ price: 1600, carrier: "CA" }),
    ] }), { status: 200 });
  };
  try {
    const response = await onRequest({ request: new Request("https://example.test/api/flight-prices?airline=spring", { headers: { Origin: "https://example.test" } }), env: { IGNAV_API_KEY: "test-key", DB } });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(payload.results.map(({ price }) => price), [2500, 2500, 2500, 2500, 3200, 3200, 3200, 3200]);
    assert.equal(payload.results[0].outbound.flightNumber, "9C7289");
    assert.deepEqual(providerRequests.map(({ departure_date, return_date }) => [departure_date, return_date]), [
      ["2027-02-07", "2027-02-16"], ["2027-02-08", "2027-02-17"],
      ["2027-02-09", "2027-02-18"], ["2027-02-10", "2027-02-19"],
    ]);
    assert.ok(providerRequests.every(({ origin, destination, adults, children, market, max_stops, allow_self_transfer, airlines_include }) => (
      origin === "PVG" && destination === "BKK" && adults === 1 && market === "CN"
      && children === 0 && max_stops === 0 && allow_self_transfer === false && airlines_include[0] === "9C"
    )));
    assert.ok(DB.calls.filter(({ values }) => values[0] === "9C" && values[5] === 2).length === 4);
  } finally { globalThis.fetch = previousFetch; }
});

test("all-carrier endpoint searches BKK open-jaw combinations for the seven-person party", async () => {
  const previousFetch = globalThis.fetch;
  const DB = database();
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const [outbound, inbound] = body.legs;
    return new Response(JSON.stringify({ itineraries: [{
      price: { amount: 16800, currency: "CNY" }, cabin_class: "economy",
      legs: [
        { carrier: "测试航司", duration_minutes: 280, segments: [{ marketing_carrier_code: "XX", flight_number: "100", departure_airport: outbound.origin, arrival_airport: "BKK", departure_time_local: `${outbound.departure_date}T08:00:00+08:00`, arrival_time_local: `${outbound.departure_date}T12:00:00+07:00` }] },
        { carrier: "测试航司", duration_minutes: 260, segments: [{ marketing_carrier_code: "XX", flight_number: "101", departure_airport: "BKK", arrival_airport: inbound.destination, departure_time_local: `${inbound.departure_date}T17:00:00+07:00`, arrival_time_local: `${inbound.departure_date}T22:00:00+08:00` }] },
      ],
    }] }), { status: 200 });
  };
  try {
    const response = await onRequest({ request: new Request("https://example.test/api/flight-prices?airline=all", { headers: { Origin: "https://example.test" } }), env: { IGNAV_API_KEY: "test-key", DB } });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.mode, "all-carrier-bkk-grid");
    assert.equal(calls.length, 16);
    assert.ok(calls.every(({ adults, children, allow_self_transfer, legs }) => adults === 1 && children === 0 && allow_self_transfer === false && legs.length === 2));
    assert.ok(calls.every(({ legs }) => legs[0].destination === "BKK" && legs[1].origin === "BKK"));
    assert.equal(payload.results.length, 16);
    assert.equal(payload.results[0].price, 16800);
    assert.equal(payload.results[0].outbound.origin, "PVG");
    assert.ok(DB.calls.some(({ values }) => values[0] === "ALL"));
  } finally { globalThis.fetch = previousFetch; }
});

test("Thai endpoint searches each requested one-way date and keeps only direct Thai flights", async () => {
  const previousFetch = globalThis.fetch;
  const DB = database();
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const outbound = body.origin === "PVG";
    const direct = {
      price: { amount: body.departure_date.endsWith("08") ? 2200 : 2400, currency: "CNY" },
      outbound: { carrier: "THAI", duration_minutes: 280, segments: [{ marketing_carrier_code: "TG", flight_number: "663", departure_airport: outbound ? "PVG" : "BKK", arrival_airport: outbound ? "BKK" : "PVG", departure_time_local: `${body.departure_date}T08:15:00+08:00`, arrival_time_local: `${body.departure_date}T12:15:00+07:00` }] },
    };
    const wrongCarrier = structuredClone(direct);
    wrongCarrier.price.amount = 1000;
    wrongCarrier.outbound.segments[0].marketing_carrier_code = "CA";
    return new Response(JSON.stringify({ itineraries: [direct, wrongCarrier] }), { status: 200 });
  };
  try {
    const response = await onRequest({ request: new Request("https://example.test/api/flight-prices?airline=thai", { headers: { Origin: "https://example.test" } }), env: { IGNAV_API_KEY: "test-key", DB } });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.mode, "one-way-date-grid");
    assert.equal(calls.length, 8);
    assert.deepEqual(calls.map(({ departure_date }) => departure_date), ["2027-02-07", "2027-02-08", "2027-02-09", "2027-02-10", "2027-02-16", "2027-02-17", "2027-02-18", "2027-02-19"]);
    assert.equal(payload.outbound[0].results.length, 1);
    assert.equal(payload.inbound[0].results[0].flight.flightNumber, "TG663");
    assert.ok(DB.calls.some(({ values }) => values[0] === "TG" && values[5] === 8));
  } finally { globalThis.fetch = previousFetch; }
});

test("flight price endpoint reports missing provider configuration", async () => {
  const response = await onRequest({ request: new Request("https://example.test/api/flight-prices?airline=spring"), env: { DB: database() } });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "Flight search is not configured");
});
