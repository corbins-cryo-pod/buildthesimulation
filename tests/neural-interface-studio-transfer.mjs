import test from 'node:test';
import assert from 'node:assert/strict';
import { importDesigner,conductorSvg } from '../src/lib/neural-interface-studio/designer-transfer.js';
import { designerDemo,TRANSFER_DEMOS } from '../src/lib/neural-interface-studio/transfer-demos.js';
import { preset,PRESETS,fabricate,validateProject,exportProject,importProject,maskPath,domainOf,MAX_GRID_CELLS } from '../src/lib/neural-interface-studio/model.js';
const clone=x=>JSON.parse(JSON.stringify(x)),convert=(s,options)=>importDesigner(JSON.stringify(s),options),close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const metrics=r=>({channels:r.channels,metrics:r.metrics,process:r.process});
for(const [id]of TRANSFER_DEMOS)test(`${id}: every saved coordinate, width and source mapping survives transfer`,()=>{
  const s=designerDemo(id),before=JSON.stringify(s),{project:p,report}=convert(s);
  assert.equal(JSON.stringify(s),before);assert.equal(p.design.nets.length,s.contacts.length);
  s.routes.forEach((t,i)=>{assert.deepEqual(p.design.traces[i].points,t.points.map(q=>[q.x,q.y]));assert.equal(p.design.traces[i].width,t.width);assert.equal(p.design.sites[i].sourceId,t.contactId);assert.equal(report.mapping[i].sourcePadId,t.padId);});
  assert.ok(p.design.window.minX<0);assert.equal(p.design.window.widthUm%4,0);
});
for(const [id]of TRANSFER_DEMOS)test(`${id}: fabricated layout has isolated accessible channels`,()=>{
  const {project:p}=convert(designerDemo(id)),r=fabricate(p);
  assert.equal(r.metrics.accessibleCount,p.design.nets.length);assert.equal(r.metrics.shortCount,0);assert.equal(r.metrics.openCount,0);
  assert.ok(r.channels.every(c=>c.solver.converged&&c.resistanceOhm>0));
});
test('shared sheet resistance is retained through explicit film thickness',()=>{
  const s=designerDemo(),a=convert(s,{metalThicknessUm:.2}),b=convert(s,{metalThicknessUm:.4});
  close(a.project.recipe.resistivityOhmM,4e-8);close(b.project.recipe.resistivityOhmM,8e-8);
  close(fabricate(a.project).channels[0].resistanceOhm,fabricate(b.project).channels[0].resistanceOhm);
});
test('annular holes survive side-entry paths and axis inset',()=>{
  const {project:p}=convert(designerDemo('annular')),r=fabricate(p),g=r.geometry,s=p.design.sites[0];
  const at=(x,y)=>Math.floor((y-g.minY)/g.cellUm)*g.nx+Math.floor((x-g.minX)/g.cellUm);
  assert.equal(g.metal[at(s.x,s.y)],0);assert.equal(g.exposed[at(s.x,s.y)],0);
  const o=p.design.openings[0];assert.equal(o.w,52);assert.equal(o.inner,32);
});
test('envelope radius is retained and used by substrate raster',()=>{
  const {project:p}=convert(designerDemo()),r=fabricate(p,9,{resistance:false}),g=r.geometry,b=p.design.outlineShape;
  const at=(x,y)=>Math.floor((y-g.minY)/g.cellUm)*g.nx+Math.floor((x-g.minX)/g.cellUm);
  assert.equal(b.radius,40);assert.equal(g.body[at(b.minX+1,b.minY+1)],0);assert.equal(g.body[at(b.minX+41,b.minY+1)],1);
});
test('Manhattan miter differs from a rounded corner at an independent test point',()=>{
  const {project:p}=convert(designerDemo('bent'));p.cellUm=1;
  const a=fabricate(p,9,{resistance:false});p.design.traces.forEach(t=>t.join='round');const b=fabricate(p,9,{resistance:false});
  const g=a.geometry,x=5.5,y=p.design.sites[0].y-5.5,i=Math.floor((y-g.minY)/g.cellUm)*g.nx+Math.floor((x-g.minX)/g.cellUm);
  assert.equal(g.metal[i],1);assert.equal(b.geometry.metal[i],0);
});
test('all nine legacy presets preserve previous domain and reported reference',()=>{
  for(const [id]of PRESETS){const r=fabricate(preset(id),9,{resistance:false});assert.equal(r.geometry.metal.length,80000);assert.equal(r.geometry.minX,0);}
  close(fabricate(preset()).channels[0].resistanceOhm,13.664,1e-7);
});
test('negative-origin translation does not change conductivity or exposure',()=>{
  const p=preset(),a=fabricate(p);p.design.window={minX:-800,minY:-1200,widthUm:320,heightUm:1000,pivotX:-640,pivotY:-706};
  for(const list of [p.design.sites,p.design.pads,p.design.openings])for(const s of list){s.x-=800;s.y-=1200;}
  for(const t of p.design.traces)for(const q of t.points){q[0]-=800;q[1]-=1200;}
  p.design.outline=p.design.outline.map(([x,y])=>[x-800,y-1200]);assert.deepEqual(metrics(fabricate(p)),metrics(a));
});
test('dynamic domain project v3 round trip retains provenance and recomputes',()=>{
  const {project:p}=convert(designerDemo('annular')),text=exportProject(p),q=importProject(text);
  assert.equal(JSON.parse(text).version,3);assert.deepEqual(q.design.provenance,p.design.provenance);assert.deepEqual(fabricate(p),fabricate(q));
});
test('legacy v1 and v2 inputs remain accepted without a dynamic domain',()=>{
  for(const version of [1,2]){const v=JSON.parse(exportProject(preset()));v.version=version;delete v.design.window;assert.equal(importProject(JSON.stringify(v)).design.sites.length,4);}
});
test('a new run does not mutate a retained input snapshot',()=>{
  const {project:p}=convert(designerDemo()),record=JSON.parse(exportProject(p)),before=JSON.stringify(record);p.recipe.overlayXUm=25;fabricate(p);assert.equal(JSON.stringify(record),before);
});
test('shifted openings change exposure, not the retained metal resistance',()=>{
  const {project:p}=convert(designerDemo()),a=fabricate(p);p.recipe.overlayXUm=24;const b=fabricate(p);
  assert.ok(b.channels.some((c,i)=>c.siteAreaUm2<a.channels[i].siteAreaUm2));close(a.channels[0].resistanceOhm,b.channels[0].resistanceOhm);
});
test('declared routed status cannot override geometric disconnection',()=>{
  const s=designerDemo();s.routes[0].points[0].x+=150;const {project:p}=convert(s),r=fabricate(p);assert.equal(r.channels[0].connected,false);assert.equal(r.channels[0].resistanceOhm,null);
});
test('refinement is explicit and retains dimensions',()=>{
  const {project:p}=convert(designerDemo()),before=clone(p.design.window),a=fabricate(p);p.cellUm=1;const b=fabricate(p);
  assert.deepEqual(p.design.window,before);assert.equal(a.geometry.widthUm,b.geometry.widthUm);assert.equal(b.geometry.nx,a.geometry.nx*2);assert.ok(Math.abs(b.channels[0].resistanceOhm/a.channels[0].resistanceOhm-1)<.02);
});
test('mask export path includes physical coordinate origin',()=>assert.equal(maskPath(new Uint8Array([1,1]),2,2,-10,-20),'M-10 -20h4v2h-4z'));
test('grid budget refuses excess work before allocation without scaling',()=>{
  const p=preset();p.design.window={minX:0,minY:0,widthUm:2000,heightUm:2000};const before=clone(p);assert.throws(()=>validateProject(p),/Grid exceeds/);assert.deepEqual(p,before);assert.equal(MAX_GRID_CELLS,640000);
});
test('thin-trace resolution warning is retained as provenance',()=>{const s=designerDemo();s.routes[0].width=5;const r=convert(s);assert.match(r.report.warnings[0],/2.50 cells/);assert.equal(r.project.design.provenance.warnings.length,1);});
const invalids=[
 ['unsupported units',s=>s.units='mm',/explicitly use/],['missing units',s=>delete s.units,/explicitly use/],
 ['multiple metal layers',s=>{s.routes[1].layer=2;s.pads[1].layer=2;},/plane 1/],
 ['unrouted airwire',s=>s.routes[0].status='unrouted',/airwires/],['conflicting lead',s=>s.routes[0].status='conflict',/airwires/],
 ['missing saved route',s=>s.routes.pop(),/exactly one/],['wrong pad mapping',s=>s.routes[0].padId=s.pads[1].id,/references/],
 ['duplicate contact IDs',s=>s.contacts[1].id=s.contacts[0].id,/unique/],['duplicate routes',s=>s.routes[1].contactId=s.contacts[0].id,/unique/],
 ['mismatched channels',s=>s.routes[0].channel=2,/channel numbering/],['ribbon substrate',s=>s.routing.substrateStyle='ribbons',/ribbon/],
 ['unsupported dielectric',s=>s.routing.dielectric='Parylene-C',/Polyimide/],['unknown metal',s=>s.routing.material='unknown',/conductor/],
 ['zero sheet resistance',s=>s.routing.sheetResistance=0,/sheet resistance/],['oversized grid',s=>s.pads[0].x=15000,/Grid exceeds/],
 ['nonfinite position',s=>s.contacts[0].x=Infinity,/finite/],['unknown shape',s=>s.contacts[0].shape='triangle',/shape/],
 ['zero-length segment',s=>s.routes[0].points.push({...s.routes[0].points.at(-1)}),/zero-length/],
 ['route point count',s=>s.routes[0].points=Array.from({length:257},(_,i)=>({x:i,y:0})),/supported count/]
];
for(const [name,mutate,pattern]of invalids)test(`rejects ${name} without changing the source`,()=>{const s=designerDemo();mutate(s);const before=JSON.stringify(s);assert.throws(()=>convert(s),pattern);assert.equal(JSON.stringify(s),before);});
test('oversized ring aperture inset is rejected rather than filled or enlarged',()=>assert.throws(()=>convert(designerDemo('annular'),{openingInsetUm:12}),/removes/));
test('file size, schema, malformed JSON and unsupported grid are bounded',()=>{assert.throws(()=>importDesigner(' '.repeat(2000001)));assert.throws(()=>importDesigner('{}'),/version 1/);assert.throws(()=>importDesigner('{'));assert.throws(()=>convert(designerDemo(),{cellUm:.5}),/Grid must/);});

test('conductor SVG declares physical dimensions and origin',()=>{const {project:p}=convert(designerDemo()),r=fabricate(p,9,{resistance:false}),g=r.geometry,text=conductorSvg(r);assert.ok(text.includes(`width="${g.widthUm/1000}mm"`));assert.ok(text.includes(`height="${g.heightUm/1000}mm"`));assert.ok(text.includes(`viewBox="${g.minX} ${g.minY} ${g.widthUm} ${g.heightUm}"`));assert.throws(()=>conductorSvg(null));});
test('unreimportable oversized notebooks are not exported silently',()=>{const p=preset();p.design.extra='x'.repeat(2000000);assert.throws(()=>exportProject(p),/Notebook exceeds/);});
