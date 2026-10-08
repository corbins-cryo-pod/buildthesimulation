export function randomGenerator(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function normal(rng) { return Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng()); }

export function createPopulation(c) {
  const rng = randomGenerator(c.seed), volume = c.width * c.width * c.depth / 1e9;
  const target = Math.round(c.density * volume), cells = [], hash = new Map(), pitch = 32;
  const key = (x, y, z) => `${x},${y},${z}`;
  const occupied = (x, y, z) => hash.get(key(x, y, z)) ?? [];
  // Fix cell sizes and classes before placement, then place large somata first.
  // Redrawing a rejected cell would bias the anatomy toward small somata.
  const proposals = Array.from({ length: target }, () => {
    const inhibitory = rng() < c.inhibitoryFraction;
    const diameter = Math.max(7, Math.min(26, c.somaDiameter * (inhibitory ? .85 : 1) * Math.exp(c.somaCV * normal(rng) - c.somaCV ** 2 / 2)));
    const radii = inhibitory ? [diameter / 2, diameter / 2, diameter / 2] : [diameter * .45, diameter * .45, diameter / 1.8];
    return { diameter, radii, radius: Math.max(...radii), inhibitory, morphologySeed: Math.floor(rng() * 2147483647) };
  }).sort((a, b) => b.radius - a.radius);
  let attempts = 0;
  const limit = Math.min(target * 100, 1000000);
  for (const proposal of proposals) {
    if (attempts >= limit) break;
    const { radius } = proposal;
    for (let trial = 0; trial < 100 && attempts++ < limit; trial++) {
      const position = [(rng() - .5) * (c.width - 2 * radius), (rng() - .5) * (c.width - 2 * radius), c.top + radius + rng() * (c.depth - 2 * radius)];
      const grid = position.map(v => Math.floor(v / pitch)); let ok = true;
      for (let x = grid[0] - 1; x <= grid[0] + 1 && ok; x++) for (let y = grid[1] - 1; y <= grid[1] + 1 && ok; y++) for (let z = grid[2] - 1; z <= grid[2] + 1 && ok; z++) for (const index of occupied(x, y, z)) {
        const other = cells[index], spacing = radius + other.radius + .5;
        if (position.reduce((sum, v, i) => sum + (v - other.position[i]) ** 2, 0) < spacing * spacing) { ok = false; break; }
      }
      if (!ok) continue;
      const cell = { id: cells.length, position, ...proposal };
      const k = key(...grid); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(cell.id); cells.push(cell);
      break;
    }
  }
  // Nearest-neighbour estimate from a 256-cell audit in a local spatial neighborhood.
  const audit = Array.from({ length: Math.min(256, cells.length) }, (_, i) => cells[Math.floor(i * cells.length / Math.min(256, cells.length))]);
  const nearest = audit.map(cell => {
    const g = cell.position.map(v => Math.floor(v / pitch)); let min = Infinity;
    for (let x = g[0] - 3; x <= g[0] + 3; x++) for (let y = g[1] - 3; y <= g[1] + 3; y++) for (let z = g[2] - 3; z <= g[2] + 3; z++) for (const id of occupied(x, y, z)) {
      if (id !== cell.id) min = Math.min(min, Math.hypot(...cell.position.map((v, j) => v - cells[id].position[j])));
    }
    return min;
  }).filter(Number.isFinite).sort((a, b) => a - b);
  return { cells, volume, target, density: cells.length / volume, meanDiameter: cells.reduce((sum, cell) => sum + cell.diameter, 0) / cells.length, inhibitoryFraction: cells.filter(cell => cell.inhibitory).length / cells.length, characteristicSpacing: 1000 / Math.cbrt(cells.length / volume), nearestMedian: nearest[Math.floor(nearest.length / 2)] ?? 0 };
}

