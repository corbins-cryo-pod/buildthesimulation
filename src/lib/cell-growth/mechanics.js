/**
 * V2 membrane–cortex mechanics. Coordinates µm, time h, force pN, energy pN µm.
 * A coarse discrete elastic cortex, NOT a molecular bilayer or a fitted cell type.
 * Passive forces are negative analytic energy gradients; motor traction is active.
 */
import {add, sub, scale, dot, cross, length, distance, unit, clamp, lerp,
  pointSegmentDistance, segmentSphereHit, segmentBoxHit, segmentCapsuleHit} from './geometry.js';

export const MECHANICS = Object.freeze({maxStepHours:.0125, vertexDrag:3, nucleusDrag:45,
  areaModulus:45, volumeModulus:180, cortexSpring:48, bendingSpring:24,
  nucleusSpring:70, protrusionPn:18, tractionPn:620, adhesionOn:5, adhesionOff:.8,
  cellAdhesionRange:7, cellAdhesionPn:900});

export function sphereTopology(level=2) {
  const t=(1+Math.sqrt(5))/2;
  const vertices=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(unit);
  let triangles=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let k=0;k<level;k++) {
    const cache=new Map(), next=[];
    const midpoint=(a,b)=>{const key=`${Math.min(a,b)}:${Math.max(a,b)}`;if(cache.has(key))return cache.get(key);const i=vertices.length;vertices.push(unit(add(vertices[a],vertices[b])));cache.set(key,i);return i;};
    for(const [a,b,c] of triangles){const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);next.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}
    triangles=next;
  }
  const edges=[],neighbors=vertices.map(()=>[]),seen=new Set();
  for(const f of triangles)for(let i=0;i<3;i++){const a=Math.min(f[i],f[(i+1)%3]),b=Math.max(f[i],f[(i+1)%3]),key=`${a}:${b}`;if(seen.has(key))continue;seen.add(key);edges.push([a,b]);neighbors[a].push(b);neighbors[b].push(a);}
  return {vertices,triangles,edges,neighbors};
}
export const SHELL = sphereTopology();
const zeros=n=>Array.from({length:n},()=>[0,0,0]);
export function centroid(v){const p=[0,0,0];for(const x of v)for(let k=0;k<3;k++)p[k]+=x[k]/v.length;return p;}
const plus=(a,b,s=1)=>{a[0]+=b[0]*s;a[1]+=b[1]*s;a[2]+=b[2]*s;};
export function surfaceGeometry(vertices,triangles=SHELL.triangles) {
  // Translation-invariant summation about the centroid avoids cancellation far from 0.
  const center=centroid(vertices);let area=0,volume=0,minQuality=1;
  for(const [ia,ib,ic] of triangles){const a=sub(vertices[ia],center),b=sub(vertices[ib],center),c=sub(vertices[ic],center),ab=sub(b,a),ac=sub(c,a),bc=sub(c,b),twice=length(cross(ab,ac));area+=twice/2;volume+=dot(a,cross(b,c))/6;minQuality=Math.min(minQuality,2*Math.sqrt(3)*twice/Math.max(1e-15,dot(ab,ab)+dot(ac,ac)+dot(bc,bc)));}
  return {area,volume,minQuality,center};
}

export function createSoftCell(position,radius,id,planar,polarity) {
  const vertices=SHELL.vertices.map((u,i)=>{
    // Seed-independent cell-id variation is fixed initial geometry, never an animation.
    const variation=1+.025*Math.sin(i*2.13+id*1.7)*Math.sin(i*.83);
    const p=scale(u,radius*variation);if(planar){p[0]*=1.16;p[1]*=.74;p[2]*=1.16;}
    return add(position,p);
  });
  const center=centroid(vertices),g=surfaceGeometry(vertices),n=vertices.length;
  const membrane={vertices,triangles:SHELL.triangles.map(f=>[...f]),area:g.area,volume:g.volume,targetArea:g.area,targetVolume:g.volume,
    restLengths:SHELL.edges.map(([a,b])=>distance(vertices[a],vertices[b])),reserve:1,reserveCapacity:g.area*1.5,suppliedArea:0,usedArea:0,recycledArea:0,
    tension:7,elasticEnergy:0,lastSolveHours:-1,minQuality:g.minQuality,areaStrain:0,volumeStrain:0,contactVertices:[],
    actin:SHELL.vertices.map(u=>.25+.75*Math.max(0,dot(u,polarity))),adhesions:Array(n).fill(0),mt:Array(n).fill(.25),
    energies:{area:0,volume:0,cortex:0,bending:0},forces:zeros(n)};
  return {position:center,membrane,nucleus:{position:[...center],radius:radius*.38,force:[0,0,0]},
    mechanics:{polarity:[...polarity],initialPosition:[...center],velocity:[0,0,0],displacement:0,pathLength:0,adhesionMean:0,
      traction:[0,0,0],netForce:[0,0,0],contactForce:[0,0,0],activeRms:0,passiveRms:0,contactCount:0,rejectedSteps:0,substeps:0,
      collisionRadius:Math.max(...vertices.map(v=>distance(v,center))),trail:[{timeHours:0,position:[...center]}]}};
}

