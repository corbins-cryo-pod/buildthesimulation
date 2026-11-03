// v3 validation summaries, side by side with the v2 runs of the same experiment.
//   node exp/analyze3.js v1|v2|v4|v5|v7|perf
const fs = require('fs'), path = require('path');
const R3 = path.join(__dirname, 'results'), R2 = path.join(__dirname, '../../neurosim2/exp/results');
const load = (dir, f) => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const uniq = (rows) => { const m = new Map(); for (const r of rows) m.set(r.id, r); return [...m.values()]; };
const v3 = () => uniq([...load(R3, 'v3a.jsonl'), ...load(R3, 'v3b.jsonl'), ...load(R3, 'v3d.jsonl'), ...load(R3, 'v3e.jsonl'), ...load(R3, 'v3f.jsonl')]);   // v3d = hippocampal and stiffness runs repeated on the final engine (overrides v3a and the v4 stiffness rows of v3b)
const v2 = () => uniq([...load(R2, 'qA.jsonl'), ...load(R2, 'qA2.jsonl'), ...load(R2, 'qB.jsonl'), ...load(R2, 'qD.jsonl'), ...load(R2, 'qE.jsonl')]);
const q = (v, p) => { const s = v.filter((x) => x != null && !isNaN(x)).sort((a, b) => a - b); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return +(s[lo] + (s[hi] - s[lo]) * (i - lo)).toFixed(2); };
const med = (v) => q(v, 0.5);
const mean = (v) => { const s = v.filter((x) => x != null && !isNaN(x)); return s.length ? +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2) : null; };
const at = (r, h) => r.samples && r.samples.find((s) => Math.abs(s.t - h) < 0.6);
const corr = (x, y) => { const n = x.length, mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return +(a / Math.sqrt(b * c)).toFixed(2); };
const rng = (v) => [q(v, 0), q(v, 1)];

function cellStats(rs) {
  const d4 = rs.map((r) => at(r, 96)), d5 = rs.map((r) => at(r, 120)), d7 = rs.map((r) => at(r, 168));
  const dprim = (s) => s.prim.filter((p) => p.ident === 3).map((p) => p.L);
  const axPrim = (s) => Math.max(0, ...s.prim.filter((p) => p.ident === 2).map((p) => p.L));
  const s3 = rs.map((r) => r.stageT[3]);
  return {
    n: rs.length,
    s2: { med: med(rs.map((r) => r.stageT[2])), mean: mean(rs.map((r) => r.stageT[2])), range: rng(rs.map((r) => r.stageT[2])) },
    s3: { med: med(s3), mean: mean(s3), range: rng(s3), in8to30: s3.filter((x) => x != null && x >= 8 && x <= 30).length },
    s3decided: rs[0].extra ? { med: med(rs.map((r) => r.extra.decided)), range: rng(rs.map((r) => r.extra.decided)) } : null,
    s4: { med: med(rs.map((r) => r.stageT[4])), range: rng(rs.map((r) => r.stageT[4])), afterAxon: med(rs.map((r) => r.stageT[4] - r.stageT[3])), afterAxonRange: rng(rs.map((r) => r.stageT[4] != null ? r.stageT[4] - r.stageT[3] : null)), exact60: rs.filter((r) => r.stageT[4] != null && Math.abs(r.stageT[4] - r.stageT[3] - 60) < 0.05).length },
    s5: { med: med(rs.map((r) => r.stageT[5])), range: rng(rs.map((r) => r.stageT[5])), reached: rs.filter((r) => r.stageT[5] != null).length },
    axon4: med(d4.map((s) => s.axon)), axon7: { med: med(d7.map((s) => s.axon)), range: rng(d7.map((s) => s.axon)) },
    dend4: med(d4.map((s) => s.dend)), dend7: { med: med(d7.map((s) => s.dend)), range: rng(d7.map((s) => s.dend)) },
    dendGrowth5to7PerDendrite: med(rs.map((r, i) => { const a = d5[i], b = d7[i]; const n = dprim(b).length; return n ? (b.dend - a.dend) / 2 / n : null; })),
    longestDend7: { med: med(d7.map((s) => Math.max(0, ...dprim(s)))), range: rng(d7.map((s) => Math.max(0, ...dprim(s)))) },
    perDend7: med(d7.flatMap((s) => dprim(s))),
    nDend7: { med: med(d7.map((s) => dprim(s).length)), range: rng(d7.map((s) => dprim(s).length)) },
    axonOverLongestDend7: { med: med(d7.map((s) => axPrim(s) / Math.max(1, ...dprim(s)))), min: q(d7.map((s) => axPrim(s) / Math.max(1, ...dprim(s))), 0) },
    rAxonDend7: corr(d7.map((s) => s.axon), d7.map((s) => s.dend)),
    Q7: med(d7.map((s) => s.Q)), dTipTub7: med(d7.map((s) => s.dTipTub)), bp7: med(d7.map((s) => s.bp)),
    switches: rs.reduce((a, r) => a + ((r.extra && r.extra.switches) || 0), 0),
    minor24: med(rs.map((r) => at(r, 24).minor)), prim24: { med: med(rs.map((r) => at(r, 24).primaries)), range: rng(rs.map((r) => at(r, 24).primaries)) },
    curve: [24, 48, 72, 96, 120, 144, 168].map((h) => ({ h, axon: med(rs.map((r) => at(r, h).axon)), dend: med(rs.map((r) => at(r, h).dend)), minor: med(rs.map((r) => at(r, h).minor)), Q: med(rs.map((r) => at(r, h).Q)) })),
  };
}

