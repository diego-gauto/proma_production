import assert from "node:assert/strict";
import { test } from "node:test";
import { movePartToStage } from "./orders.api";

test("movePartToStage finishes the current stage and starts the target stage", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method?: string; body?: unknown; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(JSON.stringify({ id: "event-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await movePartToStage("token", "part-1", {
      id: 4,
      code: "BORDADO",
      name: "Bordado",
      executionType: "INTERNO",
      isOptional: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.endsWith("/order-parts/part-1/stage-events/finish"), true);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[0].body, { note: "Movimiento desde tablero de sectores" });
  assert.equal(calls[1].url.endsWith("/order-parts/part-1/stage-events/start"), true);
  assert.equal(calls[1].method, "POST");
  assert.deepEqual(calls[1].body, {
    stageId: 4,
    executionType: "INTERNO",
    note: "Movimiento desde tablero de sectores",
  });
  assert.equal(calls.every((call) => call.authorization === "Bearer token"), true);
});


test("movePartToStage rejects exclusively external stages", async () => {
  await assert.rejects(
    () =>
      movePartToStage("token", "part-1", {
        id: 8,
        code: "PLANCHA",
        name: "Plancha",
        executionType: "EXTERNO",
        isOptional: false,
      }),
    /requiere seleccionar taller/,
  );
});
