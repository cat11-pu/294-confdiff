// confrun.js：按合并预算合并并留账
import { valuesOf, applyLayer } from "./layers.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function copyState(source) {
  const state = source && typeof source === "object" ? source : {};
  return {
    config: Object.assign({}, state.config || {}),
    merged: (state.merged || []).slice(),
    ledger: (state.ledger || []).map(function (entry) {
      return { name: entry.name, values: Object.assign({}, entry.values || {}) };
    }),
    applied: (state.applied || []).slice()
  };
}

export function step(spec) {
  const state = copyState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const layerCode = spec.layer_error_code || "E_BAD_LAYER";
  const eventCode = spec.event_error_code || "E_BAD_EVENT";
  let budget = Number.isFinite(spec.budget) ? spec.budget : events.length;
  let mergedCount = 0;
  let judged = 0;
  events.forEach(function (event, index) {
    judged += 1;
    if (!event || typeof event !== "object" || event.kind !== "layer") {
      fail(eventCode, "bad event");
    }
    const marker = event.id !== undefined ? event.id : index;
    if (state.applied.indexOf(marker) !== -1) return;
    const values = valuesOf(event);
    if (!event.name || Object.keys(values).length === 0) {
      fail(layerCode, "bad layer");
    }
    state.applied.push(marker);
    if (budget > 0) {
      budget -= 1;
      state.config = applyLayer(state.config, event.name, values);
      state.merged.push(event.name);
      mergedCount += 1;
    } else {
      state.ledger.push({ name: event.name, values: values });
    }
  });
  return {
    state: state,
    merged_count: mergedCount,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (entry) { return entry.name; }),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = copyState(spec.state);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  pending.forEach(function (entry) {
    state.config = applyLayer(state.config, entry.name, valuesOf(entry));
    state.merged.push(entry.name);
    catchup += 1;
  });
  const order = {};
  (Array.isArray(spec.events) ? spec.events : []).forEach(function (event, index) {
    if (event && typeof event === "object" && event.kind === "layer"
        && event.name && !(event.name in order)) {
      order[event.name] = index;
    }
  });
  state.merged = state.merged
    .map(function (name, index) { return [name, index]; })
    .sort(function (a, b) {
      const oa = a[0] in order ? order[a[0]] : Infinity;
      const ob = b[0] in order ? order[b[0]] : Infinity;
      return (oa - ob) || (a[1] - b[1]);
    })
    .map(function (pair) { return pair[0]; });
  return { state: state, catchup: catchup };
}