/** E = gamma A + KA/(2A0)(A-A0)^2 + KV/(2V0)(V-V0)^2
 *       - p0(V-V0) + sum ke/2(l-l0)^2 + kb/2 sum |Lx|².
 * L is the fixed umbrella graph Laplacian. The last term is a discrete curvature
 * regularizer, not a mesh-converged Helfrich bending modulus. All gradients below
 * include L-transpose and are checked against central finite differences.
 */
export function passiveMembrane(m,config) {
  const v=m.vertices,n=v.length,g=surfaceGeometry(v,m.triangles),forces=zeros(n),dA=g.area-m.targetArea,dV=g.volume-m.targetVolume;
  const ka=MECHANICS.areaModulus,kV=MECHANICS.volumeModulus,kE=MECHANICS.cortexSpring*config.cortexStiffness,kB=MECHANICS.bendingSpring*config.bending;
  const gamma=m.tension,p0=2*gamma/Math.cbrt(3*m.targetVolume/(4*Math.PI));
  const areaSlope=gamma+ka*dA/m.targetArea,volumeSlope=kV*dV/m.targetVolume-p0;
  const energies={area:gamma*g.area+.5*ka*dA*dA/m.targetArea,volume:.5*kV*dV*dV/m.targetVolume-p0*dV,cortex:0,bending:0};
  for(const [ia,ib,ic] of m.triangles){
    const a=sub(v[ia],g.center),b=sub(v[ib],g.center),c=sub(v[ic],g.center),normal=unit(cross(sub(b,a),sub(c,a)));
    for(const [i,u,w] of [[ia,b,c],[ib,c,a],[ic,a,b]]){plus(forces[i],cross(sub(u,w),normal),-.5*areaSlope);plus(forces[i],cross(u,w),-volumeSlope/6);}
  }
  for(let e=0;e<SHELL.edges.length;e++){
    const [i,j]=SHELL.edges[e],d=sub(v[j],v[i]),l=length(d),q=l-m.restLengths[e];
    energies.cortex+=.5*kE*q*q;const f=scale(d,kE*q/Math.max(l,1e-12));plus(forces[i],f);plus(forces[j],f,-1);
  }
  for(let i=0;i<n;i++){
    const ns=SHELL.neighbors[i],lap=[...v[i]];for(const j of ns)plus(lap,v[j],-1/ns.length);
    energies.bending+=.5*kB*dot(lap,lap);plus(forces[i],lap,-kB);for(const j of ns)plus(forces[j],lap,kB/ns.length);
  }
  return {...g,forces,energies,energy:Object.values(energies).reduce((a,b)=>a+b,0)};
}

export function signedObstacle(p,o) {
  if(o.shape==='sphere'){const d=sub(p,o.position);return {gap:length(d)-o.radius,normal:unit(d)};}
  const d=sub(p,o.position),q=d.map((x,i)=>Math.abs(x)-o.size[i]/2),outside=q.map(x=>Math.max(0,x));
  if(length(outside)>1e-12)return {gap:length(outside),normal:unit(outside.map((x,i)=>x*Math.sign(d[i])))};
  const axis=q.indexOf(Math.max(...q)),normal=[0,0,0];normal[axis]=Math.sign(d[axis])||1;return {gap:q[axis],normal};
}

function externalCellForces(sim,cell) {
  const result={force:[0,0,0],turn:[0,0,0],contacts:0},r=cell.mechanics.collisionRadius;
  for(const other of sim.cells){if(other.id===cell.id)continue;const delta=sub(other.position,cell.position),d=length(delta),u=unit(delta),gap=d-r-other.mechanics.collisionRadius;
    if(gap<MECHANICS.cellAdhesionRange&&gap>=-.05){
      const attraction=sim.config.cellAdhesion*MECHANICS.cellAdhesionPn*Math.max(0,1-gap/MECHANICS.cellAdhesionRange);
      plus(result.force,u,attraction);if(gap<.75){result.contacts++;plus(result.turn,u,-sim.config.contactInhibition);}
    }
  }
  for(const o of sim.world.obstacles){const {gap,normal}=signedObstacle(cell.position,o);if(gap<r+4)plus(result.turn,normal,Math.max(0,1-(gap-r)/4));}
  return result;
}

