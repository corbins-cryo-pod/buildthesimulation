// Reduced cortical cable model, independently implemented from published equations.
// Pospischil et al. (2008) kinetics; spatial channel allocation is a new assumption.
// Internal units: mV, ms, nA, nF, µS. Axial resistivity: Ω cm.
const REST = -70, ENA = 50, EK = -100;
const trap = (x, y) => Math.abs(x / y) < 1e-7 ? y * (1 - x / (2 * y)) : x / Math.expm1(x / y);
export function gateRates(v, threshold = -55) {
  const u = v - threshold;
  const pairs = [[.32 * trap(13 - u, 4), .28 * trap(u - 40, 5)], [.128 * Math.exp((17 - u) / 18), 4 / (1 + Math.exp((40 - u) / 5))], [.032 * trap(15 - u, 5), .5 * Math.exp((10 - u) / 40)]];
  return [...pairs.map(([a, b]) => [a / (a + b), 1 / (a + b)]), [1 / (1 + Math.exp(-(v + 35) / 10)), 1000 / (3.3 * Math.exp((v + 35) / 20) + Math.exp(-(v + 35) / 20))]];
}

function gateTable(dt, threshold) {
  const table = new Float64Array(7001 * 8);
  for (let k = 0; k <= 7000; k++) gateRates(-500 + k / 10, threshold).forEach(([inf, tau], j) => { table[k * 8 + j * 2] = inf; table[k * 8 + j * 2 + 1] = -Math.expm1(-dt / tau); });
  return table;
}

export function compileCable(morphologies, c, extracellular) {
  const length = morphologies.reduce((s, m) => s + m.nodes.length, 0), f = () => new Float64Array(length);
  const cable = { length, parent: new Int32Array(length), root: [], ais: [], owner: new Int32Array(length), kind: new Uint8Array(length), voltage: f(), m: f(), h: f(), n: f(), p: f(), capacitance: f(), na: f(), k: f(), slow: f(), leak: f(), leakE: f(), edge: f(), sumEdge: f(), drive: f(), diagonal: f(), rhs: f(), extracellular: Float64Array.from(extracellular), tables: [gateTable(c.dt, -55), gateTable(c.dt, -63)], dt: c.dt };
  let offset = 0;
  morphologies.forEach((morph, owner) => {
    cable.root.push(offset); cable.ais.push(offset + morph.ais);
    morph.nodes.forEach((node, local) => {
      const i = offset + local, axon = ['axon', 'ais'].includes(node.kind), dendrite = node.kind === 'dendrite';
      cable.owner[i] = owner; cable.kind[i] = node.kind === 'soma' ? 0 : dendrite ? 1 : node.kind === 'ais' ? 2 : 3;
      cable.parent[i] = node.parent < 0 ? -1 : offset + node.parent;
      const areaScale = node.area * 1e-5;
      cable.capacitance[i] = areaScale; // Cm = 1 µF/cm².
      cable.na[i] = (node.kind === 'ais' ? 400 : axon ? 200 : dendrite ? 5 : 50) * c.sodiumScale * areaScale;
      cable.k[i] = (axon ? 40 : dendrite ? 1 : morph.cell.inhibitory ? 10 : 5) * areaScale;
      cable.slow[i] = (morph.cell.inhibitory || axon ? 0 : .07) * areaScale;
      cable.leak[i] = .1 * areaScale;
      const rates = gateRates(REST, axon ? -63 : -55);
      [cable.m[i], cable.h[i], cable.n[i], cable.p[i]] = rates.map(r => r[0]);
      cable.voltage[i] = REST;
      const gNa = cable.na[i] * cable.m[i] ** 3 * cable.h[i], gK = cable.k[i] * cable.n[i] ** 4 + cable.slow[i] * cable.p[i];
      // Balance rest exactly. This construction is documented, not a fitted leak reversal.
      cable.leakE[i] = REST + (gNa * (REST - ENA) + gK * (REST - EK)) / cable.leak[i];
      if (node.parent >= 0) {
        const parent = morph.nodes[node.parent];
        const resistance = c.axialResistivity * 1e4 * (node.length / 2 / (Math.PI * (node.diameter / 2) ** 2) + parent.length / 2 / (Math.PI * (parent.diameter / 2) ** 2));
        const g = 1e6 / resistance, p = cable.parent[i];
        cable.edge[i] = g; cable.sumEdge[i] += g; cable.sumEdge[p] += g;
        const force = g * (cable.extracellular[p] - cable.extracellular[i]); cable.drive[i] += force; cable.drive[p] -= force;
      }
    });
    offset += morph.nodes.length;
  });
  return cable;
}

