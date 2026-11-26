import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {pinned,loadFixture,stitch,point,initial,dispatch,csv} from '../public/equipment/12-10/solver.mjs';
const p=new URL('../public/equipment/12-10/',import.meta.url),url=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(url(n),'utf8')),fixture=json('fixture.json'),rows=[];
function check(id,expected,actual,unit='',tol=0){
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});assert.ok(pass,id);
}
test('immutable synthetic fixture and consistent pixel geometry',async()=>{
 const raw=readFileSync(url('fixture.json'));assert.equal(createHash('sha256').update(raw).digest('hex'),pinned);
 assert.deepEqual(await loadFixture(async()=>new Response(raw)),fixture);
 await assert.rejects(loadFixture(async()=>new Response(raw.toString()+' ')),/fingerprint/);
 assert.deepEqual(fixture.slideMm,[76,26,1]);
});
test('independent geometric coverage and overlap inclusion–exclusion',()=>{
 const r=stitch(fixture),width=4*32-3*4,height=2*24-4;
 check('Registered mosaic pixels',width*height,r.coverage.covered,'pixels');
 check('Extra overlap contributions',8*32*24-width*height,r.coverage.overlapSamples,'samples');
 check('Pixels with duplicate coverage',12*height+4*width-12*4,r.coverage.uniqueOverlapPixels,'pixels');
 check('Maximum stored overlap difference',0,r.coverage.maxOverlapDifference,'intensity steps');
 check('Stage lattice residual',0,r.coverage.maxStageResidualPx,'pixels',1e-9);
});
test('source fiducials spanning edges resolve exactly once and have correct centres',()=>{
 const a=stitch(fixture),refs=[[29,8],[101,12],[57,21],[14,26],[85,33]];
 check('Unique fiducial components',5,a.fiducials.length,'marks');
 const got=a.fiducials.map(q=>q.pixelCenterIndex);assert.deepEqual(got,refs);
 for(const f of a.fiducials){assert.equal(f.pixels,13);assert.deepEqual(f.stageMm,[8+(f.pixelCenterIndex[0]+.5)*.5,2+(f.pixelCenterIndex[1]+.5)*.5]);}
 const reversed=stitch({...fixture,tiles:fixture.tiles.slice().reverse()});assert.deepEqual(reversed.fiducials,a.fiducials);
});
test('center and corner transform in millimetres; named tile navigation',()=>{
 const a=stitch(fixture),q=point(a,'R1C2',6,8);
 check('Example cursor X stage',39.25,q.stageMm[0],'mm');
 check('Example cursor Z stage',16.25,q.stageMm[1],'mm');
 assert.deepEqual(q.mosaicPixel,[62,28]);
 assert.deepEqual(point(a,'R0C0',0,0).stageMm,[8.25,2.25]);assert.throws(()=>point(a,'R0C0',32,0));
 assert.equal(dispatch(initial(),a,'next').state.selected,7);assert.equal(dispatch({...initial(),selected:7},a,'next').state.selected,0);
 assert.equal(dispatch(initial(),a,'pixel',{z:-1}).ok,false);
});
test('wrong stage placement and conflicting overlap fail rather than fabricate a seam',()=>{
 let fixture2=structuredClone(fixture);
 fixture2.tiles[2].originMm[0]+=.25;
 assert.throws(()=>stitch(fixture2),/offset disagrees/);
 fixture2=structuredClone(fixture);fixture2.tiles[1].pixels[0]=255;
 check('Changed duplicated sample','Rejected',(()=>{try{stitch(fixture2);return 'Accepted';}catch(e){assert.match(e.message,/overlap disagreement/);return 'Rejected';}})());
});
test('actual metric GLB, snapshot figure and named read-only action',async()=>{
 const b=readFileSync(url('vs200.glb')),m=json('interaction.json'),size=json('asset-metrics.json');
 const sc=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,seen=new Map();
 sc.traverse(o=>seen.set(o.name,(seen.get(o.name)??0)+1));
 const g=n=>sc.getObjectByName(n),d=n=>new T.Box3().setFromObject(g(n)).getSize(new T.Vector3()).toArray().map(v=>1000*v);
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.ports,...m.actions.map(a=>a.node)])assert.equal(seen.get(n),1,n);
 assert.deepEqual(g(m.frame.placementAnchor).getWorldPosition(new T.Vector3()).toArray(),[0,0,0]);
 assert.equal(m.actions.length,1);assert.equal(m.actions[0].action,'next');
 const cab=d(m.parts.cabinet),body=d('base_scanner_depth_reference'),plate=d(m.parts.sample);
 check('Cabinet catalog width',572,cab[0],'mm',.1);
 check('Cabinet catalog overall height',662.5,cab[1],'mm',.1);
 check('Base housing depth',597.5,body[2],'mm',.1);
 check('Cabinet approximate overall depth',671.5,cab[2],'mm',8);
 check('Inert slide X length',76,plate[0],'mm',.01);check('Inert slide Z width',26,plate[2],'mm',.01);
 assert.equal(size.bytes,b.length);assert.ok(size.bytes<2e6&&size.triangles<5e4&&size.primitives<=40);
});
test('exports preserve identity, offsets and verification provenance',()=>{
 const r=stitch(fixture),{pixels,...m}=r;
 assert.deepEqual(json('example-mosaic-summary.json'),m);
 assert.equal(readFileSync(url('example-fiducials.csv'),'utf8'),csv(r));
 const scope='Fixed inert test mosaic, analytic coordinate and fiducial verification, original dimensioned shell. Not biological data, real scanner registration/calibration, operation or headset test.';
 if(process.env.BTS_UPDATE_12_10==='1')writeFileSync(url('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
