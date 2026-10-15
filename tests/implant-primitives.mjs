import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { getImplantContacts } from '../src/lib/devices/implant-contacts.js';
import { buildDeviceMesh, disposeDeviceMesh } from '../src/lib/devices/geometry.js';
const close = (a,b,t=1e-6) => assert(Math.abs(a-b)<t,`${a} != ${b}`);
const common = {id:'fixture',revision:1,deviceId:'fixture',sources:[],notes:'Synthetic test geometry'};
const fixtures = [
 {...common,kind:'planar-probe',width:.07,thickness:.024,length:10,tipLength:.1,shankCount:2,shankPitch:.25,physicalSites:2,contactLayout:[{x:-.125,z:9.5,size:.012},{x:.125,z:9.5,size:.012}]},
 {...common,kind:'cylindrical-lead',diameter:1.3,length:7.5,physicalSites:8,contacts:[{z:.75,length:1.5,segments:1},{z:2.75,length:1.5,segments:3,gapAngle:Math.PI/6,areaUnknown:true},{z:4.75,length:1.5,segments:3,gapAngle:Math.PI/6,areaUnknown:true},{z:6.75,length:1.5,segments:1}]},
 {...common,kind:'nerve-cuff',innerDiameter:2.5,wallThickness:.15,length:17,openingAngle:.2,physicalSites:1,contacts:[{z:8,angle:Math.PI,angularSpan:1,length:2.5}]},
 {...common,kind:'flat-cuff',innerWidth:10,innerHeight:1.5,wallThickness:.15,length:7,physicalSites:2,contacts:[{x:-2,y:.75,z:3,diameter:.5,normal:[0,-1,0]},{x:2,y:-.75,z:3,diameter:.5,normal:[0,1,0]}]},
 {...common,kind:'exposed-wire',diameter:.037,coreDiameter:.025,length:2,exposedStart:.5,exposedLength:1,areaUnknown:true,physicalSites:1},
];
for(const model of fixtures) test(`${model.kind}: dimensions, normals and actual contact surface`,()=>{
 const sites=getImplantContacts(model);assert.equal(sites.length,model.physicalSites);
 const {group,bodies,contacts}=buildDeviceMesh(model);
 assert.equal(contacts.children.length,sites.length);
 const bounds=new Box3().setFromObject(group);close(bounds.min.z,0);close(bounds.max.z,model.length);
 for(const [i,site] of sites.entries()) {
  assert(site.positionMm.every(Number.isFinite));
  if(site.normal)close(new Vector3(...site.normal).length(),1);
  const g=contacts.children[i].geometry, n=g.attributes.normal, p=g.attributes.position;
  for(const value of p.array)assert(Number.isFinite(value));
  if(model.kind==='nerve-cuff'||model.kind==='cylindrical-lead'||model.kind==='exposed-wire') {
   const r=model.kind==='nerve-cuff'?model.innerDiameter/2:model.kind==='exposed-wire'?model.coreDiameter/2:model.diameter/2;
   for(let k=0;k<p.count;k++) {
    close(Math.hypot(p.getX(k),p.getY(k)), r + (model.kind === 'nerve-cuff' ? -0.00001 : model.kind === 'cylindrical-lead' ? 0.00001 : 0));
    const radialDot=p.getX(k)*n.getX(k)+p.getY(k)*n.getY(k);
    assert(model.kind==='nerve-cuff'?radialDot<0:radialDot>0);
   }
  }
 }
 if(model.kind==='exposed-wire'){assert.equal(bodies.children.length,2);assert.equal(sites[0].contactAreaMm2,null);close(sites[0].positionMm[2],1);}
 if(model.kind==='cylindrical-lead'){assert.equal(sites[0].normal,null);close(sites[0].contactAreaMm2,Math.PI*1.3*1.5);assert.equal(sites[1].contactAreaMm2,null);}
 if(model.kind==='flat-cuff'){close(bounds.max.x-bounds.min.x,10.3);close(bounds.max.y-bounds.min.y,1.8);}
 disposeDeviceMesh(group);
});
