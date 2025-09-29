import test from "node:test";
import assert from "node:assert";
import fetch from "node-fetch";

const API = "http://localhost:3000";

test("healthcheck works", async () => {
  const res = await fetch(`${API}/health`);
  const body = await res.json();
  assert.strictEqual(body.status, "ok");
});

// TODO: Candidate must add tests for reservation flow