function movePolarity(sim,cell,turn,dt) {
  const p=cell.mechanics.polarity,cue=unit(sub(sim.world.cue.position,cell.position));
  let steer=add(scale(cue,sim.config.guidance*.12),turn);
  // Deterministic initial polarity + mechanical contact steering; no random translation.
  if(sim.world.planar)steer[1]=0;
  const tangent=sub(steer,scale(p,dot(steer,p)));
  cell.mechanics.polarity=unit(add(p,scale(tangent,dt)));
}

/** Conservative soma envelope/finite shaft contact. Shape-specific obstacle
 * projection follows below; envelopes deliberately overestimate intercell contact. */
function admissibleShell(sim,cell,vertices,segments,roots) {
  const center=centroid(vertices),r=Math.max(cell.radius*1.06,...vertices.map(p=>distance(p,center))),old=cell.position;
  for(const o of sim.world.obstacles){const gap=signedObstacle(center,o).gap-r;if(gap<.015)return false;}
  for(const other of sim.cells)if(other.id!==cell.id){const minimum=r+other.mechanics.collisionRadius+.015;if(distance(center,other.position)<minimum&&distance(center,other.position)<distance(old,other.position)+r-cell.mechanics.collisionRadius-1e-9)return false;}
  for(const s of segments)if(s.cellId!==cell.id){if(pointSegmentDistance(center,s.start,s.end).distance<r+s.radius+.015)return false;const h=segmentCapsuleHit(old,center,s.start,s.end,Math.max(r,cell.mechanics.collisionRadius)+s.radius+.01);if(h&&h.t>1e-9)return false;}
  for(const root of roots){const start=vertices[root.anchorVertex],end=root.end;
    for(const o of sim.world.obstacles)if(o.shape==='sphere'?segmentSphereHit(start,end,o.position,o.radius+root.radius+.01):segmentBoxHit(start,end,o.position,o.size,root.radius+.01))return false;
    for(const other of sim.cells)if(other.id!==cell.id&&segmentSphereHit(start,end,other.position,other.mechanics.collisionRadius+root.radius+.01))return false;
    for(const s of segments)if(s.cellId!==cell.id&&segmentCapsuleHit(start,end,s.start,s.end,s.radius+root.radius+.01))return false;
  }
  const g=surfaceGeometry(vertices);
  if(g.volume<=magnitudeFloor(cell)||g.minQuality<.10)return false;
  // Reject a reversed outward face; topology is a star-shaped cortex in this release.
  for(const [i,j,k] of SHELL.triangles)if(dot(cross(sub(vertices[j],vertices[i]),sub(vertices[k],vertices[i])),sub(vertices[i],center))<=0)return false;
  return true;
}
const magnitudeFloor=cell=>cell.membrane.targetVolume*.65;

function projectWorld(sim,old,p,contacts,i) {
  let x=[...p];
  // Sweep each vertex before projection: thin barriers cannot be tunneled through.
  for(const o of sim.world.obstacles){
    const h=o.shape==='sphere'?segmentSphereHit(old,x,o.position,o.radius+.04):segmentBoxHit(old,x,o.position,o.size,.04);
    if(h){x=add(h.point,scale(h.normal,.045));contacts.add(i);}
    const s=signedObstacle(x,o);if(s.gap<.04){x=add(x,scale(s.normal,.04-s.gap));contacts.add(i);}
  }
  for(let k=0;k<3;k++){
    const lo=sim.world.planar&&k===1?(sim.world.substrateY??-5.8):sim.world.bounds.min[k]+.04,hi=sim.world.bounds.max[k]-.04;
    if(x[k]<lo||x[k]>hi){x[k]=clamp(x[k],lo,hi);contacts.add(i);}
  }
  if(sim.world.sphereRadius&&length(x)>sim.world.sphereRadius-.04){x=scale(unit(x),sim.world.sphereRadius-.04);contacts.add(i);}
  return x;
}

