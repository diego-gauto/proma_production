import assert from "node:assert/strict";
import { test } from "node:test";
import { ARGENTINA_PROVINCES, CABA_NEIGHBORHOODS, CABA_PROVINCE, evaluateStreetAddress, fetchDepartments, fetchLocalities, validateStreetAddress, GeoRefStreet } from "./argentina";

test("ARGENTINA_PROVINCES contains every Argentine jurisdiction once", () => {
  const names = ARGENTINA_PROVINCES.map((province) => province.name);

  assert.equal(ARGENTINA_PROVINCES.length, 24);
  assert.equal(new Set(names).size, 24);
  assert.ok(names.includes("Buenos Aires"));
  assert.ok(names.includes("Ciudad Autónoma de Buenos Aires"));
  assert.ok(names.includes("Tierra del Fuego"));
});

function streetWithRange(start: number, end: number): GeoRefStreet {
  return {
    id: "1",
    nombre: "San Martín",
    altura: {
      inicio: { derecha: start, izquierda: start },
      fin: { derecha: end, izquierda: end },
    },
  };
}

test("evaluateStreetAddress blocks when GeoRef has no street matches", () => {
  const result = evaluateStreetAddress("1200", []);

  assert.equal(result.status, "invalid");
  assert.match(result.message ?? "", /No encontré esa calle/i);
});

test("evaluateStreetAddress accepts a number inside a GeoRef height range", () => {
  const result = evaluateStreetAddress("1200", [streetWithRange(1000, 1400)]);

  assert.equal(result.status, "valid");
});

test("evaluateStreetAddress blocks a number outside every usable height range", () => {
  const result = evaluateStreetAddress("900", [streetWithRange(1000, 1400)]);

  assert.equal(result.status, "invalid");
  assert.match(result.message ?? "", /altura/i);
});

test("evaluateStreetAddress warns and allows when GeoRef cannot verify height ranges", () => {
  const result = evaluateStreetAddress("1200", [streetWithRange(0, 0)]);

  assert.equal(result.status, "warning");
  assert.match(result.message ?? "", /calle existe/i);
});


test("fetchDepartments queries Buenos Aires province by GeoRef id 06, not by ambiguous name", async () => {
  const originalFetch = globalThis.fetch;
  const seenUrls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    seenUrls.push(String(input));
    return new Response(JSON.stringify({ departamentos: [{ id: "06035", nombre: "Avellaneda" }] }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await fetchDepartments("Buenos Aires");

    assert.deepEqual(result, [{ id: "06035", name: "Avellaneda" }]);
    const firstUrl = seenUrls[0];
    assert.ok(firstUrl);
    assert.equal(new URL(firstUrl).searchParams.get("provincia"), "06");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchDepartments uses CABA neighborhoods instead of GeoRef comunas", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error("CABA should not request GeoRef departments");
  }) as typeof fetch;

  try {
    const result = await fetchDepartments(CABA_PROVINCE);

    assert.equal(called, false);
    assert.ok(result.some((option) => option.name === "Palermo"));
    assert.ok(result.some((option) => option.name === "Villa Urquiza"));
    assert.equal(result.some((option) => /Comuna/i.test(option.name)), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchLocalities mirrors the selected CABA neighborhood", async () => {
  const result = await fetchLocalities(CABA_PROVINCE, "Palermo");

  assert.deepEqual(result, [{ id: "Palermo", name: "Palermo" }]);
  assert.ok(CABA_NEIGHBORHOODS.length > 40);
});

test("validateStreetAddress does not send a department for CABA street checks", async () => {
  const originalFetch = globalThis.fetch;
  const seenUrls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    seenUrls.push(String(input));
    return new Response(JSON.stringify({ calles: [streetWithRange(1000, 1400)] }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await validateStreetAddress({
      province: CABA_PROVINCE,
      department: "Palermo",
      locality: "Palermo",
      street: "Av. Santa Fe",
      streetNumber: "1200",
    });

    const firstUrl = seenUrls[0];
    assert.ok(firstUrl);
    const query = new URL(firstUrl).searchParams;
    assert.equal(result.status, "valid");
    assert.equal(query.get("provincia"), "02");
    assert.equal(query.has("departamento"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
