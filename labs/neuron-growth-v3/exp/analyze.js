// Summaries for each experiment from results JSONL files.
//   node exp/analyze.js e1|e2|e3|e4|e5|e6|e7|perf
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, 'results');
const load = (f) => fs.existsSync(path.join(R, f)) ? fs.readFileSync(path.join(R, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const all = () => { const m = new Map(); for (const r of [...load('qA.jsonl'), ...load('qA2.jsonl'), ...load('qB.jsonl'), ...load('qC.jsonl'), ...load('qD.jsonl'), ...load('qE.jsonl'), ...load('qF.jsonl')]) m.set(r.id, r); return [...m.values()]; };
const q = (v, p) => { const s = v.filter((x) => x != null && !isNaN(x)).sort((a, b) => a - b); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return +(s[lo] + (s[hi] - s[lo]) * (i - lo)).toFixed(2); };
const med = (v) => q(v, 0.5);
const mean = (v) => { const s = v.filter((x) => x != null && !isNaN(x)); return s.length ? +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(3) : null; };
const sd = (v) => { const s = v.filter((x) => x != null && !isNaN(x)); if (s.length < 2) return null; const m = s.reduce((a, b) => a + b, 0) / s.length; return +Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / (s.length - 1)).toFixed(3); };
const summ = (v) => ({ n: v.filter((x) => x != null).length, med: med(v), q1: q(v, 0.25), q3: q(v, 0.75), min: q(v, 0), max: q(v, 1), mean: mean(v), sd: sd(v) });
const at = (r, h) => r.samples && r.samples.find((s) => Math.abs(s.t - h) < 0.6);

const A = {
  e1() {
    const rs = all().filter((r) => r.id.startsWith('e1_')).sort((a, b) => a.job.seed - b.job.seed);
    const out = { runs: rs.length };
    for (const s of [2, 3, 4, 5]) out['stage' + s] = summ(rs.map((r) => r.stageT[s]));
    out.reached5 = rs.filter((r) => r.stageT[5] != null).length;
    const d7 = rs.map((r) => at(r, 168)).filter(Boolean);
    for (const k of ['axon', 'dend', 'bp', 'primaries', 'maxOrder', 'Q', 'tips']) out['d7_' + k] = summ(d7.map((s) => s[k]));
    out.d7_dendPrimaries = summ(d7.map((s) => s.prim.filter((p) => p.ident === 3).length));
    out.d7_alive = d7.filter((s) => s.alive).length;
    out.perSeed = rs.map((r) => { const s = at(r, 168); return { seed: r.job.seed, s2: r.stageT[2], s3: r.stageT[3], s4: r.stageT[4], s5: r.stageT[5], axon: s && s.axon, dend: s && s.dend, prim: s && s.primaries, dprim: s && s.prim.filter((p) => p.ident === 3).length, bp: s && s.bp }; });
    out.curve = []; for (let h = 12; h <= 168; h += 12) { const ss = rs.map((r) => at(r, h)).filter(Boolean); out.curve.push({ h, axon: med(ss.map((s) => s.axon)), dend: med(ss.map((s) => s.dend)), minor: med(ss.map((s) => s.minor)), prim: med(ss.map((s) => s.primaries)), Q: med(ss.map((s) => s.Q)), dGrow: med(ss.map((s) => s.dGrow)), dRet: med(ss.map((s) => s.dRetract)), dTub: med(ss.map((s) => s.dTipTub)), dTips: med(ss.map((s) => s.dTips)) }); }
    return out;
  },
  e2() {
    const rs = all().filter((r) => r.id.startsWith('e2_'));
    const groups = {};
    for (const r of rs) {
      const k = `${r.job.stump}_${r.job.mode}`; (groups[k] = groups[k] || []).push(r);
    }
    const out = {};
    for (const k in groups) {
      const g = groups[k];
      out[k] = { n: g.length, errors: g.filter((r) => r.error).map((r) => r.error),
        sameAxon: g.filter((r) => !r.error && r.sameAxon).length, otherAxon: g.filter((r) => !r.error && !r.sameAxon && r.axonIdEnd >= 0).length, noAxon: g.filter((r) => !r.error && r.axonIdEnd < 0).length,
        respecH: summ(g.map((r) => r.respec && r.respec.h)),
        detail: g.filter((r) => !r.error).map((r) => {
          const stumpAfter = r.afterCut.prim.find((p) => p.id === r.cutId);
          const others = r.afterCut.prim.filter((p) => p.id !== r.cutId).map((p) => p.L);
          return { seed: r.job.seed, cutAt: r.cutAtH, stumpL: stumpAfter && stumpAfter.L, longestOther: Math.max(0, ...others), others, winner: r.axonIdEnd === r.cutId ? 'stump' : (r.axonIdEnd >= 0 ? 'other' : 'none'), respec: r.respec && r.respec.h, primsEnd: r.end.prim.length, endPrim: r.end.prim };
        }) };
    }
    return out;
  },
  e3() {
    const rs = all().filter((r) => r.id.startsWith('e3_'));
    const base = all().filter((r) => r.id.startsWith('e1_') && r.job.seed <= 4);
    const rows = [];
    const add = (param, val, g) => {
      const d4 = g.map((r) => at(r, 96)).filter(Boolean);
      const d3 = g.map((r) => at(r, 72)).filter(Boolean);
      rows.push({ param, val, n: g.length, s2: med(g.map((r) => r.stageT[2])), s3: med(g.map((r) => r.stageT[3])), s3min: q(g.map((r) => r.stageT[3]), 0), s3max: q(g.map((r) => r.stageT[3]), 1), axonBy3d: d3.filter((s) => s.stage >= 3).length, axonBy4d: g.filter((r) => r.stageT[3] != null && r.stageT[3] <= 96).length,
        axon4: med(d4.map((s) => s.axon)), other4: med(d4.map((s) => s.dend + s.minor)), long100: med(d4.map((s) => s.long100)), prim4: med(d4.map((s) => s.primaries)), Q4: med(d4.map((s) => s.Q)) });
    };
    const P = { supply: 1, tubActive: 0.45, polarity: 0.75, promoterBack: 1 };
    for (const k in P) {
      add(k, P[k], base);
      const vals = [...new Set(rs.filter((r) => r.job.params[k] != null).map((r) => r.job.params[k]))].sort((a, b) => a - b);
      for (const v of vals) add(k, v, rs.filter((r) => r.job.params[k] === v));
    }
    return rows.sort((a, b) => a.param.localeCompare(b.param) || a.val - b.val);
  },
  e4() {
    const rs = all();
    const stiff = {};
    for (const r of rs.filter((r) => r.id.startsWith('e4_drg_') || r.id.startsWith('e4_hip_'))) {
      const type = r.job.type, k = r.job.env.stiffness, last = r.samples.at(-1);
      const key = type + '|' + k; (stiff[key] = stiff[key] || []).push({ seed: r.job.seed, axon: last.axon, total: last.axon + last.dend + last.minor, stage: last.stage, s3: r.stageT[3], bp: last.bp });
    }
    const stiffRows = Object.entries(stiff).map(([key, v]) => { const [type, k] = key.split('|'); return { type, kPa: +k, n: v.length, axonMed: med(v.map((x) => x.axon)), axonMin: q(v.map((x) => x.axon), 0), axonMax: q(v.map((x) => x.axon), 1), totalMed: med(v.map((x) => x.total)), s3: med(v.map((x) => x.s3)), stage: med(v.map((x) => x.stage)) }; }).sort((a, b) => a.type.localeCompare(b.type) || a.kPa - b.kPa);
    const stripes = rs.filter((r) => r.id.startsWith('e4_stripes')).map((r) => Object.assign({ seed: r.job.seed }, r.measure));
    const turn = {};
    for (const r of rs.filter((r) => r.id.startsWith('e4_turn'))) { const c = r.id.split('_')[2]; (turn[c] = turn[c] || []).push(...r.measure.cells.map((x) => Object.assign({ seed: r.job.seed }, x))); }
    const turnRows = Object.entries(turn).map(([c, v]) => ({ cond: c, cells: v.length, axons: v.filter((x) => x.ident === 2).length, absBearingMed: med(v.map((x) => Math.abs(x.bearingAngle))), headingMed: med(v.map((x) => Math.abs(x.headingVsSource))), approachMed: med(v.map((x) => x.startDist - x.tipDist)), closerFrac: +(v.filter((x) => x.tipDist < x.startDist - 50).length / v.length).toFixed(2), lenMed: med(v.map((x) => x.len)), tipDistMed: med(v.map((x) => x.tipDist)) }));
    return { stiffRows, stripes, turnRows };
  },
  e5() {
    const rs = all();
    const dens = {};
    for (const r of rs.filter((r) => r.id.startsWith('e5_dens'))) { const n = r.job.count; (dens[n] = dens[n] || []).push(r); }
    const densRows = Object.entries(dens).map(([n, g]) => {
      const lastOf = (r) => r.series.at(-1), d2 = (r) => r.series.find((s) => Math.abs(s.h - 48) < 1);
      return { n: +n, runs: g.length, survive96: med(g.map((r) => lastOf(r).alive / r.job.count)), survive48: med(g.map((r) => d2(r).alive / r.job.count)), synPerCell96: med(g.map((r) => lastOf(r).synapses / Math.max(1, lastOf(r).alive))), syn48: med(g.map((r) => d2(r).synapses / Math.max(1, d2(r).alive))), degree96: med(g.map((r) => lastOf(r).meanDegree)), cluster96: med(g.map((r) => lastOf(r).largestCluster / Math.max(1, lastOf(r).alive))), troph48: med(g.map((r) => d2(r).meanTroph)), axon48: med(g.map((r) => d2(r).meanAxon)), series: g.map((r) => r.series.map((s) => [s.h, s.alive])) };
    }).sort((a, b) => a.n - b.n);
    const glia = rs.filter((r) => r.id.startsWith('e5_glia')).map((r) => Object.assign({ seed: r.job.seed, gliaEnd: r.series.at(-1).glia }, r.measure));
    const act = {};
    for (const r of rs.filter((r) => r.id.startsWith('e5_act'))) { const c = 'msp' + r.job.params.msp; (act[c] = act[c] || []).push(r); }
    const actRows = Object.entries(act).map(([c, g]) => ({ cond: c, series: g.map((r) => r.series.map((s) => ({ h: s.h, rate: s.meanRate, syn: s.synapses, bursts: s.bursts, w: s.meanWeight, deg: s.meanDegree }))) }));
    return { densRows, glia, actRows };
  },
  e6() {
    const rs = all().filter((r) => r.id.startsWith('e6_'));
    const base = all().filter((r) => r.id.startsWith('e1_') && r.job.seed <= 4);
    const row = (name, g) => { const d7 = g.map((r) => at(r, 168)); const d5 = g.map((r) => at(r, 120)); return { name, n: g.length, s3: med(g.map((r) => r.stageT[3])), dend7: med(d7.map((s) => s.dend)), dendMin: q(d7.map((s) => s.dend), 0), dendMax: q(d7.map((s) => s.dend), 1), axon7: med(d7.map((s) => s.axon)), axonMin: q(d7.map((s) => s.axon), 0), axonMax: q(d7.map((s) => s.axon), 1), bp7: med(d7.map((s) => s.bp)), order7: med(d7.map((s) => s.maxOrder)), Q7: med(d7.map((s) => s.Q)), Q5: med(d5.map((s) => s.Q)), dTub7: med(d7.map((s) => s.dTipTub)), prim7: med(d7.map((s) => s.primaries)) }; };
    const out = [row('baseline', base)];
    const names = [...new Set(rs.map((r) => r.id.split('_')[1]))];
    for (const nme of names) out.push(row(nme, rs.filter((r) => r.id.split('_')[1] === nme)));
    return out;
  },
  e7() {
    const rs = all().filter((r) => r.id.startsWith('e7_'));
    const base = all().filter((r) => r.id.startsWith('e1_') && r.job.seed <= 4);
    const row = (dt, g) => { const d5 = g.map((r) => at(r, 120)); return { dt, n: g.length, s2: med(g.map((r) => r.stageT[2])), s3: med(g.map((r) => r.stageT[3])), s3list: g.map((r) => r.stageT[3]), axon5: med(d5.map((s) => s.axon)), dend5: med(d5.map((s) => s.dend)), bp5: med(d5.map((s) => s.bp)), msPerStep: med(g.map((r) => r.msPerStep)) }; };
    const out = [row(0.05, base)];
    for (const dt of [...new Set(rs.map((r) => r.job.params.dt))].sort((a, b) => a - b)) out.push(row(dt, rs.filter((r) => r.job.params.dt === dt)));
    return out.sort((a, b) => a.dt - b.dt);
  },
  perf() { return all().filter((r) => r.id.startsWith('perf_')).map((r) => ({ id: r.id, count: r.job.count, ms: +r.msPerStep.toFixed(3), simMinPerSec: +r.simMinPerSec.toFixed(1), nodes: r.nodes, cells: r.cells, neurites: r.neurites, probes: r.probes, dt: r.dt })).sort((a, b) => a.count - b.count); },
};
const key = process.argv[2];
console.log(JSON.stringify(A[key](), null, 1));
