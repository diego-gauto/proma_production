import assert from "node:assert/strict";
import { test } from "node:test";
import { formatList } from "./master-formatters";

test("formatList tolerates missing arrays during resource switches", () => {
  assert.equal(formatList(undefined), "Sin datos");
});

test("formatList joins mapped values when an array is present", () => {
  assert.equal(
    formatList([{ label: "30/32" }, { label: "34/36" }], (value) => value.label),
    "30/32, 34/36",
  );
});
