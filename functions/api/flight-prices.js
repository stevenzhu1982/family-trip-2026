import {
  isSameOrigin,
  jsonResponse,
  methodNotAllowed,
  preflightResponse,
} from "../../src/auth/http.js";

const ROUTE = Object.freeze({ origin: "PVG", destination: "BKK" });
const PASSENGERS = Object.freeze({ adults: 6, children: 1, label: "6名成人＋1名儿童（7人总价）" });
const SPRING_DATE_PAIRS = Object.freeze([
  { departureDate: "2027-02-07", returnDate: "2027-02-16" },
  { departureDate: "2027-02-08", returnDate: "2027-02-17" },
  { departureDate: "2027-02-09", returnDate: "2027-02-18" },
  { departureDate: "2027-02-10", returnDate: "2027-02-19" },
]);
const THAI_DATES = Object.freeze({
  outbound: ["2027-02-07", "2027-02-08", "2027-02-09", "2027-02-10"],
  inbound: ["2027-02-16", "2027-02-17", "2027-02-18", "2027-02-19"],
});
const AIRLINES = Object.freeze({
  spring: { code: "9C", name: "春秋航空" },
  thai: { code: "TG", name: "泰国航空" },
  all: { code: "ALL", name: "全航司直飞（BKK）" },
});
const ALL_BKK_ROUTES = Object.freeze([
  { origin: "PVG", destination: "BKK", returnAirport: "PVG" },
  { origin: "PVG", destination: "BKK", returnAirport: "SHA" },
  { origin: "SHA", destination: "BKK", returnAirport: "PVG" },
  { origin: "SHA", destination: "BKK", returnAirport: "SHA" },
]);
const METHODS = "GET, OPTIONS";
const MAX_RESULTS = 30;

function providerBody(origin, destination, departureDate, airlineCode) {
  const body = {
    origin, destination, departure_date: departureDate, ...PASSENGERS,
    market: "CN", max_stops: 0, allow_self_transfer: false, airlines_include: [airlineCode],
  };
  if (!airlineCode) delete body.airlines_include;
  delete body.label;
  return body;
}

