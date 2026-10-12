// Finite-volume passive cable; sealed ends; backward Euler; Hines tree solve.
// mV, ms, nA, nF, µS. Every parent must precede its children.
export function createPassiveCable(nodes, membrane) {
  const n = nodes.length,
    f = () => new Float64Array(n);
  const c = {
    nodes,
    n,
    voltageMv: f().fill(membrane.restMv),
    capacitanceNf: f(),
    leakUs: f(),
    edgeUs: f(),
    sumEdgeUs: f(),
    diagonal: f(),
    rhs: f(),
    previous: f(),
    membraneCurrentNa: f(),
    restMv: membrane.restMv,
  };
  nodes.forEach((node, i) => {
    if (
      !Number.isInteger(node.parent) ||
      node.parent >= i ||
      node.parent < -1 ||
      !(node.areaUm2 > 0 && node.lengthUm > 0 && node.diameterUm > 0)
    )
      throw new Error('Invalid tree compartment geometry.');
    c.capacitanceNf[i] = membrane.capacitanceUfPerCm2 * node.areaUm2 * 1e-5;
    c.leakUs[i] = (node.areaUm2 * 0.01) / membrane.resistanceOhmCm2;
    if (node.parent >= 0) {
      const p = nodes[node.parent];
      const resistance =
        membrane.axialResistivityOhmCm *
        1e4 *
        (node.lengthUm / 2 / (Math.PI * (node.diameterUm / 2) ** 2) +
          p.lengthUm / 2 / (Math.PI * (p.diameterUm / 2) ** 2));
      const g = 1e6 / resistance;
      c.edgeUs[i] = g;
      c.sumEdgeUs[i] += g;
      c.sumEdgeUs[node.parent] += g;
    }
  });
  return c;
}
export function stepPassiveCable(
  c,
  dtMs,
  {
    extracellularMv,
    injectionNa,
    synapseIndex = -1,
    synapseUs = 0,
    synapticUs,
    synapseReversalMv = 0,
  } = {},
) {
  if (!(dtMs > 0 && Number.isFinite(dtMs))) throw new Error('Timestep must be positive.');
  const { n, nodes, diagonal: d, rhs: b, voltageMv: v, edgeUs: edge } = c;
  c.previous.set(v);
  for (let i = 0; i < n; i++) {
    const cap = c.capacitanceNf[i] / dtMs,
      syn = synapticUs?.[i] ?? (i === synapseIndex ? synapseUs : 0);
    d[i] = cap + c.leakUs[i] + c.sumEdgeUs[i] + syn;
    b[i] = cap * v[i] + c.leakUs[i] * c.restMv + syn * synapseReversalMv + (injectionNa?.[i] ?? 0);
  }
  if (extracellularMv)
    for (let i = 0; i < n; i++)
      if (nodes[i].parent >= 0) {
        const p = nodes[i].parent,
          force = edge[i] * (extracellularMv[p] - extracellularMv[i]);
        b[i] += force;
        b[p] -= force;
      }
  for (let i = n - 1; i >= 0; i--)
    if (nodes[i].parent >= 0) {
      const p = nodes[i].parent,
        f = edge[i] / d[i];
      d[p] -= f * edge[i];
      b[p] += f * b[i];
    }
  for (let i = 0; i < n; i++) {
    const p = nodes[i].parent;
    v[i] = (b[i] + (p >= 0 ? edge[i] * v[p] : 0)) / d[i];
    if (!Number.isFinite(v[i])) throw new Error('Non-finite cable solution.');
    // Total OUTWARD transmembrane current, including capacitive and synaptic terms.
    // Do not record leak current alone, or add intracellular injection twice.
    c.membraneCurrentNa[i] =
      (c.capacitanceNf[i] * (v[i] - c.previous[i])) / dtMs +
      c.leakUs[i] * (v[i] - c.restMv) +
      (synapticUs?.[i] ?? (i === synapseIndex ? synapseUs : 0)) * (v[i] - synapseReversalMv);
  }
  return c;
}
