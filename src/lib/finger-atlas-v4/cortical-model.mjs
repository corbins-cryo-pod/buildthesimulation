/** Paired, representative coronal tissue samples, millimetres throughout.
 * Region shape, layer widths, cell placement and projections are model priors.
 * H01 is temporal cortex; it supplies reference morphology, never M1/S1 identity.
 */
export const CORTEX_PROFILES = Object.freeze({
  m1: { id:'m1', name:'M1 · primary motor', gyrus:'Precentral gyrus', sourceId:'FMA72662', origin:[41,351,0], width:6.2, height:9, thickness:3.4, boundaries:[0,.08,.18,.43,.48,.74,1], counts:[10,48,72,20,64,76], color:0xe6b385, target:'Motor thalamus (VL)', note:'Thin, indistinct IV; expanded V. Layer-V corticospinal and layer-VI corticothalamic cells are separate.' },
  s1: { id:'s1', name:'S1 · primary sensory', gyrus:'Postcentral gyrus', sourceId:'FMA72666', origin:[43,354,-21], width:5.4, height:8.2, thickness:2.2, boundaries:[0,.08,.19,.43,.60,.78,1], counts:[10,48,64,88,48,72], color:0x8bcbd2, target:'Sensory thalamus (VPL)', note:'Prominent granular IV; deep VI gives rise to corticothalamic projections. Area-3b-like lamination is a prior.' },
});
export const LAYER_NAMES = ['I','II','III','IV','V','VI'];
export const CORTEX_EVIDENCE = {
  geometry:'MRI-style illustrative coronal gyrus sections, not patient MRI segmentation. M1 and S1 are shown at separate anterior–posterior planes, not side by side in one anatomical slice.',
  layers:'Six layers follow the curved pia to a gray–white matter boundary. Nominal thickness is 3.4 mm in M1 and 2.2 mm in S1; fractions and counts are explicit modeling priors, not H01 measurements.',
  h01:'H01 is a surgically removed temporal-cortex fragment. Released proofread neurites are rigidly reoriented and reused as morphology references in both regions; these are not measured M1/S1 cells or an H01 connectome replication.',
  connections:'Cortical construction adds individually identified reference cells with soma-connected local axons. Layer-VI projection examples enter white matter toward a labeled thalamic continuation; motor corticospinal output originates in V. Endpoints outside a section are continuation ports, not synapses.',
  dki:'No diffusion dataset is fitted here. DKI references inform a future voxel-scale orientation field; displayed paths, axon diameters, spacing and cellular endpoints remain modeled. DKI does not resolve individual axons or synaptic wiring.',
  spacing:'Deterministic non-overlapping soma placement in a 0.16-mm-thick central ribbon. Long-range fibers keep separate lanes; the representative sample is deliberately sparser than full neuropil.',
};
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,k)=>a.map(x=>x*k);
const rngFor=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export function sectionFrame(profile, theta=0) {
  const tangent=[profile.width*Math.cos(theta),-profile.height*Math.sin(theta),0],length=Math.hypot(...tangent);
  const t=tangent.map(x=>x/length),normal=[-t[1],t[0],0];
  return {tangent:t,normal,pia:[profile.width*Math.sin(theta),profile.height*Math.cos(theta),0]};
}
export function sectionPoint(profile, theta, depth, z=0) {
  const f=sectionFrame(profile,theta);return add(add(f.pia,mul(f.normal,-depth)),[0,0,z]);
}
/** Continue as separated white-matter lanes instead of extending convergent
 * cortical normals through their focal point beneath a curved crown. */
export function projectionPoint(profile,theta,below,z=0){
  const p=sectionPoint(profile,theta,profile.thickness,z);return [p[0]*(1+.08*below),p[1]-below,z];
}
export function corticalWorld(profile,p){return add(profile.origin,p);}
export function layerAtDepth(profile,depth){const i=profile.boundaries.slice(1).findIndex(t=>depth<t*profile.thickness);return i<0?6:i+1;}

