import { EXTRA_CHANNELS, extraRates, extraOpen, advanceExtra } from "./extra-channels.js";
import { CHANNELS, channelRates, channelOpen, initialSodium, stepSodium, advanceChannelGates } from "./active-channels.js";

const FARADAY = 96485.33212;
const RT_OVER_2F_MV = (1000 * 8.314462618 * (273.15 + 34)) / (2 * FARADAY);
 function createActiveCable(nodes, fit, {kv2TauGuard=true}={}) {
  const vInit = fit.conditions?.[0]?.v_init ?? -80;
  const hasExtra = fit.genome.some(p => EXTRA_CHANNELS.includes(p.mechanism));
  const n = nodes.length,
    f = () => new Float64Array(n),
    c = {
      nodes,
      kv2TauGuard,
      n,
      voltageMv: f().fill(vInit),
      extraGates: hasExtra ? new Float64Array(n * 8) : null,
      extraDensity: hasExtra ? Array.from({length:4}, f) : null,
      extraConductance: hasExtra ? new Float64Array(n * 4) : null,
      previous: f(),
      capacitanceNf: f(),
      leakUs: f(),
      edgeUs: f(),
      sumEdgeUs: f(),
      diagonal: f(),
      rhs: f(),
      membraneCurrentNa: f(),
      ionicNa: f(),
      potassiumNa: f(),
      calciumNa: f(),
      hcnNa: f(),
      leakNa: f(),
      capacitiveNa: f(),
      reversalMv: f(),
      gates: new Float64Array(n * 12),
      sodium: new Float64Array(n * 12),
      calciumMm: f().fill(1e-4),
      density: Array.from({ length: 9 }, f),
      decayMs: f().fill(80),
      gamma: f().fill(0.05),
      lastCalciumDensity: f(),
      conductance: new Float64Array(n * 9),
      caReversal: f(),
      sodiumScratch: {
        d: new Float64Array(24),
        upper: new Float64Array(12),
        r: new Float64Array(12),
      },
    };
  const initial = initialSodium(vInit),
    rates = channelRates(vInit);
  nodes.forEach((node, i) => {
    c.edgeUs[i] = node.edgeUs;
    if (node.parent >= 0) {
      c.sumEdgeUs[i] += node.edgeUs;
      c.sumEdgeUs[node.parent] += node.edgeUs;
    }
    if (!node.areaUm2) return;
    const params = Object.fromEntries(
      fit.genome.filter((p) => p.section === node.sectionType).map((p) => [p.name, +p.value]),
    );
    c.capacitanceNf[i] = params.cm * node.areaUm2 * 1e-5;
    c.leakUs[i] = params.g_pas * node.areaUm2 * 0.01;
    c.reversalMv[i] = params.e_pas;
    CHANNELS.forEach(
      (m, j) => (c.density[j][i] = (params[`gbar_${m}`] ?? 0) * node.areaUm2 * 0.01),
    );
    c.decayMs[i] = params.decay_CaDynamics ?? 80;
    c.gamma[i] = params.gamma_CaDynamics ?? 0.05;
    if (hasExtra) {
      EXTRA_CHANNELS.forEach((m,j) => c.extraDensity[j][i]=(params[`gbar_${m}`] ?? 0)*node.areaUm2*.01);
      extraRates(vInit,kv2TauGuard).forEach(([inf],j)=>c.extraGates[i*8+j]=inf);
    }
    c.sodium.set(initial, i * 12);
    rates.forEach(([inf], j) => (c.gates[i * 12 + j] = inf));
  });
  return c;
}

 function stepActiveCable(
  c,
  dt,
  { extracellularMv, injectionNa, synapticUs, synapseReversalMv = 0, membraneOffsetNa } = {},
) {
  const { n, nodes, voltageMv: v, diagonal: d, rhs: b, edgeUs: edge } = c;
  c.previous.set(v);
  // NEURON fixed-step convention: voltage uses current state; channel states
  // advance after the voltage solve. Current bookkeeping uses the same state
  // and reversal potentials as that solve, retaining local KCL exactly.
  const { conductance, caReversal } = c;
  for (let i = 0; i < n; i++) {
    const cap = c.capacitanceNf[i] / dt,
      syn = synapticUs?.[i] ?? 0;
    d[i] = cap + c.leakUs[i] + c.sumEdgeUs[i] + syn;
    b[i] =
      cap * v[i] +
      c.leakUs[i] * c.reversalMv[i] +
      syn * synapseReversalMv +
      (injectionNa?.[i] ?? 0) - (membraneOffsetNa?.[i] ?? 0);
    if (!nodes[i].areaUm2) continue;
    caReversal[i] = RT_OVER_2F_MV * Math.log(2 / c.calciumMm[i]);
    const open = channelOpen(c.gates, i, c.sodium);
    for (let j = 0; j < 9; j++) {
      const g = c.density[j][i] * open[j],
        e = j === 0 ? 53 : j === 1 ? -45 : j === 6 || j === 7 ? caReversal[i] : -107;
      conductance[i * 9 + j] = g;
      d[i] += g;
      b[i] += g * e;
    }
    if(c.extraGates) {
      const open=extraOpen(c.extraGates,i);
      for(let j=0;j<4;j++){const g=c.extraDensity[j][i]*open[j];c.extraConductance[i*4+j]=g;d[i]+=g;b[i]+=g*(-107);}
    }
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
    if (!Number.isFinite(v[i]) || (nodes[i].areaUm2 && (v[i] < -250 || v[i] > 150)))
      throw new Error(
        'Active solution left the supported voltage domain. Reduce stimulus or timestep.',
      );
    if (!nodes[i].areaUm2) {
      c.membraneCurrentNa[i] = 0;
      continue;
    }
    let na = 0,
      k = 0,
      ca = 0,
      hcn = 0;
    for (let j = 0; j < 9; j++) {
      const e = j === 0 ? 53 : j === 1 ? -45 : j === 6 || j === 7 ? caReversal[i] : -107,
        current = conductance[i * 9 + j] * (v[i] - e);
      if (j === 0) na += current;
      else if (j === 1) hcn += current;
      else if (j === 6 || j === 7) ca += current;
      else k += current;
    }
    if(c.extraGates) for(let j=0;j<4;j++) k+=c.extraConductance[i*4+j]*(v[i]+107);
    c.ionicNa[i] = na;
    c.potassiumNa[i] = k;
    c.calciumNa[i] = ca;
    c.hcnNa[i] = hcn;
    c.leakNa[i] = c.leakUs[i] * (v[i] - c.reversalMv[i]);
    c.capacitiveNa[i] = (c.capacitanceNf[i] * (v[i] - c.previous[i])) / dt;
    c.membraneCurrentNa[i] =
      c.capacitiveNa[i] +
      c.leakNa[i] +
      na +
      k +
      ca +
      hcn +
      (synapticUs?.[i] ?? 0) * (v[i] - synapseReversalMv) +
      (membraneOffsetNa?.[i] ?? 0);
    if (c.density[6][i] || c.density[7][i]) {
      // Native CaDynamics reads the calcium current evaluated during matrix
      // construction: old gates, old voltage and old reversal potential. The
      // solve-consistent current above remains the current used for KCL.
      const density =
          ((conductance[i * 9 + 6] + conductance[i * 9 + 7]) *
            (c.previous[i] - caReversal[i])) /
          (nodes[i].areaUm2 * 0.01),
        decay = c.decayMs[i];
      const target = 1e-4 - (10000 * density * c.gamma[i] * decay) / (2 * FARADAY * 0.1);
      c.calciumMm[i] = target + (c.calciumMm[i] - target) * Math.exp(-dt / decay);
      if (!(c.calciumMm[i] > 0))
        throw new Error('Nonpositive intracellular calcium; refine the active timestep.');
    }
    // Native state ordering advances CaDynamics before SK, so SK reads new cai.
    advanceChannelGates(c.gates, i, v[i], dt, c.calciumMm[i], c.density);
    if(c.extraGates) advanceExtra(c.extraGates,i,v[i],dt,c.kv2TauGuard);
    stepSodium(c.sodium, i * 12, v[i], dt, c.sodiumScratch);
  }
  return c;
}





export { createActiveCable, stepActiveCable };
