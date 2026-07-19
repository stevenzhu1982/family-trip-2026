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
        "SELECT id, name, content, created_at FROM comments ORDER BY created_at DESC",
      ).all();
      return jsonResponse(request, { success: true, comments: results });
    } catch {
      return jsonResponse(request, { success: false, error: "Unable to load comments" }, { status: 500 });
    }
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, { success: false, error: "Invalid request body" }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    const content = String(body.content || "").trim();
    if (!name || !content) {
      return jsonResponse(request, { success: false, error: "请填写姓名和留言内容" }, { status: 400 });
    }
    if (name.length > 20 || content.length > 500) {
      return jsonResponse(request, { success: false, error: "留言内容过长" }, { status: 400 });
    }

    try {
      const result = await env.DB.prepare(
        "INSERT INTO comments (name, content, created_at) VALUES (?, ?, datetime('now'))",
      ).bind(name, content).run();
      if (!result.success) throw new Error("insert failed");
      return jsonResponse(request, { success: true });
    } catch {
      return jsonResponse(request, { success: false, error: "Unable to save comment" }, { status: 500 });
    }
  }

  return methodNotAllowed(request, METHODS);
}