export function createCorticalSample(id) {
  const profile=CORTEX_PROFILES[id],rng=rngFor(id==='m1'?4117:8103),cells=[];
  for(let li=0;li<6;li++){
    const start=profile.boundaries[li]*profile.thickness,end=profile.boundaries[li+1]*profile.thickness;
    for(let i=0;i<profile.counts[li];i++){
      const layer=li+1,exc=layer>1&&rng()>.22;
      const projection=exc&&layer===6?'corticothalamic':exc&&layer===5&&id==='m1'&&i%3===0?'corticospinal':'local';
      const radius=layer===5&&projection==='corticospinal'?.014+rng()*.010:.0045+rng()*(exc?.005:.003);
      let soma,depth,theta,z;
      for(let attempt=0;attempt<5000;attempt++){
        theta=(rng()-.5)*1.8/profile.width;depth=start+.03+rng()*Math.max(.02,end-start-.06);z=(rng()-.5)*.16;
        soma=sectionPoint(profile,theta,depth,z);
        if(cells.every(c=>Math.hypot(...c.soma.map((n,k)=>n-soma[k]))>(radius+c.radius)*1.3))break;
        if(attempt===4999)throw new Error('Cortical soma packing exhausted');
      }
      const f=sectionFrame(profile,theta),type=exc?'pyramidal':'interneuron';
      const cell={id:`${id}-L${layer}-${String(i+1).padStart(3,'0')}`,region:id,layer,type,projection,radius,soma,depth,theta,normal:f.normal,tangent:f.tangent,axonRadiusMm:.0003+rng()*.0005,paths:[],source:'Modeled representative cell'};
      const local=(x,y,z0=0)=>add(soma,add(mul(f.tangent,x),add(mul(f.normal,y),[0,0,z0])));
      const path=(points,role,radius0,radius1=radius0)=>cell.paths.push({points,role,radii:points.map((_,j)=>radius0+(radius1-radius0)*j/(points.length-1))});
      if(exc){
        const reach=Math.min(depth-.035,layer>=5?.65+ rng()*.55:.25+rng()*.35),tip=local((rng()-.5)*.07,reach);
        path([soma,local(.003,reach*.25),local(-.006,reach*.6),tip],'dendrite',.0022,.0007);
        for(let j=0;j<7;j++){
          const t=.28+j*.09,root=local(-.006,reach*t),sign=j%2?1:-1,dx=sign*(.04+rng()*.09);
          path([root,local(dx*.55,reach*t+.02),local(dx,reach*t+.04+rng()*.05)],'dendrite',.0009,.0003);
        }
      }
      for(let j=0;j<(exc?5:7);j++){
        const angle=j*2.399963+rng()*.3,r=.05+rng()*.11,dx=Math.cos(angle)*r,dy=Math.sin(angle)*Math.min(r,Math.max(.025,depth*.5));
        const mid=local(dx*.55,dy*.55,(rng()-.5)*.04),tip=local(dx,dy,(rng()-.5)*.09);
        path([soma,mid,tip],'dendrite',.0012,.0004);
        path([mid,add(tip,[.025*(j%2?1:-1),.025,.015])],'dendrite',.0006,.00025);
      }
      if(projection!=='local'){
        // Follow the local radial direction across VI into white matter. Lanes
        // retain each cell's tangential/depth coordinate; no common funnel node.
        const white=projectionPoint(profile,theta,.25,z),end=projectionPoint(profile,theta,2.4,z);
        const initial=sectionPoint(profile,theta,Math.min(profile.thickness-.005,depth+.045),z);
        path([soma,initial,sectionPoint(profile,theta,Math.min(profile.thickness,depth+.3),z),white,end],'axon',cell.axonRadiusMm);
        cell.continuation={point:end,target:projection==='corticospinal'?'Descending corticospinal tract':profile.target,kind:'continuation-port'};
        path([initial,local(.08,-.06),local(.16,.04)],'collateral',cell.axonRadiusMm*.7,.00025);
      }else{
        path([soma,local(.006,-.025),local(.06,-.05),local(.15,-.02),local(.21,.04)],'axon',cell.axonRadiusMm,.00025);
      }
      cells.push(cell);
    }
  }
  return {profile,cells,evidence:CORTEX_EVIDENCE,unit:'mm',sliceThicknessMm:.16};
}

/** Reposition the existing route cells with all graph endpoints/landmarks.
 * The original V3 mesh templates and IDs remain intact. */
export function placeCorticalRouteCells(model) {
  const result=structuredClone(model),moves=new Map();
  for(const area of ['m1','s1']){
    const p=CORTEX_PROFILES[area],targets=result.cells.filter(c=>c.type===area);
    targets.forEach((cell,i)=>{
      const layer=area==='m1'?5:4,lo=p.boundaries[layer-1]*p.thickness,hi=p.boundaries[layer]*p.thickness;
      const theta=((i%12)-5.5)*.11/p.width,depth=lo+(hi-lo)*(.35+.3*((i%3)/2)),z=((Math.floor(i/12)%6)-2.5)*.027;
      const local=sectionPoint(p,theta,depth,z),before=cell.soma,after=corticalWorld(p,local);
      moves.set(cell.id,{before,after});cell.soma=after;cell.corticalLayer=layer;cell.corticalArea=area;cell.pialNormal=sectionFrame(p,theta).normal;
      cell.corticalPlacement={theta,depthMm:depth,prior:true};
      const first=cell.branches.find(b=>b.role==='axon');
      if(area==='m1'&&first){first.points=[after,corticalWorld(p,projectionPoint(p,theta,.2,z)),corticalWorld(p,projectionPoint(p,theta,2.4,z)),...first.points.slice(1)];}
      else for(const branch of cell.branches)branch.points=branch.points.map(point=>point.map((n,k)=>n+after[k]-before[k]));
    });
  }
  const byId=new Map(result.cells.map(c=>[c.id,c]));
  for(const route of result.routes){
    for(const edge of route.connections){
      const move=moves.get(edge.to);if(!move)continue;edge.at=[...move.after];
      for(const b of byId.get(edge.from).branches)if(b.points.at(-1).every((n,i)=>Math.abs(n-move.before[i])<1e-9)){
        const target=byId.get(edge.to),p=CORTEX_PROFILES[target.type],q=target.corticalPlacement;
        b.points=[...b.points.slice(0,-1),corticalWorld(p,projectionPoint(p,q.theta,2.4,move.after[2]-p.origin[2])),corticalWorld(p,projectionPoint(p,q.theta,.2,move.after[2]-p.origin[2])),[...move.after]];
      }
    }
    for(const mark of route.landmarks){const move=moves.get(mark.cellId);if(move&&mark.region==='cortex')mark.point=[...move.after];}
  }
  result.cortex={profiles:CORTEX_PROFILES,evidence:CORTEX_EVIDENCE};return result;
}
