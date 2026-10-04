import assert from "node:assert/strict";
import { test } from "node:test";
import { apiRequest, isUnauthorizedError } from "./client";

test("apiRequest exposes 401 responses as unauthorized errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  try {
    await assert.rejects(
      () => apiRequest("/orders", { token: "expired-token" }),
      (error) => {
        assert.equal(isUnauthorizedError(error), true);
        assert.equal(error instanceof Error ? error.message : "", "Unauthorized");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
