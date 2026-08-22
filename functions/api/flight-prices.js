import {
  isSameOrigin,
  jsonResponse,
  methodNotAllowed,
  preflightResponse,
} from "../../src/auth/http.js";

const ROUTE = Object.freeze({
  origin: "PVG",
  destination: "BKK",
  departureDate: "2027-02-10",
  returnDate: "2027-02-18",
  adults: 1,
});

const AIRLINES = Object.freeze({
  spring: { code: "9C", name: "春秋航空" },
  thai: { code: "TG", name: "泰国航空" },
});

const METHODS = "GET, OPTIONS";
const MAX_RESULTS = 30;

function formatLeg(leg) {
  const segment = leg?.segments?.[0];
  return {
    carrier: leg?.carrier || segment?.operating_carrier_name || "航司待确认",
    flightNumber: segment?.flight_number
      ? String(segment.flight_number).startsWith(segment.marketing_carrier_code || "")
        ? String(segment.flight_number)
        : `${segment.marketing_carrier_code || ""}${segment.flight_number}`
      : "待确认",
    departure: segment?.departure_time_local || null,
    arrival: segment?.arrival_time_local || null,
    durationMinutes: Number.isFinite(leg?.duration_minutes) ? leg.duration_minutes : null,
  };
}

function isNonstopRoute(itinerary, airlineCode) {
  const outbound = itinerary?.outbound?.segments;
  const inbound = itinerary?.inbound?.segments;
  if (!Array.isArray(outbound) || !Array.isArray(inbound) || outbound.length !== 1 || inbound.length !== 1) return false;
  const [outboundSegment] = outbound;
  const [inboundSegment] = inbound;
  return outboundSegment.departure_airport === ROUTE.origin
    && outboundSegment.arrival_airport === ROUTE.destination
    && inboundSegment.departure_airport === ROUTE.destination
    && inboundSegment.arrival_airport === ROUTE.origin
    && outboundSegment.marketing_carrier_code === airlineCode
    && inboundSegment.marketing_carrier_code === airlineCode;
}

function normalize(itinerary) {
  const price = itinerary.price || {};
  return {
    price: Number(price.amount),
    currency: String(price.currency || "CNY"),
    priceStatus: String(price.status || "unverified"),
    cabin: String(itinerary.cabin_class || "economy"),
    baggage: itinerary.bags || {},
    outbound: formatLeg(itinerary.outbound),
    inbound: formatLeg(itinerary.inbound),
    bookingId: String(itinerary.ignav_id || ""),
  };
}

async function saveSnapshot(env, airline, results) {
  if (!env.DB) return;
  const payload = JSON.stringify(results);
  await env.DB.prepare(
    `INSERT INTO flight_price_queries
      (airline_code, origin, destination, departure_date, return_date, result_count, results_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).bind(
    airline.code,
    ROUTE.origin,
    ROUTE.destination,
    ROUTE.departureDate,
    ROUTE.returnDate,
    results.length,
    payload,
  ).run();
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return preflightResponse(request, METHODS);
  if (request.method !== "GET") return methodNotAllowed(request, METHODS);
  if (!isSameOrigin(request)) return jsonResponse(request, { success: false, error: "Forbidden" }, { status: 403 }, METHODS);

  const airlineKey = new URL(request.url).searchParams.get("airline");
  const airline = AIRLINES[airlineKey];
  if (!airline) return jsonResponse(request, { success: false, error: "Unknown airline" }, { status: 400 }, METHODS);
  if (!env.IGNAV_API_KEY) {
    return jsonResponse(request, { success: false, error: "Flight search is not configured" }, { status: 503 }, METHODS);
  }

  let providerResponse;
  try {
    providerResponse = await fetch("https://ignav.com/api/fares/round-trip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": env.IGNAV_API_KEY,
      },
      body: JSON.stringify({
        origin: ROUTE.origin,
        destination: ROUTE.destination,
        departure_date: ROUTE.departureDate,
        return_date: ROUTE.returnDate,
        adults: ROUTE.adults,
        market: "CN",
        max_stops: 0,
        allow_self_transfer: false,
        airlines_include: [airline.code],
      }),
    });
  } catch {
    return jsonResponse(request, { success: false, error: "Flight provider is temporarily unavailable" }, { status: 502 }, METHODS);
  }

  if (!providerResponse.ok) {
    return jsonResponse(request, { success: false, error: "Flight provider request failed" }, { status: 502 }, METHODS);
  }

  let payload;
  try {
    payload = await providerResponse.json();
  } catch {
    return jsonResponse(request, { success: false, error: "Flight provider returned invalid data" }, { status: 502 }, METHODS);
  }

  const results = (Array.isArray(payload.itineraries) ? payload.itineraries : [])
    .filter((itinerary) => isNonstopRoute(itinerary, airline.code))
    .map(normalize)
    .filter((itinerary) => Number.isFinite(itinerary.price) && itinerary.price >= 0)
    .sort((left, right) => left.price - right.price)
    .slice(0, MAX_RESULTS);

  try {
    await saveSnapshot(env, airline, results);
  } catch {
    return jsonResponse(request, { success: false, error: "Flight data was found but could not be recorded" }, { status: 500 }, METHODS);
  }

  return jsonResponse(request, {
    success: true,
    queriedAt: new Date().toISOString(),
    provider: "Ignav",
    airline,
    route: ROUTE,
    results,
  }, {}, METHODS);
}
