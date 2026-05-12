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

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM feedback ORDER BY created_at DESC"
    ).all();
    return Response.json({ success: true, feedbacks: results }, { headers: corsHeaders });
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { family_name, destinations, destination_other, adults, elderly, children, time_pref, accommodation, travel_style, special_needs } = body;

      if (!family_name || !family_name.trim()) {
        return Response.json(
          { success: false, error: "请填写家庭名称" },
          { status: 400, headers: corsHeaders }
        );
      }

      const { success } = await env.DB.prepare(
        `INSERT INTO feedback (family_name, destinations, destination_other, adults, elderly, children, time_pref, accommodation, travel_style, special_needs, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        family_name.trim(),
        JSON.stringify(destinations || []),
        (destination_other || "").trim(),
        parseInt(adults) || 0,
        parseInt(elderly) || 0,
        parseInt(children) || 0,
        JSON.stringify(time_pref || []),
        accommodation || "",
        travel_style || "",
        (special_needs || "").trim()
      ).run();

      if (success) {
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      return Response.json(
        { success: false, error: "提交失败，请重试" },
        { status: 500, headers: corsHeaders }
      );
    } catch (e) {
      return Response.json(
        { success: false, error: "请求格式错误" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