const A = {
  v1() {
    return { v3: cellStats(v3().filter((r) => r.id.startsWith('v1_'))), v2: cellStats(v2().filter((r) => r.id.startsWith('e1_'))) };
  },
  v2() {
    const out = {};
    for (const [ver, rs, pre] of [['v3', v3(), 'v2_'], ['v2', v2(), 'e2_']]) {
      const g = {};
      for (const r of rs.filter((r) => r.id.startsWith(pre))) { const k = `${r.job.stump}_${r.job.mode}`; (g[k] = g[k] || []).push(r); }
      out[ver] = Object.fromEntries(Object.entries(g).map(([k, gg]) => {
        const ok = gg.filter((r) => !r.error);
        const det = ok.map((r) => {
          const st = r.afterCut.prim.find((p) => p.id === r.cutId), others = r.afterCut.prim.filter((p) => p.id !== r.cutId).map((p) => p.L);
          return { seed: r.job.seed, stumpL: st && st.L, longestOther: Math.max(0, ...others), stumpLongest: st && st.L > Math.max(0, ...others), winner: r.axonIdEnd === r.cutId ? 'stump' : r.axonIdEnd >= 0 ? 'other' : 'none', respec: r.respec && r.respec.h, switches: r.switches };
        });
        return [k, { n: gg.length, errors: gg.filter((r) => r.error).map((r) => r.error), stump: det.filter((d) => d.winner === 'stump').length, other: det.filter((d) => d.winner === 'other').length, none: det.filter((d) => d.winner === 'none').length,
          longestWon: det.filter((d) => (d.winner === 'stump') === d.stumpLongest).length, respecMed: med(det.map((d) => d.respec)), respecRange: rng(det.map((d) => d.respec)), detail: det }];
      }));
    }
    return out;
  },
  v7() {
    const rows = (rs, base, pre) => {
      const g = { 0.05: base };
      for (const r of rs.filter((r) => r.id.startsWith(pre))) (g[r.job.params.dt] = g[r.job.params.dt] || []).push(r);
      return Object.entries(g).map(([dt, gg]) => ({ dt: +dt, n: gg.length, s3: med(gg.map((r) => r.stageT[3])), axon5mean: mean(gg.map((r) => at(r, 120).axon)), axon5range: rng(gg.map((r) => at(r, 120).axon)), dend5mean: mean(gg.map((r) => at(r, 120).dend)), ms: med(gg.map((r) => r.msPerStep)), wall: med(gg.map((r) => r.wallS)) })).sort((a, b) => a.dt - b.dt);
    };
    const R3s = v3(), R2s = v2();
    return { v3: rows(R3s, R3s.filter((r) => /^v1_s[1-4]$/.test(r.id)), 'v7_'), v2: rows(R2s, R2s.filter((r) => /^e1_s[1-4]$/.test(r.id)), 'e7_') };
  },
  v4() {
    const stiff = (rs, pre) => {
      const g = {};
      for (const r of rs.filter((r) => r.id.startsWith(pre + 'drg_') || r.id.startsWith(pre + 'hip_'))) { const k = r.job.type + '|' + r.job.env.stiffness; (g[k] = g[k] || []).push(r.samples.at(-1).axon); }
      return Object.entries(g).map(([k, v]) => { const [type, kPa] = k.split('|'); return { type, kPa: +kPa, n: v.length, axonMed: med(v), range: rng(v) }; }).sort((a, b) => a.type.localeCompare(b.type) || a.kPa - b.kPa);
    };
    const turn = {};
    for (const r of v3().filter((r) => r.id.startsWith('v4_turn'))) { const c = r.id.split('_')[2]; (turn[c] = turn[c] || []).push(...r.measure.cells.filter((x) => x.ident === 2).map((x) => Object.assign({ seed: r.job.seed }, x))); }
    const turnRows = Object.entries(turn).map(([c, v]) => ({ cond: c, axons: v.length, turnTowardMed: med(v.map((x) => x.turnToward)), turnTowardMean: mean(v.map((x) => x.turnToward)), towardFrac: +(v.filter((x) => x.turnToward > 0).length / v.length).toFixed(2), tipTurnMed: med(v.map((x) => x.tipTurnToward)), srcBearingMed: med(v.map((x) => Math.abs(x.srcBearing))), lenMed: med(v.map((x) => x.len)), list: v.map((x) => x.turnToward) }));
    return { v3stiff: stiff(v3(), 'v4_'), v2stiff: stiff(v2(), 'e4_'), turnRows };
  },
  v5() {
    const dens = (rs, pre) => {
      const g = {};
      for (const r of rs.filter((r) => r.id.startsWith(pre))) (g[r.job.count] = g[r.job.count] || []).push(r);
      return Object.entries(g).map(([n, gg]) => {
        const fin = (r) => r.series.at(-1), s48 = (r) => r.series.find((s) => Math.abs(s.h - 48) < 1);
        // deaths per 12 h bin, summed over runs
        const bins = {}; for (const r of gg) { let prev = 0; for (const s of r.series) { const b = Math.ceil(s.h / 12) * 12; bins[b] = (bins[b] || 0) + (s.deaths - prev); prev = s.deaths; } }
        return { n: +n, runs: gg.length, survive96: med(gg.map((r) => fin(r).alive / r.job.count)), survive48: med(gg.map((r) => s48(r).alive / r.job.count)), deathBins: bins };
      }).sort((a, b) => a.n - b.n);
    };
    const R3s = v3(), R2s = v2();
    const glia = (rs, pre) => {
      const g = rs.filter((r) => r.id.startsWith(pre)).map((r) => Object.assign({ seed: r.job.seed }, r.measure));
      const L = g.reduce((a, x) => a + x.leftAlive, 0), Lp = g.reduce((a, x) => a + x.leftPlated, 0), Rr = g.reduce((a, x) => a + x.rightAlive, 0), Rp = g.reduce((a, x) => a + x.rightPlated, 0);
      const diffs = g.map((x) => x.leftAlive / x.leftPlated - x.rightAlive / x.rightPlated), md = mean(diffs);
      const sdv = Math.sqrt(diffs.reduce((a, d) => a + (d - md) ** 2, 0) / Math.max(1, diffs.length - 1));
      return { seeds: g.length, astro: [L, Lp, +(L / Lp).toFixed(3)], bare: [Rr, Rp, +(Rr / Rp).toFixed(3)], betterSeeds: diffs.filter((d) => d > 0).length, meanDiff: md, t: +(md / (sdv / Math.sqrt(diffs.length))).toFixed(2), perSeed: g };
    };
    const feed = {};
    for (const r of R3s.filter((r) => r.id.startsWith('v5_feed'))) (feed[r.job.params.feeder] = feed[r.job.params.feeder] || []).push(+(r.series.at(-1).alive / r.job.count).toFixed(3));
    return { v3dens: dens(R3s, 'v5_dens'), v2dens: dens(R2s, 'e5_dens'), v3glia: glia(R3s, 'v5_glia_'), v3gliaContact: glia(R3s, 'v5_gliaContact'), v2glia: glia(R2s, 'e5_glia'), feeder: feed };
  },
  perf() {
    const p = (rs) => rs.filter((r) => r.id.startsWith('perf_')).map((r) => ({ count: r.job.count, ms: +r.msPerStep.toFixed(2), simMinPerSec: +r.simMinPerSec.toFixed(1), weekMin: +(10080 / r.simMinPerSec / 60).toFixed(1) })).sort((a, b) => a.count - b.count);
    return { v3: p(v3()), v2: p(v2()) };
  },
};
const key = process.argv[2];
const res = A[key]();
console.log(JSON.stringify(res, (k, v) => (k === 'list' || k === 'detail' || k === 'perSeed') && process.argv[3] !== 'full' ? undefined : v, 1));
