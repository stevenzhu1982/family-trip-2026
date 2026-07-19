import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/api/votes.js";

function database() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const statement = {
        bind(...values) {
          calls.push({ sql, values });
          return statement;
        },
        async all() {
          calls.push({ sql, values: [] });
          return { results: [{ hotel: "concorde", count: 2 }] };
        },
        async first() {
          return { hotel: "hilton" };
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
  };
}

test("votes endpoint returns aggregate counts and the current device vote", async () => {
  const DB = database();
  const request = new Request("https://example.test/api/votes?voter_id=device-1");
  const response = await onRequest({ request, env: { DB } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    counts: { concorde: 2, hilton: 0, days: 0 },
    myVote: "hilton",
  });
  assert.ok(DB.calls.some(({ sql, values }) => sql.includes("WHERE voter_id = ?") && values[0] === "device-1"));
});

test("votes endpoint stores votes through the dedicated schema", async () => {
  const DB = database();
  const request = new Request("https://example.test/api/votes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.test",
    },
    body: JSON.stringify({ voter_id: "device-1", hotel: "days" }),
  });
  const response = await onRequest({ request, env: { DB } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.ok(DB.calls.some(({ sql, values }) => sql.includes("INSERT INTO votes") && values[0] === "device-1" && values[1] === "days"));
});

test("votes endpoint rejects invalid choices", async () => {
  const request = new Request("https://example.test/api/votes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.test",
    },
    body: JSON.stringify({ voter_id: "device-1", hotel: "unknown" }),
  });
  const response = await onRequest({ request, env: { DB: database() } });
  assert.equal(response.status, 400);
});
