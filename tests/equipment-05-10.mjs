import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {LAMBDA,SI,PS,shift,stokesNm,gaussian,broaden,focusResponse,spectrum,peak,initial,dispatch,scan,tiles,mapCsv,axis,windows} from '../public/equipment/05-10/solver.mjs';
const dir=new URL('../public/equipment/05-10/',import.meta.url),json=n=>JSON.parse(readFileSync(new URL(n,dir))),write=(n,v)=>writeFileSync(new URL(n,dir),JSON.stringify(v)+'\n');
const def=initial(), run=s=>{const q=scan(s);assert.equal(q.ok,true,q.message);return q.result;};
const out=run(def),asym=run({...def,fixture:tiles(['SPSPS','PSSSP','SPPPS'])});
function grid(o){return Array.from({length:o.input.rows},(_,r)=>o.points.filter(p=>p.row===r).map(p=>p.assigned).join('')).join('/');}
const x=Array.from({length:1001},(_,i)=>-25+i*.05),width=peak(x,x.map(v=>gaussian(v,broaden(3,4))),[-20,20]).fwhmCm;
const actual={'silicon-stokes':stokesNm(LAMBDA,SI),'ps-stokes':stokesNm(LAMBDA,PS),'fwhm-gaussian':width,'half-maximum':gaussian(2.5,5),'calibration':peak(axis,out.signalTable.S,windows.S).centerCm,'unadjusted':peak(axis,spectrum('S',axis,{correction:0}),windows.S).centerCm,'focus':focusResponse(focusResponse(0,50).axialHwhmUm,50).eta,'checkerboard':grid(out),'asymmetry':grid(asym),'missing-reference':scan({...def,cal:null}).code};
const fixture=json('acceptance.json'),cases=fixture.cases.map(q=>({...q,actual:actual[q.id],pass:q.tolerance===undefined?q.expected===actual[q.id]:Math.abs(q.expected-actual[q.id])<=q.tolerance}));
for(const c of cases)test(c.id,()=>assert.ok(c.pass,JSON.stringify(c)));
test('wavelength round trip and model area preservation',()=>{
 assert.ok(Math.abs(shift(532,stokesNm(532,520.45))-520.45)<1e-10);
 const p=run({...def,lsf:5}).points[0];
 assert.ok(Math.abs(p.fit.S.area-out.points[0].fit.S.area)<.002);
 assert.ok(p.fit.S.fwhmCm>out.points[0].fit.S.fwhmCm);
});
test('axis orientation, material identity and physical coordinates',()=>{
 assert.deepEqual(out.points[7],{...out.points[7],row:1,col:2,xUm:30,yUm:18,sourceKey:'P',assigned:'P'});
 assert.equal(asym.points[12].col,2);assert.equal(asym.points[12].row,2);
 assert.ok(out.points.every(p=>p.assigned===p.sourceKey&&p.fit[p.assigned].area>.95));
});
test('focus, exposure, range guards and no physical control',()=>{
 const dim=run({...def,defocus:focusResponse(0,50).axialHwhmUm});
 assert.ok(Math.abs(dim.points[0].fit.S.area/out.points[0].fit.S.area-.5)<1e-9);
 assert.equal(scan({...def,lsf:9}).code,'range');
 assert.equal(scan(dispatch(def,'door').state).code,'interlock');
 assert.equal(dispatch(def,'import',{}).code,'cover');
 assert.equal(dispatch({...def,door:true},'arm').code,'interlock');
 assert.equal(dispatch({...def,door:true},'import',{...tiles(),materials:['invalid']}).code,'sample');
});
test('provenance and exported physical units',()=>{
 assert.equal(out.classification,'simulated');assert.equal(out.schema,'bts.raman-map.v1');assert.equal(out.shiftCm.length,out.signalTable.S.length);
 assert.ok(mapCsv(out).includes('SI-PS-CHECKER-532,1,1,1,2,30,18,'));
});
if(process.env.REFRESH_0510==='1'){write('verification.json',{note:fixture.note,cases});write('example-coupon.json',def.fixture);write('example-map.json',out);}
