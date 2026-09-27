// app.js：渲染结果
import { valuesOf, applyLayer } from "./layers.js";
import { step, close } from "./confrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      config: state.config, merged: state.merged, ledger: state.ledger,
      applied: state.applied.length
    });
  };
  const keys = Object.keys(closed.state.config).sort();
  return { config: keys.map(function (key) {
             return [key, closed.state.config[key][0], closed.state.config[key][1]];
           }),
           layers: closed.state.merged.slice(),
           merged_count: closed.state.merged.length,
           merged_first: first.merged_count, merged_wide: wide.merged_count,
           pair_differs: first.merged_count !== wide.merged_count,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.merged_count, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length,
           tail: Object.keys(valuesOf({})).length + Object.keys(applyLayer({}, {})).length };
}
