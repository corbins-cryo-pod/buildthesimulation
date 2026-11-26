import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {initial,dispatch,sweep,maxwell,moduli,csv} from '../public/equipment/14-03/solver.mjs';
const dir=new URL('../public/equipment/14-03/',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,dir))),write=(n,x)=>writeFileSync(new URL(n,dir),JSON.stringify(x,null,2)+'\n');
const s=initial(),got=sweep(s);assert.equal(got.ok,true);const r=got.result,p=r.points,z=moduli(maxwell(),1);
const a={'newtonian-storage':p[1].storagePa,'loss-01hz':p[0].lossPa,'loss-1hz':p[1].lossPa,'loss-10hz':p[2].lossPa,phase:p[1].phaseDegrees,angle:p[1].imposedAngleRad,torque:p[1].torqueAmplitudeNm,'maxwell-storage-wtau1':z.storagePa,'maxwell-loss-wtau1':z.lossPa};
const accept=read('acceptance.json'), rows=accept.cases.map(c=>({...c,actual:a[c.id],pass:Math.abs(a[c.id]-c.expected)<=c.tolerance}));
for(const c of rows)test(c.id,()=>assert.ok(c.pass,JSON.stringify(c)));
test('hardware interlock and range',()=>{assert.equal(sweep({...s,gapMm:.01}).code,'range');assert.equal(sweep({...s,loaded:false}).code,'interlock');assert.equal(dispatch(s,'load').code,'fixture');assert.equal(sweep(dispatch(s,'head').state).code,'interlock');});
test('linear strain scales torque, not extracted moduli',()=>{const q=sweep({...s,strainPct:2,gapMm:2}).result.points[1];assert.ok(Math.abs(q.imposedAngleRad/p[1].imposedAngleRad-4)<1e-12);assert.ok(Math.abs(q.torqueAmplitudeNm/p[1].torqueAmplitudeNm-2)<1e-12);assert.equal(q.lossPa,p[1].lossPa);});
test('signed physical metadata and Newtonian viscosity fit',()=>{assert.equal(r.schema,'bts.rheology-sweep.v1');assert.equal(r.fit.viscosityPaS,2);assert.equal(r.fit.lossRMSEPa,0);assert.equal(r.sampleId,'VIRTUAL-N2');assert.ok(csv(r).includes('VIRTUAL-N2,1,1'));});
if(process.env.REFRESH_1403==='1'){write('verification.json',{scope:accept.scope,rows});write('example-sweep.json',r);write('example-material.json',s.sample);}
