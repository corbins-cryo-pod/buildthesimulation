/* Run from the repository checkout: node tests/foundry-peripheral-solids.mjs
 * Test actual mesh triangles rather than inspecting declared feature names alone:
 * native-engine channel coordinates must pass through voids or hit the intended
 * material. These are deterministic geometry / handoff tests, not fabrication QA.
 */
import * as T from 'three';
import {makeDeviceProfiles} from '../public/simulations/foundry/cleanroom-device-profiles-3d.js';
import {createRequire} from 'node:module';import A from 'node:assert/strict';
const require=createRequire(import.meta.url), L='../scripts/foundry-atlas/labs/';
const RM=require(L+'rolled-microchannels/engine.cjs'),T4=require(L+'time4h/engine.cjs'),SB=require(L+'stentrode/src/engine.cjs');globalThis.RMF=RM;globalThis.T4=T4;globalThis.StentBench=SB;
const m=makeDeviceProfiles(T),ray=new T.Raycaster(),rootA=()=>m.group.children[0].children[0];
function shoot(v,d,filter){m.group.updateMatrixWorld(true);const root=rootA(),o=root.localToWorld(new T.Vector3(...v)),t=new T.Vector3(...d).transformDirection(root.matrixWorld);ray.set(o,t);
  const g=[];root.traverseVisible(q=>{if(q.geometry&&filter(q))g.push(q)});return ray.intersectObjects(g,false).map(r=>r.object.name);}
const R='rolled-microchannels-foundry';let rays=0;
for(const mode of ['wire150','counter84','g50','g100','g150']){
 const settings=RM.defaults(mode),g=RM.getGeometry(mode,settings.driftPct),N=RM.sequence(mode);
 const state=m.update({profile:R,stage:N.length-1,dataset:settings,progress:1});A.equal(state.enclosedLumenCount,g.channels.length);
 // Coordinates from the actual native API, not extracted from the workpiece under test.
 const tx=(.150/(2*Math.PI)),tc=Math.hypot(tx,.245),ax=tx/tc,ay=.245/tc;
 const floorOrWall=q=>q.name.includes('permanent PDMS roof')||q.name.includes('PDMS floor')||q.name.includes('SU-8 partitions');
 for(const c of g.channels){const [x,y]=c.centerUm.map(x=>x/1000),pos=[x*ax+y*ay,x*ay-y*ax,3];
  A.deepEqual(shoot(pos,[0,0,-1],floorOrWall),[],`native channel ${mode}/${c.lumen} blocked`);rays++;
 }
 A.deepEqual(shoot([0,0,3],[0,0,-1],floorOrWall),[],'central void is hollow and separate');
 for(let j=0;j<20;j++){const t=g.angularSpanRad*(j+.27)/20,[xx,yy]=RM.spiralAt(t,-55).map(x=>x/1000);
  A(shoot([xx*ax+yy*ay,xx*ay-yy*ax,3],[0,0,-1],floorOrWall).length>0,'floor finite axial face '+mode);rays++;}
 if(state.installedWireCount){for(const q of RM.wireSites(RM.MODES[mode])){const [xx,yy]=g.channels[q.lumen-1].centerUm.map(v=>v/1000);A(shoot([xx*ax+yy*ay,xx*ay-yy*ax,3],[0,0,-1],q=>q.name.includes('60 µm')).length>0,'expected wire solid at native lumen '+q.id);rays++;}}
}
const C='self-closing-cuff-foundry';
for(const n of [3,28]){m.update({profile:C,stage:5,progress:1,dataset:{layout:n}});
 for(let j=0;j<n;j++){const x=(n===3?(j===1?-1:1):(j%2?-1:1))*.84,z=.45+(n===3?j:Math.floor(j/2))*9.8/((n===3?3:14)-1);
  const h=shoot([x,5,z],[0,-1,0],q=>q.name.includes('Registration apertures')||q.name.includes('PEDOT'));
  A(h.every(s=>!s.includes('Registration apertures')),'cuff opening is not a solid');A(h.some(s=>s.includes('PEDOT')),'sense material visible in opening');rays++;
 }}
