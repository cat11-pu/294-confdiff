// layers.js：层内容与覆盖（后合的层逐键覆盖先合的层，先合的键保持原样）
// 配置形态：config[key] = [值, 来源层名]

// 取一层事件/账条里的键值表；没有合法表时给空表。
export function valuesOf(layer) {
  if (layer && typeof layer === "object"
      && layer.values && typeof layer.values === "object") {
    return layer.values;
  }
  return {};
}

// 把一层逐键覆盖进配置，返回新配置（不改入参）。
// 兼容两种调用：applyLayer(config, name, values) 与 applyLayer(config, layerEvent)。
export function applyLayer(config, name, values) {
  if (name && typeof name === "object") {
    const layer = name;
    values = valuesOf(layer);
    name = layer.name;
  }
  const next = Object.assign({}, config || {});
  const table = values || {};
  for (const key of Object.keys(table)) {
    next[key] = [table[key], name];
  }
  return next;
}
