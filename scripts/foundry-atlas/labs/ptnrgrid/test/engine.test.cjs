'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const m=require('../src/engine.js');
const check=(p={})=>m.solve({stage:m.stagesLast,focus:512,...p});
const f=512;
test('published carrier and distinct writing-field and mounting constraints',()=>{
 const a=m.carrierCheck(177.8,177.8,170,32), b=m.carrierCheck(177.8,177.8,100,100);
 assert.deepEqual(a.carrierMm,[177.8,177.8]);assert.equal(m.carriers.glass.thickness,1.524);assert.deepEqual(a.registeredFieldMm,[150,150]);assert.equal(a.pattern,'exceeds registered field');assert.equal(b.pattern,'dimensionally within field');assert(a.carrierOverField&&b.carrierOverField);assert(!b.canQualify);assert.match(b.carrierMount,/unverified/);assert.equal(m.carrierCheck().pattern,'unknown pattern extent');
});
test('19 stages with resolvable sources and equipment, sequenced in order',()=>{
 assert.equal(m.stages.length,19);for(const s of m.stages){assert(s.src.length);assert(s.src.every(x=>m.sources[x]));assert(s.tools.every(x=>m.toolNames[x]))}
 assert.match(m.stages[3].title,/artwork A/);assert.match(m.stages[5].title,/artwork B/);assert.match(m.stages[8].title,/Pt–Ag/);assert.match(m.stages[12].title,/strip/);assert.match(m.stages[13].title,/Release/);assert.match(m.stages[14].title,/dealloy/);
});
test('all four documented envelope / site-count pairs stay distinct',()=>{
 const ims=Object.values(m.configs).map(c=>[c.count,c.pitch,c.width,c.height]);
 assert.deepEqual(ims,[[1024,1,32,32],[1024,.2,3,13],[2048,1.8,80,80],[1024,.15,4.8,4.8]]);
 assert.equal(m.physical.ptSiteUm,30);assert.equal(m.physical.ptRecessUm,2);assert.equal(m.physical.auNmPerPass,250);
});
test('regular square has exactly 1024 unique indexed contacts and center extents',()=>{
 const x=check(),r=x.res;assert.equal(r.length,1024);assert.equal(new Set(r.map(e=>e.id)).size,1024);assert.equal(new Set(r.map(e=>[e.x,e.y].join(','))).size,1024);
 assert.deepEqual([r[0].x,r[0].y,r.at(-1).x,r.at(-1).y],[-15.5,15.5,15.5,-15.5]);assert.equal(r[1].x-r[0].x,1);assert.equal(r[0].y-r[32].y,1);
});
test('only documented square lattice coordinates are exported',()=>{
 assert.equal(m.report(check(),f).selectedSite.x,-15.5);
 for(const config of ['narrow','wide','small']){let a=check({config});assert.equal(m.report(a).selectedSite.x,null);assert.equal(m.report(a).selectedSite.y,null);const line=m.csv(a).split('\r\n')[1];assert.match(line,/^"S0001","1","1","","",/);}
 assert(m.solve({stage:18,config:'wide'}).res.every(r=>r.x===null&&r.y===null));
});
test('bottom layer references remain separate',()=>{
 assert.equal(check({thick:'main'}).thicknessUm,6.6);assert.equal(check({thick:'supplement'}).thicknessUm,6.8);assert.equal(m.physical.topParyleneUm,3.1);
});
test('virtual process gates contact material and outputs',()=>{
 const o=(stage)=>check({stage}).res[f];assert.equal(o(7).finish,'Not formed');assert.equal(o(8).finish,'Ti-capped Pt–Ag');assert.equal(o(11).wetWindow,false);assert.equal(o(12).finish,'Pt–Ag alloy');assert.equal(o(13).finish,'Pt–Ag alloy');assert.equal(o(14).finish,'Pt-rich');assert.equal(o(14).outputIds.length,0);assert.equal(o(16).dry,'Not inspected');assert.equal(o(17).dry,'Mapped');assert.deepEqual(m.spectrum(o(17)),[]);assert.equal(m.spectrum(o(18)).length,20);
});
test('nominal all-site bijection',()=>{
 for(const config of Object.keys(m.configs)){const a=check({config});assert.equal(a.totals.correct,a.n);assert.equal(a.totals.wet,a.n);assert.equal(a.totals.open,0);assert.equal(new Set(a.res.map(r=>r.outputIds[0])).size,a.n);assert(a.res.every(r=>r.filmPath&&r.extender&&r.wetWindow&&r.dry==='Mapped'))}
});
test('single A break before B and rescue thereafter in-register',()=>{
 const a=check({stage:4,defect:'first'}),b=check({stage:6,defect:'first'}),n=check(),d=check({defect:'first'});
 assert.equal(a.affected,f);assert.deepEqual(a.res[f].A,[true,false,true]);assert(!a.res[f].routingClosed);assert(b.res[f].routingClosed);assert.equal(d.totals.correct,1024);assert(d.res[f].wireOhm>n.res[f].wireOhm);
});
test('zero overlap is no direct contact, while A survives with no A break',()=>{
 for(const overlay of [-4,4]){assert.equal(check({overlay}).overlap,0);assert.equal(check({overlay}).totals.correct,1024);const a=check({defect:'first',overlay});assert.equal(a.totals.open,1);assert.equal(a.res[f].wireOhm,null)}
});
test('distinct span faults route through a junction only if registered',()=>{
 const a=check({defect:'crossed'}),b=check({defect:'crossed',overlay:4});assert(a.res[f].routingClosed);assert.equal(a.totals.correct,1024);assert.equal(b.res[f].dry,'Open');assert.equal(b.totals.open,1);
});
test('same-span cuts break both paths regardless of overlay',()=>{
 const a=check({defect:'through'});assert.equal(a.totals.open,1);assert.equal(a.totals.correct,1023);assert(a.res[0].routingClosed);assert(!a.res[f].routingClosed);assert.equal(a.res[f].eisReady,false);assert.deepEqual(m.spectrum(a.res[f]),[]);
});
test('metal bridge changes isolation, not naive continuity',()=>{
 const a=check({defect:'bridge'});assert.equal(a.totals.connected,1024);assert.equal(a.totals.correct,1022);assert.equal(a.totals.bridged,2);assert.deepEqual(a.res[f].outputIds,['Q0513','Q0514']);assert.deepEqual(a.res[f].shortWith,['S0514']);assert.equal(a.res[f].eisReady,false);
});
test('blocked window passes dry map but fails wet exposure',()=>{
 const a=check({defect:'cover'});assert.equal(a.totals.correct,1024);assert.equal(a.totals.wet,1023);assert.equal(a.totals.covered,1);assert.equal(a.res[f].wet,'Blocked');assert.equal(a.res[f].dry,'Mapped');assert.equal(a.res[f].finish,'Ti-capped Pt–Ag under film');assert.deepEqual(m.spectrum(a.res[f]),[]);
});
test('incomplete dealloy changes passive RC witness not wiring',()=>{
 const a=check({defect:'alloy'}),b=check();assert.equal(a.totals.correct,1024);assert.equal(a.totals.limited,1);assert.equal(a.totals.formed,1023);assert.equal(a.totals.wet,1024);assert.equal(a.res[f].finish,'partial Pt-rich');assert(m.spectrum(a.res[f],[1000])[0].magOhm>m.spectrum(b.res[f],[1000])[0].magOhm);
});
test('open bond leaves film path intact but cannot be acquired',()=>{
 const a=check({defect:'bond'});assert.equal(a.totals.film,1024);assert.equal(a.totals.open,1);assert(a.res[f].filmPath);assert(!a.res[f].extender);assert.equal(a.res[f].outputIds.length,0);
});
test('swapped outputs fail mapping despite good dry conductors',()=>{
 const a=check({defect:'swap'});assert.equal(a.totals.connected,1024);assert.equal(a.totals.swapped,2);assert.equal(a.totals.correct,1022);assert.deepEqual(a.res[f].outputIds,['Q0514']);assert.deepEqual(a.res[f+1].outputIds,['Q0513']);
});
test('unseated connector group removes 64 mapped outputs, not the film',()=>{
 for(const config of ['square','wide']){const a=check({config,defect:'bank'});assert.equal(a.totals.open,64);assert.equal(a.totals.film,a.n);assert.equal(a.totals.correct,a.n-64);assert(a.res[f].extender);assert.equal(a.res[f].dry,'Open');assert.equal(a.res[f-1].dry,'Mapped');assert.equal(a.res[f+64].dry,'Mapped')}
});
test('bench circuit is finite passive and monotonic in the chosen ideal model',()=>{
 const a=m.spectrum(check().res[f]);assert.equal(a.length,20);for(let i=0;i<a.length;i++){assert(a[i].realOhm>0);assert(a[i].imagOhm<0);assert(a[i].phaseDeg<0);assert(a[i].phaseDeg>-90);if(i)assert(a[i].magOhm<a[i-1].magOhm);}assert.throws(()=>m.spectrum(check().res[f],[0]));
});
test('CSV and traveler evidence stable, measured and synthetic distinct',()=>{
 const C=check({defect:'bank'}),csv=m.csv(C);assert.equal(csv.split('\r\n').length,1026);assert.equal(m.csv(check({config:'wide'})).split('\r\n').length,2050);
 assert.throws(()=>m.csv(check({stage:16})),/Finish dry/);const r=m.report(C,0);assert.equal(r.virtualOptions.selectedSite,'S0001');assert.equal(r.virtualOptions.defectSite,'S0513');assert.equal(r.configuration.benchmark.mean,11);assert.equal(r.syntheticSpectrum.length,20);assert.equal(r.process.length,19);assert.deepEqual(r.checkCounts,C.totals);
});
