/*
 * Morphometrics and export: per-cell shape measures, population/network measures, Sholl
 * profiles, Dotti stage timing, and SWC export (the standard neuron-morphology format:
 * id type x y z radius parent; type 1 soma, 2 axon, 3 dendrite, 4 apical dendrite).
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.NE2 = root.NE2 || {}; Object.assign(root.NE2, mod); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const IDENT = ['none', 'minor', 'axon', 'dendrite'];

  function segmentsOf(e, c, fn) {
    const N = e.N;
    for (const id of c.neur) {
      const nr = e.neurites[id]; let a = nr.base;
      for (const b of nr.nodes) { fn(N.x[a], N.y[a], N.x[b], N.y[b], nr); a = b; }
    }
  }

  function sholl(e, c, step = 10, maxR = 0) {
    const cx = e.N.x[c.nuc], cy = e.N.y[c.nuc];
    let far = 0; segmentsOf(e, c, (x0, y0, x1, y1) => { far = Math.max(far, Math.hypot(x1 - cx, y1 - cy)); });
    const R = maxR || Math.ceil(far / step) * step;
    const out = [];
    for (let r = step; r <= R; r += step) {
      let n = 0;
      segmentsOf(e, c, (x0, y0, x1, y1) => { const d0 = Math.hypot(x0 - cx, y0 - cy) - r, d1 = Math.hypot(x1 - cx, y1 - cy) - r; if (d0 * d1 < 0) n++; });
      out.push({ r, n });
    }
    return out;
  }

  function cellMetrics(e, c) {
    const m = { id: c.id, type: c.T.key, stage: c.stage, ageMin: c.age, primaries: 0, axonLength: 0, dendriteLength: 0, minorLength: 0,
      totalLength: 0, branchPoints: 0, tips: 0, maxOrder: 0, tortuosity: 0, synapsesOut: 0, synapsesIn: 0, rateHz: c.rate || 0,
      stageTimesMin: c.stageT.slice(), contactAngleDeg: c.theta * 180 / Math.PI, somaHeight: c.h, footprintDiameter: 2 * c.a };
    let tortN = 0;
    for (const id of c.neur) {
      const nr = e.neurites[id];
      if (nr.parent < 0) m.primaries++; else m.branchPoints++;
      m.tips++;
      m.maxOrder = Math.max(m.maxOrder, nr.order);
      const L = nr.len; m.totalLength += L;
      if (nr.ident === 2) m.axonLength += L; else if (nr.ident === 3) m.dendriteLength += L; else m.minorLength += L;
      const tip = nr.nodes[nr.nodes.length - 1];
      const chord = Math.hypot(e.N.x[tip] - e.N.x[nr.base], e.N.y[tip] - e.N.y[nr.base]);
      if (L > 8 && chord > 1) { m.tortuosity += L / chord; tortN++; }
    }
    m.tortuosity = tortN ? m.tortuosity / tortN : 1;
    for (const b of e.bonds) if (b && b.alive) { if (b.ca === c.id) m.synapsesOut++; if (b.cb === c.id) m.synapsesIn++; }
    m.sholl = sholl(e, c, 10);
    return m;
  }

  function populationMetrics(e) {
    const cells = e.cells.filter((c) => c.alive);
    const neurons = cells.filter((c) => !c.T.glia);
    const n = e.cells.length, adj = new Array(n);
    for (let i = 0; i < n; i++) adj[i] = new Set();
    let syn = 0, wsum = 0;
    for (const b of e.bonds) if (b && b.alive) { syn++; wsum += b.w; if (b.ca !== b.cb) { adj[b.ca].add(b.cb); adj[b.cb].add(b.ca); } }
    // clustering coefficient (undirected) and components
    let cc = 0, ccN = 0, deg = 0;
    for (const c of neurons) {
      const nb = [...adj[c.id]]; deg += nb.length;
      if (nb.length < 2) continue;
      let links = 0; for (let a = 0; a < nb.length; a++) for (let b = a + 1; b < nb.length; b++) if (adj[nb[a]].has(nb[b])) links++;
      cc += 2 * links / (nb.length * (nb.length - 1)); ccN++;
    }
    const stageCounts = [0, 0, 0, 0, 0, 0];
    let axon = 0, dend = 0, rate = 0;
    for (const c of neurons) { stageCounts[c.stage]++; rate += c.rate || 0; for (const id of c.neur) { const nr = e.neurites[id]; if (nr.ident === 2) axon += nr.len; else if (nr.ident === 3) dend += nr.len; } }
    return {
      t: e.t, div: e.p.startDIV + e.t / 1440, cells: cells.length, neurons: neurons.length, glia: cells.length - neurons.length,
      deaths: e.deaths, divisions: e.divisions, synapses: syn, meanWeight: syn ? wsum / syn : 0,
      meanDegree: neurons.length ? deg / neurons.length : 0, clustering: ccN ? cc / ccN : 0,
      largestCluster: e.largestCluster(), stageCounts, meanAxon: neurons.length ? axon / neurons.length : 0,
      meanDendrite: neurons.length ? dend / neurons.length : 0, meanRateHz: neurons.length ? rate / neurons.length : 0,
      bursts: e.activity ? e.activity.bursts : 0,
    };
  }

  function toSWC(e, c) {
    const N = e.N, lines = [`# Coverslip Neuron Engine v2 export · cell ${c.id} · type ${c.T.key} · t=${(e.t / 60).toFixed(1)} h`, '# id type x y z radius parent'];
    const sid = new Map(); let next = 1;
    const cx = N.x[c.nuc], cy = N.y[c.nuc];
    lines.push(`${next} 1 ${cx.toFixed(2)} ${cy.toFixed(2)} 0 ${c.rOut.toFixed(2)} -1`); const somaId = next++;
    const order = [];
    const visit = (id) => { order.push(id); for (const ch of e.neurites[id].children) visit(ch); };
    for (const id of c.neur) if (e.neurites[id].parent < 0) visit(id);
    for (const id of order) {
      const nr = e.neurites[id];
      const t = nr.ident === 2 ? 2 : (nr.apical ? 4 : 3);
      let parent = nr.parent < 0 ? somaId : (sid.get(nr.base) || somaId);
      for (const i of nr.nodes) {
        lines.push(`${next} ${t} ${N.x[i].toFixed(2)} ${N.y[i].toFixed(2)} 0 ${Math.max(0.1, N.w[i]).toFixed(2)} ${parent}`);
        sid.set(i, next); parent = next; next++;
      }
    }
    return lines.join('\n') + '\n';
  }

  // median time (h) at which cells first reached each Dotti stage
  function stageTiming(e) {
    const out = {};
    for (let s = 2; s <= 5; s++) {
      const ts = e.cells.filter((c) => !c.T.glia && c.stageT[s] >= 0).map((c) => (c.stageT[s] - c.born) / 60).sort((a, b) => a - b);
      out['stage' + s] = ts.length ? ts[ts.length >> 1] : null;
    }
    return out;
  }

  return { Morpho: { cellMetrics, populationMetrics, sholl, toSWC, stageTiming, IDENT } };
});
