export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers
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
      "SELECT id, name, content, created_at FROM comments ORDER BY created_at DESC"
    ).all();
    return Response.json({ success: true, comments: results }, { headers: corsHeaders });
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const name = (body.name || "").trim();
      const content = (body.content || "").trim();

      if (!name || !content) {
        return Response.json(
          { success: false, error: "请填写姓名和留言内容" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (name.length > 20) {
        return Response.json(
          { success: false, error: "姓名不能超过20个字符" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (content.length > 500) {
        return Response.json(
          { success: false, error: "留言内容不能超过500个字符" },
          { status: 400, headers: corsHeaders }
        );
      }

      const { success } = await env.DB.prepare(
        "INSERT INTO comments (name, content, created_at) VALUES (?, ?, datetime('now'))"
      ).bind(name, content).run();

      if (success) {
        return Response.json({ success: true }, { headers: corsHeaders });
      } else {
        return Response.json(
          { success: false, error: "提交失败，请重试" },
          { status: 500, headers: corsHeaders }
        );
      }
    } catch (e) {
      return Response.json(
        { success: false, error: "请求格式错误" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
