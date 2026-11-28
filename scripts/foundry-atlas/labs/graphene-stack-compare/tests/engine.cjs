'use strict';
const test=require('node:test'),A=require('node:assert/strict'),{GrapheneEngine:E}=require('../src/engine.js');
const approx=(x,y,atol=1e-8)=>{A.ok(Math.abs(x-y)<atol*Math.max(1,Math.abs(x),Math.abs(y)),x+' versus '+y)};
test('both travelers are independent twelve-stage ordered chains with source tags',()=>{
  A.equal(E.SAMPLE.clear.stages.length,12); A.equal(E.SAMPLE.delft.stages.length,12);
  A.equal(E.SAMPLE.clear.id,'CL-04');A.equal(E.SAMPLE.delft.id,'DL-ML');
  A.equal(E.SOURCE.clear.doi,'10.1038/ncomms6258');A.equal(E.SOURCE.delft.doi,'10.1002/advs.202517524');
});
test('series, parallel, bridged and disconnected graphs solve under one volt',()=>{
  A.equal(E.solve([['a','b',13]]),13);
  approx(E.solve([['a','j',7],['j','b',3]]),10);
  approx(E.solve([['a','b',15],['a','b',30]]),10);
  approx(E.solve([['a','c',1],['a','d',1],['c','d',1],['c','b',1],['d','b',1]]),1);
  A.equal(E.solve([['a','j',3],['k','b',2]]),null);
  approx(E.solve([['a','j',1],['j','unused',4],['j','b',1]]),2);
});
test('one- and four-transfer endpoints anchor 152 and 76 Ω/sq; intermediates are assumed',()=>{
  A.equal(E.interpolatedRs(1),152);A.equal(E.interpolatedRs(4),76);
  A.equal(E.interpolatedRs(0),null);A.ok(E.interpolatedRs(2)>E.interpolatedRs(3));
  approx(E.model('clear',3).film.rsEquivalent,152);
  approx(E.model('clear',6).film.rsEquivalent,76);
});
test('CLEAR gets one film per transfer, does not grow them directly',()=>{
  const a=Array.from({length:12},(_,i)=>E.model('clear',i).n);
  A.deepEqual(a,[0,0,0,1,2,3,4,4,4,4,4,4]);
  for(let n=0;n<3;n++)A.equal(E.model('clear',n).hasCarbon,false);
});
test('CLEAR continuous prior sheet is not a patterned circuit',()=>{
  const a=E.model('clear',6);A.ok(a.film.rOhm>0);A.equal(a.art,false);A.equal(a.dry,null);
  const b=E.model('clear',7);A.ok(b.dry>0);A.equal(b.art,true);
});
test('CLEAR cap and silicon release events do not occur together',()=>{
  const a=E.model('clear',8),b=E.model('clear',9),c=E.model('clear',10);
  A.equal(a.backed,true);A.equal(a.cap,true);A.equal(a.clearFraction,0);approx(a.geom,a.nominalA);
  A.equal(b.backed,false);A.equal(b.cap,true);A.equal(b.clearFraction,0);
  A.equal(c.backed,false);A.equal(c.cap,false);A.equal(c.clearFraction,1);
  A.equal(c.ready,false);A.equal(E.model('clear',11).pass,true);
});
test('one torn sheet increases electrical modeled resistance while geometry is unchanged',()=>{
  const a=E.model('clear',11),b=E.model('clear',11,{tear:'one'});
  A.equal(b.film.fullSheets,3);A.equal(b.film.segDefects.length,1);A.equal(b.n,4);
  approx(b.dry/a.dry,4/3);A.equal(a.clearFraction,b.clearFraction);A.equal(b.pass,true);
});
test('aligned cuts open the film even with perfect interior ties',()=>{
  const a=E.model('clear',11,{tear:'aligned',transferPath:'ideal'});
  A.equal(a.film.fullSheets,0);A.equal(a.dry,null);A.equal(a.clearFraction,1);
  A.equal(a.pass,false);
});
test('staggered cuts only read through hypothetical interior ties',()=>{
  const a=E.model('clear',11,{tear:'staggered'}),b=E.model('clear',11,{tear:'staggered',transferPath:'ideal'});
  A.equal(a.n,4);A.equal(b.n,4);A.equal(a.film.fullSheets,0);A.equal(b.film.fullSheets,0);
  A.equal(a.dry,null);approx(b.dry,1472);A.ok(b.pass);
});
test('Delft never logs donor transfers and retains fused silica throughout',()=>{
  for(let i=0;i<12;i++){const m=E.model('delft',i);A.equal(m.backed,true);A.equal(m.n,0);A.equal(m.hasCarbon,i>=3)}
});
test('Delft separately removes cap before Mo, with intact geometry and conduction',()=>{
  const a=E.model('delft',8),b=E.model('delft',9),c=E.model('delft',10);
  A.equal(a.cap,true);A.equal(a.residue,1);A.equal(a.clearFraction,0);
  A.equal(b.cap,false);A.equal(b.residue,1);A.equal(b.clearFraction,0);
  A.equal(c.cap,false);A.equal(c.residue,0);A.equal(c.clearFraction,1);A.equal(c.film.moly,true);
  approx(a.dry,b.dry);approx(b.dry,c.dry);
});
test('Delft retained Mo can electrically bypass an interrupted inner carbon track',()=>{
  const a=E.model('delft',11),b=E.model('delft',11,{inner:'carbon-break'});
  A.equal(b.film.carbon,false);A.equal(b.film.moly,true);
  A.ok(b.dry>a.dry);A.ok(b.dry/a.dry<1.01);A.equal(a.clearFraction,b.clearFraction);
});
test('Delft carbon-only dry path differs from double open',()=>{
  const a=E.model('delft',11,{inner:'mo-open'}),b=E.model('delft',11,{inner:'both-break'});
  A.equal(a.film.moly,false);A.ok(a.dry>10*E.model('delft',11).dry);
  A.equal(b.film.carbon,false);A.equal(b.dry,null);A.equal(b.clearFraction,1);
});
test('residual Mo only changes window qualification, not dry trace resistance',()=>{
  const a=E.model('delft',11),b=E.model('delft',11,{moAtFace:.40});
  A.equal(a.dry,b.dry);A.equal(b.clearFraction,.6);A.equal(b.geom,a.geom);
  A.equal(b.pass,false);
});
test('independent aperture scale uses actual reported Delft size options',()=>{
  const a=E.model('clear',11,{windowShift:1}),b=E.model('delft',11,{windowShift:1,diameter:10}),c=E.model('delft',11,{windowShift:1,diameter:50});
  A.equal(a.windowDx,50);A.equal(b.windowDx,5);A.equal(c.windowDx,25);
  approx(b.nominalA*25,c.nominalA);approx(a.clearFraction,b.clearFraction);approx(b.clearFraction,c.clearFraction);
  A.equal(a.pass,false);A.ok(a.dry>0);
});
test('circle area is symmetric and stops exactly at tangency',()=>{
  approx(E.circleOverlap(3,3,0),Math.PI*9);approx(E.circleOverlap(3,1,1),Math.PI);
  A.equal(E.circleOverlap(3,3,6),0);A.equal(E.circleOverlap(3,2,5.001),0);
  approx(E.circleOverlap(2,4,4),E.circleOverlap(4,2,4));
});
test('aligned feature and partial residue compound but do not double-count blocked area',()=>{
  const a=E.model('delft',11,{diameter:30,windowShift:1,moAtFace:.2});
  approx(a.carbonArea,a.geom*.8);A.ok(a.clearFraction<a.geom/a.nominalA);
  A.equal(E.model('delft',11,{windowShift:2,moAtFace:.1}).carbonArea,0);
});
test('each source keeps separate transmission witness and material evidence',()=>{
  approx(E.grownEstimate,22.8260869565);
  A.equal(E.SAMPLE.clear.bands,'470 and 570 nm');
  A.equal(E.SAMPLE.delft.bands,'550 nm');
  A.match(E.SAMPLE.delft.evidence[2].desc,/separate, centimeter-scale graphene sheet transferred to glass/);
});
test('stage range and narrow supported parametric set are clamped',()=>{
  A.deepEqual(E.options('delft',{windowShift:-1,moAtFace:3,diameter:20,inner:'bad'}),{inner:'intact',moAtFace:1,diameter:10,windowShift:0});
  A.equal(E.model('delft',73).s,11);
  A.equal(E.model('clear',-10).s,0);
});
