// confrun.js：按整批共用的合并预算逐层合并，用尽预算后整层（名 + 键值）压账；
// 下一轮先还旧账（FIFO），收尾不限预算把账并完。
import { valuesOf, applyLayer } from "./layers.js";

function err(spec, field, fallback) {
  const code = (spec && spec[field]) || fallback;
  const error = new Error(code);
  error.code = code;
  return error;
}

function cloneState(state) {
  return {
    config: Object.assign({}, (state && state.config) || {}),
    merged: Array.isArray(state && state.merged) ? state.merged.slice() : [],
    ledger: Array.isArray(state && state.ledger)
      ? state.ledger.map(function (entry) {
          return { name: entry.name, values: Object.assign({}, entry.values) };
        })
      : [],
    applied: Array.isArray(state && state.applied) ? state.applied.slice() : []
  };
}

// 合法层：有非空层名，且由层内容推出非空键值表；否则 E_BAD_LAYER。
function inspect(spec, event) {
  if (!event || typeof event !== "object" || event.kind !== "layer") {
    throw err(spec, "event_error_code", "E_BAD_EVENT");
  }
  const name = event.name;
  if (typeof name !== "string" || name === "") {
    throw err(spec, "layer_error_code", "E_BAD_LAYER");
  }
  const values = valuesOf(event);
  if (!values || typeof values !== "object" || Object.keys(values).length === 0) {
    throw err(spec, "layer_error_code", "E_BAD_LAYER");
  }
  return { name: name, values: values };
}

function eventKey(event) {
  return event && event.id !== undefined && event.id !== null
    ? "id:" + String(event.id)
    : "layer:" + String(event.name) + ":" + JSON.stringify(event && event.values);
}

export function step(spec) {
  const state = cloneState(spec && spec.state);
  const events = Array.isArray(spec && spec.events) ? spec.events : [];
  const budget = Number.isFinite(spec && spec.budget) ? spec.budget : 0;

  // 先验一遍：事件不合法时整批不产生副作用。
  for (const event of events) inspect(spec, event);

  let merged_count = 0;
  let remaining = budget;

  // 先还旧账：上一轮压着的层按入账顺序先并。
  while (remaining > 0 && state.ledger.length > 0) {
    const entry = state.ledger.shift();
    state.config = applyLayer(state.config, entry.name, entry.values);
    state.merged.push(entry.name);
    merged_count += 1;
    remaining -= 1;
  }

  for (const event of events) {
    const key = eventKey(event);
    if (state.applied.indexOf(key) !== -1) continue; // 已压账或已并，重放不再处理
    state.applied.push(key);
    const layer = inspect(spec, event);
    if (remaining > 0) {
      state.config = applyLayer(state.config, layer.name, layer.values);
      state.merged.push(layer.name);
      merged_count += 1;
      remaining -= 1;
    } else {
      // 预算用尽：连名字与键值一起压账，等下一轮或收尾。
      state.ledger.push({ name: layer.name, values: Object.assign({}, layer.values) });
    }
  }

  return {
    state: state,
    merged_count: merged_count,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (entry) { return entry.name; }),
    judged: events.length,
    judged_bound: events.length
  };
}

// 收尾：不限预算，把账里的层全部合并，返回补齐层数。
export function close(spec) {
  const state = cloneState(spec && spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    const entry = state.ledger.shift();
    state.config = applyLayer(state.config, entry.name, entry.values);
    state.merged.push(entry.name);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
