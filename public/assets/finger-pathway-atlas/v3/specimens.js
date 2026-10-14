(()=>{'use strict';
const {T,V,PALETTE:C,seedRandom:rand,plus,mix,decodeGeometry,cellColor,surfaceMaterial,Membrane,posePoint}=window.ATLAS_GEOMETRY;
const TAU=2*Math.PI;
const SOURCE_NOTE='Generated visualization surface; not an EM segmentation or a solver-ready membrane.';
const REGIONS=[
 {id:'overview',group:'Anatomical scale',name:'Whole pathway',title:'From finger to cortex',unit:'mm',center:[-310,140,5],span:1070,camera:[80,210,1450],description:'A source-based human anatomical scaffold. The right index finger is linked to contralateral sensory and motor cortex through separately modeled neurons.',evidence:'atlas + modeled pathways',notice:'Millimeter anatomy · fiber diameters exaggerated for visibility',context:'overview'},
 {id:'hand',group:'Anatomical scale',name:'Hand & index finger',title:'The index finger, in context',unit:'mm',native:[-277,-149,735],span:225,camera:[-25,100,320],description:'Source-based BodyParts3D hand and skin surface in atlas rest coordinates. Two modeled proper palmar digital branches follow the selected index finger. The rest of the hand is anatomical context.',evidence:'source anatomical surfaces',notice:'Only the selected finger pathway is populated',context:'hand'},
 {id:'arm',group:'Anatomical scale',name:'Wrist, forearm & plexus',title:'Through the peripheral nerves',unit:'mm',native:[-216,-96,1030],span:650,camera:[30,180,900],description:'Sensory fibers travel through the median pathway; distinct motor routes reach flexor, extensor and intrinsic hand-muscle targets. The cervical root/plexus trajectories are modeled landmarks.',evidence:'atlas + modeled trajectories',notice:'Routing is anatomically informed, not cadaver-traced nerve geometry',context:'arm'},
 {id:'cervical',group:'Anatomical scale',name:'Cervical spinal cord',title:'Root, ganglion, cord',unit:'mm',native:[-18,-73,1418],span:125,camera:[-155,80,175],description:'Actual cervical vertebral meshes locate a modeled cord, dorsal/ventral rootlets and right C6/C7 ganglion regions. Sensory identity is preserved through the ganglion; no obligatory DRG synapse.',evidence:'atlas landmarks + synthetic neural tissue',notice:'C6/C7 are illustrative selected roots, not exclusive index-finger mapping',context:'cervical'},
 {id:'brain',group:'Anatomical scale',name:'Brainstem & cerebral cortex',title:'The contralateral destination',unit:'mm',native:[0,-90,1565],span:255,camera:[240,135,360],description:'Source cortical gyri, cerebellum, pons, medulla and thalamic surfaces. Precentral and postcentral gyri are identified; the selected hand-area patches and long-range fibers are modeled.',evidence:'source gyri / modeled hand-area placement',notice:'Whole thalamus is sourced; VPL subnucleus is not segmented',context:'brain'},
 {id:'tip',group:'Cellular scale',name:'Fingertip sensory endings',title:'Where touch begins',unit:'µm',center:[20,-45,0],span:1280,camera:[230,330,1700],description:'A composite cutaway of Meissner lamellae, Merkel-associated contacts, deeper Pacinian-like lamellae and free endings. Endings remain connected to their parent afferents.',evidence:'synthetic end-organ microanatomy',notice:'Comparison specimen · positions and dimensions are model priors',context:'hand'},
 {id:'nerve',group:'Cellular scale',name:'Peripheral nerve fascicles',title:'Inside one peripheral nerve',unit:'µm',center:[0,-5,0],span:780,camera:[190,910,730],description:'Unequal-caliber axons, separate myelin and axoplasm, staggered nodal gaps, packed fascicle sections and cutaway perineurial layers. Context fiber fragments are not counted as additional reconstructed neurons.',evidence:'histogram-informed sample / synthetic packing',notice:'Large-fiber diameter prior is not a digitized index-finger histogram',context:'arm'},
 {id:'drg',group:'Cellular scale',name:'Dorsal root ganglion',title:'One neuron. Two directions.',unit:'µm',center:[0,0,0],span:1230,camera:[260,130,1830],description:'Pseudounipolar sensory cells with variable implicit soma surfaces, one emerging stem and continuous peripheral/central axon branches. Satellite-cell membranes form a separate support layer.',evidence:'cell-class topology prior',notice:'Synthetic cervical ganglion sample · no dendritic forest',context:'cervical'},
 {id:'spinal',group:'Cellular scale',name:'Spinal sensorimotor circuit',title:'A local spinal circuit',unit:'µm',center:[0,0,0],span:1730,camera:[270,200,2350],description:'Expanded dorsal sensory entry and ventral motor-cell populations with local multipolar interneurons. Incoming afferents, interneurons and outgoing lower motor neurons remain distinct objects.',evidence:'synthetic circuit sample',notice:'Normalized section outline; only the cell geometry uses local µm' ,context:'cervical'},
 {id:'medulla',group:'Cellular scale',name:'Medullary relay & crossings',title:'Two different crossings',unit:'µm',center:[0,0,0],span:1760,camera:[200,210,2450],description:'A right-cuneate relay sample gives rise to sensory crossing fibers. A separate, more caudal corticospinal crossing belongs to upper motor neurons, not primary sensory cells.',evidence:'anatomical topology / synthetic cells',notice:'Circuit expanded for inspection; crossings are not one shared junction',context:'brain'},
 {id:'thalamus',group:'Cellular scale',name:'Thalamic relay sample',title:'A relay toward somatosensory cortex',unit:'µm',center:[0,0,0],span:1350,camera:[250,240,1850],description:'Modeled multipolar VPL relay cells with dendritic arbors and distinct incoming/outgoing processes. This is a qualitative inspection volume, not the actual shape or cell census of VPL.',evidence:'synthetic relay population',notice:'No measured relay-cell morphology or connectivity is asserted',context:'brain'},
 {id:'cortex',group:'Cellular scale',name:'Human cortical arbors',title:'A tissue of individual cells',unit:'µm',center:[0,-110,0],span:3000,camera:[250,170,4900],description:'Ten human tracing sources supply unscaled branching trees and radii. Copies are arranged by their source layer (II, III or V) in one comparative slab. Tissue spacing and S1/M1 domains are illustrative, not measured finger-cortex samples.',evidence:'measured traces / synthetic placement',notice:'Source cells are temporal/frontal specimens, not measured index S1/M1',context:'brain'},
 {id:'cell',group:'Cellular scale',name:'Single-cell source library',title:'Inspect a reconstructed human cell',unit:'µm',center:[0,0,0],span:1300,camera:[210,170,1800],description:'Original human tracing topology, translated to the soma and rotated for display. The membrane is generated around the measured centerline/radius; no display-only spines are added in this source view.',evidence:'Allen human SWC reconstruction',notice:'Bright-field tracing ≠ EM membrane reconstruction',context:'brain'},
 {id:'nmj',group:'Cellular scale',name:'Neuromuscular junction',title:'The motor pathway ends at muscle',unit:'µm',center:[0,10,0],span:205,camera:[45,155,235],description:'A human-inspired terminal with irregular presynaptic endings, separate postsynaptic patches and a local muscle-fiber surface. This terminal represents a forearm muscle target, not a fingertip receptor.',evidence:'synthetic human-inspired terminal',notice:'Illustrative endplate geometry; not a traced human NMJ',context:'arm'},
 {id:'proprio',group:'Cellular scale',name:'Proprioceptive endings',title:'Sensing length and tension',unit:'µm',center:[0,0,0],span:1500,camera:[350,300,1900],description:'Two additional qualitative specimens: spindle-like sensory endings around intrafusal fibers and tendon-organ-like arborization between supporting collagen strands. Not part of the tactile reduction count.',evidence:'synthetic comparative specimens',notice:'No physiological response or measured proprioceptor density is simulated',context:'arm'}
];
function cohort(denominator=30){
 if(![20,30,40].includes(+denominator))throw new Error('Unsupported sampling denominator');
 const expected=3*241+9*(1.6*58),n=Math.round(expected/denominator),edges=[7,8,9,10,11,12,13,14],weights=[1.9,3,4.5,7,6.5,2,.3],cells=[];
 for(let i=0;i<n;i++){const r=rand(731+i*137),q=r();let w=r()*weights.reduce((a,b)=>a+b,0),bin=0;while(bin<weights.length-1&&(w-=weights[bin])>0)bin++;const d=edges[bin]+r();cells.push({id:i+1,name:q<.43?'Meissner-associated FA-I':q<.76?'Merkel-associated SA-I':q<.87?'Pacinian-associated FA-II':'SA-II · end organ unresolved',kind:'sensory',subtype:q<.43?'meissner':q<.76?'merkel':q<.87?'pacinian':'sa2',fiberDiameter:d,axonDiameter:d*.66,somaRadius:17+r()*17,source:'synthetic tactile neuron',evidence:'Population weighted from JV1979/JV1983 and assumed glabrous areas. Diameter: coarse visual large-fiber prior, not raw data.'});}
 for(let i=0;i<8;i++)cells.push({id:101+i,name:'Free-ending sensory example',kind:'sensory',subtype:'free',axonDiameter:.6+i*.08,somaRadius:12+i*.65,source:'synthetic additional sensory example'});
 for(let i=0;i<12;i++)cells.push({id:201+i,name:'Lower motor neuron · '+(i<4?'median':i<8?'radial':'ulnar'),kind:'motor',subtype:'motor',somaRadius:24+(i%4)*3,axonDiameter:8+(i%5)*1.4,nerve:i<4?'median':i<8?'radial':'ulnar',source:'synthetic lower motor neuron'});
 return {n,denominator,expected,cells,calibration:{scope:'Glabrous low-threshold tactile afferents only',tipAreaCm2:3,restAreaCm2:9,areasAssumed:true,tipDensity:241,restDensity:92.8,gRatio:.66,diameterPrior:{edges,weights,evidence:'coarse visually estimated large-fiber mode in JV1983; outer fiber diameter, not axon'},representedUnitsPerSample:expected/n}};
}

class Specimen {
 constructor(id,unit){this.id=id;this.unit=unit;this.group=new T.Group();this.group.name=id;this.entries=[];this.labels=[];this.context=[];this.paths=[];}
 add(g,color,meta={},layer='neural',opacity=1){if(!g?.attributes?.position?.count)return null;if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));const mesh=new T.Mesh(g,surfaceMaterial(color,opacity));mesh.name=meta.name||`surface_${this.entries.length}`;mesh.userData={layer,kind:meta.kind||'other',...meta,baseColor:color,baseOpacity:opacity};this.group.add(mesh);this.entries.push(mesh);return mesh;}
 membrane(b,color,meta,layer='neural',opacity=1){return this.add(b.geometry(),color,meta,layer,opacity);}
 label(text,p,target=null){this.labels.push({text,p,target});}
}
function factories(data){
 const anatomy=new Map(data.meshes.map(m=>[m.id,{info:m,geometry:null}]));
 const somaPriors=data.somaPriors.map(m=>({info:m,geometry:decodeGeometry(m)}));
 const human=data.morphologies.map(m=>({info:m,geometry:null}));
 function somaGeometry(kind,seed,position,rad){const found=somaPriors[(kind==='pseudounipolar'?0:8)+Math.abs(seed)%8];const g=found.geometry.clone();const scale=[rad,rad,rad];g.scale(...scale);g.translate(...position);return {g,roots:found.info.roots.map(p=>plus(position,p.map(x=>x*rad)))};}
 function organicCell(s,cell,p,rad,seed,depth=3,spread=1,projected=false){
  const info={id:cell.id,name:cell.name,kind:cell.kind,source:cell.source||'synthetic class-specific membrane',evidence:SOURCE_NOTE,...cell};const shell=somaGeometry('multipolar',seed,p,rad),b=new Membrane();b.append(shell.g);shell.g.dispose();
  // Five dendritic poles and one distinct axonal pole. Proximal roots are fused
  // into an implicit soma, rather than six cylinders intersecting a sphere.
  shell.roots.slice(0,5).forEach((root,j)=>{const d=V(root).sub(V(p)).normalize();b.tree(root,d.toArray(),(38+rand(seed+j)()*55)*spread,Math.min(3,rad*.12),depth,seed+j*713,false);});
  const axonOrigin=shell.roots[5];
  if(!projected)b.tree(axonOrigin,V(axonOrigin).sub(V(p)).normalize().toArray(),160*spread,Math.max(.65,rad*.035),2,seed+991,false);
  const mesh=s.membrane(b,cell.kind==='motor'?C.motor:cell.kind==='sensory'?C.sensory:C.other,info);mesh.userData.axonOrigin=axonOrigin;return mesh;
 }
 function sourceGeometry(index){
  const rec=human[index%human.length];if(rec.geometry)return rec.geometry;const b=new Membrane();b.append(decodeGeometry(rec.info.soma));
  for(const branch of rec.info.branches){const p=branch.points.map(x=>x.slice(0,3));const rr=branch.points.map(x=>Math.max(.07,x[3]));b.sweep(p,rr,rec.info.id+branch.type,7);}
  rec.geometry=b.geometry();return rec.geometry;
 }
 function fineGeometry(index){const rec=human[index%human.length];if(rec.fine)return rec.fine;const b=new Membrane(),r=rand(rec.info.id+991);let count=0;
  for(const branch of rec.info.branches){if(![2,3,4].includes(branch.type))continue;const dend=branch.type!==2;if(dend&&rec.info.metadata.tag__dendrite_type==='aspiny')continue;const pts=branch.points;for(let k=3;k<pts.length-2;k+=18){if(count>390)break;const p=V(pts[k].slice(0,3)),dir=V(pts[k+1].slice(0,3)).sub(V(pts[k-1].slice(0,3))).normalize();if(dend){const out=V().crossVectors(dir,V(r()-.5,r()-.5,r()-.5)).normalize(),len=1.1+r()*1.2,base=p.clone().addScaledVector(out,pts[k][3]*.6),neck=p.clone().addScaledVector(out,pts[k][3]+len*.65),tip=p.clone().addScaledVector(out,pts[k][3]+len);b.sweep([base,neck,tip],[.20,.15,.38+r()*.15],count,7);b.shell(tip.toArray(),[.45,.46,.39],count+44,6,9);}else{b.shell(p.toArray(),[pts[k][3]+.34,pts[k][3]+.23,pts[k][3]+.30],count+12,6,9);}count++;}}
  rec.fine=b.geometry();return rec.fine;
 }
 function addHuman(s,index,id,position,kind='other',scale=1,rotation=0){const src=human[index%human.length],m=src.info;const g=sourceGeometry(index);const mesh=new T.Mesh(g,surfaceMaterial(kind==='motor'?C.motor:kind==='sensory'?C.sensory:cellColor(id)));mesh.position.copy(V(position));mesh.scale.set(scale,scale,scale);mesh.rotation.y=rotation;mesh.name=`human_${m.id}_instance_${id}`;mesh.userData={id,name:`Human ${m.metadata.tag__dendrite_type} cell · ${m.id}`,kind,layer:'neural',baseColor:kind==='motor'?C.motor:kind==='sensory'?C.sensory:cellColor(id).getHex(),baseOpacity:1,sourceId:m.id,source:m.source,sourceRegion:m.metadata.structure__name?.replaceAll('"',''),sourceLayer:m.metadata.structure__layer,sourceSpecies:m.metadata.donor__species,rawNodes:m.nodes,branches:m.branches.length,bifurcations:m.bifurcations,evidence:'Measured skeleton/radii; generated membrane. Position/orientation here are display choices.',original: s.id==='cell'};s.group.add(mesh);s.entries.push(mesh);const fine=s.add(fineGeometry(index),mesh.userData.baseColor,{id,name:'Modeled spines / boutons · '+m.id,kind,source:'Synthetic reduced microdetail anchored to source dendrites and axons',sourceId:m.id,modeledFineDetail:true,evidence:'Spine/bouton dimensions, placement and reduced density are assumptions, not resolved features in the SWC.'},'neural',1);if(fine){fine.position.copy(mesh.position);fine.scale.copy(mesh.scale);fine.rotation.copy(mesh.rotation);}return mesh;}
 function addAnatomy(s){for(const [id,e] of anatomy){if(!e.geometry||e.posed!==window.ATLAS_POSE_EXTENDED){e.geometry=decodeGeometry(window.ATLAS_POSE_EXTENDED?e.info:{...e.info,p:e.info.restP||e.info.p});e.posed=window.ATLAS_POSE_EXTENDED;}const m=e.info;let color=m.category==='skin'?0x8ebdcd:m.category==='bone'?0xa7b9b9:m.category==='muscle'?0xba8474:0x8e9eab,alpha=m.category==='skin'?.20:m.category==='bone'?.24:m.category==='muscle'?.12:.22;
  if(id==='FMA72662'){color=0xc99a75;alpha=.48;}if(id==='FMA72666'){color=0x79b8c7;alpha=.48;}
  if(id==='FMA258716'){color=0x9bb8c4;alpha=.4;}
  if(m.category==='cortex'){color=id==='FMA72662'?0xbd926f:id==='FMA72666'?0x66a9b4:0x717c82;alpha=.87;}
  const mesh=s.add(e.geometry,color,{id:'atlas:'+id,name:m.name,kind:'context',source:m.source,sourceId:id,evidence:m.derived,atlas:true},m.category,alpha);mesh.renderOrder=m.category==='skin'?6:2; if(m.category==='cortex'){mesh.material.side=T.FrontSide;mesh.material.depthWrite=true;mesh.material.transparent=true;}
 }}
 const tactileRoute=[[-311,-179,679],[-305,-163,697],[-296,-146,724],[-279,-140,765],[-263,-128,818],[-243,-122,906],[-221,-105,993],[-208,-101,1061],[-184,-94,1178],[-169,-85,1276],[-137,-93,1338],[-88,-96,1366],[-52,-95,1392],[-26,-91,1414],[-12,-76,1418],[-5,-66,1437],[-5,-65,1462],[-5,-69,1497]];
 const leftS1=[[12,-92,1561],[22,-83,1586],[36,-78,1607]];
 const lemniscus=[[-5,-69,1497],[-9,-76,1502],[2,-88,1508],[7,-97,1528],[9,-98,1544],[12,-92,1561]];
 const umn=[[37,-100,1608],[24,-94,1586],[14,-94,1557],[7,-103,1534],[4,-93,1502],[2,-89,1486],[-4,-83,1477],[-5,-72,1450],[-5,-72,1422],[-4,-84,1409]];
 const motorRoutes={median:[[-4,-84,1409],[-16,-94,1406],[-35,-103,1398],[-84,-100,1362],[-139,-94,1338],[-169,-91,1278],[-182,-95,1176],[-208,-104,1060],[-221,-117,1005],[-227,-122,974]],radial:[[-4,-84,1390],[-20,-95,1389],[-65,-94,1365],[-148,-84,1318],[-189,-43,1220],[-214,-31,1133],[-232,-52,1034],[-248,-96,944],[-260,-103,883]],ulnar:[[-4,-83,1386],[-25,-88,1381],[-74,-94,1361],[-148,-81,1319],[-181,-54,1215],[-203,-42,1082],[-214,-61,1035],[-239,-99,918],[-245,-107,835],[-248,-127,790],[-270,-148,749]]};
 function macro(model){
  const s=new Specimen('overview','mm');addAnatomy(s);
  // Explicit long axis and gray-matter contour, not a cylinder primitive.
  const cord=new Membrane(),pts=[];for(let i=0;i<=140;i++){let z=1338+i*1.02;pts.push(posePoint([0,-72+5*Math.sin((z-1360)*.025),z]));}
  cord.sweep(pts,pts.map((p,i)=>4.3+1.3*Math.exp(-(((i-68)/24)**2))),99,28);s.membrane(cord,0x91a4b0,{id:'modeled-cord',name:'Cervical spinal cord · modeled envelope',kind:'context',source:'Vertebral-landmark constrained envelope, not segmented cord'},'cns',.23);
  const rootContext=new Membrane();
  [1387,1401,1416,1430,1445].forEach((z,k)=>{for(let side of [-1,1]){for(let j=0;j<5;j++)rootContext.curve([posePoint([side*3.5,-68,z-3+j*1.4]),posePoint([side*9,-76,z+2]),posePoint([side*21,-86,z+3]),posePoint([side*32,-95,z])],.20,100+k*9+j,32,.13,6);}});
  s.membrane(rootContext,0x89948e,{id:'root-context',name:'Context cervical rootlets',kind:'context',source:'Synthetic bilateral rootlet landmarks; not the selected cell census'},'support',.53);
  // Right C6/C7 gross ganglion capsules. Source-prior surface; neuron bodies appear in the linked micro view.
  [1414,1398].forEach((z,i)=>{const b=new Membrane();b.shell(posePoint([-24,-91,z]),[2.5,4.1,2.7],9+i,22,32);s.membrane(b,0xabafa0,{id:'ganglion-'+i,name:'Right '+(i?'C7':'C6')+' DRG region',kind:'context',source:'Modeled gross ganglion envelope'},'support',.25);});
  // Sensory cells: primary afferents stop at cuneate; separate relay cells continue above.
  for(const c of model.cells.filter(x=>x.id<101)){
   const r=rand(c.id*271),b=new Membrane();
   // A stable cross-sectional position is transported along the tract. Correlated
   // waviness changes gradually, rather than random jitter at each control point.
   const angle=c.id*2.39996323,rho=Math.sqrt((c.id-.5)/model.n);
   const controls=tactileRoute.map((p,i)=>{const tangent=V(tactileRoute[Math.min(i+1,tactileRoute.length-1)]).sub(V(tactileRoute[Math.max(0,i-1)])).normalize();
    const u=V().crossVectors(tangent,Math.abs(tangent.z)>.85?V(1,0,0):V(0,0,1)).normalize(),v=V().crossVectors(tangent,u).normalize();
    const width=i<3?.9:i<13?2.0:1.05;
    const q=V(p).addScaledVector(u,(Math.cos(angle)*rho+.07*Math.sin(i*.7+c.id))*width).addScaledVector(v,(Math.sin(angle)*rho+.06*Math.cos(i*.6+c.id))*width);
    return posePoint(q.toArray());});
   const branchSide=c.id%2?1:-1;controls[0]=posePoint([-311+branchSide*3.1,-179+(r()-.5)*4,678+r()*5]);controls[1]=posePoint([-305+branchSide*3.5,-163,699]);controls[2]=posePoint([-296+branchSide*4.0,-146,724]);
   b.curve(controls,.065+c.fiberDiameter*.0055,c.id,440,.03,7);
   // Subepidermal terminal fan stays anatomically inside the distal skin neighborhood.
   const origin=controls[0];for(let j=0;j<3;j++){const dest=posePoint([-308+(r()-.5)*9,-179-r()*4,680+(r()-.5)*7]);b.curve([origin,plus(mix(origin,dest,.55),[(r()-.5)*.65,(r()-.5)*.55,(r()-.5)*.4]),dest],.045,c.id*13+j,19,.45,5);}
   const meta={...c,evidence:'Modeled primary tactile axon. Gross radius exaggerated; stable identity continues in nerve/DRG views.'};s.membrane(b,C.sensory,meta);
   s.paths.push({cell:c.id,kind:'primary-afferent',nativeControls:tactileRoute,displayControls:controls});
  }
  for(let i=0;i<14;i++){const b=new Membrane(),r=rand(801+i);b.curve(lemniscus.map(p=>posePoint([p[0]+(r()-.5)*1.2,p[1]+(r()-.5),p[2]])),.13,801+i,100,.08,7);s.membrane(b,C.sensory,{id:301+i,name:'Cuneate relay axon '+(i+1),kind:'sensory',source:'Synthetic second-order neuron',evidence:'Primary afferent ends at right cuneate; this separate cell crosses to left medial lemniscus.'});
   const t=new Membrane();t.curve(leftS1.map(p=>posePoint([p[0]+(r()-.5)*4,p[1]+(r()-.5)*3,p[2]+(r()-.5)*3])),.15,1201+i,50,.25,6);s.membrane(t,C.sensory,{id:341+i,name:'Left VPL thalamocortical axon '+(i+1),kind:'sensory',source:'Synthetic thalamocortical relay'});
  }
  for(let i=0;i<12;i++){const b=new Membrane(),r=rand(i+181);b.curve(umn.map(p=>posePoint([p[0]+(r()-.5)*1.4,p[1]+(r()-.5),p[2]])),.15,2001+i,190,.08,7);s.membrane(b,C.motor,{id:901+i,name:'Upper motor neuron route '+(i+1),kind:'motor',source:'Synthetic corticospinal neuron',evidence:'Separate from lower motor neuron; modeled pyramidal crossing.'});}
  for(const c of model.cells.filter(x=>x.kind==='motor')){const b=new Membrane(),r=rand(c.id);const route=motorRoutes[c.nerve];b.curve(route.map(p=>posePoint([p[0]+(r()-.5)*1.3,p[1]+(r()-.5)*1.4,p[2]+(r()-.5)])),.16,c.id,210,.08,7);const end=posePoint(route.at(-1));for(let k=0;k<5;k++)b.tree(end,[r()-.5,-.5,r()-.5],3+r()*5,.085,1,c.id*23+k,false);s.membrane(b,C.motor,c);s.paths.push({cell:c.id,kind:'lower-motor',nerve:c.nerve,nativeControls:route});}
  // Thin modeled sheaths convey fascicular organization rather than one oversized colored cable.
  const sheath=new Membrane();for(let i=0;i<3;i++){let cp=tactileRoute.slice(3,14).map(p=>posePoint([p[0]+Math.cos(i*TAU/3)*1.1,p[1]+Math.sin(i*TAU/3)*1.1,p[2]]));sheath.curve(cp,.42,11+i,160,.05,10);}s.membrane(sheath,0x879582,{id:'fascicle-context',name:'Modeled fascicular envelope',kind:'context',source:'Qualitative fascicular scaffold; not a nerve atlas segmentation'},'support',.15);
  // Unselected mesoscopic neural context. These curves carry no neuron census
  // or measured-connectivity claim; the selected pathways remain separate.
  const plexusContext=new Membrane(),longitudinal=new Membrane();
  for(let k=0;k<5;k++){
   const z=[1445,1430,1416,1401,1387][k],tz=k<2?1408:k===2?1388:1370;
   for(let j=0;j<9;j++){
    const a=j*2.3999,dx=Math.cos(a)*.7,dy=Math.sin(a)*.7;
    const cp=[[ -5+dx,-80+dy,z],[-24+dx,-90+dy,z-2],[-53+dx,-93+dy,(z+tz)*.5],[-77+dx,-96+dy,tz],[-113+dx,-96+dy,1350+k*3],[-148+dx,-87+dy,1317+k*2]];
    plexusContext.curve(cp.map(p=>posePoint(p)),.13+(j%3)*.035,k*91+j,130,.18,6);
   }
  }
  for(const nerveName of ['median','radial','ulnar']){
   const route=motorRoutes[nerveName].slice(3);
   for(let j=0;j<13;j++){
    const a=j*2.39996,rho=Math.sqrt((j+.5)/13)*1.6;
    const cp=route.map((p,k)=>posePoint([p[0]+Math.cos(a)*rho+.10*Math.sin(k+j),p[1]+Math.sin(a)*rho,p[2]]));
    longitudinal.curve(cp,.11+(j%3)*.027,1381+j,220,.18,6);
   }
  }
  s.membrane(plexusContext,0xb2a584,{id:'plexus-neural-context',name:'C5–T1 plexus context · modeled fiber trajectories',kind:'context',source:'Synthetic upper-limb plexus scaffold; not measured branching or additional sampled neurons'},'contextNerve',.65);
  s.membrane(longitudinal,0xa59b79,{id:'peripheral-neural-context',name:'Median / radial / ulnar nerve context',kind:'context',source:'Synthetic unselected fiber fragments around the three selected peripheral routes'},'contextNerve',.50);
  s.routeAnchors={tip:posePoint([-311,-179,680]),nerve:posePoint([-262,-128,819]),drg:posePoint([-24,-91,1414]),spinal:posePoint([-4,-84,1409]),medulla:posePoint([0,-87,1500]),thalamus:posePoint([12,-92,1561]),cortex:posePoint([36,-83,1607]),nmj:posePoint([-227,-122,974])};
  s.displayRoutes={sensory:[tactileRoute,lemniscus,leftS1].map(route=>route.map(posePoint)),motor:[umn,motorRoutes.median].map(route=>route.map(posePoint))};
  s.label('Fingertip endings',posePoint([-311,-185,679]),'tip');s.label('Wrist fascicles',posePoint([-265,-138,811]),'nerve');s.label('Cervical DRG',posePoint([-24,-91,1414]),'drg');s.label('Medullary crossing',posePoint([5,-91,1505]),'medulla');s.label('Left S1 / M1',posePoint([43,-89,1612]),'cortex');s.label('Motor endplate',posePoint([-227,-122,974]),'nmj');
  s.label('Right median sensory pathway',posePoint([-209,-99,1056]));s.label('Brachial plexus · modeled',posePoint([-96,-96,1364]));
  return s;
 }
 function endings(s,model){
  const sensory=model.cells.filter(x=>x.kind==='sensory');const get=t=>sensory.find(c=>c.subtype===t)||sensory[0];
  // A shared undulating skin reference, not unrelated ovals around terminal pictures.
  const basal=(x,z)=>300+32*Math.cos(x*.028)*Math.cos(z*.026)+8*Math.sin(x*.075+.5);
  const outer=(x,z)=>387+9*Math.sin(x*.014+z*.009)+1.4*Math.sin(x*.12+z*.025);
  const skin=new Membrane(),interfaceMembrane=new Membrane();
  function skinSurface(builder,fn){const nx=148,nz=54,off=builder.p.length/3;for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const x=-570+i/nx*1140,z=-170+j/nz*340,y=fn(x,z),dx=(fn(x+.5,z)-fn(x-.5,z)),dz=(fn(x,z+.5)-fn(x,z-.5));builder.vert(V(x,y,z),V(-dx,1,-dz).normalize());}for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=off+i*(nz+1)+j,b=a+nz+1;builder.tri(a,a+1,b);builder.tri(a+1,b+1,b);}}
  skinSurface(skin,outer);skinSurface(interfaceMembrane,basal);
  s.membrane(skin,0x7895a7,{id:'tip-skin',name:'Holographic epidermal surface',kind:'context',source:'Modeled fingerprint-like surface ridges; not a histological reconstruction'},'skin',.22);
  s.membrane(interfaceMembrane,0x9b8090,{id:'basal-skin-interface',name:'Undulating epidermal / dermal interface',kind:'context',source:'Synthetic rete/papillary relief used to locate the terminal neighborhood'},'support',.13);
  const walls=new Membrane();for(const z of [-170,170]){const off=walls.p.length/3;for(let i=0;i<=120;i++){const x=-570+i/120*1140;walls.vert(V(x,outer(x,z),z),V(0,0,z<0?-1:1));walls.vert(V(x,-470,z),V(0,0,z<0?-1:1));}for(let i=0;i<120;i++){const a=off+i*2;walls.tri(a,a+1,a+2);walls.tri(a+1,a+3,a+2);}}
  s.membrane(walls,0x66848d,{id:'dermal-hologram',name:'Holographic local cutaneous volume',kind:'context',source:'Transparent comparison block; positions are not registered to measured fingertip histology'},'skin',.035);
  const me=get('meissner'),p=[-335,230,0],mb=new Membrane();mb.curve([[-556,-490,35],[-470,-426,12],[-405,-198,-20],[-350,85,0],[-337,188,0]],me.axonDiameter/2,me.id,85,.65,9);
  const lam=new Membrane(),meStem=Array.from({length:13},(_,j)=>[-337+.6*Math.sin(j*.5),188+j*4.8,.35*Math.sin(j*.4)]);mb.sweep(meStem,1.2,101,9);
  for(let j=0;j<13;j++){const y=200+j*5.1,w=24+8*Math.sin(j/12*Math.PI);lam.shell([-335+1.4*Math.sin(j),y,0],[w,2.4,17+3*Math.sin(j*.9)],j+5,9,28);const pts=[];for(let k=0;k<=36;k++){let a=k/36*TAU*.89;pts.push([-335+Math.cos(a)*(w*.76),y+2.8*Math.sin(a*2+j*.3),Math.sin(a)*12]);}mb.curve([meStem[j],pts[0]],1.15,100+j,12,.15,7);mb.sweep(pts,pts.map((_,i)=>1.3+.25*Math.sin(i*.4+j)),j+11,8);}
  s.membrane(mb,C.sensory,{...me,name:'Meissner terminal arbor · '+me.id});s.membrane(lam,0xa5becc,{...me,name:'Meissner lamellar support membranes'},'support',.33);s.label('Meissner · FA-I',[-335,335,25]);
  const mk=get('merkel'),kb=new Membrane(),kc=new Membrane();const kp=[-64,260,0];kb.curve([[-553,-491,38],[-369,-433,30],[-199,-240,22],[-148,-30,10],[-101,175,3],[-65,240,0]],mk.axonDiameter/2,mk.id,85,.7,9);
  const merkelBranches=[[-95,263,-6],[-49,257,-10],[-68,261,22]];
  merkelBranches.forEach((q,j)=>kb.curve([[-65,240,0],mix([-65,240,0],q,.55),q],1.6-j*.16,621+j,28,.28,9));
  for(let j=0;j<9;j++){const ex=-119+j*13,ez=(rand(j+91)()-.5)*43,end=[ex,basal(ex,ez)-3,ez],root=merkelBranches[Math.floor(j/3)];kb.curve([root,mix(root,end,.55).map((x,k)=>x+(k===0?3*Math.sin(j):0)),end],1.1,j+171,24,.26,8);kb.shell(plus(end,[0,-1,0]),[3.6,1.6,3.1],j+1,8,16);kc.shell(plus(end,[0,3.5,0]),[6.2,3.8,5.1],j+89,11,20);}
  s.membrane(kb,C.sensory,{...mk,name:'Merkel-associated terminal contacts · '+mk.id});s.membrane(kc,0xc3a6b4,{...mk,name:'Merkel support-cell profiles'},'support',.66);s.label('Merkel complexes · SA-I',[-69,335,50]);
  const pc=get('pacinian'),pb=new Membrane(),pl=new Membrane(),pcen=[318,-50,5];pb.curve([[-550,-492,41],[-170,-451,28],[173,-354,12],[310,-258,3],[318,48,0]],pc.axonDiameter/2,pc.id,100,.62,10);
  for(let j=0;j<25;j++){const a=22+j*3.3;pl.shell(pcen,[a,108+j*4.1,a*.70],31+j,38,60,.57);}
  s.membrane(pb,C.sensory,{...pc,name:'Pacinian-like central ending · '+pc.id});const pg=pl.geometry();pg.translate(-pcen[0],-pcen[1],-pcen[2]);pg.rotateY(-Math.PI/2);pg.translate(...pcen);s.add(pg,0xc7b590,{...pc,name:'Pacinian concentric lamellar membranes · cutaway'},'support',.52);s.label('Pacinian-like · FA-II',[327,224,60]);
  const fr=get('free'),fb=new Membrane();fb.curve([[-548,-493,44],[-222,-402,84],[0,-145,108],[76,75,104],[89,163,99]],.7,fr.id,90,.25,8);fb.tree([89,163,99],[0,1,0],65,.53,4,6023,false);s.membrane(fb,0xba92dc,{...fr,name:'Free-ending sensory arbor'});s.label('Free endings',[119,308,130]);
  // Four distinct primary afferents enter the same local nerve neighborhood.
  // Every proximal-to-terminal trajectory is one smooth continuous spline.
  s.label('Subdermal nerve neighborhood',[-368,-540,45]);
  s.label('Deeper connective-tissue territory',[294,-327,75]);
 }
 function nerve(s,model){
  const active=model.cells.filter(c=>c.kind==='sensory'&&c.id<101),coreContext=new Membrane(),myelinContext=new Membrane(),small=new Membrane(),sheaths=new Membrane(),endoneurium=new Membrane();
  const placements=[],rr=rand(89012),fc=[[-116,-99,84,.86],[99,-106,72,.95],[-112,103,77,.86],[110,91,90,.83]];
  function center(f,t){return [f[0]+6.2*Math.sin(t*3.8+f[0]),-190+280*t,f[1]+5.4*Math.sin(t*3.5+f[1])];}
  function ring(f,t,r,seed){const mb=new Membrane(),cp=center(f,t),off=mb.p.length/3,N=96;
   for(let j=0;j<=N;j++){const a=j/N*TAU,mod=1+.055*Math.sin(3*a+seed)+.04*Math.cos(2*a+seed*.2);for(const ro of [r,r+2.8])mb.vert(V(cp[0]+Math.cos(a)*ro*mod,cp[1],cp[2]+Math.sin(a)*ro*f[3]*mod),V(0,1,0));}
   for(let j=0;j<N;j++){const a=off+j*2;mb.tri(a,a+2,a+1);mb.tri(a+1,a+2,a+3);}return mb;
  }
  for(let fi=0;fi<fc.length;fi++){const f=fc[fi],pack=[],target=[120,82,94,131][fi];
   for(let attempt=0;attempt<20000&&pack.length<target;attempt++){const a=rr()*TAU,r=Math.sqrt(rr())*(f[2]-9),d=active[placements.length+pack.length]?.fiberDiameter||(6.4+rr()*7.2),x=Math.cos(a)*r,z=Math.sin(a)*r*f[3];if(pack.every(p=>Math.hypot(p.x-x,(p.z-z)/f[3])>(p.d+d)*.55+.7))pack.push({x,z,d,fi});}
   placements.push(...pack);
   for(let lay=0;lay<3;lay++){const off=sheaths.p.length/3,N=64,K=36;for(let k=0;k<=K;k++){const t=k/K,cp=center(f,t);for(let j=0;j<=N;j++){const a=(j/N*.80+.13)*TAU,rad=(f[2]+lay*2.8)*(1+.055*Math.sin(3*a+fi)+.035*Math.cos(a*2+fi*.2+t*.7));sheaths.vert(V(cp[0]+Math.cos(a)*rad,cp[1],cp[2]+Math.sin(a)*rad*f[3]),V(Math.cos(a),0,Math.sin(a)/f[3]).normalize());}}
    for(let k=0;k<K;k++)for(let j=0;j<N;j++){const a=off+k*(N+1)+j,b=a+N+1;sheaths.tri(a,a+1,b);sheaths.tri(a+1,b+1,b);}const rg=ring(f,1,f[2]+lay*2.8,fi).geometry();endoneurium.append(rg);rg.dispose();
   }
  }
  const matrices=fc.map((f,fi)=>{const shape=new T.Shape(),cp=center(f,1);for(let j=0;j<=96;j++){const a=j/96*TAU,mod=1+.055*Math.sin(3*a+fi)+.04*Math.cos(2*a+fi*.2),x=cp[0]+Math.cos(a)*(f[2]-.4)*mod,z=cp[2]+Math.sin(a)*(f[2]-.4)*f[3]*mod;if(j)shape.lineTo(x,z);else shape.moveTo(x,z);}shape.closePath();return shape;});
  placements.forEach((p,i)=>{const c=i<active.length?active[i]:null,q=rand(920+i),f=fc[p.fi],rad=(c?c.fiberDiameter:p.d)/2,points=[];
   for(let k=0;k<=56;k++){const t=k/56,cp=center(f,t);points.push([cp[0]+p.x+2.4*Math.sin(t*6+i*.23),cp[1],cp[2]+p.z+1.9*Math.sin(t*6.6+i*.7)]);}
   const hole=new T.Path(),top=points.at(-1);for(let j=0;j<=18;j++){const a=-j/18*TAU,x=top[0]+Math.cos(a)*rad*1.05,z=top[2]+Math.sin(a)*rad*1.05;if(j)hole.lineTo(x,z);else hole.moveTo(x,z);}hole.closePath();matrices[p.fi].holes.push(hole);
   const core=c?new Membrane():coreContext,outer=c?new Membrane():myelinContext;
   core.sweep(points,points.map((_,k)=>rad*.66*(1+.045*Math.sin(k*.12+i))),i,10);
   let start=-(i%20);while(start<56){const lo=Math.max(start,0),hi=Math.min(start+23,56);if(hi>lo+1){const part=points.slice(lo,hi+1);outer.sweep(part,part.map((_,k)=>rad*(.95+.05*Math.max(0,Math.sin(Math.PI*k/(part.length-1)))**.4)),i+lo,14,false);
    for(const side of [0,part.length-1]){const at=V(part[side]),tan=V(part[Math.min(side+1,part.length-1)]).sub(V(part[Math.max(0,side-1)])).normalize(),u=V().crossVectors(tan,V(1,0,0)).normalize(),v=V().crossVectors(tan,u),st=outer.p.length/3;
     for(let j=0;j<=14;j++){const a=j/14*TAU;for(const ri of [.66,.95])outer.vert(at.clone().addScaledVector(u,Math.cos(a)*rad*ri).addScaledVector(v,Math.sin(a)*rad*ri),tan.clone().multiplyScalar(side?1:-1));}
     for(let j=0;j<14;j++){const a=st+j*2;if(side){outer.tri(a,a+1,a+2);outer.tri(a+1,a+3,a+2);}else{outer.tri(a,a+2,a+1);outer.tri(a+1,a+2,a+3);}}
    }}start+=25;
   }
   if(c){s.membrane(core,C.sensory,{...c,name:'Myelinated tactile axon '+c.id});s.membrane(outer,0x6a8690,{...c,name:'Myelin around tactile axon '+c.id},'support',1);}
  });
  for(let i=0;i<140;i++){const q=rand(789+i),f=fc[i%4],a=q()*TAU,rho=15+q()*(f[2]-17),ps=[];for(let k=0;k<=32;k++){const t=k/32,cp=center(f,t);ps.push([cp[0]+Math.cos(a)*rho+Math.sin(t*6+i),cp[1],cp[2]+Math.sin(a)*rho*f[3]+Math.cos(t*7+i)]);}small.sweep(ps,.23+q()*.45,201+i,6);}
  const matrixSurface=new Membrane();matrices.forEach(shape=>{const g=new T.ShapeGeometry(shape,18),pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getY(i);pos.setXYZ(i,x,89.55,z);}g.computeVertexNormals();matrixSurface.append(g);g.dispose();});s.membrane(matrixSurface,0x666967,{id:'endoneurial-cut',name:'Inter-fiber endoneurial cut surface',kind:'context',source:'Constructed perforated tissue matrix, not a histology segmentation'},'support',.72);
  s.membrane(coreContext,0x719ea4,{id:'context-fiber-cores',name:'Context axoplasm excerpts',kind:'context',source:'Constructed non-registered fiber fragments; not an additional neuron census'},'support',1);
  s.membrane(myelinContext,0x546f7d,{id:'context-myelin',name:'Context myelinated fiber excerpts',kind:'context',source:'Synthetic packing, not histology-derived segmentation'},'support',1);
  s.membrane(small,0x9c80b1,{id:'unmyelinated-fragments',name:'Unmyelinated context fragments',kind:'context',source:'Illustrative small-fiber caliber and position assumptions'},'support',.95);
  s.membrane(sheaths,0xaaac9c,{id:'perineurium',name:'Irregular cutaway perineurial membranes',kind:'context',source:'Constructed fascicle boundaries'},'skin',.23);
  s.membrane(endoneurium,0xa29b83,{id:'perineurial-rims',name:'Perineurial lamellar cut surfaces',kind:'context',source:'Constructed boundary layers, not traced histology'},'support',1);
  const envelope=new Membrane(),strands=new Membrane(),cutEdge=new Membrane();
  const N=112,K=60;
  function epip(t,a,radialOffset=0){const rx=277+radialOffset,rz=256+radialOffset,mod=1+.037*Math.sin(3*a+.5)+.022*Math.cos(5*a-t*.8);return V(Math.cos(a)*rx*mod+4*Math.sin(t*2.8),-211+t*322,Math.sin(a)*rz*mod+4*Math.cos(t*3));}
  for(let k=0;k<=K;k++)for(let j=0;j<=N;j++){const t=k/K,a=(j/N*.73+.22)*TAU,p=epip(t,a),n=V(Math.cos(a)/277,.006*Math.sin(t*9+a),Math.sin(a)/256).normalize();envelope.vert(p,n);}
  for(let k=0;k<K;k++)for(let j=0;j<N;j++){const a=k*(N+1)+j,b=a+N+1;envelope.tri(a,a+1,b);envelope.tri(a+1,b+1,b);}
  for(let j=0;j<45;j++){const a=(j/44*.73+.22)*TAU,ps=[];for(let k=0;k<=45;k++)ps.push(epip(k/45,a+.007*Math.sin(k*.37+j),.65));strands.sweep(ps,.40+(j%4)*.15,190+j,5);}
  for(let t of [0,1]){const ps=[];for(let j=0;j<=N;j++)ps.push(epip(t,(j/N*.73+.22)*TAU,.2));cutEdge.sweep(ps,.72,239,9);}
  const epiShape=new T.Shape();for(let j=0;j<=160;j++){const p=epip(1,j/160*TAU);if(j)epiShape.lineTo(p.x,p.z);else epiShape.moveTo(p.x,p.z);}epiShape.closePath();
  for(let fi=0;fi<fc.length;fi++){const f=fc[fi],cp=center(f,1),hole=new T.Path();for(let j=0;j<=128;j++){const a=-j/128*TAU,mod=1+.055*Math.sin(3*a+fi)+.04*Math.cos(2*a+fi*.2);const x=cp[0]+Math.cos(a)*(f[2]+8.2)*mod,z=cp[2]+Math.sin(a)*(f[2]+8.2)*f[3]*mod;if(j)hole.lineTo(x,z);else hole.moveTo(x,z);}hole.closePath();epiShape.holes.push(hole);}
  s.crossSection={outer:epiShape.getPoints().map(p=>[p.x,p.y]),holes:epiShape.holes.map(h=>h.getPoints().map(p=>[p.x,p.y]))};
  const ecg=new T.ShapeGeometry(epiShape,32),ecp=ecg.attributes.position;for(let i=0;i<ecp.count;i++){const x=ecp.getX(i),z=ecp.getY(i);ecp.setXYZ(i,x,93.6+1.2*Math.sin(x*.072)*Math.cos(z*.063),z);}// Earcut can emit zero-area closure triangles after Float32 conversion.
  // Remove them rather than exporting duplicate boundary vertices as faces.
  const clean=[],eidx=ecg.index.array;
  for(let k=0;k<eidx.length;k+=3){const a=V().fromBufferAttribute(ecp,eidx[k]),b=V().fromBufferAttribute(ecp,eidx[k+1]).sub(a),c=V().fromBufferAttribute(ecp,eidx[k+2]).sub(a);if(b.cross(c).lengthSq()>1e-10)clean.push(eidx[k],eidx[k+1],eidx[k+2]);}
  ecg.setIndex(clean);ecg.computeVertexNormals();
  s.add(ecg,0x8c8470,{id:'interfascicular-epineurium',name:'Shared interfascicular cut surface',kind:'context',source:'Modeled inter-fascicle connective matrix with four fascicle apertures, not measured histology'},'support',.74);
  s.membrane(envelope,0x877961,{id:'epineurium',name:'One shared epineurial sleeve · windowed',kind:'context',source:'Modeled common connective envelope enclosing the fascicles; not a segmented nerve specimen'},'support',.14);
  s.membrane(strands,0xb6a488,{id:'epineurial-fibers',name:'Epineurial connective strand cues',kind:'context',source:'Synthetic longitudinal connective-tissue cues'},'support',.10);
  s.membrane(cutEdge,0xb2a086,{id:'epineurial-window-rim',name:'Cut edge of epineurial inspection window',kind:'context',source:'Deliberate cutaway boundary, not an anatomical tear'},'support',.24);
  s.label('Separate axoplasm / myelin',[0,135,-200]);s.label('Variable fascicular packing',[235,45,70]);s.label('Longitudinal internodes',[0,-225,115]);s.contextFragments=placements.length-active.length+140;
 }
 function drg(s,model){
  const cells=model.cells.filter(x=>x.kind==='sensory'),q=rand(183091),placed=[];
  // Nonlattice, nonhelical soma packing; larger somata exclude a larger neighborhood.
  for(const c of cells){let p;for(let attempt=0;attempt<5000;attempt++){p=[(q()-.5)*255,(q()-.5)*550,(q()-.5)*195];if((p[0]/150)**2+(p[1]/315)**2+(p[2]/112)**2>1)continue;if(placed.every(o=>V(p).distanceTo(V(o.p))>(c.somaRadius+o.cell.somaRadius)*1.10))break;}placed.push({cell:c,p});}
  const passing=new Membrane();for(let i=0;i<105;i++){const a=i*2.39996,rho=Math.sqrt((i+.5)/105)*66,ps=[];for(let k=0;k<=72;k++){const t=k/72;ps.push([Math.cos(a)*rho+12*Math.sin(t*5+i*.3),-435+870*t,Math.sin(a)*rho*.85+11*Math.sin(t*5.8+i*.6)]);}passing.sweep(ps,.55+(i%8)*.18,103+i,7);}
  s.membrane(passing,0x557583,{id:'ganglion-passing-fragments',name:'Context ganglion fiber fragments',kind:'context',source:'Synthetic passing fragments; no extra reconstructed-cell identities'},'support',.60);
  placed.forEach(({cell:c,p},i)=>{const r=rand(830+c.id*8),prior=somaPriors[c.id%8],b=new Membrane();
   const inward=V(-p[0],-12-r()*22,-p[2]).normalize(),rootDirection=V(prior.info.roots[0]).normalize(),rotation=new T.Quaternion().setFromUnitVectors(rootDirection,inward),axes=V(c.somaRadius*(.78+r()*.35),c.somaRadius*(.77+r()*.32),c.somaRadius*(.80+r()*.30));
   const matrix=new T.Matrix4().compose(V(p),rotation,axes),g=prior.geometry.clone().applyMatrix4(matrix);
   // Low-frequency cell-specific surface variation only on the soma proper.
   // The already fused proximal stem and its exact root coordinate are preserved.
   const gp=g.attributes.position;for(let jv=0;jv<gp.count;jv++){const a=V().fromBufferAttribute(gp,jv),d=a.clone().sub(V(p)),q=d.clone().divide(axes),u=q.length();if(u<1.13){const f=1+.070*Math.sin(q.x*3.1+c.id)*Math.cos(q.y*2.7+.7)*Math.sin(q.z*2.9+c.id*.3)*Math.min(1,(1.13-u)*7);a.copy(V(p)).addScaledVector(d,f);gp.setXYZ(jv,a.x,a.y,a.z);}}g.computeVertexNormals();b.append(g);const stem=V(prior.info.roots[0]).applyMatrix4(matrix).toArray(),j=[p[0]*.44,p[1]-34-r()*16,p[2]*.46];
   b.curve([stem,mix(stem,j,.50).map((x,k)=>x+(k===1?-8:0)),j],Math.max(.48,c.axonDiameter/2),c.id,28,.06,10);
   for(const sign of [-1,1]){const endY=sign*435,ps=[j];for(let k=1;k<=60;k++){const t=k/60;ps.push([j[0]*(1-t*.25)+Math.sin(t*3.6+i*.3)*11*t,j[1]+(endY-j[1])*t,j[2]*(1-t*.25)+Math.sin(t*4.1+i*.7)*9*t]);} // y interpolates exactly from the shared junction.
    ps.forEach((pt,k)=>pt[1]=j[1]+(endY-j[1])*k/60);b.sweep(ps,Math.max(.48,c.axonDiameter/2),c.id+sign+7,9);
   }
   s.membrane(b,C.sensory,{...c,name:c.name+' · DRG soma',somaPosition:p,somaAxes:axes.toArray(),junction:j,evidence:'Irregular implicit soma with one fused proximal stem and continuous central/peripheral T branch. Synthetic packing, not EM.'});
   // Satellite membranes follow the actual irregular soma surface; no floating beads.
   const gl=new Membrane(),pos=g.attributes.position,norm=g.attributes.normal,idx=g.index.array,capdirs=[];for(let k=0;k<5;k++)capdirs.push(V(r()-.5,r()-.5,r()-.5).normalize());
   for(let k=0;k<idx.length;k+=3){const ids=[idx[k],idx[k+1],idx[k+2]],cent=V();ids.forEach(id=>cent.add(V().fromBufferAttribute(pos,id)));cent.multiplyScalar(1/3);const dir=cent.clone().sub(V(p));if(dir.length()>c.somaRadius*1.17||!capdirs.some(d=>d.dot(dir.clone().normalize())>.84))continue;const off=gl.p.length/3;ids.forEach(id=>{const n=V().fromBufferAttribute(norm,id);gl.vert(V().fromBufferAttribute(pos,id).addScaledVector(n,.7),n);});gl.tri(off,off+1,off+2);}
   g.dispose();s.membrane(gl,0xaac5ce,{...c,name:'Conformal satellite membrane patches · '+c.id},'support',.36);
  });
  s.label('Central branches → cord',[0,480,0]);s.label('Peripheral branches → finger',[0,-480,0]);s.label('Packed pseudounipolar somata',[216,85,0]);
 }
 function circuit(s,type,model){const counts=type==='thalamus'?24:type==='medulla'?20:38;const r=rand(409);
  for(let i=0;i<counts;i++){let p,kind='other',id,name,rad=12+r()*6,spread=1;
   if(type==='thalamus'){p=[(r()-.5)*650,(r()-.5)*620,(r()-.5)*300];kind='sensory';id=341+i;name='VPL relay sample '+(i+1);}
   else if(type==='medulla'){p=[-270+(r()-.5)*280,120+(r()-.5)*290,(r()-.5)*250];kind='sensory';id=301+i;name='Right cuneate relay '+(i+1);}
   else{const motor=i>=26;p=[motor?-335+(r()-.5)*195:(i%2?-1:1)*(230+r()*150),motor?-280+(r()-.5)*170:175+(r()-.5)*320,(r()-.5)*180];kind=motor?'motor':'other';id=motor?201+i-26:381+i;name=motor?'Ventral-horn lower motor neuron '+(i-25):'Spinal interneuron '+(i+1);rad=motor?25+r()*8:10+r()*6;spread=motor?1.3:.82;}
   const soma=organicCell(s,{id,name,kind,source:'Synthetic noncortical multipolar cell; no measured reconstruction claimed'},p,rad,i+201,3,spread,type!=='spinal'||kind==='motor');const ap=soma.userData.axonOrigin;
   const b=new Membrane();if(type==='thalamus')b.curve([ap,plus(ap,[60,170,40]),[270+(r()-.5)*180,700,(r()-.5)*200]],1.1,i+771,70,.1,7);
   else if(type==='medulla')b.curve([ap,[-220,40-i*4,p[2]],[20,-40-i*4,p[2]],[240,130,p[2]+20],[245,790,p[2]+25]],1.5,i+778,125,.10,7);
   else if(kind==='motor')b.curve([ap,plus(ap,[-130,-95,30]),[-940,-365+(i%4)*18,55]],3.5,i+3,85,.1,9);
   if(b.p.length)s.membrane(b,kind==='motor'?C.motor:C.sensory,{id,name:name+' · projection',kind,source:'Modeled outgoing projection'});
  }
  const inputs=new Membrane();for(let i=0;i<36;i++){const x=type==='medulla'?-320+(i%9)*12:type==='thalamus'?-170+(i%9)*21:560+(i%8)*11,z=(Math.floor(i/9)-2)*38;inputs.curve([[x,-770,z],[x+Math.sin(i)*20,-140,z],[x-15,300,z]],1.7+i%3*.3,999+i,95,.08,7);if(type==='spinal')inputs.tree([x,300,z],[-1,-.2,0],150,1.4,2,300+i,false);}
  if(type!=='spinal')s.membrane(inputs,C.sensory,{id:'afferent-inputs-'+type,name:'Selected incoming sensory excerpts',kind:'sensory',source:'Modeled entering fibers; illustrative fragments'});
  else{
   // A dorsal-up cross-sectional frame, not an undifferentiated forest. Neural
   // placement is modeled; this contour is not represented as traced histology.
   const outline=[[0,130],[105,160],[250,350],[405,495],[445,455],[365,250],[335,90],[430,-75],[500,-195],[500,-325],[410,-437],[290,-430],[190,-300],[170,-135],[0,-105],[-170,-135],[-190,-300],[-290,-430],[-410,-437],[-500,-325],[-500,-195],[-430,-75],[-335,90],[-365,250],[-445,455],[-405,495],[-250,350],[-105,160]];
   const cv=new T.CatmullRomCurve3(outline.map(p=>V(p[0],p[1],0)),true,'centripetal'),points=cv.getPoints(240);
   const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,p.y):shape.moveTo(p.x,p.y));shape.closePath();
   const canal=new T.Path();canal.absellipse(0,8,15,11,0,TAU,true,0);shape.holes.push(canal);
   const g=new T.ExtrudeGeometry(shape,{depth:220,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:7,bevelThickness:7,curveSegments:24});g.translate(0,0,-220);
   s.add(g,0x857674,{id:'spinal-gray-context',name:'Modeled butterfly-shaped gray matter',kind:'context',source:'Illustrative cervical section: dorsal horns above, ventral horns below. Not a calibrated histological boundary.'},'support',.14);
   const rim=new Membrane();rim.sweep(points.map(p=>[p.x,p.y,-5]),1.1,228,6);
   const white=new T.Shape(),outer=[];for(let j=0;j<=144;j++){const a=j/144*TAU,mod=1+.019*Math.cos(4*a)+.016*Math.sin(3*a);const p=[680*Math.cos(a)*mod,580*Math.sin(a)*mod];outer.push([p[0],p[1],-15]);if(j)white.lineTo(...p);else white.moveTo(...p);}white.closePath();
   const grayHole=new T.Path();points.slice().reverse().forEach((p,i)=>i?grayHole.lineTo(p.x,p.y):grayHole.moveTo(p.x,p.y));grayHole.closePath();white.holes.push(grayHole);
   const wg=new T.ExtrudeGeometry(white,{depth:210,bevelEnabled:false,steps:1,curveSegments:30});wg.translate(0,0,-230);
   s.add(wg,0x72888e,{id:'spinal-white-context',name:'Modeled surrounding white-matter section',kind:'context',source:'Constructed section shell; not a segmented spinal-cord specimen'},'support',.09);
   rim.sweep(outer,1.3,229,6);s.membrane(rim,0x7d9ea4,{id:'spinal-boundary',name:'Section boundary guides',kind:'context',source:'Constructed gross gray/white-matter outline'},'contextNerve',.52);
   for(let i=0;i<18;i++){
    const c=model.cells[i],b=new Membrane(),x=-420+i%6*10,y=337+Math.floor(i/6)*8,z=-90+i*9;
    const join=[x,y,z];b.curve([[-975,415+i*3,z],[-760,392,z],[-570,345,z],join],1.1+i%3*.16,1000+i,78,.06,7);
    b.curve([[x,y,-510],join,[x+12,y+8,540]],1.5,1100+i,85,.03,7);
    b.curve([join,[-340,285,z],[-255,210,z+13]],1.0,1200+i,34,.34,7);b.tree([-255,210,z+13],[.2,-.9,0],54,.6,2,1300+i,false);
    s.membrane(b,C.sensory,{...c,name:'Right dorsal sensory entry · '+c.id,evidence:'Same modeled primary-afferent identity as nerve and DRG. Dorsal-column continuation plus a local collateral; this is not measured synaptic connectivity.'});
   }
  }
  if(type==='medulla'){for(let i=0;i<15;i++){const b=new Membrane();b.curve([[260+i*3,800,-130],[260+i*3,-275,-130],[30,-385-i*4,-90],[-270,-440-i*3,-50],[-288,-800,-40]],1.8,i+290,135,.10,8);s.membrane(b,C.motor,{id:901+i,name:'Distinct corticospinal crossing '+(i+1),kind:'motor',source:'Synthetic upper motor axon'});}s.label('Right cuneate relay',[-415,450,30]);s.label('Sensory crossing',[145,55,0]);s.label('Pyramidal crossing',[20,-520,40]);}
  else if(type==='spinal'){s.label('Dorsal sensory entry',[-805,530,0]);s.label('Right ventral motor pool',[-320,-550,0]);s.label('Ventral root exit',[-880,-470,65]);s.label('Dorsal ↑ · modeled cervical section',[120,650,0]);}
  else{s.label('Toward left S1',[255,790,0]);s.label('Ascending medial lemniscus',[-160,-810,0]);}
 }
 function cortex(s,quality){
  const n=quality==='ultra'?96:quality==='low'?28:56,r=rand(772),placed=[];
  const pools={2:[4],3:[0,1,2,3,5,6,7,8],5:[9]};
  for(let i=0;i<n;i++){
   const motor=i>=n/2,local=i%(n/2),phase=local%7;
   const layer=phase===0?2:phase>=5?5:3,pool=pools[layer],index=pool[Math.floor(local/7+phase)%pool.length];
   let p;
   for(let attempt=0;attempt<250;attempt++){
    p=[(motor?560:-560)+(r()-.5)*1080,(layer===2?580:layer===5?-610:140)+(r()-.5)*(layer===3?410:185),(r()-.5)*590];
    if(placed.every(q=>V(p).distanceTo(V(q))>85))break;
   }
   placed.push(p);
   const m=addHuman(s,index,501+i,p,motor?'motor':'sensory',1,(r()-.5)*2.2);
   m.userData.placement=(motor?'M1':'S1')+' illustrative domain · source layer '+layer;
   m.userData.placementLayer=layer;m.userData.coordinateScale=1;
   m.userData.evidence='Measured human branching trace and sampled radii at 1:1 micrometer scale. Layer-group placement and repeated copies are illustrative. Not a measured S1/M1 slab.';
  }
  const pia=new Membrane();pia.sheet([0,1260,0],[2460,12,760],52,50,18);
  s.membrane(pia,0x829fac,{id:'pia-comparison',name:'Pial orientation reference · inferred placement',kind:'context',source:'Modeled slab boundary. Source cells are not registered to this pia.'},'skin',.06);
  const boundaries=new Membrane();
  for(const y of [1040,460,-200,-950]){
   boundaries.curve([[-1210,y,-370],[0,y+9,-370],[1210,y,-370]],.65,73+y,60,.0,5);
   boundaries.curve([[-1210,y,-370],[-1210,y,370]],.65,73+y,18,.0,5);
  }
  s.membrane(boundaries,0x47616f,{id:'laminar-guides',name:'Illustrative layer-group boundaries',kind:'context',source:'Orientation guides, not calibrated S1/M1 cortical-layer thicknesses'},'contextNerve',.36);
  s.label('S1 · illustrative domain',[-620,1400,0]);s.label('M1 · illustrative domain',[620,1400,0]);
  s.label('II',[-1255,595,-370]);s.label('III',[-1255,150,-370]);s.label('V',[-1255,-590,-370]);
  s.cellInstanceCount=n;s.layerCounts=Object.fromEntries([2,3,5].map(layer=>[layer,s.entries.filter(m=>m.userData.placementLayer===layer).length]));
 }
 function nmj(s){
  const r=rand(650),muscle=new Membrane(),b=new Membrane(),post=new Membrane(),folds=new Membrane(),glia=new Membrane();
  const height=(x,z)=>20-.0095*x*x+.62*Math.sin(z*.048)+.13*Math.cos(z*TAU/2.5);
  const normal=(x,z)=>V(.019*x,1,-.62*.048*Math.cos(z*.048)).normalize();
  const NX=68,NZ=140;for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){const x=-39+i/NX*78,z=-89+j/NZ*178;muscle.vert(V(x,height(x,z),z),normal(x,z));}
  for(let i=0;i<NX;i++)for(let j=0;j<NZ;j++){const a=i*(NZ+1)+j,c=a+NZ+1;muscle.tri(a,a+1,c);muscle.tri(a+1,c+1,c);}
  s.membrane(muscle,0x886265,{id:'sarcolemma',name:'Local curved extrinsic muscle membrane',kind:'context',source:'Synthetic sarcolemmal patch; the muscle belly belongs in the forearm, not the finger'},'muscle',.72);
  // Rejection-sampled nummular domains replace the old regular grid of buttons.
  const targets=[];for(let attempt=0;attempt<1000&&targets.length<18;attempt++){const x=(r()-.5)*35,z=(r()-.5)*48;if((x/19)**2+(z/26)**2>1)continue;const rad=1.6+r()*1.15;if(targets.every(p=>Math.hypot(p.x-x,p.z-z)>p.rad+rad+1.0))targets.push({x,z,rad});}
  const root=[-19,height(-19,-16)+4,-16],nodes=[root],parents=[];const remaining=targets.map((p,i)=>({p,i}));
  b.curve([[-62,67,-62],[-43,47,-37],[-30,29,-25],root],2.0,731,70,.55,12);
  // A connected minimum-distance terminal tree: each distal branch starts on
  // an existing tree node instead of crossing the tissue in separate straight rows.
  while(remaining.length){let best={dist:Infinity};remaining.forEach((v,k)=>nodes.forEach((p,j)=>{const d=Math.hypot(p[0]-v.p.x,p[2]-v.p.z);if(d<best.dist)best={dist:d,k,j};}));const v=remaining.splice(best.k,1)[0],p=v.p,tip=[p.x,height(p.x,p.z)+1.25,p.z],origin=nodes[best.j],mid=mix(origin,tip,.5);mid[1]+=1.4+r()*1.2;
   b.curve([origin,mid,tip],best.j===0?.85:.58+r()*.24,870+v.i,22,.1,10);nodes.push(tip);parents.push({child:nodes.length-1,parent:best.j});
   b.shell(tip,[p.rad,.57,p.rad*(.72+r()*.4)],650+v.i,10,22);post.shell([p.x,height(p.x,p.z)+.17,p.z],[p.rad*1.20,.12,p.rad*(.94+r()*.2)],710+v.i,10,22);
   for(let k=-2;k<=2;k++){const ps=[];for(let j=0;j<=10;j++){const x=p.x+k*.53,z=p.z+(j/10-.5)*p.rad*1.6;ps.push([x,height(x,z)+.30,z]);}folds.sweep(ps,.095,901+k+v.i*13,5);}
   if(v.i%3===0){const gp=plus(tip,[0,1.0,0]);glia.shell(gp,[p.rad*1.35,.32,p.rad*1.12],901+v.i,9,20);}
  }
  s.membrane(b,C.motor,{id:201,name:'Connected presynaptic motor-terminal arbor',kind:'motor',source:'Synthetic human-inspired nonlattice arbor; not a traced NMJ',evidence:'One incoming motor axon, connected terminal tree, irregular distal swellings. Separate postsynaptic domains.',terminalGraph:parents});
  s.membrane(post,0xb9c59c,{id:'postsynaptic-patches',name:'Postsynaptic receptor domains',kind:'context',source:'Qualitative nummular patches; dimensions and placement are model assumptions'},'support',1);
  s.membrane(folds,0x728d85,{id:'junctional-folds',name:'Illustrative junctional-fold crests',kind:'context',source:'Visualization details; not resolved human ultrastructure'},'support',.85);
  s.membrane(glia,0x8fa7b2,{id:'terminal-schwann',name:'Partial terminal Schwann membrane',kind:'context',source:'Synthetic conformal coverage'},'support',.22);
  const stripes=new Membrane();for(let z=-87;z<89;z+=2.5){const ps=[];for(let k=0;k<=32;k++){const x=-38+k/32*76;ps.push([x,height(x,z)-.12,z]);}stripes.sweep(ps,.10,Math.floor(z+200),5);}s.membrane(stripes,0xaf8582,{id:'striations',name:'Subsarcolemmal striation cues',kind:'context',source:'Illustrative local muscle context'},'muscle',.37);
  s.label('Presynaptic motor arbor',[-50,70,-30]);s.label('Separate receptor domains',[30,31,15]);s.label('Curved local sarcolemma',[0,18,78]);
 }
 function proprio(s){const tissue=new Membrane(),sens=new Membrane();for(let i=0;i<5;i++){const x=-330+(i-2)*11,ps=[];for(let k=0;k<=55;k++)ps.push([x+1.8*Math.sin(k*.08+i),-450+k*16.4,Math.sin(i)*11]);tissue.sweep(ps,5.5+(i%3),60+i,12);const spiral=[];for(let j=0;j<=340;j++){let a=j/340*TAU*12,y=-150+j/340*300;spiral.push([x+Math.cos(a)*9,y,Math.sin(i)*11+Math.sin(a)*9]);}sens.sweep(spiral,1.1,i+900,7);sens.curve([[-540,-630,0],[-510,-210,0],spiral[0]],2.7,i+771,60,.25,8);}
  const cap=new Membrane();cap.shell([-330,0,0],[67,530,47],261,50,52,.76);s.membrane(cap,0x889eac,{id:'spindle-envelope',name:'Spindle-like capsule',kind:'context'},'skin',.16);s.membrane(tissue,0x8b7779,{id:'intrafusal-context',name:'Intrafusal-fiber context',kind:'context'},'muscle',.35);
  const collagen=new Membrane();for(let i=0;i<30;i++){const p=[245+(i%6)*12,-410,Math.floor(i/6)*13-26];const ps=[];for(let k=0;k<=50;k++)ps.push([p[0]+2.7*Math.sin(k*.3+i),p[1]+k*16,p[2]+1.4*Math.cos(k*.31+i)]);collagen.sweep(ps,1.0+i%3*.15,i+66,7);}
  sens.tree([285,-280,0],[0,1,0],132,2.1,4,43918,false);sens.curve([[548,-620,0],[430,-400,0],[285,-280,0]],3.1,672,65,.30,9);
  s.membrane(collagen,0xafac93,{id:'collagen-context',name:'Tendon-organ collagen context',kind:'context',source:'Synthetic geometry'},'support',.55);
  s.membrane(sens,C.sensory,{id:1301,name:'Proprioceptive comparison endings',kind:'sensory',source:'Synthetic examples outside the glabrous tactile population count'});
  s.label('Spindle-like sensory ending',[-330,602,0]);s.label('Tendon-organ-like arbor',[299,551,0]);
 }
 function build(id,model,quality='high',sourceIndex=0){if(['overview','hand','arm','cervical','brain'].includes(id))return macro(model);const s=new Specimen(id,'µm');if(id==='tip')endings(s,model);if(id==='nerve')nerve(s,model);if(id==='drg')drg(s,model);if(['spinal','medulla','thalamus'].includes(id))circuit(s,id,model);if(id==='cortex')cortex(s,quality);if(id==='cell'){const rec=human[sourceIndex%human.length];addHuman(s,sourceIndex,rec.info.id,[0,0,0],'other',1,0);s.label('Specimen '+rec.info.id,[0,rec.info.bounds[1][1]+65,0]);}if(id==='nmj')nmj(s);if(id==='proprio')proprio(s);return s;}
 return {build,anatomy,human,sourceGeometry,somaPriors,REGIONS,cohort,Specimen};
}
window.ATLAS_GENERATORS={factories,REGIONS,cohort};
})();
