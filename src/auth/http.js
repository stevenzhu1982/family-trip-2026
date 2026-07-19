export function isSameOrigin(request) {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite === "same-origin") return true;
  if (fetchSite === "cross-site") return false;
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

export function corsHeaders(request, methods) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });
  const origin = request.headers.get("Origin");
  if (origin && origin === new URL(request.url).origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function jsonResponse(request, body, init = {}, methods = "GET, POST, OPTIONS") {
  const headers = new Headers(init.headers);
  for (const [name, value] of corsHeaders(request, methods)) headers.set(name, value);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function preflightResponse(request, methods) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { success: false, error: "Forbidden" }, { status: 403 }, methods);
  }
  return new Response(null, { status: 204, headers: corsHeaders(request, methods) });
}

export function methodNotAllowed(request, methods) {
  return jsonResponse(
    request,
    { success: false, error: "Method not allowed" },
    { status: 405, headers: { Allow: methods.replace(", OPTIONS", "") } },
    methods,
  );
}
