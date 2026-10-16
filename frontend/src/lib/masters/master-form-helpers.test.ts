import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPayload, initialForm } from "./master-form-helpers";

test("providers and workshops default to Buenos Aires province on new forms", () => {
  assert.equal(initialForm("providers", null).province, "Buenos Aires");
  assert.equal(initialForm("workshops", null).province, "Buenos Aires");
});

test("clients keep province empty on new forms", () => {
  assert.equal(initialForm("clients", null).province, "");
});


test("article payload accepts structured supplies and decoration sections", () => {
  const payload = buildPayload("articles", {
    code: "ART-1",
    name: "Campera",
    description: "",
    supplies: JSON.stringify([
      { supplyId: "11111111-1111-4111-8111-111111111111", quantity: 4, note: "Puños" },
      { supplyId: "22222222-2222-4222-8222-222222222222", quantity: 1, note: "Etiqueta" },
    ]),
    decorationParts: JSON.stringify([
      { decorationType: "BORDADO", garmentPart: "Delantero", placement: "Pecho izquierdo", decorationCode: "B-123", imageUrl: "https://example.com/bordado.png", notes: "Hilo blanco" },
      { decorationType: "ESTAMPADO", garmentPart: "Espalda", placement: "Centrado", decorationCode: "E-456", imageUrl: "https://example.com/estampa.png", notes: "Medida 20cm" },
    ]),
  }, false);

  assert.deepEqual(payload.supplies, [
    { supplyId: "11111111-1111-4111-8111-111111111111", quantity: 4, note: "Puños" },
    { supplyId: "22222222-2222-4222-8222-222222222222", quantity: 1, note: "Etiqueta" },
  ]);
  assert.deepEqual(payload.decorationParts, [
    { decorationType: "BORDADO", garmentPart: "Delantero", placement: "Pecho izquierdo", decorationCode: "B-123", imageUrl: "https://example.com/bordado.png", notes: "Hilo blanco" },
    { decorationType: "ESTAMPADO", garmentPart: "Espalda", placement: "Centrado", decorationCode: "E-456", imageUrl: "https://example.com/estampa.png", notes: "Medida 20cm" },
  ]);
});
