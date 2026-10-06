import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adjustFabricRollStock,
  adjustSupplyStock,
  createFabricStockEntry,
  createSupplyStockEntry,
  getFabricStockDetail,
  getSupplyStockDetail,
  listFabricStock,
  listSupplyStock,
} from "./inventory.api";

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
      rolls: [{ code: "R001", lot: "L001", quantity: 25 }],
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
    rolls: [{ code: "R001", lot: "L001", quantity: 25 }],
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


test("inventory API lists fabric stock and opens fabric detail", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(JSON.stringify({ items: [], total: 0, page: 1, limit: 20 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await listFabricStock("token", "gabardina", 2, 30);
    await getFabricStockDetail("token", "fabric-1");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.endsWith("/stock/fabrics?page=2&limit=30&search=gabardina"), true);
  assert.equal(calls[1].url.endsWith("/stock/fabrics/fabric-1"), true);
  assert.equal(calls[0].authorization, "Bearer token");
});

test("inventory API lists supply stock and opens supply detail", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(JSON.stringify({ items: [], total: 0, page: 1, limit: 20 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await listSupplyStock("token", "boton", 1, 10);
    await getSupplyStockDetail("token", "supply-1");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.endsWith("/stock/supplies?page=1&limit=10&search=boton"), true);
  assert.equal(calls[1].url.endsWith("/stock/supplies/supply-1"), true);
  assert.equal(calls[0].authorization, "Bearer token");
});

test("inventory API creates fabric roll and supply adjustments", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method?: string; body?: unknown; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(JSON.stringify({ id: "adjustment-1" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await adjustFabricRollStock("token", "roll-1", {
      quantityDelta: -2.5,
      reason: "USO",
      note: "OC-1",
    });
    await adjustSupplyStock("token", "supply-1", {
      quantityDelta: 15,
      reason: "CORRECCION",
      note: "Conteo",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.endsWith("/stock/fabric-rolls/roll-1/adjustments"), true);
  assert.equal(calls[1].url.endsWith("/stock/supplies/supply-1/adjustments"), true);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[0].body, { quantityDelta: -2.5, reason: "USO", note: "OC-1" });
  assert.deepEqual(calls[1].body, { quantityDelta: 15, reason: "CORRECCION", note: "Conteo" });
});