export function advanceCellMechanics(sim,cell,duration,segments,roots,maxStepHours=MECHANICS.maxStepHours) {
  const m=cell.membrane,c=sim.config,mech=cell.mechanics,n=m.vertices.length;
  if(m.lastSolveHours>sim.timeHours+1e-8)return; // explicit frozen diagnostic fixtures
  const totalSteps=Math.max(1,Math.ceil(duration/maxStepHours-1e-9)),dt=duration/totalSteps;
  for(let step=0;step<totalSteps;step++) {
    const previous=m.vertices,oldCenter=[...cell.position],oldNucleus=[...cell.nucleus.position],external=externalCellForces(sim,cell);
    movePolarity(sim,cell,external.turn,dt);
    const passive=passiveMembrane(m,c),f=passive.forces,act=zeros(n),p=mech.polarity,traction=[0,0,0];
    const stageGain=cell.stage==='maturing'?.08:cell.stage==='polarized'?.20:cell.stage==='immature'?.45:1;
    const gain=c.motility*c.actin*stageGain,meanActive=[0,0,0];let binding=0,activeSquared=0;
    for(let i=0;i<n;i++){
      const radial=unit(sub(previous[i],oldCenter)),front=Math.max(0,dot(radial,p)),rear=Math.max(0,-dot(radial,p));
      const desired=.12+.88*front*front;
      m.actin[i]+=(desired-m.actin[i])*(-Math.expm1(-dt/1.2));
      m.mt[i]+=(clamp(c.microtubules*(.2+.7*front),0,1)-m.mt[i])*(-Math.expm1(-dt/3));
      const gap=sim.world.planar?Math.max(0,previous[i][1]-(sim.world.substrateY??-5.8)):0,access=sim.world.planar?Math.exp(-gap/2):1;
      const on=MECHANICS.adhesionOn*c.adhesion*(.15+front)*access,off=MECHANICS.adhesionOff*(1+4*rear*c.contractility),eq=on/(on+off);
      m.adhesions[i]=eq+(m.adhesions[i]-eq)*Math.exp(-(on+off)*dt);binding+=m.adhesions[i]/n;
      // Protrusion and contraction are internal: subtract their mean below.
      act[i]=scale(radial,gain*MECHANICS.protrusionPn*(m.actin[i]-.42*c.contractility*rear));
      plus(meanActive,act[i],1/n);
    }
    let passiveSquared=0;
    const nucleusTether=scale(sub(oldCenter,oldNucleus),MECHANICS.nucleusSpring),nucleusForce=[...nucleusTether],motors=[];
    for(let i=0;i<n;i++){
      passiveSquared+=dot(f[i],f[i]);plus(act[i],meanActive,-1);activeSquared+=dot(act[i],act[i]);plus(f[i],act[i]);
      const radial=unit(sub(previous[i],oldCenter)),front=Math.max(0,dot(radial,p));
      // This transmitted motor force is the only active net external force. It
      // vanishes at zero adhesion; it is not added again as a protrusion resultant.
      const motor=gain*(sim.world.planar?MECHANICS.tractionPn:110)*m.adhesions[i]*front*front*c.stiffness/(c.stiffness+100)/(1+2*c.adhesion*c.adhesion);
      const t=scale(p,motor);plus(traction,t);motors.push(t);plus(f[i],external.force,1/n);
      if(sim.world.planar){const gap=Math.max(0,previous[i][1]-(sim.world.substrateY??-5.8));f[i][1]-=3*m.adhesions[i]*gap*Math.exp(-gap/2);}plus(f[i],nucleusTether,-1/n);
      // MT support is an internal radial spring; equal/opposite force reaches nucleus.
      const delta=sub(previous[i],oldNucleus),len=length(delta),rest=cell.baseRadius*(sim.world.planar?.98:1),kmt=.9*m.mt[i];
      const support=scale(unit(delta),-kmt*(len-rest));plus(f[i],support);plus(nucleusForce,support,-1);
    }
    for(let i=0;i<n;i++){plus(f[i],traction,.85/n);plus(f[i],motors[i],.15);}
    const contacts=new Set(),raw=previous.map((v,i)=>add(v,scale(f[i],dt/MECHANICS.vertexDrag)));
    let candidate=raw.map((v,i)=>projectWorld(sim,previous[i],v,contacts,i));
    // Line search guards multi-contact/mesh inversion and the existing rooted tree.
    let accepted=false,alpha=1;
    for(let attempt=0;attempt<10;attempt++){
      if(admissibleShell(sim,cell,candidate,segments,roots)){
        let required=0;for(const r of roots)required+=Math.max(0,distance(candidate[r.anchorVertex],r.end)-distance(r.start,r.end))*2*Math.PI*r.radius;
        if(required<=m.reserve*m.reserveCapacity+1e-9){accepted=true;break;}
      }
      alpha*=.5;candidate=previous.map((v,i)=>lerp(v,candidate[i],.5));
    }
    if(!accepted){candidate=previous.map(v=>[...v]);alpha=0;mech.rejectedSteps++;}
    m.vertices=candidate;const g=surfaceGeometry(candidate);cell.position=g.center;
    // The mechanical nucleus follows the cortex with finite drag and is contained
    // by every outward face plane. This is a rigid sphere, not a decorative sprite.
    let nucleus=add(oldNucleus,scale(nucleusForce,dt/MECHANICS.nucleusDrag));
    for(let iteration=0;iteration<3;iteration++)for(const [a,b,d] of SHELL.triangles){const normal=unit(cross(sub(candidate[b],candidate[a]),sub(candidate[d],candidate[a]))),gap=dot(sub(nucleus,candidate[a]),normal)+cell.nucleus.radius;if(gap>0)nucleus=sub(nucleus,scale(normal,gap+.001));}
    cell.nucleus.position=nucleus;cell.nucleus.force=nucleusForce;
    for(const root of roots){const next=candidate[root.anchorVertex],dl=distance(next,root.end)-distance(root.start,root.end),area=2*Math.PI*root.radius*dl;
      if(area>0){m.reserve-=area/m.reserveCapacity;m.usedArea+=area;}else{const recycled=Math.min(-area*.6,(1-m.reserve)*m.reserveCapacity);m.reserve+=recycled/m.reserveCapacity;m.recycledArea+=recycled;}
      root.start=[...next];
    }
    m.reserve=clamp(m.reserve,0,1);m.area=g.area;m.volume=g.volume;m.minQuality=g.minQuality;m.areaStrain=g.area/m.targetArea-1;m.volumeStrain=g.volume/m.targetVolume-1;
    m.energies=passive.energies;m.elasticEnergy=passive.energies.cortex+passive.energies.bending;m.forces=f;m.contactVertices=[...contacts];
    const delta=sub(cell.position,oldCenter);mech.velocity=scale(delta,1/dt);mech.pathLength+=length(delta);mech.displacement=distance(cell.position,mech.initialPosition);
    mech.traction=traction;mech.netForce=f.reduce((sum,x)=>add(sum,x),[0,0,0]);mech.contactForce=candidate.reduce((sum,x,i)=>add(sum,scale(sub(x,raw[i]),MECHANICS.vertexDrag/dt)),[0,0,0]);
    mech.adhesionMean=binding;mech.activeRms=Math.sqrt(activeSquared/n);mech.passiveRms=Math.sqrt(passiveSquared/n);mech.contactCount=contacts.size+external.contacts+(alpha<1?1:0);mech.substeps++;
    mech.collisionRadius=Math.max(cell.radius*1.06,...candidate.map(v=>distance(v,cell.position)));
  }
  m.lastSolveHours=sim.timeHours;
  if(sim.timeHours-(mech.trail.at(-1)?.timeHours??0)>=.5-1e-8){mech.trail.push({timeHours:sim.timeHours,position:[...cell.position]});if(mech.trail.length>1500)mech.trail.shift();}
}

