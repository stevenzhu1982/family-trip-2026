import {
  isSameOrigin,
  jsonResponse,
  methodNotAllowed,
  preflightResponse,
} from "../../src/auth/http.js";

const METHODS = "GET, POST, OPTIONS";
const HOTELS = new Set(["concorde", "hilton", "days"]);

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return preflightResponse(request, METHODS);
  if (!isSameOrigin(request)) return jsonResponse(request, { success: false, error: "Forbidden" }, { status: 403 });

  if (request.method === "GET") {
    try {
      const voterId = new URL(request.url).searchParams.get("voter_id")?.trim() || "";
      if (voterId.length > 100) {
        return jsonResponse(request, { success: false, error: "Invalid voter" }, { status: 400 });
      }
      const { results } = await env.DB.prepare("SELECT hotel, COUNT(*) AS count FROM votes GROUP BY hotel").all();
      const counts = { concorde: 0, hilton: 0, days: 0 };
      for (const row of results) {
        if (HOTELS.has(row.hotel)) counts[row.hotel] = Number(row.count);
      }
      let myVote = "";
      if (voterId) {
        const row = await env.DB.prepare("SELECT hotel FROM votes WHERE voter_id = ? LIMIT 1").bind(voterId).first();
        if (row && HOTELS.has(row.hotel)) myVote = row.hotel;
      }
      return jsonResponse(request, { success: true, counts, myVote });
    } catch {
      return jsonResponse(request, { success: false, error: "Unable to load votes" }, { status: 500 });
    }
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, { success: false, error: "Invalid request body" }, { status: 400 });
    }
    const voterId = String(body.voter_id || "").trim();
    const hotel = String(body.hotel || "").trim();
    if (!voterId || voterId.length > 100 || !HOTELS.has(hotel)) {
      return jsonResponse(request, { success: false, error: "Invalid vote" }, { status: 400 });
    }

    try {
      const result = await env.DB.prepare(
        `INSERT INTO votes (voter_id, hotel, created_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(voter_id) DO UPDATE SET hotel = excluded.hotel, created_at = excluded.created_at`,
      ).bind(voterId, hotel).run();
      if (!result.success) throw new Error("upsert failed");
      return jsonResponse(request, { success: true });
    } catch {
      return jsonResponse(request, { success: false, error: "Unable to save vote" }, { status: 500 });
    }
  }

  return methodNotAllowed(request, METHODS);
}
