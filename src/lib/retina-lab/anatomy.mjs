import { retinalSurface, visualToRetinal } from "./coordinates.mjs";

export const ANATOMY_VERSION = "retina-procedural-stratified-v1";
export const ANATOMY_NOTE =
  "Procedural, density-reduced retinal anatomy informed by histology. These cells are not microscopy reconstructions. Layer dimensions, arbor distributions and disease survival are exploratory assumptions.";
export function random(seed) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function layersAt(xUm, yUm) {
  const r = Math.hypot(xUm, yUm),
    inner = 1 - Math.exp(-((r / 460) ** 2));
  const nfl = 8 + 12 * inner,
    gcl = 3 + 39 * inner,
    ipl = 3 + 43 * inner,
    inl = 5 + 34 * inner,
    opl = 15,
    onl = 70 - 25 * inner,
    is = 24,
    os = 30,
    rpe = 12;
  let top = 0;
  return [
    ["NFL", nfl, "#b9b59b"],
    ["GCL", gcl, "#9d91a0"],
    ["IPL", ipl, "#74958d"],
    ["INL", inl, "#9c8aab"],
    ["OPL", opl, "#9dba9a"],
    ["ONL", onl, "#a1a7b4"],
    ["IS", is, "#bcb284"],
    ["OS", os, "#9a9e68"],
    ["RPE", rpe, "#51403a"],
  ].map(([id, thickness, color]) => {
    const layer = { id, top, bottom: top + thickness, thickness, color };
    top += thickness;
    return layer;
  });
}
export function tissueAt(x, y, t) {
  const r = Math.hypot(x, y),
    local = Math.exp(
      -0.5 *
        (Math.hypot(x - t.lesionXUm, y - t.lesionYUm) / t.lesionRadiusUm) ** 6,
    );
  let loss = 0,
    bipolar = t.bipolar,
    ganglion = t.ganglion;
  if (t.condition === "healthy") {
    bipolar = 1;
    ganglion = 1;
  }
  if (t.condition === "degeneration" || t.condition === "selective")
    loss = t.severity;
  if (t.condition === "rp")
    loss = t.severity * (1 - Math.exp(-((r / 1100) ** 2)));
  if (t.condition === "ga") loss = t.severity * local;
  if (t.condition === "lesion") {
    loss = t.severity * local;
    bipolar *= 1 - loss;
    ganglion *= 1 - loss;
  }
  if (t.condition === "ganglion") ganglion *= 1 - t.severity;
  return {
    photoreceptor: Math.max(0, 1 - loss),
    bipolar,
    ganglion,
    damage: loss,
  };
}
export function ganglionLocation(x, y) {
  const r = Math.hypot(x, y),
    displacement = 340 * Math.exp(-((r / 600) ** 2)),
    theta = r > 1 ? Math.atan2(y, x) : 0;
  return {
    xUm: x + displacement * Math.cos(theta),
    yUm: y + displacement * Math.sin(theta),
  };
}
export function population(config) {
  const n = config.neural.gridSize,
    span = config.scene.fieldDeg,
    rng = random(config.seed),
    cells = [];
  for (let row = 0; row < n; row++)
    for (let col = 0; col < n; col++) {
      const xDeg = -span / 2 + ((col + 0.5) * span) / n,
        yDeg = span / 2 - ((row + 0.5) * span) / n,
        p = visualToRetinal(xDeg, yDeg),
        s = ganglionLocation(p.xUm, p.yUm),
        layers = layersAt(s.xUm, s.yUm);
      const gcl = layers.find((l) => l.id === "GCL"),
        ipl = layers.find((l) => l.id === "IPL"),
        inl = layers.find((l) => l.id === "INL");
      const on = (row + col) % 2 === 0;
      cells.push({
        id: "RGC-" + cells.length,
        index: cells.length,
        xDeg,
        yDeg,
        receptorXUm: p.xUm,
        receptorYUm: p.yUm,
        ...s,
        on,
        kind: rng() < 0.18 ? "parasol" : "midget",
        depthUm: (gcl.top + gcl.bottom) / 2,
        dendriteDepthUm: ipl.top + (on ? 0.72 : 0.28) * ipl.thickness,
        bipolarDepthUm: (inl.top + inl.bottom) / 2,
        survival: tissueAt(p.xUm, p.yUm, config.tissue),
        seed: Math.floor(rng() * 4294967295),
      });
    }
  return cells;
}
/** Space-filling arbor: a constrained minimum-cost tree through a stratified target cloud.
 * Paths and branching are stochastic; not a traced neuron or an exact published generator.
 */
