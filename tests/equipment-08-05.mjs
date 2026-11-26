import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {initial,fixture,powerFraction,overlaps,dispatch,sweep,csv} from '../public/equipment/08-05/solver.mjs';
const d=new URL('../public/equipment/08-05/',import.meta.url),s=initial(),f=fixture(),run=q=>{const o=sweep(q);assert.equal(o.ok,true,o.message);return o.result;},p=run(s),off=run({...s,fixture:{...f,emitterAxisUm:[1.5,0],receiverAxisUm:[-.5,0]}});
const map={'center-peak':p.peakAtCurrentY.stageXUm,'peak-efficiency':p.peakAtCurrentY.powerFraction,'offset-plus-five':powerFraction(f,5,0),'mirror-symmetry':powerFraction(f,5,0)-powerFraction(f,-5,0),'off-axis-center':off.peakAtCurrentY.stageXUm,'pad-overlap-at-five':overlaps(f,5,0)[0].fraction,'zero-pad-overlap':overlaps(f,20,0)[0].fraction,'open-guard':sweep({...s,closed:false}).code};
const raw=JSON.parse(readFileSync(new URL('acceptance.json',d))),rows=raw.cases.map(x=>({...x,actual:map[x.id],pass:x.tol===undefined?x.expected===map[x.id]:Math.abs(x.expected-map[x.id])<=x.tol}));
for(const r of rows)test(r.id,()=>assert.ok(r.pass,JSON.stringify(r)));
test('virtual placement state and registered axes',()=>{
 const t=dispatch({...s,fixture:off.reference},'center').state;assert.equal(t.dx,2);assert.equal(run(t).pose.powerFraction,.8);
 assert.equal(sweep({...s,dy:26}).code,'range');assert.equal(sweep(dispatch(s,'head').state).code,'guard');
});
test('increasing vertical mismatch lowers the attainable peak, not its X',()=>{const z=run({...s,dy:5});assert.equal(z.peakAtCurrentY.stageXUm,0);assert.ok(Math.abs(z.peakAtCurrentY.powerFraction-.29430355293715)<1e-10);});
test('export records pose, pad projection, and lineage without claiming electrical connectivity',()=>{assert.equal(p.sampleRevision,1);assert.equal(p.pads[0].emitterId,'DIE_PAD_A');assert.match(p.pads[0].classification,/no bond/);assert.ok(csv(p).includes('stageX_um,stageY_um,power_fraction'));});
if(process.env.REFRESH_0805==='1')for(const [n,j] of Object.entries({'verification.json':{scope:raw.scope,rows},'example-fixture.json':f,'example-alignment.json':p}))writeFileSync(new URL(n,d),JSON.stringify(j,null,2)+'\n');
