import assert from "node:assert";
import { valuesOf, applyLayer } from "../layers.js";
import { step, close } from "../confrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { config: {}, merged: [], ledger: [], applied: [] },
  events: [],
  layer_error_code: "E_BAD_LAYER", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("valuesOf returns a table", () => {
  assert.strictEqual(typeof valuesOf({}), "object");
});

check("applyLayer returns a table", () => {
  assert.strictEqual(typeof applyLayer({}, {}), "object");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
