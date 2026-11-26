import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {initial,defaults,parseMap,loadMap,selection,selectSite,replay,dispatch,siteSha256,csv} from '../public/equipment/10-13/solver.mjs';
const p=new URL('../public/equipment/10-13/',import.meta.url),a=new URL('../public/models/neuropixels-engineering/',import.meta.url);
const raw=readFileSync(new URL('electrode-coordinates.csv',a)),map=parseMap(raw.toString()),url=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(url(n),'utf8')),rows=[];
function check(id,expected,actual,unit='',tol=0){
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});assert.ok(pass,id);
}
const step=(s,k,v)=>{const q=dispatch(s,map,k,v);assert.ok(q.ok,q.message);return q.state;};
const sha=data=>createHash('sha256').update(data).digest('hex');
test('pinned engineering coordinate table and independent checks on every row',async()=>{
 assert.equal(sha(raw),siteSha256);
 check('Pinned geometric site rows',960,map.length,'sites');
 check('Closest reconstructed site from tip',200,map[0].yUm,'µm');
 check('Farthest reconstructed site from tip',9780,map.at(-1).yUm,'µm');
 assert.deepEqual([...new Set(map.map(x=>x.xUm))].sort((a,b)=>a-b),[-24,-8,8,24]);
 assert.equal(new Set(map.map(p=>p.yUm)).size,480);
 for(let i=2;i<960;i++)assert.ok(Math.abs(map[i].yUm-map[i-2].yUm-20)<1e-7);
 assert.deepEqual(await loadMap(async()=>new Response(raw)),map);
 await assert.rejects(loadMap(async()=>new Response(raw.toString().replace('-24.0','-23.0'))),/differs/);
});
test('independent channel and depth-code checks across alternate virtual banks',()=>{
 const s=initial(),r0=replay(map,s),b=step(s,'bank',1),r1=replay(map,b);
 check('Bank 0 channel 7 physical site',7,r0.selected.siteId);
 check('Bank 1 channel 7 physical site',391,r1.selected.siteId);
 check('Bank 1 channel 7 axial coordinate',4100,r1.selected.yUm,'µm',1e-8);
 check('Reference initial level bank 0',10.6,1e6*r0.selected.initialV,'µV',1e-9);
 check('Reference initial level bank 1',49,1e6*r1.selected.initialV,'µV',1e-9);
 check('Reference level shift between banks',38.4,1e6*(r1.selected.initialV-r0.selected.initialV),'µV',1e-9);
 assert.equal(r0.bankAt0.length,384);
 assert.ok(r1.trace.voltageV.every((v,i)=>Math.abs(v-r0.trace.voltageV[i]-38.4e-6)<1e-18));
});
test('bank 2 capacity and unavailable coordinates do not silently fabricate values',()=>{
 const s=step(initial(),'bank',2);
 assert.equal(selection(map,2,191).siteId,959);
 assert.deepEqual(selectSite(959),{bank:2,channel:191});
 check('Bank 2 capacity',192,replay(map,s).bankAt0.length,'sites');
 assert.equal(dispatch(s,map,'channel',192).ok,false);
 assert.equal(dispatch(s,map,'bank',3).ok,false);
 assert.equal(step(step(initial(),'channel',383),'bank',2).channel,0);
 assert.equal(dispatch(s,map,'site',960).ok,false);
});
test('world shift changes coordinates only and fixture validation is narrow',()=>{
 const s=initial(),a=replay(map,s),b=replay(map,step(s,'shift',2000));
 check('Pure display coordinate shift',2000,b.selected.worldUm[1]-a.selected.worldUm[1],'µm',1e-9);
 assert.deepEqual(a.trace,b.trace);
 assert.equal(dispatch(s,map,'shift',5001).ok,false);
 assert.equal(dispatch(s,map,'import',{...defaults,variant:'Neuropixels 2.0'}).ok,false);
 assert.equal(dispatch(s,map,'import',{...defaults,mapRevision:'OTHER'}).ok,false);
 assert.equal(dispatch(s,map,'fixture',{slopeUvPerUm:.06}).ok,false);
});
test('independent sinusoidal T/4 fixture and exact SI clock',()=>{
 const s=step(initial(),'fixture',{toneHz:1,durationMs:250}),r=replay(map,s);
 check('Independent quarter-period peak',18.6,1e6*r.trace.voltageV.at(-1),'µV',1e-9);
 check('Virtual sample interval',.001,r.trace.dtS,'s');
 assert.equal(r.trace.timeS.at(-1),.25);
 assert.equal(r.trace.timeS.length,251);
});
test('original GLB scale and all 960 visible anchors precisely match the CSV data',()=>{
 const manifest=json('interaction.json'),b=readFileSync(new URL('models/neuropixels-shank.glb',a)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 assert.equal(sha(b),manifest.assetSha256);assert.equal(b.length,886644);
 const root=j.nodes[j.scenes[j.scene].nodes[0]],scale=root.scale[0];
 assert.deepEqual(root.scale,[.001,.001,.001]);assert.equal(root.extras.specification.revision,'BTS-NPX1-R1');
 const nodes=root.children.map(i=>j.nodes[i]),site=nodes.filter(n=>Number.isInteger(n.extras?.site_id));
 check('Original GLB contact anchor count',960,site.length,'sites');
 assert.equal(new Set(site.map(n=>n.extras.site_id)).size,map.length);
 let max=0;
 for(const n of site){const q=map[n.extras.site_id];max=Math.max(max,...n.translation.map((x,i)=>Math.abs(x*scale*1e6-[q.xUm,q.yUm,q.zUm][i])));}
 check('Largest GLB-to-CSV mismatch',0,max,'µm',2e-9);
 const box=j.accessors[j.meshes[nodes[2].mesh].primitives[0].attributes.POSITION],ds=box.max.map((x,i)=>(x-box.min[i])*scale*1e6);
 check('Original active shank length',10000,ds[1],'µm',.001);check('Original active shank width',70,ds[0],'µm',.001);check('Original active shank thickness',24,ds[2],'µm',.001);
 assert.equal(nodes.length-site.length,6);
 const flatDraw=1+nodes.length-site.length;
 check('Conditioned original surface + site draws (static)',7,flatDraw,'draws');
});
test('export and published results match fresh run',()=>{
 assert.deepEqual(json('example-fixture.json'),defaults);
 const r=replay(map,initial()),{trace,bankAt0,...summary}=r;
 assert.deepEqual(json('example-summary.json'),{...summary,sampleCount:trace.timeS.length});
 assert.equal(readFileSync(url('example-trace.csv'),'utf8'),csv(r));
 const scope='Independent analytic synthetic signal, geometry and software checks. Source GLB/CSV bytes pinned; no device or biological measurement, routing verification or headset testing.';
 if(process.env.BTS_UPDATE_10_13==='1')writeFileSync(url('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
