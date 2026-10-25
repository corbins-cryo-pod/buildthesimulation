import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { evaluateField, axisDiskField, clearFieldCache, fieldCacheStats } from '../../src/lib/retinal-implant/field.mjs';
const fixtures = JSON.parse(readFileSync('tests/fixtures/retinal-field/independent-reference.json'));
const error = {};
for (const interpolation of [false, true]) {
  let potential = 0, vectorField = 0, worstPotential = '', worstField = '';
  clearFieldCache();
  for (const f of fixtures.cases) {
    const a = evaluateField(f.sources, [f.point], { conductivitySm: f.conductivitySm, interpolation }), e = f.expected;
    const p = Math.abs(a.potentialMv[0] - e.potentialMv) / Math.max(1e-6, Math.abs(e.potentialMv));
    const v = Math.hypot(a.exVm[0] - e.exVm, a.eyVm[0] - e.eyVm, a.ezVm[0] - e.ezVm) / Math.max(1e-6, Math.hypot(e.exVm, e.eyVm, e.ezVm));
    if (p > potential) { potential = p; worstPotential = f.name; } if (v > vectorField) { vectorField = v; worstField = f.name; }
  }
  error[interpolation ? 'cached' : 'direct'] = { potential, vectorField, worstPotential, worstField };
}
function points(n, span = 7000) { return Array.from({ length: n*n }, (_, i) => ({ xUm: -span/2 + span*(i%n)/(n-1), yUm: span/2 - span*Math.floor(i/n)/(n-1), zUm: 0 })); }
function sources(rows, cols, pitch, radius, gap, current, ring = false) {
  const s = Array.from({ length: rows*cols }, (_, i) => ({ id: 'S'+i, xUm: ((i%cols)-(cols-1)/2)*pitch, yUm: ((rows-1)/2-Math.floor(i/cols))*pitch, zUm: gap, radiusUm: radius, currentUa: -current }));
  if (ring) for (let i = 0; i < 8; i++) s.push({ id: 'R'+i, xUm: 6000*Math.cos(i*Math.PI/4), yUm: 6000*Math.sin(i*Math.PI/4), zUm: gap, radiusUm: 250, currentUa: rows*cols*current/8 });
  else s.push({ id: 'R', xUm: 12000, yUm: 0, zUm: gap, radiusUm: 250, currentUa: rows*cols*current });
  return s;
}
const benchmarks = [];
for (const [label, sourceList, n] of [
  ['60 stimulating contacts, 61² grid', sources(6,10,575,112.5,200,80),61],
  ['60 stimulating contacts, 241² grid', sources(6,10,575,112.5,200,80),241],
  ['256 stimulating contacts + 8 returns, 241² stress case', sources(16,16,250,100,25,300,true),241],
]) {
  clearFieldCache(); const p = points(n), t0 = performance.now(), a = evaluateField(sourceList,p,{requireBalanced:true}), t1 = performance.now(), b = evaluateField(sourceList,p,{requireBalanced:true}), t2 = performance.now();
  let difference = 0;
  for (const key of ['potentialMv','exVm','eyVm','ezVm']) for (let i=0;i<p.length;i++) { if (!Number.isFinite(a[key][i])) throw new Error('Nonfinite benchmark output'); difference=Math.max(difference,Math.abs(a[key][i]-b[key][i])); }
  benchmarks.push({ label, sourceCount:sourceList.length, outputPoints:p.length, coldMs:t1-t0, repeatMs:t2-t1, repeatMaximumAbsoluteDifference:difference, currentBalanceUa:a.metadata.netCurrentUa, numerical:a.metadata, cache:fieldCacheStats() });
}
clearFieldCache();
const narrow = {id:'S',xUm:250,yUm:250,zUm:25,radiusUm:50,currentUa:80};
const sampled = evaluateField([narrow],points(61,10000)), exact = axisDiskField({currentUa:80,radiusUm:50,axialOffsetUm:-25,conductivitySm:.2});
let sampledPeak = 0;for(let i=0;i<61*61;i++)sampledPeak=Math.max(sampledPeak,Math.hypot(sampled.exVm[i],sampled.eyVm[i],sampled.ezVm[i]));
const report={schema:'retinal-field-numerical-report-v1',measuredAtUtc:new Date().toISOString(),node:process.version,referenceEnvironment:fixtures.referenceEnvironment,fixtureCases:fixtures.cases.length,maximumRelativeFixtureError:error,benchmarks,
  samplingExample:{source:narrow,grid:'61×61 over ±5000 µm',axisFieldVm:exact.fieldVm,sampledPeakVm:sampledPeak,sampledFractionOfAxis:sampledPeak/exact.fieldVm},
  interpretation:'Observed agreement with the stated mathematical model, not physiological validation or a universal error bound. Timing depends on host; dense cases can exceed the transfer cache.'};
mkdirSync('docs/retinal-implant',{recursive:true});writeFileSync('docs/retinal-implant/FIELD_NUMERICAL_REPORT.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
