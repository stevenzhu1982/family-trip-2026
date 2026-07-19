import {
  isSameOrigin,
  jsonResponse,
  methodNotAllowed,
  preflightResponse,
} from "../../src/auth/http.js";

const METHODS = "GET, POST, OPTIONS";

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return preflightResponse(request, METHODS);
  if (!isSameOrigin(request)) return jsonResponse(request, { success: false, error: "Forbidden" }, { status: 403 });

  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare(
        "SELECT id, family_name, destinations, destination_other, adults, elderly, children, time_pref, accommodation, travel_style, special_needs, created_at FROM feedback ORDER BY created_at DESC",
      ).all();
      return jsonResponse(request, { success: true, feedbacks: results });
    } catch {
      return jsonResponse(request, { success: false, error: "Unable to load feedback" }, { status: 500 });
    }
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, { success: false, error: "Invalid request body" }, { status: 400 });
    }

    const familyName = String(body.family_name || "").trim();
    if (!familyName || familyName.length > 100) {
      return jsonResponse(request, { success: false, error: "请填写有效的家庭名称" }, { status: 400 });
    }
    const destinations = Array.isArray(body.destinations) ? body.destinations.slice(0, 20) : [];
    const timePreference = Array.isArray(body.time_pref) ? body.time_pref.slice(0, 20) : [];
    const toCount = (value) => Math.max(0, Math.min(99, Number.parseInt(value, 10) || 0));

    try {
      const result = await env.DB.prepare(
        `INSERT INTO feedback (family_name, destinations, destination_other, adults, elderly, children, time_pref, accommodation, travel_style, special_needs, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).bind(
        familyName,
        JSON.stringify(destinations),
        String(body.destination_other || "").trim().slice(0, 200),
        toCount(body.adults),
        toCount(body.elderly),
        toCount(body.children),
        JSON.stringify(timePreference),
        String(body.accommodation || "").slice(0, 100),
        String(body.travel_style || "").slice(0, 100),
        String(body.special_needs || "").trim().slice(0, 1000),
      ).run();
      if (!result.success) throw new Error("insert failed");
      return jsonResponse(request, { success: true });
    } catch {
      return jsonResponse(request, { success: false, error: "Unable to save feedback" }, { status: 500 });
    }
  }

  return methodNotAllowed(request, METHODS);
}
