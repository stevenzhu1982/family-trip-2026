import {
  clearSessionCookie,
  createSessionCookie,
  hasAuthSecrets,
  hasValidSession,
  passwordsMatch,
} from "../src/auth/session.js";
import { isSameOrigin } from "../src/auth/http.js";

const LOGIN_PATH = "/login";
const LOGOUT_PATH = "/logout";
const MAX_LOGIN_BODY_BYTES = 4096;

// Public IPTV TV page paths (no login required)
const PUBLIC_PATHS = new Set(["/tv", "/tv.html", "/TV", "/TV/"]);
// Relaxed CSP for the TV page: allows hls.js from jsDelivr, iptv-org API and stream playback
const TV_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: http:; connect-src 'self' https: http: blob:; media-src 'self' https: http: blob:; frame-src 'self' https://www.youtube.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

const SECURITY_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; connect-src 'self' https://flights.ch.com http://localhost:8000; frame-src 'self' https://www.youtube.com; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function loginPage(error = false, status = 200) {
  const errorMessage = error ? '<p class="error" role="alert">密码错误，请重试。</p>' : "";
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>家庭旅行 · 登录</title>
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f0e7;color:#44372c;font-family:system-ui,sans-serif}.card{width:min(86vw,22rem);padding:2rem;border-radius:1rem;background:#fff;box-shadow:0 1rem 3rem #684f3522}h1{font-size:1.4rem}label{display:block;margin:.8rem 0 .35rem}input,button{box-sizing:border-box;width:100%;padding:.8rem;border-radius:.6rem;font:inherit}input{border:1px solid #c9b9a8}button{margin-top:1rem;border:0;background:#765638;color:#fff;font-weight:700}.error{color:#a32121}</style>
</head>
<body><main class="card"><h1>请输入访问密码</h1><form method="post" action="/login"><label for="password">密码</label><input id="password" name="password" type="password" required autocomplete="current-password" autofocus><button type="submit">登录</button>${errorMessage}</form></main></body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

function unavailable(request) {
  const isApi = new URL(request.url).pathname.startsWith("/api/");
  return new Response(isApi ? JSON.stringify({ success: false, error: "Service unavailable" }) : "Service unavailable", {
    status: 503,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": isApi ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    },
  });
}

async function handleLogin(request, env) {
  if (request.method === "GET" || request.method === "HEAD") return loginPage();
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { ...SECURITY_HEADERS, Allow: "GET, HEAD, POST" } });
  }
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403, headers: SECURITY_HEADERS });

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_LOGIN_BODY_BYTES) return loginPage(true, 413);

  let password;
  try {
    if (!(request.headers.get("Content-Type") || "").startsWith("application/x-www-form-urlencoded")) {
      return loginPage(true, 415);
    }
    const reader = request.body?.getReader();
    const chunks = [];
    let total = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_LOGIN_BODY_BYTES) {
        await reader.cancel();
        return loginPage(true, 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    password = new URLSearchParams(new TextDecoder().decode(body)).get("password");
  } catch {
    return loginPage(true, 400);
  }
  if (typeof password !== "string" || !(await passwordsMatch(password, env.SITE_PASSWORD))) {
    return loginPage(true, 401);
  }

  return new Response(null, {
    status: 303,
    headers: {
      ...SECURITY_HEADERS,
      Location: "/",
      "Set-Cookie": await createSessionCookie(env.SESSION_SECRET),
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const pathname = new URL(request.url).pathname;

  if (!hasAuthSecrets(env)) return unavailable(request);
  if (pathname === LOGIN_PATH) return handleLogin(request, env);

  // Public TV/IPTV page bypasses login and uses a relaxed CSP.
  // _redirects 200-proxy rules are NOT applied to requests handled by
  // Pages Functions, so rewrite the path to the static tv.html file here.
  if (PUBLIC_PATHS.has(pathname)) {
    const tvRequest =
      pathname === "/tv.html" ? request : new Request(new URL("/tv.html", request.url), request);
    const tvResponse = await context.next(tvRequest);
    const tvSecured = new Response(tvResponse.body, tvResponse);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      tvSecured.headers.set(name, name === "Content-Security-Policy" ? TV_CSP : value);
    }
    return tvSecured;
  }

  if (!(await hasValidSession(request, env.SESSION_SECRET))) {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8" },
      });
    }
    return new Response(null, { status: 303, headers: { ...SECURITY_HEADERS, Location: LOGIN_PATH } });
  }

  if (pathname === LOGOUT_PATH) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { ...SECURITY_HEADERS, Allow: "POST" } });
    }
    if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403, headers: SECURITY_HEADERS });
    return new Response(null, {
      status: 303,
      headers: { ...SECURITY_HEADERS, Location: LOGIN_PATH, "Set-Cookie": clearSessionCookie() },
    });
  }

  const response = await context.next();
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) secured.headers.set(name, value);
  return secured;
}