export function stepCable(cable, drive, time, state = null) {
  const { length, parent, voltage: v, m, h, n, p, diagonal: d, rhs: b, edge, dt } = cable;
  for (let i = 0; i < length; i++) {
    const table = cable.tables[cable.kind[i] >= 2 ? 1 : 0];
    const index = Math.max(0, Math.min(6999, Math.floor((v[i] + 500) * 10))), u = Math.max(0, Math.min(1, (v[i] + 500) * 10 - index)), j = index * 8;
    // Linear interpolation removes rounding-dependent threshold jumps.
    const inf0 = table[j] + (table[j + 8] - table[j]) * u, rate0 = table[j + 1] + (table[j + 9] - table[j + 1]) * u;
    const inf1 = table[j + 2] + (table[j + 10] - table[j + 2]) * u, rate1 = table[j + 3] + (table[j + 11] - table[j + 3]) * u;
    const inf2 = table[j + 4] + (table[j + 12] - table[j + 4]) * u, rate2 = table[j + 5] + (table[j + 13] - table[j + 5]) * u;
    const inf3 = table[j + 6] + (table[j + 14] - table[j + 6]) * u, rate3 = table[j + 7] + (table[j + 15] - table[j + 7]) * u;
    m[i] += (inf0 - m[i]) * rate0; h[i] += (inf1 - h[i]) * rate1; n[i] += (inf2 - n[i]) * rate2; p[i] += (inf3 - p[i]) * rate3;
    const sodium = cable.na[i] * m[i] * m[i] * m[i] * h[i], potassium = cable.k[i] * n[i] ** 4 + cable.slow[i] * p[i], capacitive = cable.capacitance[i] / dt;
    d[i] = capacitive + sodium + potassium + cable.leak[i] + cable.sumEdge[i];
    b[i] = capacitive * v[i] + sodium * ENA + potassium * EK + cable.leak[i] * cable.leakE[i] + cable.drive[i] * drive;
  }
  // Hines elimination: every parent precedes its children, across independent trees.
  for (let i = length - 1; i >= 0; i--) if (parent[i] >= 0) { const factor = edge[i] / d[i]; d[parent[i]] -= factor * edge[i]; b[parent[i]] += factor * b[i]; }
  for (let i = 0; i < length; i++) {
    const old = v[i]; v[i] = (b[i] + (parent[i] < 0 ? 0 : edge[i] * v[parent[i]])) / d[i];
    if (!Number.isFinite(v[i]) || Math.abs(v[i]) > 3000) throw new Error('The reduced membrane model left its supported voltage range. Reduce current or move contacts away from neurites.');
    if (state) {
      const owner = cable.owner[i];
      if (Math.abs(v[i]) > 200) state.extreme[owner] = 1;
      if (old < 0 && v[i] >= 0 && cable.kind[i] !== 1) {
        if (state.firstSpike[owner] < 0) { state.firstSpike[owner] = time; state.firstNode[owner] = i - cable.root[owner]; }
        if (cable.kind[i] === 0 && state.somaSpike[owner] < 0) state.somaSpike[owner] = time;
        if (cable.kind[i] >= 2 && state.axonSpike[owner] < 0) state.axonSpike[owner] = time;
      }
    }
  }
}
