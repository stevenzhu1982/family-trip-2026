import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/_middleware.js";
import {
  createSessionCookie,
  hasValidSession,
} from "../src/auth/session.js";
import { isSameOrigin } from "../src/auth/http.js";

const ENV = {
  SITE_PASSWORD: "local-test-password",
  SESSION_SECRET: "local-test-session-secret-with-32-bytes",
};

function context(request, overrides = {}) {
  return {
    request,
    env: ENV,
    next: async () => new Response("asset", { headers: { "Content-Type": "text/plain" } }),
    ...overrides,
  };
}

test("signed session cookie is private and verifiable", async () => {
  const setCookie = await createSessionCookie(ENV.SESSION_SECRET);
  assert.match(setCookie, /^__Host-family_trip_session=/);
  assert.match(setCookie, /; HttpOnly; Secure; SameSite=Strict$/);
  assert.doesNotMatch(setCookie, new RegExp(ENV.SITE_PASSWORD));

  const cookie = setCookie.split(";", 1)[0];
  const request = new Request("https://example.test/", { headers: { Cookie: cookie } });
  assert.equal(await hasValidSession(request, ENV.SESSION_SECRET), true);

  const [cookieName, cookieValue] = cookie.split("=");
  const [issuedAt, signature] = cookieValue.split(".");
  const changedFirstCharacter = signature[0] === "A" ? "B" : "A";
  const tampered = `${cookieName}=${issuedAt}.${changedFirstCharacter}${signature.slice(1)}`;
  const badRequest = new Request("https://example.test/", { headers: { Cookie: tampered } });
  assert.equal(await hasValidSession(badRequest, ENV.SESSION_SECRET), false);
});

test("private pages and APIs reject unauthenticated requests", async () => {
  const page = await onRequest(context(new Request("https://example.test/members.html")));
  assert.equal(page.status, 303);
  assert.equal(page.headers.get("Location"), "/login");

  const api = await onRequest(context(new Request("https://example.test/api/comments")));
  assert.equal(api.status, 401);
  assert.deepEqual(await api.json(), { success: false, error: "Unauthorized" });
});

test("login never accepts URL credentials and issues a signed cookie on POST", async () => {
  const queryAttempt = await onRequest(context(new Request("https://example.test/?pw=local-test-password")));
  assert.equal(queryAttempt.status, 303);
  assert.equal(queryAttempt.headers.get("Location"), "/login");

  const body = new URLSearchParams({ password: ENV.SITE_PASSWORD });
  const login = await onRequest(context(new Request("https://example.test/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://example.test",
    },
    body,
  })));
  assert.equal(login.status, 303);
  assert.equal(login.headers.get("Location"), "/");
  assert.match(login.headers.get("Set-Cookie"), /^__Host-family_trip_session=/);
  assert.doesNotMatch(login.headers.get("Set-Cookie"), new RegExp(ENV.SITE_PASSWORD));
});

test("authenticated requests reach the application with security headers", async () => {
  const setCookie = await createSessionCookie(ENV.SESSION_SECRET);
  const request = new Request("https://example.test/hotel-pdfs/private.pdf", {
    headers: { Cookie: setCookie.split(";", 1)[0] },
  });
  const response = await onRequest(context(request));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
});

test("missing authentication secrets fails closed", async () => {
  const response = await onRequest(context(new Request("https://example.test/"), { env: {} }));
  assert.equal(response.status, 503);
});

test("same-origin browser submissions survive trusted proxy host rewriting", () => {
  const proxiedRequest = new Request("https://internal.example.test/login", {
    method: "POST",
    headers: {
      Origin: "https://preview.example.test",
      "Sec-Fetch-Site": "same-origin",
    },
  });
  assert.equal(isSameOrigin(proxiedRequest), true);

  const crossSiteRequest = new Request("https://internal.example.test/login", {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      "Sec-Fetch-Site": "cross-site",
    },
  });
  assert.equal(isSameOrigin(crossSiteRequest), false);
});
