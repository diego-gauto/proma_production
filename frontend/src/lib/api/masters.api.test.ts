import assert from "node:assert/strict";
import { test } from "node:test";
import { getClient, getProvider, getWorkshop } from "./masters.api";

test("client API opens a client by id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(JSON.stringify({ id: "client-1", businessName: "Gauto SA", contacts: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const client = await getClient("token", "client-1");
    assert.equal(client.businessName, "Gauto SA");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith("/clients/client-1"), true);
  assert.equal(calls[0].authorization, "Bearer token");
});

test("provider and workshop APIs open parameterized details", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ id: "master-1" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    await getProvider("token", "provider-1");
    await getWorkshop("token", "workshop-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(urls[0].endsWith("/providers/provider-1"), true);
  assert.equal(urls[1].endsWith("/workshops/workshop-1"), true);
});
