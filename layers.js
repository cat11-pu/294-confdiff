// layers.js：层内容与覆盖
export function valuesOf(layer) {
  if (!layer || typeof layer !== "object") return {};
  const values = layer.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) return {};
  return Object.assign({}, values);
}

export function applyLayer(config, name, values) {
  if (values === undefined) { values = name; name = null; }
  const table = values && typeof values === "object" ? values : {};
  const next = Object.assign({}, config);
  Object.keys(table).forEach(function (key) {
    next[key] = [table[key], name];
  });
  return next;
}
