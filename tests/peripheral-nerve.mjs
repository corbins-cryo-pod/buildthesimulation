import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, MODEL, PRESETS, makeAnatomy, makeContacts, makeCable, fieldAt, greenMvPerUa, laplacian, pulseAverage, solvePassive, calculateExperiment, validateParameters, experimentDocument, parseExperiment } from '../src/lib/peripheral-nerve/model.js';

const close = (a, b, abs = 1e-9) => assert.ok(Math.abs(a - b) < abs, `${a} differs from ${b} by ${Math.abs(a-b)} (limit ${abs})`);
test('seeded fascicles and fibers reproduce and remain disjoint and contained', () => {
  for (const diameter of [1, 2, 4]) for (const seed of [0, 1871, 4294967295]) {
    const p = { ...DEFAULTS, diameter, seed }, a = makeAnatomy(p);
    assert.deepEqual(a, makeAnatomy(p)); assert.equal(a.fibers.length, 168);
    for (const f of a.fascicles) {
      assert.ok(Math.hypot(f.x, f.y) + f.r < a.radius);
      for (const g of a.fascicles) if (f.id !== g.id) assert.ok(Math.hypot(f.x-g.x,f.y-g.y) > f.r+g.r);
    }
    for (const f of a.fibers) {
      const fascia = a.fascicles[f.fascicle];
      assert.ok(Math.hypot(f.x-fascia.x,f.y-fascia.y)+f.diameterUm/2000 < fascia.r);
      for (const g of a.fibers) if (f.id !== g.id) assert.ok(Math.hypot(f.x-g.x,f.y-g.y) > (f.diameterUm+g.diameterUm)/2000);
    }
  }
});
test('isotropic unregularized point source agrees with SI 1/(4πσr)', () => {
  const p = {x:1,y:2,z:3}, o = {x:0,y:0,z:0}, sigma=.3;
  close(greenMvPerUa(p,o,sigma,sigma,0),1/(4*Math.PI*sigma*Math.sqrt(14)));
  close(greenMvPerUa(p,o,.2,.6),greenMvPerUa(o,p,.2,.6));
  close(greenMvPerUa({x:2,y:0,z:0},o,.2,.6),greenMvPerUa({x:0,y:2,z:0},o,.2,.6));
});
test('each distributed source integrates to its assigned current; local returns balance', () => {
  for (const preset of PRESETS) {
    const p={...DEFAULTS,...preset.values}, contacts=makeContacts(p);
    for(const c of contacts) close(c.samples.reduce((s,q)=>s+q.fraction,0),1);
    close(contacts.reduce((s,c)=>s+c.weight,0),p.layout==='intra'?-1:0);
  }
});
test('finite ring on-axis agrees with independently integrated asinh expression', () => {
  const p={...DEFAULTS,layout:'bipolar',sigmaT:.3,sigmaL:.3}, c=makeContacts(p,128)[0], z=.7;
  const a=Math.sqrt(c.r*c.r+MODEL.coreMm**2), w=c.width, center=c.z;
  const integral=(Math.asinh((center+w/2-z)/a)-Math.asinh((center-w/2-z)/a))/(4*Math.PI*.3*w);
  close(fieldAt({x:0,y:0,z},[c],p),p.amplitude*c.weight*integral,2e-5);
});
test('ring sources are rotation invariant and bipolar field is antisymmetric', () => {
  const p={...DEFAULTS,layout:'bipolar'}, contacts=makeContacts(p);
  close(fieldAt({x:.2,y:.3,z:0},contacts,p),0);
  close(fieldAt({x:.2,y:.3,z:1},contacts,p),-fieldAt({x:.2,y:.3,z:-1},contacts,p));
  close(fieldAt({x:.2,y:.3,z:1},contacts,p),fieldAt({x:-.3,y:.2,z:1},contacts,p),1e-8);
});
test('pulse edge integration is charge-balanced even across nonaligned timesteps', () => {
  const p={...DEFAULTS,width:.137,gap:.033};
  let total=0, cathodic=0;
  for(let t=0;t<MODEL.endMs;t+=.007){const b=Math.min(t+.007,MODEL.endMs),v=pulseAverage(t,b,p);total+=v*(b-t);if(v>0)cathodic+=v*(b-t);}
  close(total,0);close(cathodic,p.width);
});
test('sealed cable has no response to uniform potential or zero current', () => {
  const c=makeCable(makeAnatomy().fibers[0]);
  const r=solvePassive(c,Float64Array.from(c.z,()=>400),DEFAULTS);
  assert.ok(r.voltages.every(v=>v===0));assert.equal(r.peak,0);
  assert.equal(calculateExperiment({...DEFAULTS,amplitude:0}).response.peak,0);
});
test('field offset is a gauge; response scales linearly and reverses with field sign', () => {
  const r=calculateExperiment(DEFAULTS),c=r.cable;
  for(const [factor,offset] of [[1,100],[2,0],[-1,0]]) {
    const other=solvePassive(c,Float64Array.from(r.field,v=>v*factor+offset),DEFAULTS);
    other.voltages.forEach((v,i)=>close(v,r.response.voltages[i]*factor,2e-6));
  }
});
// Independent continuous-time modal solution: sealed path-graph eigenvectors
// cos(m*pi*(i+1/2)/N), eigenvalues -4*sin²(m*pi/(2N)). No tridiagonal solver.
function modalReference(c,field,p,t) {
  const n=field.length, out=new Float64Array(n), intervals=[[.1,.1+p.width,1],[.1+p.width+p.gap,.1+2*p.width+p.gap,-1]];
  for(let m=0;m<n;m++) {
    const eigen=-4*Math.sin(m*Math.PI/(2*n))**2;
    const basis=Array.from({length:n},(_,i)=>Math.cos(m*Math.PI*(i+.5)/n));
    const norm=m?2/n:1/n, coefficient=field.reduce((s,v,i)=>s+v*basis[i],0)*norm;
    const rate=(c.leakUs-c.axialUs*eigen)/c.capacitanceNf, force=c.axialUs*eigen*coefficient/c.capacitanceNf;
    let response=0;
    for(const [a,b,sign] of intervals) if(t>a){const end=Math.min(t,b);response+=sign*force/rate*(Math.exp(-rate*(t-end))-Math.exp(-rate*(t-a)));}
    out.forEach((_,i)=>{out[i]+=response*basis[i];});
  }
  return out;
}
test('passive cable converges to independent continuous-time spectral solution', () => {
  const n=19,c={z:Array.from({length:n},(_,i)=>i*.5),capacitanceNf:.002,leakUs:.001,axialUs:.005};
  const field=Float64Array.from(c.z,z=>-2/Math.sqrt((z-4)**2+.2));
  const errors=[];
  for(const dt of [.002,.001,.0005]) {
    const p={...DEFAULTS,dt},r=solvePassive(c,field,p);let error=0;
    for(const t of [.2,.3,.4,.55,1.2]){const index=Math.round(t/dt), exact=modalReference(c,field,p,t);exact.forEach((v,i)=>error=Math.max(error,Math.abs(v-r.voltages[index*n+i])));}
    errors.push(error);
  }
  assert.ok(errors[1]<errors[0]*.55);assert.ok(errors[2]<errors[1]*.55);assert.ok(errors[2]<.002,JSON.stringify(errors));
});
test('spatial drive conserves total current including sealed ends', () => {
  const v=[4,9,-3,12,5];close(Array.from(laplacian(v)).reduce((s,x)=>s+x,0),0);
  const r=calculateExperiment(DEFAULTS),n=r.response.count;
  for(let frame=0;frame<r.response.times.length;frame++) {
    close(Array.from(r.response.voltages.subarray(frame*n,(frame+1)*n)).reduce((s,x)=>s+x,0),0,1e-6);
  }
});
test('preset quadrature and timestep refinement keep default peak within 1 percent', () => {
  for(const preset of PRESETS){const p={...DEFAULTS,...preset.values},r=calculateExperiment(p),q=calculateExperiment({...p,dt:.0005},0,{order:128});assert.ok(Math.abs(r.response.peak-q.response.peak)/q.response.peak<.01,`${p.layout}: ${r.response.peak} vs ${q.response.peak}`);}
});
test('finite source and cable remain finite at parameter extremes', () => {
  for(const layout of ['directional','bipolar','tripolar','intra']) {
    const r=calculateExperiment({...DEFAULTS,layout,diameter:1,clearance:.05,intraX:0,intraY:0,amplitude:100,sigmaT:.05,sigmaL:.05,width:.4,gap:.2},167);
    assert.ok(r.response.voltages.every(Number.isFinite));
  }
});
test('experiments round-trip to identical anatomy and membrane traces', () => {
  const r=calculateExperiment({...DEFAULTS,layout:'tripolar',seed:11},63),doc=parseExperiment(JSON.stringify(experimentDocument(r))), restored=calculateExperiment(doc.parameters,doc.selectedFiber);
  assert.deepEqual(restored.anatomy,r.anatomy);assert.deepEqual(restored.response.voltages,r.response.voltages);
});
test('malformed and foreign files cannot silently alter the experiment', () => {
  for(const input of [null,[],{amplitude:NaN},{seed:-1},{dt:.1},{layout:'other'},{layout:'intra',intraX:1.8,intraY:1.8},{layout:'intra',intraX:.3,intraY:.2}]) assert.throws(()=>validateParameters(input));
  for(const input of ['{}','not json','x'.repeat(17000),JSON.stringify({schema:'bts-peripheral-sandbox',version:1}),JSON.stringify({schema:'bts-peripheral-nerve',version:'1.0.0',parameters:{},selectedFiber:0})]) assert.throws(()=>parseExperiment(input));
});
test('new laboratory and historical original both remain discoverable', () => {
  const data=readFileSync(new URL('../src/data/simulations.js',import.meta.url),'utf8');
  assert.match(data,/\/simulations\/peripheral-nerve\//);assert.match(data,/The First Simulation/);assert.match(data,/"href": "\/sim\/"/);
  const old=readFileSync(new URL('../src/pages/sim.astro',import.meta.url),'utf8');assert.match(old,/stim amplitude|Stim amplitude/);
});
