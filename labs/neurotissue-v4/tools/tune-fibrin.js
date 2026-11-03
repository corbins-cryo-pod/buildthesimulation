// Standalone field-only tuning diagnostic; not the complete coupled conduit model.
// Field-only tuning of the conduit chemistry: exudate from the stump faces -> fibrin cable.
// usage: node tools/tune-fibrin.js '{"exD":4000,"exDecay":0.00064,...}'
const { Tube } = require('../engine/space.js');
const o = Object.assign({ exD: 4000, exDecay: 1 / 1560, exSrc: 0.02, exTau: 4, kF: 0.004, exThr: 0.2 }, JSON.parse(process.argv[2] || '{}'));
const gaps = o.gaps || [6, 8, 10, 12, 15];
for (const g of gaps) {
  const gap = g * 1000, Lp = 1500, Ld = 2000, L = Lp + gap + Ld, R = 400;
  const sp = new Tube(L, R, { fieldRes: 50 });
  const ex = sp.addField({ name: 'exudate', D: o.exD, decay: o.exDecay });
  const fib = sp.addField({ name: 'fibrin', kind: 'matrix', max: 1 });
  fib.fillWhere((x) => x < Lp || x > Lp + gap, 1);
  ex.srcWhere((x) => Math.abs(x - Lp) < 60 || Math.abs(x - (Lp + gap)) < 60, o.exSrc);
  const tau = o.exTau * 1440, dtF = 5; let t = 0; const out = [];
  for (let day = 1; day <= (o.days || 14); day++) {
    while (t < day * 1440) {
      t += dtF;
      for (let q = 0; q < fib.c.length; q++) { if (!fib.mask[q]) continue; const E = ex.c[q] - o.exThr; if (E > 0) fib.c[q] += (1 - fib.c[q]) * -Math.expm1(-o.kF * E * dtF); }
      ex.update(dtF, 3, Math.exp(-(t-dtF/2) / tau)); fib.update(dtF, 3, 1);
    }
    let fmin = 1, emid = ex.profileX(Lp + gap / 2), eface = ex.profileX(Lp + 25);
    for (let x = Lp + 25; x < Lp + gap; x += 50) fmin = Math.min(fmin, fib.profileX(x));
    if ([1, 2, 3, 5, 7, 10, 14].includes(day)) out.push(`d${day} fmin ${fmin.toFixed(3)} Emid ${emid.toFixed(3)} Eface ${eface.toFixed(3)}`);
  }
  console.log(`gap ${g} mm: ` + out.join(' | '));
}