export function samplePopulation(population, count, seed) {
  const indices = population.cells.map((_, i) => i), rng = randomGenerator(seed ^ 0xA7811);
  for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
  return indices.slice(0, Math.min(count, indices.length)).map(i => population.cells[i]);
}

const norm = v => { const r = Math.hypot(...v); return v.map(x => x / r); };
export function createMorphology(cell, c) {
  const rng = randomGenerator(cell.morphologySeed), nodes = [];
  const radial = c.orientation === 'radial' && !cell.inhibitory;
  const direction = radial ? norm([.15 * normal(rng), .15 * normal(rng), 1]) : norm([normal(rng), normal(rng), normal(rng)]);
  const tangent = norm(Math.abs(direction[2]) < .9 ? [-direction[1], direction[0], 0] : [direction[2], 0, -direction[0]]);
  const second = [direction[1] * tangent[2] - direction[2] * tangent[1], direction[2] * tangent[0] - direction[0] * tangent[2], direction[0] * tangent[1] - direction[1] * tangent[0]];
  const local = (x, y, z) => cell.position.map((p, k) => p + x * tangent[k] + y * second[k] + z * direction[k]);
  // Knud Thomsen ellipsoid-area approximation; not the original equivalent-area HH soma.
  const [a, b, d] = cell.radii, p = 1.6075;
  const area = 4 * Math.PI * ((a ** p * b ** p + a ** p * d ** p + b ** p * d ** p) / 3) ** (1 / p);
  nodes.push({ position: cell.position, local: [0, 0, 0], parent: -1, diameter: cell.diameter, length: cell.diameter, area, kind: 'soma' });
  const branch = (parent, end, diameter, kind, taper = 1) => {
    const start = nodes[parent].local, length = Math.hypot(...end.map((v, i) => v - start[i]));
    const segments = Math.max(1, Math.ceil(length / c.segmentLength)); let prev = parent;
    for (let j = 1; j <= segments; j++) {
      const point = start.map((v, i) => v + (end[i] - v) * j / segments), dia = diameter * (1 - (1 - taper) * (j - .5) / segments);
      nodes.push({ position: local(...point), local: point, parent: prev, diameter: dia, length: length / segments, area: Math.PI * dia * length / segments, kind }); prev = nodes.length - 1;
    }
    return prev;
  };
  const apical = branch(0, [10, 0, cell.inhibitory ? -110 : -180], cell.inhibitory ? 1.5 : 2.2, 'dendrite', .7);
  branch(apical, [65, 20, cell.inhibitory ? -150 : -260], 1.1, 'dendrite', .65);
  branch(apical, [-60, -20, cell.inhibitory ? -155 : -245], 1.1, 'dendrite', .65);
  for (let b = 0; b < 3; b++) { const theta = b * 2 * Math.PI / 3 + rng() * .4; branch(0, [100 * Math.cos(theta), 100 * Math.sin(theta), 35], 1.6, 'dendrite', .6); }
  const ais = branch(0, [0, 0, 40], 1.25, 'ais', .8);
  const axon = branch(ais, [10, 10, 95], c.axonDiameter, 'axon');
  const theta = rng() * 2 * Math.PI;
  // Locally branching unmyelinated axon; this is not a reconstructed full axonal arbor.
  for (let b = 0; b < 2; b++) {
    const angle = theta + b * Math.PI + (rng() - .5) * .4;
    const middle = [Math.cos(angle) * c.axonLength * .55, Math.sin(angle) * c.axonLength * .55, 115 + (rng() - .5) * 40];
    const junction = branch(axon, middle, c.axonDiameter, 'axon', .9);
    for (let j = 0; j < 2; j++) branch(junction, [middle[0] + Math.cos(angle + (j ? .5 : -.5)) * c.axonLength * .45, middle[1] + Math.sin(angle + (j ? .5 : -.5)) * c.axonLength * .45, middle[2] + (j ? 40 : -40)], c.axonDiameter * .8, 'axon', .8);
  }
  return { cell, nodes, ais, direction };
}
