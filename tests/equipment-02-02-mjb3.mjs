import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,exposure,pose,fit,transform,inverse,solveAlignment,overlay,checkCouponMarks,stageScenePose,sceneGeometryMm} from '../public/equipment/02-02/solver.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t, a+' != '+b);
const mask={id:'SQUARE-REFERENCE',revision:0,clear:[{id:'open',x:0,y:0,w:2,h:2}],fiducials:[{id:'left',x:-5,y:5},{id:'right',x:5,y:5}]};
const square={...defaults,mask,pitchMm:.1};
test('Independent 2 × 2 mm aperture, 25 mW/cm² × 4 s: 400 cells at 100 mJ/cm², 4 mm²',()=>{const r=exposure(square).sampleRevision;assert.equal(r.statistics.exposedPixels,400);near(r.statistics.exposedAreaMm2,4);near(r.statistics.maxDoseMjCm2,100);assert.equal(r.grid.values.filter(x=>x===100).length,400)});
test('Known 1 mm stage translation shifts pattern left 10 pixels; dose/area conserved',()=>{const r=exposure({...square,xMm:1}).sampleRevision;const xs=r.grid.values.flatMap((v,i)=>v?[i%r.grid.nx]:[]);assert.equal(Math.min(...xs),60);assert.equal(Math.max(...xs),79);near(r.statistics.exposedAreaMm2,4);near(r.fiducials[0].residualMm[0],1)});
test('Record acceptance: valid fit and centered edge, rejection beyond travel preserves input',()=>{const incoming=structuredClone(square),before=JSON.stringify(incoming);assert.ok(fit(incoming).ok);assert.ok(exposure({...incoming,xMm:3}).ok);const fail=exposure({...incoming,xMm:3.001});assert.equal(fail.code,'travel');assert.equal(fail.sampleRevision,null);assert.equal(JSON.stringify(incoming),before);assert.equal(exposure({...incoming,thetaDeg:15.001}).code,'travel')});
test('Fit rejects overhang and uncovered assumed holes; interlocks refuse exposure',()=>{assert.equal(exposure({...square,widthMm:24,heightMm:24}).code,'chuck');assert.equal(exposure({...square,widthMm:6}).code,'vacuum');for(const k of ['loaded','clamped','contact'])assert.equal(exposure({...square,[k]:false}).code,'interlock')});
test('Control response: doubling time doubles dose, geometry unchanged',()=>{const a=exposure(square).sampleRevision,b=exposure({...square,seconds:8}).sampleRevision;near(b.statistics.maxDoseMjCm2,2*a.statistics.maxDoseMjCm2);assert.equal(a.statistics.exposedPixels,b.statistics.exposedPixels)});
test('Analytic rigid transform: 90° test outside operating span and round-trip within span',()=>{const a=transform(1,0,{xMm:2,yMm:3,thetaDeg:90});near(a[0],2);near(a[1],4);const s={xMm:.3,yMm:-1,thetaDeg:15};const b=inverse(...transform(2,-4,s),s);near(b[0],2);near(b[1],-4)});
test('Mask validation, revision and example schema',()=>{assert.equal(exposure({...square,mask:{...mask,clear:[]}}).code,'mask');const a=exposure(defaults).sampleRevision;assert.equal(a.sampleId,defaults.sampleId);assert.equal(a.parentRevision,0);assert.equal(a.revision,1);assert.equal(a.grid.values.length,a.grid.nx*a.grid.ny);assert.equal(a.schema,'bts.lithography.latent-dose.v1')});
test('Geometry source uses mm, chuck and mask are documented scale and stable pivots',()=>{const m=JSON.parse(readFileSync(new URL('../public/equipment/02-02/model-source.json',import.meta.url)));const nodes=Object.fromEntries(m.nodes.map(n=>[n.name,n]));assert.equal(nodes.chuck.size[0],25.4);assert.equal(nodes.mask_glass.size[0],76.2);assert.equal(nodes.mask_glass.size[2],76.2);assert.equal(nodes.coupon.parent,'stage_pose');for(const key of ['transport','stage_pose','contact_lever','mask_holder','microscope','exposure_head'])assert.ok(nodes[key]);const g=JSON.parse(readFileSync(new URL('../public/equipment/02-02/mjb3.gltf',import.meta.url)));assert.equal(g.asset.version,'2.0');assert.equal(g.nodes.length,m.nodes.length);assert.ok(g.buffers[0].byteLength>0)});

