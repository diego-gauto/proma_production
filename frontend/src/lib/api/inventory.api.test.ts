import assert from "node:assert/strict";
import { test } from "node:test";
import { createFabricStockEntry, createSupplyStockEntry } from "./inventory.api";

test("inventory API creates fabric entries with rolls", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method?: string; body?: unknown; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(JSON.stringify({ id: "entry-1" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await createFabricStockEntry("token", {
      providerId: "provider-1",
      fabricId: "fabric-1",
      entryDate: "2026-10-05T00:00:00.000Z",
      documentNumber: "FC-1",
      rolls: [{ code: "R001", lot: "L001" }],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith("/fabric-stock-entries"), true);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].authorization, "Bearer token");
  assert.deepEqual(calls[0].body, {
    providerId: "provider-1",
    fabricId: "fabric-1",
    entryDate: "2026-10-05T00:00:00.000Z",
    documentNumber: "FC-1",
    rolls: [{ code: "R001", lot: "L001" }],
  });
});

test("inventory API creates supply entries with quantity", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method?: string; body?: unknown; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(JSON.stringify({ id: "entry-2" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await createSupplyStockEntry("token", {
      providerId: "provider-1",
      supplyId: "supply-1",
      entryDate: "2026-10-05T00:00:00.000Z",
      quantity: 12,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith("/supply-stock-entries"), true);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].authorization, "Bearer token");
  assert.deepEqual(calls[0].body, {
    providerId: "provider-1",
    supplyId: "supply-1",
    entryDate: "2026-10-05T00:00:00.000Z",
    quantity: 12,
  });
});
