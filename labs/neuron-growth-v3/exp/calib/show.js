const fs = require('fs'); const f = process.argv[2], q = process.argv[3];
const jobs = q ? Object.fromEntries(JSON.parse(fs.readFileSync(q)).map((j) => [j.id, j])) : {};
const med = (a) => { a = a.filter((x) => x != null).sort((x, y) => x - y); const n = a.length; return !n ? null : n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const g = {};
for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) { const r = JSON.parse(l); const k = r.id.replace(/_s\d+$/, ''); (g[k] = g[k] || []).push(r); }
const rows = [];
for (const k in g) {
  const rs = g[k], at = (r, h) => r.samples.find((s) => s.t >= h - 0.01) || {};
  const s3 = rs.map((r) => r.stageT[3]), s2 = rs.map((r) => r.stageT[2]);
  const last = rs[0].samples.at(-1).t;
  rows.push({ k, n: rs.length, s2: med(s2), s3: med(s3), s3n: s3.filter((x) => x != null).length, s3max: Math.max(...s3.map((x) => x == null ? 999 : x)),
    s4: med(rs.map((r) => r.stageT[4])), s5: med(rs.map((r) => r.stageT[5])),
    ax48: med(rs.map((r) => at(r, 48).axon)), ax96: med(rs.map((r) => at(r, 96).axon)), axEnd: med(rs.map((r) => r.samples.at(-1).axon)),
    deEnd: med(rs.map((r) => r.samples.at(-1).dend)), mi24: med(rs.map((r) => at(r, 24).minor)), maxD: med(rs.map((r) => Math.max(0, ...r.samples.at(-1).prim.filter((p) => p.ident === 3).map((p) => p.L)))),
    sw: rs.reduce((a, r) => a + ((r.extra && r.extra.switches) || 0), 0), Q: med(rs.map((r) => r.samples.at(-1).Q)), last,
    g: JSON.stringify((rs[0].job.genome || {})).replace(/"/g, '') + (rs[0].job.params ? ' p' + JSON.stringify(rs[0].job.params).replace(/"/g, '') : '') });
}
rows.sort((a, b) => (a.s3 ?? 999) - (b.s3 ?? 999));
for (const r of rows) console.log([r.k.padEnd(14), r.n, 's2', r.s2, 's3', r.s3, `(${r.s3n}, max ${r.s3max})`, 's4', r.s4, 's5', r.s5, 'ax48', r.ax48, 'ax96', r.ax96, 'axEnd', r.axEnd, 'dEnd', r.deEnd, 'maxD', r.maxD, 'Q', r.Q, 'sw', r.sw, r.g].join(' '));