export function morphology(cell, { count = 65, axon = true } = {}) {
  const rng = random(cell.seed ?? 431),
    ecc = Math.hypot(cell.xUm, cell.yUm) / 1000;
  const radius =
    (cell.kind === "parasol" ? 125 : 32) * (1 + 0.18 * Math.min(ecc, 5));
  const nodes = [
    {
      xUm: cell.xUm,
      yUm: cell.yUm,
      depthUm: cell.depthUm,
      radiusUm: cell.kind === "parasol" ? 9 : 6,
      parent: -1,
      type: "soma",
      pathUm: 0,
    },
  ];
  const stem = {
    xUm: cell.xUm + 2,
    yUm: cell.yUm - 1,
    depthUm: cell.dendriteDepthUm,
    radiusUm: 1.35,
    parent: 0,
    type: "dendrite",
    pathUm: Math.abs(cell.dendriteDepthUm - cell.depthUm),
  };
  nodes.push(stem);
  const targets = Array.from({ length: count }, () => {
    const a = rng() * Math.PI * 2,
      r = radius * Math.sqrt(rng());
    return {
      xUm: cell.xUm + Math.cos(a) * r,
      yUm: cell.yUm + Math.sin(a) * r * 0.8,
      depthUm: cell.dendriteDepthUm + (rng() - 0.5) * 8,
    };
  });
  while (targets.length) {
    let best = Infinity,
      pi = 1,
      ti = 0;
    for (let j = 0; j < targets.length; j++)
      for (let k = 1; k < nodes.length; k++) {
        const a = nodes[k],
          b = targets[j],
          d = Math.hypot(a.xUm - b.xUm, a.yUm - b.yUm, a.depthUm - b.depthUm),
          cost = d + 0.42 * a.pathUm;
        if (cost < best) {
          best = cost;
          pi = k;
          ti = j;
        }
      }
    const p = nodes[pi],
      q = targets.splice(ti, 1)[0],
      distance = Math.hypot(
        p.xUm - q.xUm,
        p.yUm - q.yUm,
        p.depthUm - q.depthUm,
      );
    nodes.push({
      ...q,
      parent: pi,
      type: "dendrite",
      pathUm: p.pathUm + distance,
      radiusUm: Math.max(
        0.23,
        1.05 * Math.exp(-(p.pathUm + distance) / radius),
      ),
    });
  }
  if (axon) {
    let parent = 0;
    const dx = 4200 - cell.xUm,
      dy = -300 - cell.yUm,
      len = Math.hypot(dx, dy);
    for (let i = 1; i <= 16; i++) {
      const dist = i * 18;
      nodes.push({
        xUm: cell.xUm + (dist * dx) / len,
        yUm: cell.yUm + (dist * dy) / len + 12 * Math.sin(i / 5),
        depthUm: Math.max(4, cell.depthUm * (1 - i / 16)),
        radiusUm: i < 5 ? 0.45 : 0.55,
        parent,
        type: i < 5 ? "ais" : "axon",
        pathUm: dist,
      });
      parent = nodes.length - 1;
    }
  }
  return nodes;
}
export function cellWorld(node) {
  return [
    node.xUm / 1000,
    node.yUm / 1000,
    (retinalSurface(node.xUm, node.yUm) - node.depthUm) / 1000,
  ];
}