export function updateConeShape(tip,dt,config){
  const count=12,base=tip.kind==='axon'?1.6:1.85;
  tip.shape??={radii:Array(count).fill(base),height:.45,actinRim:Array(count).fill(0),maxRadius:base};
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,front=.3+.7*Math.max(0,Math.cos(a)),activity=config.actin*front*(.4+.6*tip.clutch);
    const load=tip.status==='contact'?.5:1,rest=base*(.65+.25*tip.mt),target=rest+load*.65*activity/(1+.025*tip.forces.membrane);
    tip.shape.radii[i]+=(target-tip.shape.radii[i])*(-Math.expm1(-dt/.3));tip.shape.actinRim[i]=activity;
  }
  tip.shape.height=.28+.28*tip.mt;tip.shape.maxRadius=Math.max(...tip.shape.radii);tip.radius=tip.shape.maxRadius;
}

export function populationMechanics(sim){
  const parents=sim.cells.map((_,i)=>i),find=i=>parents[i]===i?i:(parents[i]=find(parents[i]));let contacts=0;
  for(let i=0;i<sim.cells.length;i++)for(let j=i+1;j<sim.cells.length;j++){const a=sim.cells[i],b=sim.cells[j],gap=distance(a.position,b.position)-a.mechanics.collisionRadius-b.mechanics.collisionRadius;if(gap<1){contacts++;parents[find(i)]=find(j);}}
  const groups=new Map();sim.cells.forEach((_,i)=>groups.set(find(i),(groups.get(find(i))||0)+1));
  return {cellContacts:contacts,clusters:[...groups.values()].filter(n=>n>1).length,largestCluster:Math.max(...groups.values()),meanDisplacement:sim.cells.reduce((a,c)=>a+c.mechanics.displacement,0)/sim.cells.length,meanCellSpeed:sim.cells.reduce((a,c)=>a+length(c.mechanics.velocity),0)/sim.cells.length};
}
