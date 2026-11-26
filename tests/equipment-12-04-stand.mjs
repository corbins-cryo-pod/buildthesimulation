import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createHash} from 'node:crypto';
import {compare,csv,loadPair,manifest,dispatch,initial} from '../public/equipment/12-04/solver.mjs';
const p=new URL('../public/equipment/12-04/',import.meta.url),url=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(url(n),'utf8')),pair={wide:json('wide.json'),narrow:json('narrow.json')},rows=[];
function check(id,expected,actual,unit='',tol=0){
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});assert.ok(pass,id);
}
test('fixed source byte hashes, complete image arrays, inaccessible modification',async()=>{
 for(const k of ['wide','narrow'])assert.equal(createHash('sha256').update(readFileSync(url(k+'.json'))).digest('hex'),manifest[k]);
 const fetcher=async q=>new Response(readFileSync(url(q.split('/').at(-1))));
 assert.deepEqual(await loadPair(fetcher),pair);
 await assert.rejects(loadPair(async q=>new Response(readFileSync(url(q.split('/').at(-1)),'utf8').replace('4225','4224')+' ')),/does not match/);
 assert.equal(pair.wide.pixelsQ16.length,65**2);assert.equal(pair.narrow.pixelsQ16.length,65**2);
});
test('independent half-height values and inverse pixel-spacing benchmark',()=>{
 const v=compare(pair);
 check('Broad spot FWHM analytic reference',240,v.wide.widthNm,'nm',.02);
 check('Narrow spot FWHM analytic reference',80,v.narrow.widthNm,'nm',.02);
 check('Wide minus narrow',160,v.deltaNm,'nm',.04);
 check('Width ratio',3,v.ratio,'ratio',.001);
 assert.deepEqual([v.wide.leftNm,v.wide.rightNm,v.narrow.leftNm,v.narrow.rightNm],[-120,120,-40,40]);
 for(const k of ['wide','narrow']){
  const q=v[k],index=32+q.rightNm/10;
  assert.ok(Math.abs(q.samples[index].value-q.threshold)<2/65535);
 }
});
test('orthogonal symmetry and failed faint region',()=>{
 const x=compare(pair,'x',32),y=compare(pair,'y',32);
 check('Orthogonal broad width difference',0,x.wide.widthNm-y.wide.widthNm,'nm',.02);
 check('Orthogonal narrow width difference',0,x.narrow.widthNm-y.narrow.widthNm,'nm',.02);
 const q=compare(pair,'x',36);assert.ok(Math.abs(q.wide.widthNm-240)<.02);
 const s=dispatch(initial(),pair,'line',0).state;
 check('Faint off-center line','Rejected',dispatch(s,pair,'run').ok?'Accepted':'Rejected');
 assert.equal(dispatch(s,pair,'line',65).ok,false);assert.equal(dispatch(s,pair,'axis','z').ok,false);
});
test('read-only view and provenance remain independent of measurement',()=>{
 const q=dispatch(initial(),pair,'run');
 const view=dispatch(q.state,pair,'view');
 assert.equal(view.state.visible,'narrow');assert.equal(view.state.result,q.state.result);
 assert.deepEqual(json('example-comparison.json'),q.state.result);
 assert.equal(readFileSync(url('example-profiles.csv'),'utf8'),csv(q.state.result));
 assert.equal(q.state.result.narrow.sourceHash,manifest.narrow);
 assert.equal(dispatch(view.state,pair,'reset').state.line,32);
});
test('genuine source GLB standing geometry, anchors and single read-only action',async()=>{
 const b=readFileSync(url('stellaris8.glb')),m=json('interaction.json'),metrics=json('asset-metrics.json');
 const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,seen=new Map();
 scene.traverse(n=>seen.set(n.name,(seen.get(n.name)??0)+1));
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.ports,...m.actions.map(a=>a.node)])assert.equal(seen.get(n),1,n);
 assert.equal(m.actions.length,1);assert.equal(m.actions[0].action,'view');
 assert.deepEqual(scene.getObjectByName(m.frame.placementAnchor).getWorldPosition(new T.Vector3()).toArray(),[0,0,0]);
 const base=new T.Box3().setFromObject(scene.getObjectByName('stand_nominal_proxy')).getSize(new T.Vector3());
 check('Proxy stand base modeled width',310,base.x*1000,'mm',.02);
 check('Proxy stand base modeled depth',500,base.z*1000,'mm',.02);
 assert.equal(metrics.bytes,b.length);assert.ok(metrics.bytes<2e6&&metrics.triangles<5e4&&metrics.primitives<=40);
});
test('published verification matches results',()=>{
 const scope='Independent analytical checks of two fixed synthetic image widths; hashed data and original model geometry only. No real image acquisition, microscope calibration or headset test.';
 if(process.env.BTS_UPDATE_12_04==='1')writeFileSync(url('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
