import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,exportAnnotation,initial,lookup,makeExample,readVolume,seamDemo,worldFromIndex} from '../public/equipment/01-04/solver.mjs';
const dir=new URL('../public/equipment/01-04/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const volume=readVolume(makeExample()),s=action(initial(),{type:'demo'}),z=action(s,{type:'zoom'}),example=exportAnnotation(z),p=lookup(volume,0,seamDemo[1]),q=lookup(volume,1,seamDemo[1]);
const glb=get('connectomics-console.glb'),g=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12))),n=name=>g.nodes.find(n=>n.name===name);
const a=g.meshes[n('desk_top').mesh].primitives.map(p=>g.accessors[p.attributes.POSITION]),bbox=[0,1,2].map(i=>Math.max(...a.map(x=>x.max[i]))-Math.min(...a.map(x=>x.min[i])));
const reject=f=>{try{f();return false}catch{return true}};
const actual={
 'seam-world':p.worldNm,'seam-fine-index':p.indexVox,'seam-coarse-index':q.indexVox,'seam-fine-owner':p.tileId,'seam-coarse-owner':q.tileId,'seam-label-fine':p.segmentId,'seam-label-coarse':q.segmentId,
 'adjacent-left-owner':lookup(volume,0,[1063.999,-148,680]).tileId,
 'skeleton-retains-canonical-position':JSON.stringify(s.nodes)===JSON.stringify(z.nodes)&&JSON.stringify(z.cursor)===JSON.stringify(seamDemo[1]),
 'out-of-volume-rejected':reject(()=>lookup(volume,0,[1128,-148,680])),
 'alternate-segment-link-rejected':reject(()=>action(action(s,{type:'select',payload:[1092,-116,680]}),{type:'add'})),
 'desk-width':bbox[0]
};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):JSON.stringify(actual[c.id])===JSON.stringify(c.expected))?'PASS':'FAIL'}));
const metrics={bytes:glb.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),deskGltfXyzM:bbox};
const proof={schema:'bts.connectomics.verification.v1',metrics,cases,scope:'Synthetic two-tile coordinate, indexing, provenance and nominal geometry checks; not hardware, headset, experimental connectomics or service compatibility.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-annotation.json',example);
 writeFileSync(new URL('tiny-volume.json',dir),JSON.stringify(makeExample())+'\n');
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'01-04',asset:'/equipment/01-04/connectomics-console.glb',scale:'glTF meter, +Y up and +Z toward operator; volume nm are a separate logical coordinate frame',metrics,implementation:'Display and future XR share DOM-independent action(); no immersive browser/headset run',nodes:[
  {node:'zoom_trackball',label:'Toggle native or coarse rendering',action:{type:'zoom'},diameterM:.084},
  {node:'annotation_key',label:'Append annotation at canonical cursor',action:{type:'add'},boundsM:[.045,.017,.043]},
  {node:'primary_texture_anchor',label:'Live XY slice texture',panelXYm:[.720,.407]},
  {node:'side_texture_anchor',label:'Live selection provenance texture',panelXYm:[.445,.279]}
 ]});
}
test('Locked seam lookup, same label and point across display scales, GLB anchors',()=>{
 assert.deepEqual(read('verification.json'),proof);
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 assert.deepEqual(exportAnnotation(s).nodes,example.nodes);assert.deepEqual(example,read('example-annotation.json'));
 assert.deepEqual(example.nodes.map(n=>n.prevNodeId),[null,'node-1','node-2']);
 assert.deepEqual(example.edits.map(e=>e.revision),[1,2,3,4]);assert.equal(example.selection.segmentId,17);
 assert.deepEqual(p.tileLocalVox,[0,6,4]);assert.deepEqual(q.tileLocalVox,[0,3,2]);
 for(let x=1048;x<=1080;x+=1)assert.equal(lookup(volume,0,[x,-148,680]).segmentId,17);
 for(const name of ['zoom_trackball','annotation_key','primary_texture_anchor','side_texture_anchor']) assert.ok(n(name));
});
test('Synthetic input, single-segment trace and axis conversion reject incompatible data',()=>{
 const doc=read('tiny-volume.json');assert.deepEqual(doc,makeExample());
 const w=worldFromIndex(volume,0,[8,6,4],false);assert.deepEqual(w,[1064,-152,660]);
 assert.throws(()=>lookup(volume,1,[1064,-148,820]),/outside/);
 assert.throws(()=>action(initial(),{type:'slice',payload:8}),/0 to 7/);
 const bad=structuredClone(doc);bad.tiles[1].offsetVox[0]=9;assert.throws(()=>readVolume(bad),/tile bounds/);
 const base=initial({...doc,volumeId:'SYNTH-CUSTOM',originNm:[-82,-200,-500]});
 assert.throws(()=>action(base,{type:'demo'}),/bundled/);
 assert.equal(lookup(base.volume,0,base.cursor).segmentId,17);
});
