import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_CONFIG, PRESETS, MODEL_VERSION, normalizeConfig, simulate, sampleAt, sampleFieldsAt, axonAt, localMyelin, runEnsemble, runSensitivity } from '../src/lib/nerve-regeneration/model.mjs';
const small={axonCount:24,durationDays:120};
const lastX=a=>a.path.at(-1)?.x||0;
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} versus ${b}; tolerance ${tol}`);
const ideal={referenceMode:true,axonCount:8,gapMm:5,distalMm:15,elongationMmDay:1.7,growthLagDays:2.3,durationDays:30,alignment:1};

test('input normalization rejects nonfinite values and unsafe enum choices',()=>{
  const c=normalizeConfig({gapMm:Infinity,distalMm:-20,axonCount:999,seed:-1,repair:'invalid',injury:'invalid',alignment:NaN});
  assert.equal(c.gapMm,DEFAULT_CONFIG.gapMm);assert.equal(c.distalMm,5);assert.equal(c.axonCount,512);assert.equal(c.seed,0);assert.equal(c.repair,'conduit');assert.equal(c.alignment,DEFAULT_CONFIG.alignment);
});
test('crush uses preserved zero-gap tracks and has no repair-delay clock',()=>{const c=normalizeConfig({injury:'crush',gapMm:20,delayDays:90,repair:'graft',alignment:0});assert.equal(c.gapMm,0);assert.equal(c.delayDays,0);assert.equal(c.repair,'none');assert.equal(c.alignment,1);});
test('direct repair represents apposition rather than silently spanning an open gap',()=>{assert.equal(normalizeConfig({repair:'direct',gapMm:20}).gapMm,0);});
test('species label alone cannot turn rodent assumptions into a human calibration',()=>{const a=simulate({...small,species:'rat'}),b=simulate({...small,species:'human-exploratory'});assert.deepEqual(a.axons,b.axons);assert.deepEqual(a.samples,b.samples);assert.equal(a.diagnostics.calibrated,false);});
test('same seed and configuration reproduce the entire model result exactly',()=>{assert.deepEqual(simulate(small),simulate(small));});
test('different seeds generate distinct representative cohorts',()=>{const a=simulate({...small,seed:10}),b=simulate({...small,seed:11});assert.notDeepEqual(a.axons.map(x=>x.speedMmDay),b.axons.map(x=>x.speedMmDay));});
test('ideal constant-speed limit matches exact distance, distal-entry and arrival times',()=>{
  const r=simulate(ideal),entry=ideal.growthLagDays+ideal.gapMm/ideal.elongationMmDay,arrival=ideal.growthLagDays+(ideal.gapMm+ideal.distalMm)/ideal.elongationMmDay;
  for(const a of r.axons){close(a.entryDay,entry);close(a.arrivalDay,arrival);for(const t of [0,2.2,2.3,4.7,9.11,15.9,30])close(axonAt(a,t,r.config).x,Math.min(20,Math.max(0,t-2.3)*1.7));}
});
test('zero elongation creates no distal entry, no target arrival and no new myelin',()=>{const r=simulate({...small,elongationMmDay:0});assert.equal(r.summary.distalEntry,0);assert.equal(r.summary.arrived,0);for(const a of r.axons){assert.equal(lastX(a),0);assert.equal(localMyelin(a,0,120,r.config),0);}});
test('zero supportive state prevents advance in the reduced-order growth equation',()=>{const r=simulate({...small,schwannSupport:0});assert.ok(r.axons.every(a=>lastX(a)===0));assert.equal(r.summary.arrived,0);});
test('event counts are integer and inclusive at exact events between daily samples',()=>{
  const r=simulate(ideal),t=r.axons[0].entryDay;assert.equal(sampleAt(r,t-1e-8).distalEntry,0);assert.equal(sampleAt(r,t).distalEntry,8);for(const t of [1.13,7.37,20.26])for(const k of ['distalEntry','arrived','correctlyRouted','correctlyEntered','active','stalled','waiting'])assert.ok(Number.isInteger(sampleAt(r,t)[k]));
});
test('all trajectories are finite, monotone in time and longitudinal distance, and bounded',()=>{
  const r=simulate({...small,alignment:.15,gapMm:20,radiusMm:2});for(const a of r.axons){let t=-1,x=-1;for(const p of a.path){for(const v of Object.values(p))assert.ok(Number.isFinite(v));assert.ok(p.t>=t&&p.x>=x);assert.ok(p.x<=r.geometry.totalMm);assert.ok(Math.hypot(p.y,p.z)<=r.config.radiusMm);t=p.t;x=p.x;}}
});
test('nonuniform mesh resolves a 1 mm bridge with a 500 mm distal pathway',()=>{const r=simulate({...small,gapMm:1,distalMm:500,durationDays:2});assert.ok(r.fields.xMm.includes(1));assert.ok(r.fields.xMm.filter(x=>x<1).length>=7);assert.equal(r.fields.xMm.at(-1),501);for(let i=1;i<r.fields.xMm.length;i++)assert.ok(r.fields.xMm[i]>r.fields.xMm[i-1]);});
test('reaction states conserve disconnected axon material across fragmentation and clearance',()=>{
  const r=simulate({...small,durationDays:45});for(const s of r.fields.samples)for(let i=0;i<r.fields.xMm.length;i++){const total=r.fields.xMm[i]<r.config.gapMm?0:1;close(s.intact[i]+s.debris[i]+s.cleared[i],total,1e-12);for(const key of ['intact','debris','cleared','macrophage','schwann','vascular','scar'])assert.ok(s[key][i]>=0&&s[key][i]<=1);}
});
test('degeneration produces debris before clearance instead of starting with an empty distal stump',()=>{const r=simulate({...small,durationDays:30}),i=r.fields.xMm.length-1;assert.equal(r.fields.samples[0].intact[i],1);assert.equal(r.fields.samples[0].debris[i],0);assert.ok(r.fields.samples[4].debris[i]>.3);assert.ok(r.fields.samples[30].debris[i]<r.fields.samples[4].debris[i]);});
test('unrepaired transection never credits local sprouts as distal reinnervation',()=>{const r=simulate({...small,repair:'none',delayDays:90});assert.equal(r.config.delayDays,0);assert.equal(r.summary.distalEntry,0);assert.equal(r.summary.arrived,0);assert.ok(r.axons.some(a=>lastX(a)>0));assert.ok(r.axons.every(a=>lastX(a)<r.config.gapMm));});
test('repair beyond the observation horizon has no bridge support or axon advance',()=>{const r=simulate({...small,repair:'graft',delayDays:150,durationDays:100});assert.ok(r.axons.every(a=>lastX(a)===0));const bridge=r.fields.xMm.map((x,i)=>x<r.config.gapMm?i:-1).filter(i=>i>=0);for(const s of r.fields.samples)assert.ok(bridge.every(i=>s.schwann[i]===0));});
test('delayed repair never credits growth or entry before the repair date',()=>{const r=simulate({...small,repair:'graft',delayDays:30});for(const a of r.axons){assert.ok(a.entryDay===null||a.entryDay>=30);assert.equal(axonAt(a,29.99,r.config).x,0);assert.ok(a.path.filter(p=>p.x>0).every(p=>p.t>=30));}});
test('scheduled conduit repair cannot leak bridge support into earlier display times',()=>{
  for(const delayDays of [30,30.37]){
    const r=simulate({repair:'conduit',delayDays,durationDays:40,axonCount:4});
    for(const day of [delayDays-.1,delayDays-.001,delayDays]){
      const fields=sampleFieldsAt(r,day);
      assert.ok(fields.schwann.every((v,i)=>fields.xMm[i]>=r.config.gapMm||v===0),`bridge support before repair at ${day}`);
      assert.equal(sampleAt(r,day).distalEntry,0);
    }
    const later=sampleFieldsAt(r,delayDays+.5);
    assert.ok(later.schwann.some((v,i)=>later.xMm[i]<r.config.gapMm&&v>0));
  }
});
test('unique parent-axon accounting is monotone and correctly nested',()=>{const r=simulate(small);assert.equal(new Set(r.axons.map(a=>a.id)).size,r.config.axonCount);let e=0,a=0;for(const s of r.samples){assert.ok(s.correctlyRouted<=s.arrived&&s.arrived<=s.distalEntry&&s.distalEntry<=r.config.axonCount);assert.ok(s.distalEntry>=e&&s.arrived>=a);e=s.distalEntry;a=s.arrived;}});
test('arbitrary-time statuses partition the representative cohort',()=>{for(const config of [{...small},{...small,repair:'none'},{...small,delayDays:45},{...small,schwannSupport:0}]){const r=simulate(config);for(const day of [0,3.171,35.3,85.73,120]){const s=sampleAt(r,day);assert.equal(s.waiting+s.active+s.stalled+s.arrived+s.lost,r.config.axonCount);}}});
test('timestep refinement converges without drawing a different random cohort',()=>{const a=simulate({...small,dtDays:.25}),b=simulate({...small,dtDays:.05});assert.deepEqual(a.axons.map(x=>[x.origin,x.speedMmDay,x.lagDays]),b.axons.map(x=>[x.origin,x.speedMmDay,x.lagDays]));assert.ok(Math.max(...a.axons.map((x,i)=>Math.abs(lastX(x)-lastX(b.axons[i]))))<.05);for(let i=0;i<a.axons.length;i++)if(a.axons[i].arrivalDay!==null&&b.axons[i].arrivalDay!==null)close(a.axons[i].arrivalDay,b.axons[i].arrivalDay,.1);});
test('bridge mesh refinement converges for a long distal pathway',()=>{const a=simulate({...small,gapMm:5,distalMm:500,fieldNodes:49}),b=simulate({...small,gapMm:5,distalMm:500,fieldNodes:129});assert.ok(Math.max(...a.axons.map((x,i)=>Math.abs(lastX(x)-lastX(b.axons[i]))))<.15);});
test('local myelin cannot appear ahead of the growth cone or before its local maturation lag',()=>{const r=simulate({...ideal,remyelinationLagDays:7});const a=r.axons[0],x=10,arrival=ideal.growthLagDays+x/ideal.elongationMmDay;assert.equal(localMyelin(a,x,arrival-1,r.config),0);assert.equal(localMyelin(a,x,arrival+6.99,r.config),0);assert.ok(localMyelin(a,x,arrival+10,r.config)>0);assert.equal(localMyelin(a,21,30,r.config),0);});
test('myelin follows segment age, retaining the first arrival across terminal plateaus',()=>{const r=simulate({...ideal,durationDays:120,remyelinationLagDays:0});const a=r.axons[0];assert.ok(localMyelin(a,3,35,r.config)>localMyelin(a,18,35,r.config));close(localMyelin(a,20,120,r.config),1-Math.exp(-(120-a.arrivalDay)/r.config.remyelinationDays));});
test('remyelination parameters cannot retroactively change growth or routing',()=>{const a=simulate({...small,remyelinationDays:5}),b=simulate({...small,remyelinationDays:180,remyelinationLagDays:20});assert.deepEqual(a.axons,b.axons);assert.ok(a.summary.meanMyelin>b.summary.meanMyelin);});
test('target receptivity remains separate from arrival and routing counts',()=>{const a=simulate({...small,targetHalfLifeDays:30}),b=simulate({...small,targetHalfLifeDays:1000});assert.deepEqual(a.axons,b.axons);assert.equal(a.summary.arrived,b.summary.arrived);assert.ok(a.summary.targetViability<b.summary.targetViability);});
test('a farther target cannot arrive earlier for the same axon in an ideal pathway',()=>{const a=simulate({...ideal,distalMm:10}),b=simulate({...ideal,distalMm:20});for(let i=0;i<a.axons.length;i++)assert.ok(a.axons[i].arrivalDay<b.axons[i].arrivalDay);});
test('perfect alignment preserves original fascicle identity',()=>{const r=simulate({...small,alignment:1,schwannSupport:1});assert.ok(r.axons.every(a=>a.correctTarget));});
test('longer support persistence cannot reduce axial advance for the same cohort',()=>{const a=simulate({...small,supportHalfLifeDays:30}),b=simulate({...small,supportHalfLifeDays:300});assert.ok(a.axons.every((x,i)=>lastX(x)<=lastX(b.axons[i])+1e-9));});
test('ensemble bands are reproducible, ordered and explicitly stochastic rather than clinical intervals',()=>{const c={...small,axonCount:12,durationDays:90};const a=runEnsemble(c,3),b=runEnsemble(c,3);assert.deepEqual(a,b);for(const s of a.samples)for(const key of ['arrived','meanMyelin'])assert.ok(s[key].low<=s[key].median&&s[key].median<=s[key].high);assert.equal(new Set(a.endpoints.map(x=>x.seed)).size,3);assert.match(a.interpretation,/not a clinical confidence interval/);});
test('sensitivity uses common seeds, validates parameters and reports its limited interpretation',()=>{const c={...ideal},a=runSensitivity(c,'elongationMmDay',[.5,1,2]);assert.ok(a.points[0].meanFrontMm<=a.points[1].meanFrontMm&&a.points[1].meanFrontMm<=a.points[2].meanFrontMm);assert.throws(()=>runSensitivity(c,'not-a-parameter'));assert.match(a.interpretation,/common random seed/);const x=simulate({...small,scar:.1}),y=simulate({...small,scar:.8});assert.deepEqual(x.axons.map(a=>[a.speedMmDay,a.lagDays,a.origin]),y.axons.map(a=>[a.speedMmDay,a.lagDays,a.origin]));});
test('every preset produces finite bounded outputs at its intended geometry',()=>{for(const p of PRESETS){const r=simulate({...p.config,axonCount:12});assert.ok(Object.values(r.summary).every(Number.isFinite));assert.ok(r.summary.arrived<=12);if(p.id==='crush'||p.id==='direct')assert.equal(r.geometry.gapMm,0);}});
test('sampling clamps outside the observation period and preserves exact endpoint values',()=>{const r=simulate(small);assert.equal(sampleAt(r,-10).day,0);assert.equal(sampleAt(r,1000).day,120);for(const key of ['arrived','distalEntry','correctlyRouted','meanMyelin'])close(sampleAt(r,120)[key],r.summary[key]);assert.equal(sampleFieldsAt(r,-10).day,0);});
test('adaptive display-path reduction preserves solver events and stays close to dense trajectories',()=>{const c={...small,dtDays:.1,alignment:.3},a=simulate(c),b=simulate(c,{compressPaths:false});let maxError=0;assert.ok(a.axons.reduce((s,a)=>s+a.path.length,0)<b.axons.reduce((s,a)=>s+a.path.length,0));for(let i=0;i<a.axons.length;i++){assert.equal(a.axons[i].entryDay,b.axons[i].entryDay);assert.equal(a.axons[i].arrivalDay,b.axons[i].arrivalDay);for(let t=0;t<=120;t+=.37){const p=axonAt(a.axons[i],t,a.config),q=axonAt(b.axons[i],t,b.config);maxError=Math.max(maxError,Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z));}}assert.ok(maxError<.025,`${maxError} mm`);});
test('a newly inserted structured bridge has a post-repair support clock distinct from the old distal stump',()=>{const a=simulate({...small,repair:'graft',delayDays:0,durationDays:10}),b=simulate({...small,repair:'graft',delayDays:90,durationDays:100});const sa=sampleFieldsAt(a,7),sb=sampleFieldsAt(b,97),i=sa.xMm.findIndex(x=>x>=3&&x<5);close(sa.schwann[i],sb.schwann[i],1e-10);assert.ok(sb.schwann.at(-1)<sa.schwann.at(-1));});
test('restored source preserves the retained v1.0.0 cohort and quantifies numerical differences',t=>{
  const f=JSON.parse(fs.readFileSync(new URL('./fixtures/nerve-regeneration-v1.0.0-export.json',import.meta.url),'utf8')),r=simulate(f.config);
  assert.notEqual(MODEL_VERSION,f.modelVersion);
  for(let i=0;i<r.axons.length;i++)for(const key of ['origin','target','speedMmDay','lagDays','correctTarget','canInitiate','caliberFactor']){
    const a=r.axons[i][key],b=f.axons[i][key];
    if(Array.isArray(a))a.forEach((x,j)=>close(x,b[j],1e-12));else if(typeof a==='number')close(a,b,1e-12);else assert.equal(a,b);
  }
  const maxFrontMm=Math.max(...r.axons.map((a,i)=>Math.abs(lastX(a)-f.axons[i].finalPoint.x)));
  const maxPairedArrivalDays=Math.max(...r.axons.map((a,i)=>a.arrivalDay!==null&&f.axons[i].arrivalDay!==null?Math.abs(a.arrivalDay-f.axons[i].arrivalDay):0));
  for(const key of ['distalEntry','arrived','correctlyRouted'])assert.equal(r.summary[key],f.summary[key]);
  assert.ok(Number.isFinite(maxFrontMm)&&Number.isFinite(maxPairedArrivalDays));
  t.diagnostic(JSON.stringify({comparison:'retained browser export, not biological validation',maxFrontMm,maxPairedArrivalDays,meanMyelinDifference:r.summary.meanMyelin-f.summary.meanMyelin,conductionProxyDifference:r.summary.conductionProxy-f.summary.conductionProxy}));
});
