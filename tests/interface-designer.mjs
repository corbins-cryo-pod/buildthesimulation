import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_CONTACTS,DEFAULT_PATTERN,DEFAULT_ROUTING,generatePattern,normalizedContact,contactArea,contactBounds,contactPort,hitContact,assignPads,parseDesign,normalizeRouting} from '../src/lib/designer/model.js';
import {routeDesign,roundedPath,serpentineTail,pathLength} from '../src/lib/designer/routing.js';
import {checkDesign} from '../src/lib/designer/checks.js';
import {exportSvg,exportNetlist,designDocument} from '../src/lib/designer/export.js';

const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
test('pattern generation handles one, hundreds, rotated arrays and the contact limit',()=>{
  for(const layout of ['grid','hex','line','circle','concentric','arc','perimeter','spiral']){
    const one=generatePattern({...DEFAULT_PATTERN,layout,rows:1,cols:1,count:1,rings:1});assert.equal(one.length,1);assert.ok(Number.isFinite(one[0].x+one[0].y));
  }
  assert.equal(generatePattern({...DEFAULT_PATTERN,rows:16,cols:16}).length,256);
  assert.equal(generatePattern({...DEFAULT_PATTERN,rows:256,cols:256}).length,MAX_CONTACTS);
  const rotated=generatePattern({...DEFAULT_PATTERN,rows:1,cols:2,pitchX:200,rotation:90,x:10,y:20},42);
  near(rotated[0].x,10);near(rotated[0].y,-80);near(rotated[1].y,120);assert.equal(rotated[1].id,'E43');
  assert.equal(generatePattern({...DEFAULT_PATTERN,layout:'perimeter',rows:5,cols:4}).length,14);
  const concentric=generatePattern({...DEFAULT_PATTERN,layout:'concentric',count:4,rings:3});assert.equal(concentric.length,12);near(Math.hypot(concentric[8].x,concentric[8].y),960);
});
test('areas, rotated extents and connection ports preserve conductive geometry',()=>{
  const ring=normalizedContact({shape:'ring',w:100,inner:80});near(contactArea(ring),900*Math.PI);
  for(const side of ['left','right','top','bottom']){const p=contactPort(ring,side,8);const radial=Math.hypot(p.x,p.y);assert.ok(radial>40&&radial<50);}
  for(const shape of ['circle','square','rectangle','ellipse'])for(const rotation of [0,30,90,135]){
    const c=normalizedContact({x:50,y:-20,shape,w:80,h:30,rotation});
    for(const side of ['left','right','top','bottom']){const p=contactPort(c,side);assert.ok(hitContact(c,p.x,p.y));}
    const b=contactBounds(c);assert.ok(b.minX<c.x&&b.maxY>c.y);
  }
  near(contactArea(normalizedContact({shape:'ellipse',w:80,h:30})),600*Math.PI);
});
test('every exit arrangement creates a unique one-to-one pad map and respects overrides',()=>{
  const contacts=generatePattern({...DEFAULT_PATTERN,rows:4,cols:4});
  for(const arrangement of ['left','right','top','bottom','split-lr','split-tb','interleave-lr','rows-lr','cols-tb','four-sides']){
    const pads=assignPads(contacts,{...DEFAULT_ROUTING,arrangement});assert.equal(pads.length,contacts.length);assert.equal(new Set(pads.map(p=>p.id)).size,contacts.length);assert.equal(new Set(pads.map(p=>p.channel)).size,contacts.length);
    if(['left','right','top','bottom'].includes(arrangement))assert.ok(pads.every(p=>p.side===arrangement));
  }
  const pads=assignPads([{...contacts[0],exit:'bottom'},...contacts.slice(1)],{...DEFAULT_ROUTING,arrangement:'left'});assert.equal(pads.find(p=>p.contactId==='E1').side,'bottom');
});
test('default 64-site design routes all nets and endpoints remain on their own contacts and pads',()=>{
  const contacts=generatePattern(DEFAULT_PATTERN),result=routeDesign(contacts,DEFAULT_ROUTING),checks=checkDesign(contacts,DEFAULT_ROUTING,result);
  assert.equal(checks.routed,64);assert.equal(checks.errors,0);assert.equal(result.routes.length,64);
  for(const t of result.routes){const c=contacts.find(c=>c.id===t.contactId),p=result.pads.find(p=>p.id===t.padId);assert.ok(hitContact(c,t.points[0].x,t.points[0].y));assert.deepEqual(t.points.at(-1),{x:p.x,y:p.y});assert.equal(p.layer,t.layer);assert.ok(t.layer>=1&&t.layer<=4);assert.ok(t.length>0);near(t.resistance,t.length/t.width*DEFAULT_ROUTING.sheetResistance);}
});
// Independent analytic segment-distance checks supplement the grid router.
const pointDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function segmentDistance(a,b,c,d){const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);if(ab1*ab2<0&&cd1*cd2<0)return 0;return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));}
test('routed traces on a common plane maintain independent centerline clearance',()=>{
  const contacts=generatePattern({...DEFAULT_PATTERN,rows:4,cols:4}),r={...DEFAULT_ROUTING,layers:2},result=routeDesign(contacts,r),routes=result.routes.filter(t=>t.status==='routed');assert.equal(routes.length,16);
  for(let i=0;i<routes.length;i++)for(let j=0;j<i;j++){const a=routes[i],b=routes[j];if(a.layer!==b.layer)continue;let gap=Infinity;for(let x=1;x<a.points.length;x++)for(let y=1;y<b.points.length;y++)gap=Math.min(gap,segmentDistance(a.points[x-1],a.points[x],b.points[y-1],b.points[y]));assert.ok(gap>=r.width+r.gap-1e-5,`${a.contactId} / ${b.contactId}: ${gap}`);}
});
test('unresolved routes and direct collisions are explicit and reach checks / exports',()=>{
  const contacts=generatePattern({...DEFAULT_PATTERN,rows:8,cols:8}),r={...DEFAULT_ROUTING,layers:1,arrangement:'left'},result=routeDesign(contacts,r),checks=checkDesign(contacts,r,result);assert.ok(checks.unconnected>0);assert.ok(checks.errors>0);
  const svg=exportSvg(contacts,r,result,'metal',1);assert.equal((svg.match(/<polyline/g)||[]).length,checks.routed);assert.match(exportNetlist(contacts,result),/unrouted/);
  const directR={...r,style:'straight'},direct=routeDesign(contacts,directR);assert.ok(direct.routes.some(t=>t.status==='conflict'));assert.ok(checkDesign(contacts,directR,direct).conflicts>0);
});
test('curves retain endpoints and increase serpentine path length without changing net identity',()=>{
  const points=[{x:0,y:0},{x:1000,y:0},{x:1000,y:1000}],rounded=roundedPath(points,100),wave=serpentineTail(points,50,200);
  assert.deepEqual(rounded[0],points[0]);assert.deepEqual(rounded.at(-1),points.at(-1));assert.ok(pathLength(rounded)<pathLength(points));assert.deepEqual(wave[0],points[0]);assert.deepEqual(wave.at(-1),points.at(-1));assert.ok(pathLength(wave)>pathLength(points));
});
test('selected process thresholds flag shortfalls instead of implying qualification',()=>{
  const contacts=[normalizedContact({id:'thin-ring',shape:'ring',w:40,inner:39}),normalizedContact({id:'too-close',x:40,w:40})],r={...DEFAULT_ROUTING,width:1,gap:1,padPitch:46};
  const report=checkDesign(contacts,r,{routes:[],pads:[],routingNotes:[]});for(const code of ['linewidth','clearance','pad-spacing','contact-feature','contact-spacing','unrouted'])assert.ok(report.issues.some(i=>i.code===code),code);
});
test('designs round-trip with physical units and safely escaped exports',()=>{
  const contacts=generatePattern({...DEFAULT_PATTERN,rows:2,cols:2,shape:'ring'}),r=normalizeRouting(DEFAULT_ROUTING),result=routeDesign(contacts,r),checks=checkDesign(contacts,r,result),json=designDocument('Demo',contacts,r,result,checks),loaded=parseDesign(JSON.parse(JSON.stringify(json)));
  assert.deepEqual(loaded.contacts,contacts);assert.equal(loaded.routing.layers,4);assert.match(exportSvg(contacts,r,result,'review'),/width="[0-9.]+mm"/);assert.match(exportSvg(contacts,r,result,'openings'),/fill-rule="evenodd"/);
  assert.equal((exportSvg(contacts,r,result,'metal',2).match(/id="metal-/g)||[]).length,1);
  assert.throws(()=>parseDesign(null),/version 1/);assert.throws(()=>parseDesign({...json,units:'mm'}),/micrometers/);assert.throws(()=>parseDesign({...json,contacts:[contacts[0],contacts[0]]}),/unique/);assert.throws(()=>parseDesign({...json,contacts:Array(MAX_CONTACTS+1).fill(contacts[0])}),/exceeds/);
  const unsafe={...contacts[0],id:'=HYPERLINK("x")'},evilResult={routes:[{...result.routes[0],contactId:unsafe.id}]};assert.match(exportNetlist([unsafe],evilResult),/"'=HYPERLINK/);
  const unsafeSvg=exportSvg([unsafe],r,evilResult,'metal',result.routes[0].layer);assert.ok(!unsafeSvg.includes('data-net="=HYPERLINK("'));assert.match(unsafeSvg,/&quot;/);
});
