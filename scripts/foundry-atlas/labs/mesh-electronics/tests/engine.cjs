'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {MeshEngine:E}=require('../src/engine.js'),P=E.P;
const approx=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),a+' vs '+b);

test('four explicit masks, distinct materials and ordered process carriers',()=>{
  assert.deepEqual(Object.values(E.MASKS).map(r=>r.no),[1,2,3,4]);
  assert.deepEqual(E.STAGES[5].layers,['carrier','nickel','lower','gold','platinum','upper']);
  assert.deepEqual(E.STAGES[6].layers,['lower','gold','platinum','upper']);
  assert.deepEqual(E.STAGES[7].layers,['lower','gold','platinum','upper','fixture']);
  assert.equal(E.STAGES.length,10);
});
test('graph completes only in the right process stages',()=>{
  for(let s=1;s<=7;s++){const m=E.analyze({},s);assert.equal(m.counts.reachable,0);assert.equal(m.accepted,false);}
  assert.equal(E.analyze({},8).counts.contactedPins,32);
  assert.equal(E.analyze({},9).counts.mapped,32);
  assert.equal(E.analyze({},9).counts.wet,0);
  assert.equal(E.analyze({},10).accepted,true);
});
test('nominal 32 routes are one-to-one with geometric Au seat overlap',()=>{
  const m=E.analyze();
  assert.equal(m.accepted,true);
  assert.equal(m.rows.length,32);
  for(const d of m.rows){
    assert.equal(d.status,'good');
    assert.deepEqual(d.sites,[d.slot]);
    assert.deepEqual(d.pads,[d.slot]);
    assert.equal(d.overlap,1);
    assert.equal(d.areaFraction,1);
    approx(d.dryOhm,E.routesFor('full')[d.slot-1].routeR+3);
  }
});
test('half population has 16 mapped routes, 16 intentional no-pad positions',()=>{
  const m=E.analyze({population:'half'});
  assert.deepEqual(m.rows.filter(p=>p.expected!==null).map(p=>p.slot),Array.from({length:16},(_,k)=>k+9));
  assert.equal(m.counts.active,16);
  assert.equal(m.counts.wet,16);
  assert.equal(m.counts.empty,16);
  assert.equal(m.counts.open,0);
  assert.equal(E.drawing({population:'half'}).platinum.length,16);
  assert.equal(E.drawing({population:'half'}).fixture.length,32);
  assert.equal(m.accepted,true);
});
test('a one-pitch displacement creates 31 isolated wrong maps and one open',()=>{
  const m=E.analyze({offset:500});
  assert.equal(m.counts.reachable,31);assert.equal(m.counts.unique,31);assert.equal(m.counts.mapped,0);
  assert.equal(m.counts.wrong,31); assert.equal(m.counts.open,1);
  assert.deepEqual(m.rows[15].sites,[17]);assert.equal(m.rows[31].status,'open');
});
test('opposite pitch yields opposite neighbor and first-position open',()=>{
  const m=E.analyze({offset:-500});
  assert.equal(m.counts.wrong,31);assert.equal(m.rows[0].status,'open');assert.deepEqual(m.rows[15].sites,[15]);
});
test('nominal edge, partial contact and exact zero-area touch',()=>{
  assert.equal(E.analyze({offset:150}).rows[0].overlap,1);
  assert.equal(E.analyze({offset:225}).rows[0].overlap,.25);
  assert.equal(E.analyze({offset:225}).contacts[0].ohm,12);
  assert.equal(E.analyze({offset:250}).counts.contactedPins,0);
  assert.equal(E.analyze({offset:251}).rows[0].directPads[0],2);
});
test('ZIF lateral and seating-overlap areas multiply',()=>{
  const m=E.analyze({offset:225,depth:200});
  assert.equal(m.rows[0].overlap,.25*50/160);
  assert.equal(E.analyze({depth:250}).counts.contactedPins,0);
  assert.equal(E.analyze({latch:false}).counts.contactedPins,0);
});
test('fixture label reversal never changes physical metal',()=>{
  const m=E.analyze({reverse:true}),b=E.analyze();
  assert.deepEqual(E.drawing({reverse:true}),E.drawing());
  assert.deepEqual(m.rows.map(r=>r.sites),b.rows.map(r=>r.sites));
  assert.equal(m.rows[0].label,'P32');assert.equal(m.counts.wrong,32);
});
test('manufactured Au open leaves 32 pad hits but one invalid sensing route',()=>{
  const m=E.analyze({fault:'open',target:16});
  const a=E.drawing({fault:'open',target:16}).gold.filter(t=>t.id.startsWith('au-route-16'));
  assert.equal(a.length,2);assert.equal(a[1].pts[0][0]-a[0].pts.at(-1)[0],60);
  assert.equal(m.counts.contactedPins,32);
  assert.equal(m.counts.mapped,31);assert.equal(m.rows[15].dryOhm,null);
  assert.equal(m.rows[15].status,'open');
});
test('Au bridge yields shared two-pin two-site graph, excluded from independent impedance',()=>{
  const m=E.analyze({fault:'bridge',target:16});
  assert.equal(m.bridgeNeighbor,17);assert.equal(m.counts.shared,2);assert.equal(m.counts.reachable,32);
  assert.deepEqual(m.rows[15].sites,[16,17]);assert.deepEqual(m.rows[16].pads,[16,17]);
  assert.equal(E.impedance(m.rows[15],1000),null);
  assert.equal(E.drawing({fault:'bridge',target:16}).gold.filter(g=>g.fault==='bridge').length,1);
  assert.equal(E.analyze({population:'half',fault:'bridge',target:24}).bridgeNeighbor,23);
});
test('cracked polymer witness does not imply Au path severed',()=>{
  const m=E.analyze({fault:'rail'});assert.equal(m.electricalPass,true);assert.equal(m.structurePass,false);
  assert.equal(m.accepted,false);assert.equal(m.counts.wet,32);
  assert.deepEqual(E.drawing({fault:'rail'}).gold,E.drawing().gold);
});
test('covered Pt retains all dry addresses but no independent wet output',()=>{
  const m=E.analyze({window:10});
  assert.equal(m.counts.mapped,32);assert.equal(m.counts.wet,0);assert.equal(m.accepted,false);
  assert.ok(m.rows[15].dryOhm>0);
  assert.equal(E.waveform(m.rows[15]).length,0);
  assert.equal(E.drawing({window:10}).upper.find(r=>r.id==='upper-island-16').hole,undefined);
});
test('exact half-radius window has one-quarter area with intact dry path',()=>{
  const m=E.analyze({window:5});
  assert.equal(m.counts.mapped,32);approx(m.rows[15].areaFraction,.25);
  assert.ok(E.impedance(m.rows[15],1000).abs>E.impedance(E.analyze().rows[15],1000).abs*3.9);
});
test('Pt layer shift moves it, not the aperture; negative excess shift breaks dry path',()=>{
  const m=E.analyze({ptShift:-32});assert.equal(m.counts.reachable,0);assert.equal(m.counts.contactedPins,32);
  const s=E.drawing({ptShift:-32});const t=s.platinum.find(p=>p.net===16);
  assert.equal(s.upper.find(u=>u.id==='upper-island-16').x-t.x,32);
  const small=E.analyze({ptShift:-5});assert.equal(small.counts.mapped,32);assert.ok(small.rows[15].areaFraction<1&&small.rows[15].areaFraction>.5);
});
test('1 kHz anchor is reproduced; unfit bands extrapolate monotonically and stay passive',()=>{
  const r=E.analyze().rows[15],z=E.impedance(r,1000);
  approx(z.abs,1.3e6);approx(z.phase,-80);
  const a=E.sweep(r);
  assert.equal(a.length,37);
  for(let i=1;i<a.length;i++){assert.ok(a[i].abs<a[i-1].abs);assert.ok(a[i].re>0&&a[i].im<0);}
  assert.equal(E.impedance(r,0),null);
});
test('fixed audio-frequency tone encoding follows physical site, not wrong label',()=>{
  const a=E.waveform(E.analyze().rows[15]),b=E.waveform(E.analyze({offset:500}).rows[15]);
  assert.equal(a.length,192);assert.equal(a[0].site,16);assert.equal(b[0].site,17);assert.equal(b[0].hz-a[0].hz,13);
  assert.ok(Math.max(...a.map(x=>Math.abs(x.outputUV)))<=60);
  assert.ok(a.every((v,i)=>v.timeS===i/6000));
});
test('geometrical contact circle limits and symmetry',()=>{
  approx(E.overlapCircle(10,10,0),Math.PI*100);
  approx(E.overlapCircle(10,5,0),Math.PI*25);
  assert.equal(E.overlapCircle(10,10,20),0);assert.equal(E.overlapCircle(10,0,0),0);
  approx(E.overlapCircle(10,6,8),E.overlapCircle(6,10,8));
});
test('each nominal pad and Pt face follows one independent drawn conductor; no unintended trace overlap',()=>{
  function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
  function minimum(a,b,c,d){
    if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0)return 0;
    return Math.min(E.dSeg(...a,c,d),E.dSeg(...b,c,d),E.dSeg(...c,a,b),E.dSeg(...d,a,b));
  }
  for(const name of ['full','half']){
    const a=E.routesFor(name);
    for(let i=1;i<a.length;i++)assert.equal(a[i].pad[0]-a[i-1].pad[0],P.pitch);
    for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
      const p=a[i].points,q=a[j].points;
      for(let k=1;k<p.length;k++)for(let l=1;l<q.length;l++){
        const d=minimum(p[k-1],p[k],q[l-1],q[l]);
        assert.ok(d>P.leadWidth,[name,i,j,k,l,d].join(' '));
      }
    }
  }
});
test('reconstructed upper film windows are unobstructed by the rest of the mask',()=>{
  for(const pop of ['full','half'])for(const window of [0,4,7]){
    const G=E.drawing({population:pop,window});
    const hoops=G.upper.filter(o=>o.shape==='circle'&&o.hole>0);
    assert.equal(hoops.length,E.routesFor(pop).length);
    for(const w of hoops)for(const s of G.upper){
      if(s===w)continue;
      if(s.shape==='stroke')for(let i=1;i<s.pts.length;i++)
        assert.ok(E.dSeg(w.x,w.y,s.pts[i-1],s.pts[i])>w.hole+s.w/2,[pop,w.id,s.id].join(' '));
      if(s.shape==='circle')assert.ok(Math.hypot(s.x-w.x,s.y-w.y)>s.r+w.hole);
      if(s.shape==='rect')assert.ok(Math.hypot(Math.max(s.x-w.x,0,w.x-(s.x+s.w)),Math.max(s.y-w.y,0,w.y-(s.y+s.h)))>w.hole);
    }
  }
});
test('dry-invalid options are clamped, mask snapshots and geometry IDs are deterministic',()=>{
  assert.deepEqual(E.calcOptions({population:'bad',offset:1000,depth:-1000,ptShift:-99,window:17,latch:false,fault:'bad',target:-9}),
  {population:'full',offset:550,depth:-250,ptShift:-36,window:10,reverse:false,fault:'none',target:1,latch:false});
  const G=E.drawing(),ids=Object.values(G).flat().map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);assert.deepEqual(G,E.drawing());
});
test('pad metal sublinks have matching polymer support and seat stays exposed',()=>{
  for(const p of ['full','half']){
    const G=E.drawing({population:p});
    for(const au of G.gold.filter(x=>x.id.includes('pad-inner-link'))){
      const pair=G.lower.find(x=>x.id===au.id.replace('au-pad-inner-link','lower-internal-pad-brace'));
      assert.deepEqual(pair.pts,au.pts);assert.ok(pair.w>au.w);
    }
    for(const u of G.upper.filter(x=>x.id.startsWith('upper-riser-')))
      assert.ok(u.pts.at(-1)[1]+u.w/2<P.padY0);
  }
});