async function providerFetch(env, endpoint, body) {
  const response = await fetch(`https://ignav.com/api/fares/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": env.IGNAV_API_KEY },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("provider request failed");
  const payload = await response.json();
  return Array.isArray(payload.itineraries) ? payload.itineraries : [];
}

function formatLeg(leg) {
  const segment = leg?.segments?.[0];
  const code = segment?.marketing_carrier_code || "";
  const number = segment?.flight_number ? String(segment.flight_number) : "";
  return {
    carrier: leg?.carrier || segment?.operating_carrier_name || "航司待确认",
    origin: segment?.departure_airport || "—",
    destination: segment?.arrival_airport || "—",
    flightNumber: number ? (number.startsWith(code) ? number : `${code}${number}`) : "待确认",
    departure: segment?.departure_time_local || null,
    arrival: segment?.arrival_time_local || null,
    durationMinutes: Number.isFinite(leg?.duration_minutes) ? leg.duration_minutes : null,
  };
}

function normalizedPrice(itinerary) {
  const price = Number(itinerary?.price?.amount);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function isNonstopLeg(itinerary, airlineCode, origin, destination) {
  const segments = itinerary?.outbound?.segments;
  if (!Array.isArray(segments) || segments.length !== 1) return false;
  const [segment] = segments;
  return segment.departure_airport === origin
    && segment.arrival_airport === destination
    && segment.marketing_carrier_code === airlineCode;
}

function isNonstopRoundTrip(itinerary, airlineCode) {
  const inbound = itinerary?.inbound?.segments;
  return isNonstopLeg(itinerary, airlineCode, ROUTE.origin, ROUTE.destination)
    && Array.isArray(inbound) && inbound.length === 1
    && inbound[0].departure_airport === ROUTE.destination
    && inbound[0].arrival_airport === ROUTE.origin
    && inbound[0].marketing_carrier_code === airlineCode;
}

function isNonstopSearch(itinerary, route) {
  const legs = itinerary?.legs;
  if (!Array.isArray(legs) || legs.length !== 2) return false;
  const [outbound, inbound] = legs;
  const outboundSegment = outbound?.segments?.[0];
  const inboundSegment = inbound?.segments?.[0];
  return outbound?.segments?.length === 1 && inbound?.segments?.length === 1
    && outboundSegment?.departure_airport === route.origin
    && outboundSegment?.arrival_airport === route.destination
    && inboundSegment?.departure_airport === route.destination
    && inboundSegment?.arrival_airport === route.returnAirport
    && String(outboundSegment?.arrival_time_local || "").slice(11, 13) >= "06"
    && String(inboundSegment?.arrival_time_local || "").slice(0, 10) <= "2027-02-19";
}

function normalizeRoundTrip(itinerary, dates) {
  return {
    ...dates,
    price: normalizedPrice(itinerary), currency: String(itinerary.price?.currency || "CNY"),
    cabin: String(itinerary.cabin_class || "economy"), baggage: itinerary.bags || {},
    outbound: formatLeg(itinerary.outbound), inbound: formatLeg(itinerary.inbound),
  };
}

function normalizeOneWay(itinerary) {
  return {
    price: normalizedPrice(itinerary), currency: String(itinerary.price?.currency || "CNY"),
    cabin: String(itinerary.cabin_class || "economy"), baggage: itinerary.bags || {},
    flight: formatLeg(itinerary.outbound),
  };
}

function normalizeSearchItinerary(itinerary, dates) {
  return {
    ...dates,
    price: normalizedPrice(itinerary), currency: String(itinerary.price?.currency || "CNY"),
    cabin: String(itinerary.cabin_class || "economy"), baggage: itinerary.bags || {},
    outbound: formatLeg(itinerary.legs?.[0]), inbound: formatLeg(itinerary.legs?.[1]),
  };
}

async function searchThaiLeg(env, direction, date) {
  const outbound = direction === "outbound";
  const origin = outbound ? ROUTE.origin : ROUTE.destination;
  const destination = outbound ? ROUTE.destination : ROUTE.origin;
  const itineraries = await providerFetch(env, "one-way", providerBody(origin, destination, date, AIRLINES.thai.code));
  return {
    date, direction,
    results: itineraries
      .filter((itinerary) => isNonstopLeg(itinerary, AIRLINES.thai.code, origin, destination))
      .map(normalizeOneWay)
      .filter((itinerary) => itinerary.price !== null)
      .sort((left, right) => left.price - right.price)
      .slice(0, MAX_RESULTS),
  };
}

async function saveSnapshot(env, airline, departureDate, returnDate, result) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO flight_price_queries
      (airline_code, origin, destination, departure_date, return_date, result_count, results_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).bind(
    airline.code, ROUTE.origin, ROUTE.destination, departureDate, returnDate,
    result.resultCount, JSON.stringify(result.payload),
  ).run();
}

async function searchSpringPair(env, dates) {
  const itineraries = await providerFetch(env, "round-trip", {
    ...providerBody(ROUTE.origin, ROUTE.destination, dates.departureDate, AIRLINES.spring.code),
    return_date: dates.returnDate,
  });
  const results = itineraries
    .filter((itinerary) => isNonstopRoundTrip(itinerary, AIRLINES.spring.code))
    .map((itinerary) => normalizeRoundTrip(itinerary, dates)).filter((itinerary) => itinerary.price !== null)
    .sort((left, right) => left.price - right.price).slice(0, MAX_RESULTS);
  return { ...dates, results };
}

async function springResponse(env) {
  const settled = await Promise.allSettled(SPRING_DATE_PAIRS.map((dates) => searchSpringPair(env, dates)));
  const partial = settled.some((result) => result.status === "rejected");
  const pairs = settled.map((result, index) => result.status === "fulfilled"
    ? result.value : { ...SPRING_DATE_PAIRS[index], results: [], unavailable: true });
  const results = pairs.flatMap((pair) => pair.results).sort((left, right) => left.price - right.price);
  const payload = { mode: "round-trip-date-grid", route: ROUTE, travelers: PASSENGERS, datePairs: SPRING_DATE_PAIRS, pairs, results, partial };
  await Promise.all(pairs.map((pair) => saveSnapshot(env, AIRLINES.spring, pair.departureDate, pair.returnDate, {
    resultCount: pair.results.length,
    payload: { mode: "round-trip", route: { ...ROUTE, departureDate: pair.departureDate, returnDate: pair.returnDate }, results: pair.results },
  })));
  return payload;
}

async function thaiResponse(env) {
  const tasks = [
    ...THAI_DATES.outbound.map((date) => searchThaiLeg(env, "outbound", date)),
    ...THAI_DATES.inbound.map((date) => searchThaiLeg(env, "inbound", date)),
  ];
  const settled = await Promise.allSettled(tasks);
  const failed = settled.some((result) => result.status === "rejected");
  const outbound = settled.slice(0, THAI_DATES.outbound.length).map((result, index) => result.status === "fulfilled"
    ? result.value : { date: THAI_DATES.outbound[index], direction: "outbound", results: [], unavailable: true });
  const inbound = settled.slice(THAI_DATES.outbound.length).map((result, index) => result.status === "fulfilled"
    ? result.value : { date: THAI_DATES.inbound[index], direction: "inbound", results: [], unavailable: true });
  const payload = { mode: "one-way-date-grid", route: ROUTE, travelers: PASSENGERS, dates: THAI_DATES, outbound, inbound, partial: failed };
  const resultCount = [...outbound, ...inbound].reduce((total, group) => total + group.results.length, 0);
  await saveSnapshot(env, AIRLINES.thai, THAI_DATES.outbound.join(","), THAI_DATES.inbound.join(","), { resultCount, payload });
  return payload;
}

async function searchAllPair(env, dates, route) {
  const itineraries = await providerFetch(env, "search", {
    legs: [
      { origin: route.origin, destination: route.destination, departure_date: dates.departureDate, max_stops: 0, departure_time_range: { arrival_earliest_hour: 6 } },
      { origin: route.destination, destination: route.returnAirport, departure_date: dates.returnDate, max_stops: 0 },
    ],
    adults: PASSENGERS.adults, children: PASSENGERS.children, market: "CN", allow_self_transfer: false,
  });
  return itineraries
    .filter((itinerary) => isNonstopSearch(itinerary, route))
    .map((itinerary) => normalizeSearchItinerary(itinerary, dates))
    .filter((itinerary) => itinerary.price !== null)
    .sort((left, right) => left.price - right.price)
    .slice(0, MAX_RESULTS);
}

async function allResponse(env) {
  const jobs = SPRING_DATE_PAIRS.flatMap((dates) => ALL_BKK_ROUTES.map(async (route) => ({
    dates, route, results: await searchAllPair(env, dates, route),
  })));
  const settled = await Promise.allSettled(jobs);
  const successful = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
  const results = successful.flatMap((result) => result.results).sort((left, right) => left.price - right.price);
  const payload = {
    mode: "all-carrier-bkk-grid", route: { origins: ["PVG", "SHA"], destination: "BKK", returnAirports: ["PVG", "SHA"] },
    travelers: PASSENGERS, datePairs: SPRING_DATE_PAIRS, results,
    partial: settled.some((result) => result.status === "rejected"),
  };
  await Promise.all(SPRING_DATE_PAIRS.map((dates) => saveSnapshot(env, AIRLINES.all, dates.departureDate, dates.returnDate, {
    resultCount: results.filter((result) => result.departureDate === dates.departureDate && result.returnDate === dates.returnDate).length,
    payload,
  })));
  return payload;
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return preflightResponse(request, METHODS);
  if (request.method !== "GET") return methodNotAllowed(request, METHODS);
  if (!isSameOrigin(request)) return jsonResponse(request, { success: false, error: "Forbidden" }, { status: 403 }, METHODS);
  const airlineKey = new URL(request.url).searchParams.get("airline");
  const airline = AIRLINES[airlineKey];
  if (!airline) return jsonResponse(request, { success: false, error: "Unknown airline" }, { status: 400 }, METHODS);
  if (!env.IGNAV_API_KEY) return jsonResponse(request, { success: false, error: "Flight search is not configured" }, { status: 503 }, METHODS);
  try {
    const data = airlineKey === "thai" ? await thaiResponse(env) : airlineKey === "all" ? await allResponse(env) : await springResponse(env);
    return jsonResponse(request, { success: true, queriedAt: new Date().toISOString(), provider: "Ignav", airline, ...data }, {}, METHODS);
  } catch {
    return jsonResponse(request, { success: false, error: "Flight provider is temporarily unavailable" }, { status: 502 }, METHODS);
  }
}
