'use strict';
const a=require('node:assert/strict'),E=require('./engine.cjs'),C=E.C;
let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS',name)};
const near=(x,z,tolerance=1e-8)=>a(Math.abs(x-z)<=tolerance,`${x} vs ${z}`);
const g100=E.solve({mode:'g100'}),wired=E.solve({}),counter=E.solve({mode:'counter84'}),g50=E.solve({mode:'g50'}),g150=E.solve({mode:'g150'}),open=E.solve({mode:'open50'});
test('all distinct source/teaching geometries and branch status',()=>{
 a.deepEqual([g50,g100,g150].map(v=>[v.mode.widthUm,v.stats.patterned,v.stats.installedWires]),[[50,143,0],[100,84,0],[150,59,0]]);
 a.deepEqual([wired.mode.widthUm,wired.stats.patterned,wired.stats.installedWires],[150,59,8]);
 a.deepEqual([counter.mode.widthUm,counter.stats.patterned,counter.stats.installedWires,counter.mode.status],[100,84,8,'Teaching only']);
 a.notEqual(wired.mode.status,counter.mode.status);
});
test('expected configuration paths: 7 open, 13 closed, 14 wired',()=>{
 a.equal(E.sequence(open.mode.id).length,7);a.equal(E.sequence('g100').length,13);a.equal(E.sequence('wire150').length,14);
 a(!E.sequence('open50').includes('cap'));a(!E.sequence('g100').includes('wire'));a(E.sequence('counter84').includes('wire'));
});
test('flat and finished stack dimensions are not conflated',()=>{
 a.equal(g100.geometry.nominalThicknessUm,150);a.equal(open.geometry.nominalThicknessUm,140);
 a.equal(g100.geometry.axialLengthUm,3000);a.equal(open.geometry.axialLengthUm,10000);
 [g100,g150,g50].forEach(x=>a.equal(x.geometry.flatPitchUm,x.mode.widthUm+20));
});
test('centerline inversion preserves known pitch; no new IDs appear',()=>{
 [g100,g150,g50].forEach(x=>{
  const g=x.geometry;a.equal(g.channels.length,x.stats.patterned);a.equal(new Set(g.channels.map(q=>q.lumen)).size,x.stats.patterned);
  near(E.arc(g.angularSpanRad),g.webWidthUm,.001);
  for(let i=0;i<g.channels.length;i++){
   const q=g.channels[i];near(E.arc(q.thetaRad),q.flatCenterUm,.001);
   if(i>0)near(q.flatCenterUm-g.channels[i-1].flatCenterUm,g.flatPitchUm);
  }
 });
});
test('sane three-turn sweep and independent noncircular caliper spans',()=>{
 [g100,g150,g50].forEach(x=>{
  const g=x.geometry;a(g.turns>3.1&&g.turns<3.5);
  [g.spanXUm,g.spanYUm].forEach(d=>a(d>1430&&d<1600));a.notEqual(g.spanXUm,g.spanYUm);
 });
});
test('no-widening limit and exact inner vs outer mean area trend',()=>{
 for(const [m,r] of [['g50',25],['g100',2.5],['g150',7.5]]){
  near(E.getGeometry(m,100).innerAverageAreaRisePct,r,1e-9);near(E.getGeometry(m,20).innerAverageAreaRisePct,r/5,1e-9);
  for(const q of E.getGeometry(m,0).channels)near(q.widthUm,E.MODES[m].widthUm);
 }
});
test('wedge geometry is positive, convex, disjoint across all widths and drift boundaries',()=>{
 for(const m of ['g50','g100','g150'])for(const d of [0,50,100]){
  const p=E.getGeometry(m,d).channels;
  for(const q of p){a(q.sectionAreaUm2>0&&q.idealAreaUm2>0);near(E.area(E.clipConvex(q.sectionPolygonUm,q.sectionPolygonUm)),q.sectionAreaUm2,1e-7);}
  for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)a(E.area(E.clipConvex(p[i].sectionPolygonUm,p[j].sectionPolygonUm))<1e-6,[m,d,i,j]);
 }
});
test('opening at core is neither counted nor perfectly circular recovery',()=>{
 const s=wired.rows;a(s.every(q=>Math.hypot(...q.centerUm)>C.assumedCoreInnerRadiusUm));a(!s.some(q=>q.lumen===0));
});
test('convex overlap: exact aligned, partial and disjoint controls',()=>{
 const rect=[[0,0],[10,0],[10,10],[0,10]],r1=E.ccw([[5,0],[15,0],[15,10],[5,10]]),r2=r1.map(x=>[x[0]+10,x[1]]);
 near(E.area(E.clipConvex(rect,rect)),100);near(E.area(E.clipConvex(rect,r1)),50);near(E.area(E.clipConvex(rect,r2)),0);
});
test('registration moves the stencil but not geometry or wire identity',()=>{
 const x=E.solve({dxUm:33,dyUm:-19});a(x.stats.fixtureQualified<59);a(x.stats.registrationLoss>0);
 a.equal(x.stats.physicalPatent,59);a.equal(x.stats.correctElectrical,8);
 a(x.rows.some(r=>r.registration.neighborFraction>0));a(x.rows.some(r=>r.registration.ownFraction<.65));a.strictEqual(x.geometry,wired.geometry);
});
test('aligned stencil and cross-registration bounds',()=>{
 a(wired.rows.every(r=>r.registration.ownFraction===1&&r.registration.neighborFraction===0));
 for(const opts of [[-190,+190],[+12,+51],[+33,-19],[-60,0],[+160,0]]){
  const r=E.solve({mode:'g50',dxUm:opts[0],dyUm:opts[1]});
  for(const q of r.rows){const f=q.registration;a(f.ownFraction>=0&&f.neighborFraction>=0);a(f.ownFraction+f.neighborFraction<=1.00000001);}
 }
});
test('84×8 comparison leaves less nominal area than the published 59×8 article',()=>{
 near(wired.stats.nominalWireFreeAreaUm2,12172.566611769187);near(counter.stats.nominalWireFreeAreaUm2,7172.566611769187);
 near(wired.stats.nominalWireFreeAreaUm2-counter.stats.nominalWireFreeAreaUm2,5000);
 near(wired.stats.nominalWireFaceAndSideAreaMm2,.09707521299592461);
});
test('eight unique wire locations are a diagram and physically fit each modeled aperture',()=>{
 for(const d of [wired,counter]){
  a.equal(new Set(d.dry.wires.map(w=>w.lumen)).size,8);a.equal(d.rows.filter(w=>w.wireId).length,8);
  for(const q of d.rows.filter(w=>w.wireId))for(let j=0;j<q.sectionPolygonUm.length;j++){
   const [x1,y1]=q.sectionPolygonUm[j],[x2,y2]=q.sectionPolygonUm[(j+1)%q.sectionPolygonUm.length],[x,y]=q.centerUm;
   a(((x2-x1)*(y-y1)-(y2-y1)*(x-x1))/Math.hypot(x2-x1,y2-y1)>29, q.lumen);
  }
 }
});
test('nominal dry graph identity and external references separate',()=>{
 a(wired.dry.matrix.every((row,i)=>row.every((b,j)=>b===(i===j))));a.equal(wired.stats.correctElectrical,8);
 a.equal(wired.referenceNotes.tripolar.outsideWireConductors,2);a.equal(wired.referenceNotes.bipolar.outsideWireConductors,1);
 a.equal(wired.stats.installedWires,8);
});
test('isolating an open changes exactly one dry entry and zero lumen/path outputs',()=>{
 for(let w=1;w<=8;w++){
  const d=E.solve({fault:'open',faultWire:w});
  a.equal(d.stats.correctElectrical,7);a.equal(d.stats.physicalPatent,59);a.equal(d.stats.fixtureQualified,59);
  a.equal(d.dry.rows.find(r=>r.index===w).detectedLumens.length,0);
  a.deepEqual(d.rows.map(r=>r.flow.mappedFlowUlMin),wired.rows.map(r=>r.flow.mappedFlowUlMin));
 }
});
test('a bridged or transposed pair retains both installed edges, but not exact identities',()=>{
 for(let w=1;w<=8;w++){
  for(const fault of ['swap','bridge']){
   const d=E.solve({fault,faultWire:w});a.equal(d.stats.correctElectrical,6);a.equal(d.dry.connectedTerminals,8);a.equal(d.stats.physicalPatent,59);
   const row=d.dry.rows[w-1];a.equal(row.detectedLumens.length,fault==='swap'?1:2);a.equal(row.correct,false);
   a.equal(row.detectedLumens.includes(row.lumen),fault==='bridge');
  }
 }
});
test('complete plug stops exactly one path; no wire disappears',()=>{
 const d=E.solve({plugPct:100});a.equal(d.stats.physicalPatent,58);a.equal(d.stats.fixtureQualified,58);a.equal(d.stats.correctElectrical,8);
 a.equal(d.stats.patterned,59);
 const q=d.rows[d.config.plugSite-1];a.equal(q.wireId,'W04');a.equal(q.flow.mappedFlowUlMin,0);a.equal(q.flow.resistancePaSecPerM3,null);
 near(wired.stats.waterPathModelSumUlMin-d.stats.waterPathModelSumUlMin,wired.rows[d.config.plugSite-1].flow.mappedFlowUlMin,1e-8);
});
test('partial occlusion decreases flow monotonically, relative location stable',()=>{
 let q=Infinity;
 for(const pct of [0,20,55,80,99,100]){
  const r=E.solve({plugPct:pct}),v=r.rows[r.config.plugSite-1].flow.mappedFlowUlMin;a(v<q);q=v;a.equal(r.stats.correctElectrical,8);a.equal(r.stats.physicalPatent,pct===100?58:59);
 }
});
test('normalized rectangular flow matches square analytic factor, symmetry and scaling',()=>{
 near(E.rectK(100,100)/(100e-6)**4*12,.421731045,1e-7);near(E.rectK(100,150)/E.rectK(150,100),1);
 near(E.rectK(200,300)/E.rectK(100,150),16);
 a(E.hydraulicR(0,100,3000)===Infinity);
});
test('model is linear in pressure, zero pressure is not a geometric failure',()=>{
 const twice=E.solve({pressurePa:160}),zero=E.solve({pressurePa:0});
 near(twice.stats.waterPathModelSumUlMin/wired.stats.waterPathModelSumUlMin,2,1e-9);
 a.equal(zero.stats.waterPathModelSumUlMin,0);a.equal(zero.stats.physicalPatent,59);a.equal(zero.stats.fixtureQualified,59);
});
test('wire area loss is local and decreases same-ID duct flow against equal width no-wire build',()=>{
 for(let i=0;i<59;i++){
  const p=wired.rows[i],b=g150.rows[i];near(p.widthUm,b.widthUm);
  if(!p.wireId)near(p.flow.mappedFlowUlMin,b.flow.mappedFlowUlMin);
  else a(p.flow.mappedFlowUlMin<b.flow.mappedFlowUlMin);
 }
});
test('uncapped branch cannot produce a confined flow or electrical result',()=>{
 const z=E.solve({mode:'open50',fault:'bridge',dxUm:190,dyUm:190,plugPct:100,driftPct:80});
 a.equal(z.stats.physicalPatent,null);a.equal(z.stats.waterPathModelSumUlMin,null);a.equal(z.referenceNotes,null);a.equal(z.stats.correctElectrical,0);
 a(z.rows.every(v=>v.physicalPatency===null&&v.flow===null&&v.registration===null&&v.wireId===null));
});
test('all meshes use valid vertex indices and each named solid is an edge-closed mesh',()=>{
 for(let m of ['wire150','g100','g50','open50','counter84']){
  const o=E.meshOBJ({mode:m});let vertices=0;const parts={};let current=null;
  for(const line of o.obj.split('\n')){
   if(line.startsWith('g '))parts[current=line.slice(2)]={faces:0,edges:{}};
   if(line.startsWith('v ')){vertices++;a(line.slice(2).split(' ').every(v=>Number.isFinite(+v)));}
   if(line.startsWith('f ')){
    const p=parts[current],ix=line.slice(2).split(' ').map(Number);p.faces++;
    a(ix.every(i=>i>0&&i<=vertices));a(ix.length>=3&&new Set(ix).size===ix.length);
    for(let i=0;i<ix.length;i++){const e=[ix[i],ix[(i+1)%ix.length]].sort((a,b)=>a-b).join('-');p.edges[e]=(p.edges[e]||0)+1;}
   }
  }
  for(const p of Object.values(parts))a(Object.values(p.edges).every(n=>n===2));
  a.equal(Object.keys(parts).filter(k=>/^W[0-9]/.test(k)).length,E.MODES[m].wireCount);
  a.equal(Object.hasOwn(parts,'PDMS_lid'),E.MODES[m].rolled);
  a(o.mtl.includes('newmtl su8'));
 }
});
test('invalid inputs clamp or fall back; combined faults/fixture states stay finite',()=>{
 a.equal(E.solve({mode:'__proto__',faultWire:'N/A',plugPct:NaN,pressurePa:Infinity}).mode.id,'wire150');
 for(const m of E.modeList)for(const fault of ['none','open','swap','bridge'])for(const off of [0,40,-190])for(const p of [0,73,100]){
  const d=E.solve({mode:m.id,dxUm:off,dyUm:-off/5,plugPct:p,fault,pressurePa:187,driftPct:34});
  a(d.stats.correctElectrical<=d.stats.installedWires);a(d.stats.patterned===m.count);
  if(m.rolled){a(Number.isFinite(d.stats.waterPathModelSumUlMin));a(d.stats.fixtureQualified<=d.stats.physicalPatent);}
 }
});
console.log(n+' model suites passed');