test('Independent offset coupon coordinates recover translation and rotation, no mutation',()=>{
 const s={...square};
 // Independent rigid inverse fixture: q=(-5,5),(5,5); known pose (0.8,-0.4,6°).
 const ang=Math.PI/30,c=Math.cos(ang),n=Math.sin(ang);
 s.couponFiducials=mask.fiducials.map(f=>({id:f.id,x:c*(f.x-.8)+n*(f.y+.4),y:-n*(f.x-.8)+c*(f.y+.4)}));
 const before=JSON.stringify(s),a=solveAlignment(s);assert.ok(a.ok);near(a.pose.xMm,.8);near(a.pose.yMm,-.4);near(a.pose.thetaDeg,6);near(a.rmsMm,0);assert.equal(JSON.stringify(s),before);
 const out=exposure({...s,...a.pose}).sampleRevision;near(out.alignment.rmsMm,0);assert.equal(out.alignment.source,'explicit-coupon-marks');assert.equal(out.fiducials.length,2);
});
test('Unequal mark baselines leave nonzero least-squares residual',()=>{const s={...square,couponFiducials:[{id:'left',x:-4.9,y:5},{id:'right',x:4.9,y:5}]};const a=solveAlignment(s);assert.ok(a.ok);near(a.pose.xMm,0);near(a.pose.yMm,0);near(a.pose.thetaDeg,0);near(a.baselineMismatchMm,.2);near(a.rmsMm,.1);near(a.marks[0].delta[0],.1);near(a.marks[1].delta[0],-.1)});
test('Out-of-travel alignment rejects rather than clipping; invalid marks and first-level exposure',()=>{const wideMask={...mask,fiducials:[{id:'left',x:-2,y:2},{id:'right',x:2,y:2}]};const s={...square,mask:wideMask,couponFiducials:[{id:'left',x:-6,y:2},{id:'right',x:-2,y:2}]};const a=solveAlignment(s);assert.equal(a.code,'travel');near(a.requested.xMm,4);assert.equal(a.sampleRevision,null);
 assert.equal(exposure({...square,couponFiducials:[{id:'left',x:-9,y:0},{id:'right',x:5,y:5}]}).code,'fiducials');assert.equal(exposure({...square,couponFiducials:[{id:'wrong',x:0,y:0},{id:'right',x:5,y:5}]}).code,'fiducials');
 assert.equal(solveAlignment({...square,couponFiducials:null}).code,'no-marks');const o=exposure({...square,couponFiducials:null}).sampleRevision;assert.equal(o.fiducials.length,0);assert.equal(o.alignment.status,'not-evaluated');assert.equal(o.alignment.rmsMm,null);assert.equal(o.statistics.exposedPixels,400);
});
test('Boolean interlocks are strict and explicit mark coordinates survive JSON export',()=>{assert.equal(exposure({...square,contact:'false'}).code,'interlock');const s={...square,couponFiducials:mask.fiducials.map(f=>({...f,x:f.x+.1}))};const r=exposure(s).sampleRevision;near(r.fiducials[0].couponMarkLocalMm[0],-4.9);near(r.alignment.rmsMm,.1);assert.equal(r.exposure.nominalWavelengthNm,405)});

test('Independent loading validates coupon marks without requiring a photomask',()=>{const marks=[{id:'a',x:-3,y:1},{id:'b',x:3,y:1}];assert.ok(checkCouponMarks({...square,mask:null,couponFiducials:marks}).ok);assert.equal(checkCouponMarks({...square,couponFiducials:[marks[0],{...marks[1],x:9}]}).code,'fiducials');assert.ok(checkCouponMarks({...square,couponFiducials:null}).ok)});
test('Model-stage frame conversion, contact and 100/150 µm alignment separation',()=>{const s={...defaults,xMm:1,yMm:-2,thetaDeg:6};const p=stageScenePose(s,{engaged:true,contact:true,separationUm:100});assert.ok(p.ok);near(p.positionM[0],.001);near(p.positionM[2],.002);near(p.rotationRad,Math.PI/30);near(p.modelGapUm,0);near(p.positionM[1],.0013);for(const d of [100,150]){const q=stageScenePose(s,{engaged:true,contact:false,separationUm:d});near(q.modelGapUm,d);near(p.positionM[1]-q.positionM[1],d/1e6)}assert.equal(stageScenePose(s,{engaged:false,contact:true,separationUm:100}).code,'mechanical');assert.equal(stageScenePose(s,{engaged:true,contact:false,separationUm:151}).code,'mechanical');
 const source=JSON.parse(readFileSync(new URL('../public/equipment/02-02/model-source.json',import.meta.url)));const n=Object.fromEntries(source.nodes.map(x=>[x.name,x]));near(n.transport.p[1],sceneGeometryMm.transportY);near(n.chuck.p[1]+n.chuck.size[1]/2,sceneGeometryMm.chuckSurfaceY);near(n.mask_holder.p[1]+n.mask_glass.p[1]-n.mask_glass.size[1]/2,sceneGeometryMm.maskBottomY)});

test('Static asset coupon sits on the chuck and glTF names match source',()=>{
 const src=JSON.parse(readFileSync(new URL('../public/equipment/02-02/model-source.json',import.meta.url))),ns=Object.fromEntries(src.nodes.map(n=>[n.name,n]));
 const surface=ns.chuck.p[1]+ns.chuck.size[1]/2;near(ns.coupon.p[1]-ns.coupon.size[1]/2,surface);
 for(const node of src.nodes.filter(n=>n.name.startsWith('vacuum_hole_'))){near(node.p[1],surface);near(node.size[1],.002);}
 const g=JSON.parse(readFileSync(new URL('../public/equipment/02-02/mjb3.gltf',import.meta.url))),nodes=Object.fromEntries(g.nodes.map(n=>[n.name,n]));
 assert.equal(Object.keys(nodes).length,src.nodes.length);for(const n of src.nodes){assert.ok(nodes[n.name]);for(let i=0;i<3;i++)near(nodes[n.name].translation[i],n.p[i]/1000);}
 near(nodes.coupon.translation[1]-nodes.coupon.scale[1]/2,nodes.chuck.translation[1]+nodes.chuck.scale[1]/2);
});