const time='time-4h-foundry';
m.update({profile:time,stage:6,progress:1});
for(let leg=0;leg<2;leg++){const center=leg?.83:-.83,zGround=-3.93;
 for(const a of T4.apertures){const h=shoot([center+a.x*.096,1,zGround+a.y*.096],[0,-1,0],q=>q.name.includes('aperture walls')||q.name.includes('Seven Pt'));
 A(h.every(q=>!q.includes('aperture walls')));A(h.some(q=>q.includes('Seven Pt')));rays++;}
 for(let j=0;j<7;j++){
  const h=shoot([center,1,j*.75+.375*leg-2.43],[0,-1,0],q=>q.name.includes('aperture walls')||q.name.includes('SIROF'));A(h.every(q=>!q.includes('aperture walls')));A(h.some(q=>q.includes('SIROF')));rays++;
 }
}
let t=m.update({profile:time,stage:8,progress:1});
const arms=rootA().children.filter(x=>x.name.endsWith('movable flex face'));A.equal(arms.length,2);
const a=arms.map(g=>new T.Vector3(0,1,0).applyQuaternion(g.quaternion));A(a[0].dot(a[1])<-.999);
const P='stentrode-foundry';const act=m.update({profile:P,stage:3,progress:1});
A.equal(act.mountedSiteCount,8);A.deepEqual(shoot([0,0,18],[0,0,-1],q=>q.name.includes('diamond lattice')||q.name.includes('Platinum disc')),[]);
for(let j=0;j<8;j++){const site=SB.sites(SB.geom(3))[j],{theta,x}=site;
 const hits=shoot([2.3*Math.cos(theta),2.3*Math.sin(theta),x-31.1/2],[-Math.cos(theta),-Math.sin(theta),0],q=>q.name.startsWith('Platinum disc'));
 A(hits.length>0);rays++;}
// Native branch isolation, staged custody and reversible manual scrubbing.
const open=m.update({profile:R,stage:6,phaseId:'roll-openQC',branch:'open50',progress:1});
A.equal(open.shape,'panel'); A.equal(open.patternedGrooves,143);
A.equal(open.enclosedLumenCount,0); A.equal(open.installedWireCount,0); A.equal(open.permanentCapJoined,false);
const bonded=m.update({profile:R,stage:8,phaseId:'roll-cap',branch:'g100',progress:1});
A(bonded.permanentCapJoined&&bonded.upperCarrierAttached&&bonded.carrierAttached);
const sheet=m.update({profile:R,stage:10,phaseId:'roll-releaseWeb',branch:'g100',progress:1});
A(sheet.permanentCapJoined&&!sheet.upperCarrierAttached&&!sheet.carrierAttached);
const held=m.update({profile:C,stage:10,dataset:{release:'tether'},progress:.69}); A(held.carrierAttached); A.notEqual(held.activeFeature,'helical-wrap');
const curled=m.update({profile:C,stage:10,progress:.69}); A.equal(curled.activeFeature,'helical-wrap'); A(!curled.carrierAttached);
const stopped=m.update({profile:C,stage:6,progress:.99,authored:{verified:false}}); A(stopped.carrierAttached);
const resumed=m.update({profile:C,stage:6,progress:.99}); A(!resumed.carrierAttached);

const micro=makeDeviceProfiles(T,{section:true}); let checkpoints=0;
for(const [profile,N] of [[C,11],[time,13],[R,14],[P,8]]){
 let previous;
 for(let i=0;i<N;i++){
   const before=m.update({profile,stage:i,progress:0}),end=m.update({profile,stage:i,progress:1});
   if(previous)A.equal(before.activeFeature,previous.activeFeature,profile+' transfer at '+i);
   previous=end;
   for(const [actor,section] of [[m,false],[micro,true]]){
     const data=actor.update({profile,stage:i,progress:1});
     if(!data.visible)continue;
     actor.group.updateMatrixWorld(true);
     const box=new T.Box3();actor.group.traverseVisible(q=>{if(q.geometry)box.union(q.geometry.boundingBox.clone().applyMatrix4(q.matrixWorld));});
     A(Math.abs(box.min.y)<1e-7,profile+' must seat at y=0');
     const dims=box.getSize(new T.Vector3()).toArray();
     A(Math.abs(Math.max(...dims)-(section?.070:data.widthMm/1000))<1e-6);
     A.equal(data.canExplode,false); A.equal(data.layerCount,1);
   }
   checkpoints++;
 }
}
m.dispose();micro.dispose(); A.equal(m.group.children.length,0);
console.log('Peripheral workpieces: '+rays+' native-coordinate ray probes, '+checkpoints+' staged handoffs and six roll configurations passed.');
