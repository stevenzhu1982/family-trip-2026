export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Ensure table exists
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS votes (id INTEGER PRIMARY KEY AUTOINCREMENT, voter_id TEXT UNIQUE NOT NULL, hotel TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))"
    ).run();
  } catch(e) {
    return Response.json({ success: false, error: "DB init: " + e.message }, { status: 500, headers: corsHeaders });
  }

  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare(
        "SELECT hotel, COUNT(*) as count FROM votes GROUP BY hotel"
      ).all();
      const counts = { concorde: 0, hilton: 0, days: 0 };
      for (const row of results) {
        counts[row.hotel] = row.count;
      }
      return Response.json({ success: true, counts }, { headers: corsHeaders });
    } catch(e) {
      return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
    }
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const voter_id = (body.voter_id || "").trim();
      const hotel = (body.hotel || "").trim();

      if (!voter_id || !hotel) {
        return Response.json({ success: false, error: "缺少参数" }, { status: 400, headers: corsHeaders });
      }
      if (!["concorde", "hilton", "days"].includes(hotel)) {
        return Response.json({ success: false, error: "无效的酒店选项" }, { status: 400, headers: corsHeaders });
      }

      // Delete old vote then insert new one
      await env.DB.prepare("DELETE FROM votes WHERE voter_id = ?").bind(voter_id).run();
      await env.DB.prepare("INSERT INTO votes (voter_id, hotel) VALUES (?, ?)").bind(voter_id, hotel).run();

      return Response.json({ success: true }, { headers: corsHeaders });
    } catch(e) {
      return Response.json({ success: false, error: e.message }, { status: 400, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
