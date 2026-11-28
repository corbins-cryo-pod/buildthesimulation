/* One spatial scene and one workpiece per player. Operations are evidence-bounded
 * illustrations; this renderer does not advance the underlying process solver. */
import * as T from '/vendor/three/three.module.js';
import {GLTFLoader} from './cleanroom-gltf.js';
import {sampleCleanroomPose} from './cleanroom-models.js';
import {makeWorkpiece,makeSection} from './cleanroom-workpiece-3d.js';
import {makeTeachingMachine} from './cleanroom-machines-3d.js';
import {decorateRoom} from './cleanroom-decorator-3d.js';
import {makeSetupConsole} from './cleanroom-console-3d.js';

const V=(x,y,z)=>new T.Vector3(x,y,z);
const BASE=4.5;
// In-run cutaways are only supported on the original named interior nodes.
const CHAMBER_REVEALS=Object.freeze({'04-03':{nodes:['lid_pivot','dielectric_plasma_vessel'],eye:[.44,.37,.49]}});
const clamp=(p)=>Math.min(1,Math.max(0,Number(p)||0));
const ease=(p)=>{p=clamp(p);return p*p*(3-2*p);};
const safe=(v,max=1)=>Math.max(-max,Math.min(max,v));
const loader=new GLTFLoader();
const assets=new Map();
const ASSET_CACHE_LIMIT=24;
let worldNo=0;
function load(url){
  if(assets.has(url)){
    const cached=assets.get(url);assets.delete(url);assets.set(url,cached);return cached;
  }else{
    const request=loader.loadAsync(url).then(g=>g.scene).catch(e=>{assets.delete(url);throw e;});
    assets.set(url,request);
    if(assets.size>ASSET_CACHE_LIMIT)assets.delete(assets.keys().next().value);
    return request;
  }
}
function ownMaterial(color,roughness=.75,metalness=.17){
  return new T.MeshStandardMaterial({color,roughness,metalness});
}
const BOX=new T.BoxGeometry(1,1,1);
const supportMaterials=[ownMaterial(0x87978f,.55,.54),ownMaterial(0xb6c8b8,.42,.26),ownMaterial(0x343f3d,.87,.09),ownMaterial(0xad8546,.46,.23)];
function box(parent,mat,w,h,d,x,y,z){
  const m=new T.Mesh(BOX,mat);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;
}
function support(parent,w,d,y=0){
  const s=new T.Group();s.name='Cleanroom worktop support';
  box(s,supportMaterials[1],w,.055,d,0,y-.0275,0);
  for(const x of [-1,1])for(const z of [-1,1]){
    box(s,supportMaterials[0],.047,y,.047,x*(w/2-.05),y/2,z*(d/2-.046));
    box(s,supportMaterials[2],.086,.035,.086,x*(w/2-.05),.018,z*(d/2-.046));
  }
  box(s,supportMaterials[0],w-.06,.036,.038,0,y*.24,-d/2+.05);
  parent.add(s);return s;
}
function meshBounds(o){
  const b=new T.Box3().setFromObject(o);return b.isEmpty()?new T.Box3(V(-.4,0,-.36),V(.4,1.2,.36)):b;
}
function visibleBounds(o){
  o.updateWorldMatrix(true,true);
  const b=new T.Box3(),part=new T.Box3();
  o.traverseVisible(n=>{
    if(!n.geometry)return;
    if(n.isInstancedMesh){
      if(!n.count)return;
      if(!n.boundingBox)n.computeBoundingBox();
      if(n.boundingBox)b.union(part.copy(n.boundingBox).applyMatrix4(n.matrixWorld));
      return;
    }
    if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();
    if(n.geometry.boundingBox) b.union(part.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld));
  });
  return b.isEmpty()?new T.Box3(V(-.03,0,-.03),V(.03,.02,.03)):b;
}
function putBase(o,config){
  const scene=o.clone(true);
  scene.name='Register model '+config.id;
  scene.userData={...scene.userData,role:'equipment-model',equipmentId:config.id,assetUrl:config.assetUrl};
  const sc=config.assetScale??1;
  if(Array.isArray(sc))scene.scale.set(...sc);else scene.scale.setScalar(sc);
  scene.rotation.set(...(config.assetRotation||[0,0,0]));
  scene.position.set(...(config.assetOffset||[0,0,0]));
  return scene;
}
function lights(s, brighter=false){
  s.add(new T.HemisphereLight(0xf4fbff,0x4e615a,brighter?2.0:1.24));
  const top=new T.DirectionalLight(0xf8fcff,1.7);top.position.set(2.8,6.5,4.2);s.add(top);
  const rim=new T.DirectionalLight(0xb7d6de,.8);rim.position.set(-3,3,-3.4);s.add(rim);
  const fill=new T.DirectionalLight(0xffe0ba,.5);fill.position.set(4,2,-1.2);s.add(fill);
}
const TRAY_W=.39,TRAY_D=.31;
function buildTransferRig(parent){
  const g=new T.Group();g.name='Grounded cleanroom transfer trolley';g.userData.role='specimen-transport';g.visible=false;parent.add(g);
  const rubber=ownMaterial(0x213436,.92,.08),plastic=ownMaterial(0x426460,.58,.14);
  box(g,supportMaterials[0],TRAY_W+.07,.035,TRAY_D+.10,0,-.042,0);
  const deck=box(g,supportMaterials[2],TRAY_W,.022,TRAY_D,0,-.022,0);
  deck.userData.role='carrier-deck';
  for(const z of [-TRAY_D/2,TRAY_D/2])box(g,supportMaterials[0],TRAY_W,.008,.012,0,-.008,z);
  for(const x of [-TRAY_W/2,TRAY_W/2])box(g,supportMaterials[0],.012,.008,TRAY_D, x,-.008,0);
  for(const x of [-.115,.115])box(g,supportMaterials[3],.026,.008,.026,x,-.009,0);
  const under=new T.Group();g.add(under);
  const posts=[],wheels=[];
  for(const ix of [-1,1])for(const iz of [-1,1]){
    const x=ix*.188,z=iz*.151;
    posts.push(box(under,supportMaterials[0],.026,1,.027,x,-.4,z));
    const caster=new T.Group();caster.userData.role='caster';under.add(caster);
    const tread=new T.Mesh(new T.CylinderGeometry(.052,.052,.027,16),rubber);
    tread.rotation.z=Math.PI/2;caster.add(tread);
    for(const xi of [-.016,.016]){
      const hub=new T.Mesh(new T.CylinderGeometry(.023,.023,.007,12),supportMaterials[0]);
      hub.position.x=xi;hub.rotation.z=Math.PI/2;caster.add(hub);
    }
    caster.position.set(x,.054,z);
    wheels.push(caster);
  }
  const lower=box(under,plastic,TRAY_W-.031,.021,TRAY_D-.022,0,.22,0);
  for(const x of [-.18,.18])box(g,supportMaterials[0],.022,.152,.022,x,-.004,.217);
  box(g,plastic,TRAY_W-.026,.026,.027,0,.067,.217);
  const set=(position)=>{
    g.position.copy(position);
    under.position.y=-position.y;
    posts.forEach(n=>{n.scale.y=Math.max(.1,position.y-.107);n.position.y=.082+n.scale.y*.5;});
    lower.position.y=Math.min(.28,Math.max(.16,position.y*.34));
    for(const w of wheels)w.rotation.x=.5*position.x/.052;
  };
  return {group:g,set,dispose(){g.traverse(n=>{if(n.isMesh&&n.geometry!==BOX)n.geometry.dispose();});rubber.dispose();plastic.dispose();parent.remove(g);}};
}
// A neutral handling aid bridges the aisle cart and the tool's own receiver.
// It is intentionally not a controller reconstruction or a machine transfer robot.
function makeHandlingAid(parent){
  const g=new T.Group();g.userData.role='illustrative-handling-fork';g.visible=false;parent.add(g);
  const rod=new T.CylinderGeometry(.012,.012,1,10),joint=new T.SphereGeometry(.021,12,10);
  const brush=ownMaterial(0x78908a,.48,.48),knob=ownMaterial(0x997849,.54,.34);
  const a=new T.Mesh(rod,brush),b=new T.Mesh(rod,brush),k=new T.Mesh(joint,knob);g.add(a,b,k);
  const prongs=new T.Group();
  for(const x of [-.029,.029]) box(prongs,brush,.019,.006,.145,x,0,-.032);
  box(prongs,knob,.093,.016,.023,0,0,.045);g.add(prongs);
  const unit=V(0,1,0);
  function segment(mesh,from,to){
    const along=to.clone().sub(from);const length=along.length();
    mesh.position.copy(from).lerp(to,.5);mesh.scale.y=Math.max(.001,length);
    mesh.quaternion.setFromUnitVectors(unit,along.normalize());
  }
  return {group:g,draw(cart,work,on){
    g.visible=on;if(!on)return;
    const anchor=cart.clone().add(V(.155,-.075,.105));
    const target=work.clone().add(V(0,-.008,.048));
    const elbow=anchor.clone().lerp(target,.48).add(V(.073,.066,.028));
    k.position.copy(elbow);segment(a,anchor,elbow);segment(b,elbow,target);prongs.position.copy(target);
  },dispose(){rod.dispose();joint.dispose();brush.dispose();knob.dispose();parent.remove(g);}};
}
function supportAndField(scene){
  const support=new T.Group(),locator=new T.Group();
  support.name='Temporary support · teaching geometry';
  support.userData.role='temporary-wafer-support';
  locator.name='Selected reticle-field locator';locator.userData.role='selected-reticle-field';
  const ringMat=new T.MeshStandardMaterial({color:0x667b71,roughness:.47,metalness:.36});
  const topMat=new T.MeshStandardMaterial({color:0x394e46,roughness:.6,metalness:.12});
  const skin=new T.CylinderGeometry(.082,.082,.004,72),deck=new T.CylinderGeometry(.078,.078,.0013,72);
  const body=new T.Mesh(skin,ringMat),upper=new T.Mesh(deck,topMat);
  body.position.y=.002;upper.position.y=.0047;
  support.add(body,upper);
  const locMat=new T.MeshBasicMaterial({color:0xffbb63,depthWrite:false});
  const rail=.022,band=.00066;
  for(const k of [-1,1]){
    box(locator,locMat,rail,.00035,band,0,0,k*rail*.5);
    box(locator,locMat,band,.00035,rail,k*rail*.5,0,0);
  }
  support.visible=false;locator.visible=false;scene.add(support,locator);
  return {support,locator,dispose(){scene.remove(support,locator);skin.dispose();deck.dispose();ringMat.dispose();topMat.dispose();locMat.dispose();}};
}
function textLabel(stage){
  return (stage.machine||stage.model?.title||stage.operation||'Virtual station').split(' · ')[0];
}
function exactCandidate(stage){
  const m=stage.model;
  if(!m?.assetUrl||m.kind!=='register-asset')return false;
  const dim=stage.sizeMm??m.wafer?.nominalMm;
  const shape=stage.spec==='wafer'?'round':['die','panel'].includes(stage.spec)&&dim?'square':null;
  if(!stage.imageFits||!shape||!dim||stage.nativeHold)return false;
  return sampleCleanroomPose(m,.75,{shape,diameterMm:dim,sizeMm:dim}).status==='match';
}
const PROFILE_IMPORTS={
  peripheral:()=>import('./cleanroom-device-profiles-3d.js').then(m=>m.makeDeviceProfiles),
  utah:()=>import('./cleanroom-utah-3d.js').then(m=>m.makeUtahWorkpiece),
  retina:()=>import('./cleanroom-retinal-3d.js').then(m=>m.makeRetinaWorkpiece),
};
const profileKind=profile=> profile==='utah-array-fabrication'?'utah':profile==='retinal-photovoltaic-foundry'?'retina':profile?'peripheral':null;
function specimenActor(section=false){
  const generic=section?makeSection(T):makeWorkpiece(T),group=new T.Group(),profiles=new Map();
  group.add(generic.group);
  return {
    group,
    install(kind,factory){
      if(profiles.has(kind))return;
      const model=factory(T,{section});
      model.group.visible=false;profiles.set(kind,model);group.add(model.group);
    },
    update(state){
      const meta=generic.update(state);
      const kind=profileKind(state.profile),custom=profiles.get(kind);
      for(const [k,shape] of profiles)if(k!==kind||state.shape==='none')shape.group.visible=false;
      const selected=custom&&state.shape!=='none'&&(kind!=='retina'||section||meta.shape==='die');
      if(custom&&!selected)custom.group.visible=false;
      let supplied=null;
      if(selected){
        try{ supplied=custom.update({
          profile:state.profile,stage:state.profileStage,phaseId:state.profilePhase,
          branch:state.profileBranch,dataset:state.profileDataset,authored:state.authored,
          progress:state.progress,explode:state.explode,
        }); }catch{custom.group.visible=false;}
      }
      const virtualOnly=supplied?.shape==='none';
      const hasGeometry=Boolean(custom?.group.visible&&!virtualOnly&&state.shape!=='none'&&supplied);
      generic.group.visible=!hasGeometry&&!virtualOnly&&meta.shape!=='none';
      group.visible=hasGeometry||generic.group.visible;
      return hasGeometry||virtualOnly?{...meta,...supplied,profile:state.profile}:meta;
    },
    dispose(){
      generic.dispose();for(const p of profiles.values())p.dispose();profiles.clear();group.clear();
    },
  };
}
export function createCleanroomWorld(host,{onFailure=()=>{},onState=()=>{}}={}){
  const world=new T.Scene();world.name='Continuous Foundry cleanroom';
  world.userData.role='cleanroom-world';
  world.background=new T.Color(0x364a47);
  world.fog=new T.Fog(0x364a47,8.6,26);
  const beforeScene=new T.Scene(),afterScene=new T.Scene(),reticleScene=new T.Scene();
  beforeScene.name='Magnified 3D incoming wafer';afterScene.name='Magnified 3D outgoing wafer';
  beforeScene.background=new T.Color(0x1b302c);afterScene.background=new T.Color(0x274139);
  beforeScene.userData.role='cleanroom-before';afterScene.userData.role='cleanroom-after';
  reticleScene.name='Source-derived 64D reticle inspection';reticleScene.userData.role='cleanroom-reticle';reticleScene.background=new T.Color(0x142923);
  let renderer;
  try{
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:false});
  }catch(e){onFailure(e);return null;}
  renderer.setPixelRatio(Math.min(1.4,window.devicePixelRatio||1));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.autoClear=false;
  const canvas=renderer.domElement;canvas.className='cr-world-canvas';
  canvas.dataset.cleanroomWorld='';canvas.dataset.trackId='cr-'+(++worldNo);
  canvas.setAttribute('aria-label','Continuous 3D view of workpiece and equipment');
  canvas.setAttribute('role','img');
  host.append(canvas);
  lights(world);lights(beforeScene,true);lights(afterScene,true);lights(reticleScene,true);

  const decor=decorateRoom(T,world), carrier=buildTransferRig(world),fork=makeHandlingAid(world),supportField=supportAndField(world),operator=makeSetupConsole(T);
  world.add(operator.group);operator.group.visible=false;
  const processCue=new T.Mesh(new T.CylinderGeometry(.073,.073,.022,64),
    new T.MeshBasicMaterial({color:0x9a93ed,transparent:true,opacity:0,depthWrite:false}));
  processCue.name='Qualitative process cue · not plasma geometry';
  processCue.userData.role='qualitative-process-cue';
  processCue.visible=false;world.add(processCue);
  const workpiece=specimenActor();workpiece.group.name='Persistent wafer and workpiece';workpiece.group.userData.role='workpiece';world.add(workpiece.group);
  const inStack=specimenActor(true),outStack=specimenActor(true);
  inStack.group.userData.role='inspection-specimen';outStack.group.userData.role='inspection-specimen';
  beforeScene.add(inStack.group);afterScene.add(outStack.group);
  const camera=new T.PerspectiveCamera(43,1,.025,80);camera.name='Continuous workpiece camera';
  const sectionCamera=new T.PerspectiveCamera(38,1,.001,80); sectionCamera.name='3D stack microscope';
  const entries=new Map(),planIndices=new Map(),latestByKey=new Map();
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer={yaw:0,pitch:0,zoom:1,touches:new Map()};
  let active=null,previous=null,mode='follow',exploded=false,siteFocus='whole',layerCounts=[0,0],canExplode=false,prepared=[],p=0,reduced=false,disposed=false,frame=0,width=0,height=0,dirty=true,visible=true,lastPresented=null,hasDrawn=false;
  const origin=(i)=>V(i*BASE,0,0);
  const keyFor=step=>step.trackKey??(step.machine+'|'+step.operation+'|'+step.before);
  const shapeKey=r=>[r.spec,r.effect,r.kind,r.sizeMm,r.model?.id,Boolean(r.fitLimit),Boolean(r.nativeHold),Boolean(r.imageFits)].join('|');
  const focus=V(0,.9,0),cam=V(0,1.7,3.1),work=V(0,.9,1.5),rendererSize=new T.Vector2();
  let targetAngle=0,reticleBundle=null,reticleRequest=null;
  const profileRequests=new Map();
  function ensureProfile(record){
    const kind=profileKind(record?.deviceProfile);
    if(!kind||profileRequests.has(kind))return;
    const pending=PROFILE_IMPORTS[kind]().then(factory=>{
      if(disposed)return;
      workpiece.install(kind,factory);inStack.install(kind,factory);outStack.install(kind,factory);queue();
    }).catch(()=>{ /* Geometry can fall back to the default 3D artifact. */ });
    profileRequests.set(kind,pending);
  }
  const reticleProfile=record=>Number.isInteger(record?.surfaceFeatures?.reticleStage64D);
  function loadReticle(){
    if(reticleBundle||reticleRequest)return;
    reticleRequest=import('./cleanroom-64d-artwork.js').then(m=>{
      if(disposed)return;
      const worldReticle=m.make64DFieldOverlay(T),detail=m.make64DFieldOverlay(T),detailRoot=new T.Group();
      worldReticle.group.name='64D source artwork at the selected location';worldReticle.group.userData.role='reticle-world';
      detailRoot.name='Registered 64D source artwork close-up';detailRoot.userData.role='reticle-detail';
      const mat=ownMaterial(0x304b4e,.63,.31);
      const sample=box(detailRoot,mat,.0076,.00015,.00185,0,-.00009,0);
      sample.name='Marked wafer field fragment; optical presentation support';
      detailRoot.add(detail.group);
      reticleScene.add(detailRoot);world.add(worldReticle.group);
      const xy=m.artwork64D.outlineUm;
      const midpoint=k=>(Math.min(...xy.map(u=>u[k]))+Math.max(...xy.map(u=>u[k])))*.5;
      reticleBundle={worldReticle,detail,detailRoot,mapping:m.channelMapping64D,mat,cx:midpoint(0),cz:midpoint(1)};
      notify();queue();
    }).catch(()=>{reticleRequest=null;});
  }
  function notify(){
    if(!active)return;
    const sig=[active.renderKind,Boolean(active.exact),Boolean(active.assetFailed),Boolean(reticleBundle&&reticleProfile(active.record)),mode,active.record.spec,canExplode].join('|');
    if(lastPresented===sig)return;
    lastPresented=sig;
    onState({render:active.renderKind,hasExact:Boolean(active.exact),modelId:active.record.model?.id,
      canInspect:active.record.spec!=='none',hasReticle:!!reticleBundle&&reticleProfile(active.record),canExplode,hasReference:!!active.exact&&!active.compatible,assetFailed:!!active.assetFailed});

  }
  function queue(force=false){
    dirty=true;
    if((!visible&&hasDrawn&&force!==true)||disposed||frame)return;
    frame=requestAnimationFrame(()=>{frame=0;if(dirty){dirty=false;draw();}});
  }
  function addExact(entry,asset){
    if(disposed||entries.get(entry.index)!==entry)return;
    const {record:r}=entry,m=r.model;
    const body=putBase(asset,m),bounds=meshBounds(body),size=bounds.getSize(V(0,0,0));
    const center=bounds.getCenter(V(0,0,0));
    const exact=new T.Group();exact.name='REGISTER / '+textLabel(r);exact.userData.role='equipment';
    exact.userData.equipmentId=m.id;exact.userData.assetUrl=m.assetUrl;
    const raised=Math.max(0,Math.min(.84,1.10-bounds.max.y));
    const local=V(-center.x,raised-bounds.min.y,0);
    body.position.add(local);exact.add(body);
    if(raised>.25)support(exact,Math.max(.85,size.x+.24),Math.max(.68,size.z+.34),raised);
    exact.visible=false;entry.group.add(exact);
    const reference=new T.Vector3(-1.35,0,-.66);
    const previewScale= entry.compatible ? 1 : Math.min(1,1.62/Math.max(size.x,size.z,1.2));
    const fixture={body,group:exact,offset:local,size,bounds,raised,nodes:new Map(),reference,previewScale,reveal:null};
    entry.exact=fixture;
    if(entry.compatible){
      for(const name of m.hideNodes||[]){const node=body.getObjectByName(name);if(node)node.visible=false;}
      const reveal=CHAMBER_REVEALS[m.id];
      if(reveal){
        const originals=new Map();
        const targets=reveal.nodes.map(n=>body.getObjectByName(n)).filter(Boolean);
        for(const target of targets)target.traverse(n=>{
          if(!n.isMesh||!n.material)return;
          const wasArray=Array.isArray(n.material);
          const materials=[].concat(n.material).map(material=>{
            if(!originals.has(material))originals.set(material,material.clone());
            return originals.get(material);
          });
          n.material=wasArray?materials:materials[0];
        });
        fixture.reveal={config:reveal,materials:[...originals.values()],level:0};
      }
      const dim=r.sizeMm??m.wafer.nominalMm;
      const shape=r.spec==='wafer'?'round':'square';
      fixture.fit={shape,diameterMm:dim,sizeMm:dim};
      const open=sampleCleanroomPose(m,0,fixture.fit);
      const seat=sampleCleanroomPose(m,1,fixture.fit);
      fixture.approach=nativeLocal(fixture,open.position);
      fixture.seat=nativeLocal(fixture,seat.position);
    }
    const showOnArrival=active===entry&&(p<=.09||p>=.94&&!entry.trackLocked), compatible=entry.compatible&&entry.record.kind!=='unknown';
    if(compatible&&(active!==entry||showOnArrival)){
      entry.procedural.group.visible=false;exact.visible=true;entry.renderKind='register';
      notify();
    }
    setVis(entry);queue();
  }
  function nativeLocal(fixture,position){return V(...position).multiply(fixture.body.scale).applyEuler(fixture.body.rotation).add(fixture.body.position);}
  function loadEntry(entry){
    if(entry.request||!entry.record.model?.assetUrl||entry.record.kind==='unknown')return;
    const url=entry.record.model.assetUrl;
    entry.request=load(url).then(asset=>addExact(entry,asset)).catch(()=>{entry.assetFailed=true;if(active===entry){notify();queue();}});
  }
  function removeBay(entry){
    world.remove(entry.group);entry.procedural.dispose?.();
    entry.exact?.reveal?.materials?.forEach(m=>m.dispose());
  }
  function setVis(entry){
    const register=entry.renderKind==='register'||(active===entry&&mode==='register'&&entry.exact);
    const model=entry.exact;
    if(model){
      // An exterior-only model stays visibly separate from the teaching seat.
      // No specimen is routed to this body unless the exact track fits.
      const exhibition=!register&&entry.record.kind!=='unknown'&&!entry.record.nonphysical&&entry.record.spec!=='none'
        &&!entry.compatible&&entry.record.model?.id!=='16-11';
      model.group.visible=!!register||exhibition;
      if(exhibition){
        model.group.position.copy(model.reference);
        model.group.scale.setScalar(model.previewScale);
      }else{
        model.group.position.set(0,0,0);
        model.group.scale.setScalar(1);
      }
      model.group.userData.referenceOnly=exhibition||mode==='register'&&!entry.compatible;
    }
    entry.procedural.group.visible=!register;
  }
  function unloadPoint(entry){const s=entry.compatible&&entry.renderKind==='register'&&entry.exact?.approach||entry.procedural.approach;
    return s.clone().add(entry.group.position).add(V(.64,.052,Math.max(.42,1.37-s.z)));
  }
  function makeBay(index,r){
    const g=new T.Group();g.name='Equipment bay '+(index+1);g.position.copy(origin(index));
    g.userData={role:'equipment-bay',bay:index,equipmentId:r.model?.id||''};
    world.add(g);decor.ensureBay(index,g.position,{title:textLabel(r),kind:r.kind,effect:r.effect,index});
    const t=makeTeachingMachine(T,r.fitLimit||r.nativeHold?'handoff':r.effect,{
      title:textLabel(r),operation:r.operation,variant:r.model?.stationName||r.machine||'',kind:r.kind,blocked:!!r.fitLimit||!!r.nativeHold||r.kind==='unknown',
      nonphysical:r.spec==='none',shape:r.spec,sizeMm:r.sizeMm
    });
    t.group.name='TEACHING / '+textLabel(r);
    t.group.userData={...t.group.userData,role:'equipment',modelClass:t.kind};
    g.add(t.group);
    const entry={key:keyFor(r),index,group:g,procedural:t,record:r,renderKind:'teaching-3d',compatible:exactCandidate(r)};
    entries.set(index,entry);
    loadEntry(entry);return entry;
  }
  function activateExact(entry){
    if(!entry.exact||!entry.compatible||entry.record.kind==='unknown')return;
    entry.renderKind='register';setVis(entry);
  }
  function trim(){
    // Keep all architecture, but cull distant analytical tools from the draw pass.
    for(const entry of entries.values()){
      entry.group.visible=Math.abs(entry.index-active.index)<=2||entry===previous;
      setVis(entry);
    }
  }
  function atPosition(entry,progress,meta){
    const g=entry.group.position,r=entry.record;
    const fit=entry.exact?.fit;
    const register=entry.renderKind==='register'&&fit;
    const t=entry.procedural;
    const approach=(register?entry.exact.approach:t.approach).clone().add(g);
    const seated=(register?entry.exact.seat:t.seat).clone().add(g);
    const exit=unloadPoint(entry);
    const dock=exit.clone();
    const incoming=previous&&previous!==entry?unloadPoint(previous):dock.clone().add(V(-1.05,0,.07));
    const stageP=clamp(progress);
    const q=stageP<.16?0:stageP<.32?(stageP-.16)/.16:stageP<=.81?1:stageP<=.94?( .94-stageP)/.13:0;
    t.animate(stageP,{reducedMotion:reduced});
    targetAngle=0;
    if(register){
      const snapshot=sampleCleanroomPose(r.model,clamp(q),fit);
      for(const op of snapshot.nodeOps){
        if(!entry.exact.nodes.has(op.name))entry.exact.nodes.set(op.name,entry.exact.body.getObjectByName(op.name));
        const n=entry.exact.nodes.get(op.name);if(!n)continue;
        if(op.position)n.position.set(...op.position);if(op.rotation)n.rotation.set(...op.rotation);
        if(op.visible!==undefined)n.visible=op.visible;
      }
      if(stageP>=.16&&stageP<=.94){
        work.copy(nativeLocal(entry.exact,snapshot.position)).add(g);
        targetAngle=snapshot.rotation?.[1]||0;
        workpiece.group.rotation.set(...(snapshot.rotation||[0,0,0]));
        workpiece.group.quaternion.premultiply(entry.exact.body.quaternion);
        const thicknessMm=meta?.substrateThicknessMm;
        if(Number.isFinite(thicknessMm)&&thicknessMm>0)work.sub(V(0,thicknessMm*.0005,0).applyQuaternion(workpiece.group.quaternion));
      }
    }
    if(stageP<.16){
      if(stageP<.108)work.copy(incoming).lerp(dock,ease(stageP/.108));
      else{
        const z=ease((stageP-.108)/.052);
        work.copy(dock).lerp(approach,z);work.y+=Math.sin(Math.PI*z)*.035;
      }
    }else if(stageP>.94)work.copy(approach).lerp(exit,ease((stageP-.94)/.06));
    else if(!register){
      work.copy(approach).lerp(seated,ease(q));
      work.y+=Math.sin(ease(q)*Math.PI)*.036;
    }
    if(!register||stageP<.16||stageP>.94)workpiece.group.rotation.set(0,targetAngle,0);
    const physicallyPresent=meta?.shape!=='none'&&r.spec!=='none'&&r.kind!=='unknown'&&!r.nonphysical;
    workpiece.group.visible=physicallyPresent&&mode!=='register';
    workpiece.group.position.copy(work);
    // The cart docks in the aisle, with the released specimen on its deck.
    // It does not drive all the way into a chamber or levitate above the floor.
    carrier.group.visible=physicallyPresent&&mode!=='register';
    carrier.set(stageP<.108?work:dock);
    const opt=r.surfaceFeatures||{},support=supportField.support,locator=supportField.locator;
    const takesSupport=opt.carrierBefore===false&&opt.carrierAfter===true;
    const releasesSupport=opt.carrierBefore===true&&opt.carrierAfter===false&&!r.nativeHold;
    const tracked=physicallyPresent&&mode!=='register';
    const wafer=meta?.shape==='wafer',thickness=(meta?.substrateThicknessMm||0)*.001;
    let waferFlip=0;
    const placed=ease((stageP-.56)/.24);
    support.visible=tracked&&(opt.carrierBefore===true||takesSupport&&stageP>.49);
    support.userData.attached=support.visible&&wafer;
    if(support.visible){
      if(releasesSupport&&!wafer){support.position.copy(seated);support.userData.attached=false;}
      else support.position.copy(work).add(V(0,-.001,0));
      if(wafer){
        // The authored frontside is mounted face down only as a modeled support operation.
        const flip=waferFlip=takesSupport?placed:1;
        workpiece.group.rotation.z=Math.PI*flip;
        const centerShift=(r.sizeMm||150)*.00052*Math.sin(Math.PI*flip);
        workpiece.group.position.y+=.005+centerShift+thickness*(1-Math.cos(Math.PI*flip))*.5;
      }else if(releasesSupport){
        const shift=ease((stageP-.70)/.14)*(1-ease((stageP-.89)/.11));
        workpiece.group.position.add(V(.10*shift,.035*shift,0));
      }
    }
    const id=r.specimenIdentity;
    workpiece.group.userData.artifactId=id?.label||'';
    locator.visible=Boolean(tracked&&wafer&&id?.fieldMm);
    if(locator.visible){
      locator.position.set(id.fieldMm[0]*.001,waferFlip>.5?-.00065:thickness+.00065,id.fieldMm[1]*.001)
        .applyQuaternion(workpiece.group.quaternion).add(workpiece.group.position);
      locator.quaternion.copy(workpiece.group.quaternion);
      locator.userData.artifactId=id.label;
    }

    fork.draw(dock,work,physicallyPresent&&mode!=='register'&&!reduced&&(stageP>.108&&stageP<.16||stageP>.94&&stageP<.995));
    return {approach,seated,incoming,exit,register:!!register};
  }
  function workState(record,progress){
    const blocked=!!record.fitLimit||!!record.nativeHold||record.kind==='unknown';
    const held=blocked||record.kind==='handoff'&&!['release','dice','assemble','transfer-film','fill'].includes(record.effect)||
      record.kind==='test'||record.kind==='inspection'&&!record.inspectionChangesShape;
    const raw=record.surfaceFeatures||{};
    const w=record.nativeWitness?.window;
    const opticalUnderClear=record.nativeWitness?.stage===6&&Number.isFinite(w?.etchDepthUm)&&Number.isFinite(w?.topFilmUm)&&w.etchDepthUm<w.topFilmUm;
    const authored={...raw,face:record.processFace,activeChannel:record.specimenIdentity?.channel,connectorFace:record.specimenIdentity?.face,verified:!blocked};
    if(held||opticalUnderClear){
      authored.afterFeature=raw.beforeFeature;
      authored.afterMaterial=raw.beforeMaterial;
      authored.donorLayersAfter=raw.donorLayersBefore;
    }
    const outgoing=blocked?record.spec:record.outgoingShape||record.afterSpec||record.spec;
    const shapeChange=outgoing!==record.spec&&!blocked;
    return {
      shape:record.spec,outgoingShape:outgoing,
      sizeMm:Number(record.sizeMm)||undefined,effect:(held||opticalUnderClear)&&!shapeChange?'none':record.effect,
      before:record.before||'',after:(held||opticalUnderClear)&&!shapeChange?record.before||'':record.after||'',
      progress:blocked?0:clamp(progress),authored,
      profile:record.deviceProfile,profileStage:record.profileStage,profilePhase:record.profilePhase,
      profileBranch:record.profileBranch,profileDataset:record.profileDataset
    };
  }
  function frameCamera(entry,pose,progress){
    const r=entry.record,g=entry.group.position,d=entry.exact;
    const phone=width<620;
    const trackingOffset=V(.53,.79,phone?2.18:1.92);
    const reveal=pose.register&&d?.reveal;
    const revealLevel=mode==='follow'&&reveal?ease((progress-.575)/.073)*(1-ease((progress-.757)/.058)):0;
    if(reveal&&Math.abs(reveal.level-revealLevel)>.005){
      reveal.level=revealLevel;
      for(const mat of reveal.materials){
        const trans=revealLevel>.02;
        if(mat.transparent!==trans){mat.transparent=trans;mat.depthWrite=!trans;mat.needsUpdate=true;}
        mat.opacity=1-.82*revealLevel;
      }
    }
    canvas.dataset.chamberCutaway=revealLevel>.15?'true':'false';
    processCue.visible=revealLevel>.10;
    if(processCue.visible){
      processCue.position.copy(pose.seated).add(V(0,.018,0));
      processCue.material.opacity=revealLevel*(.12+.035*Math.sin(progress*60));
    }
    if(mode==='setup'){
      focus.copy(operator.screenTarget).add(operator.group.position);
      cam.copy(focus).add(V(.12,.19,phone?1.0:.91));
    }else if(mode==='room'){
      const both=previous&&previous!==entry;
      const x=both?(g.x+previous.group.position.x)/2:g.x;
      focus.set(x,.82,0);
      cam.set(x+(phone?.9:2.35),phone?3.35:3.95,phone?5.2:5.8);
    }else if(mode==='register'&&d){
      const b=visibleBounds(d.body),center=b.getCenter(V(0,0,0));
      const rad=Math.max(.25,b.getSize(V(0,0,0)).length()*.5),factor=phone?3.95:3.0;
      focus.copy(center);cam.copy(focus).add(V(.51,.27,.81).normalize().multiplyScalar(rad*factor));
    }else{
      const duringTransfer=progress<.16;
      const guide=d?.group.visible&&pose.register?r.model.camera:undefined;
      const native=guide?.eye&&guide?.target&&!guide.autoFit;
      const near=progress>.28&&progress<.82;
      const close=ease((progress-.18)/.26)*(1-ease((progress-.83)/.15));
      const nativeFocus=native?V(...guide.target).add(d.offset).add(g):pose.seated.clone();
      const nativeOffset=native?V(...guide.eye).sub(V(...guide.target)):V(.93,.79,1.86);
      const nearPoint=pose.seated.clone().lerp(nativeFocus,native?.82:.62);
      focus.copy(duringTransfer?work:nativeFocus);
      if(!duringTransfer)focus.lerp(nearPoint,close*.7);
      if(duringTransfer){
        cam.copy(focus).add(trackingOffset);
        const enter=ease((progress-.075)/.085);
        // Blend to the exact station camera before the actual drawer motion begins.
        const nextFocus=nativeFocus;
        const nextCam=nextFocus.clone().add(nativeOffset.clone().multiplyScalar(phone?1.28:1.10));
        focus.lerp(nextFocus,enter);cam.lerp(nextCam,enter);
      }else{
        const factor=(phone?1.28:1.10)*(1-.22*close);
        cam.copy(focus).add(nativeOffset.multiplyScalar(factor));
        const access=ease((progress-.320)/.071)*(1-ease((progress-.505)/.065));
        if(access>.0001){
          const setup=operator.screenTarget.clone().add(operator.group.position);
          focus.lerp(setup,access*(phone?.60:.67));
          cam.lerp(setup.clone().add(V(.13,.37,phone?1.53:1.54)),access*.58);
        }
        if(revealLevel>.0001){
          const chamber=pose.seated.clone();
          focus.lerp(chamber,revealLevel*.78);
          const inside=chamber.clone().add(V(...reveal.config.eye).multiplyScalar(phone?1.33:1.10));
          cam.lerp(inside,revealLevel*.79);
        }
        if(!near&&progress>.94){
          const u=ease((progress-.94)/.06);
          focus.lerp(pose.exit,u);
          cam.lerp(pose.exit.clone().add(trackingOffset),u);
        }
      }
    }
    const off=cam.clone().sub(focus);
    const sph=new T.Spherical().setFromVector3(off);
    sph.theta+=pointer.yaw;sph.phi=Math.min(1.49,Math.max(.35,sph.phi+pointer.pitch));sph.radius*=pointer.zoom;
    camera.position.copy(focus).add(new T.Vector3().setFromSpherical(sph));
    camera.aspect=Math.max(1,width)/Math.max(1,height);camera.updateProjectionMatrix();
    camera.lookAt(focus);camera.updateMatrixWorld();
  }
  function sectionFrame(scene,section,x,y,w,h,zoom=1,rotatable=false,focusBox=null){
    if(w<=0||h<=0)return;
    const b=focusBox||visibleBounds(section.group),center=b.getCenter(V(0,0,0)),size=b.getSize(V(0,0,0));
    const rad=Math.max(focusBox?.000002:.001,size.length()*.5);
    sectionCamera.aspect=w/h;
    const lens=new T.Spherical().setFromVector3(focusBox?V(.31,.92,.54):V(.66,.53,1.04));
    if(rotatable){lens.theta+=pointer.yaw;lens.phi=Math.min(2.70,Math.max(.25,lens.phi+pointer.pitch));}
    lens.radius=1;
    const direction=new T.Vector3().setFromSpherical(lens);
    sectionCamera.position.copy(center).add(direction);sectionCamera.lookAt(center);
    const inverse=sectionCamera.quaternion.clone().invert(),halfFov=Math.tan(T.MathUtils.degToRad(sectionCamera.fov*.5));
    let distance=rad*1.55;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
      const q=V(x,y,z).sub(center).applyQuaternion(inverse);
      distance=Math.max(distance,q.z+Math.max(Math.abs(q.x)/(halfFov*sectionCamera.aspect*.81),Math.abs(q.y)/(halfFov*.81)));
    }
    sectionCamera.position.copy(center).addScaledVector(direction,distance*zoom*(rotatable?pointer.zoom:1));
    sectionCamera.near=Math.max(focusBox?.00000065:.00008,rad/35);sectionCamera.far=Math.max(focusBox?.0018:.2,rad*13);
    sectionCamera.updateProjectionMatrix();sectionCamera.lookAt(center);sectionCamera.updateMatrixWorld();
    renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.render(scene,sectionCamera);
  }
  function draw(){
    if(disposed||!active)return;
    width=Math.round(host.clientWidth);height=Math.round(host.clientHeight);
    if(width<1||height<1)return;
    hasDrawn=true;
    const old=renderer.getSize(rendererSize);
    if(old.x!==width||old.y!==height)renderer.setSize(width,height,false);
    setVis(active);
    canvas.dataset.chamberCutaway='false';
    if(mode!=='reticle'){canvas.dataset.siteFocus='false';canvas.dataset.reticleFocus='whole';}
    processCue.visible=false;
    const r=active.record,state=workState(r,p);
    const specimen=workpiece.update(state);
    const pose=atPosition(active,p,specimen);
    const x=active.group.position.x;
    const floorX=Math.max(.91,Math.min(1.50,(active.exact?.size.x||1.02)*.54+.32));
    operator.group.position.set(x+floorX,0,.28);
    operator.group.visible=mode==='setup'||mode==='follow'&&p>.27&&p<.87;
    if(operator.group.visible)operator.update(r,p);
    // Pipeline identity is one root Object3D, including wafer-to-die and die-to-package changes.
    canvas.dataset.bay=String(active.index);
    canvas.dataset.specimen=specimen?.shape||r.spec||'none';
    canvas.dataset.feature=specimen?.activeFeature||'none';
    canvas.dataset.waferFace=specimen?.face||'front';
    canvas.dataset.artifactId=r.specimenIdentity?.label||'';
    canvas.dataset.deviceProfile=specimen?.profile||'';
    canvas.dataset.carrier=supportField.support.visible?(supportField.support.userData.attached?'attached':'separate'):'absent';
    canvas.dataset.stageKind=r.kind||'unknown';
    canvas.dataset.stageModel=active.renderKind;
    canvas.dataset.mode=mode;
    canvas.dataset.equipment=r.model?.id||'';
    canvas.dataset.fit=r.nativeHold?'native-hold':r.fitLimit?'blocked':pose.register?'native-dry':r.kind==='unknown'?'external':'illustrative';
    canvas.dataset.custody=previous?'continuous':r.independent?'separate-witness':'local-start';
    let reticleMap=null;
    if(reticleBundle){
      const {worldReticle,detail}=reticleBundle,id=r.specimenIdentity;
      const reticleSettings={stage:r.surfaceFeatures?.reticleStage64D,progress:p,activeChannel:id?.channel,
        connectorFace:id?.face,processFace:r.processFace,blocked:!!r.fitLimit||!!r.nativeHold,nativeWitness:r.nativeWitness,field:id?.label};
      const locator=supportField.locator;
      worldReticle.update({...reticleSettings,enabled:mode!=='register'&&locator.visible});
      if(worldReticle.group.visible){
        worldReticle.group.position.copy(locator.position).add(V(0,.00013,0));
        worldReticle.group.quaternion.copy(locator.quaternion);
      }
      if(reticleProfile(r)&&id?.channel)reticleMap=reticleBundle.mapping(id.channel,id.face);
      if(mode==='reticle')detail.update({...reticleSettings,processFace:'front',showBuried:true,enabled:true});
    }
    canvas.dataset.pin=reticleMap?.connectorPin??'';
    canvas.dataset.amplifierZero=reticleMap?.amplifierZero??'';
    const showSection=mode==='follow'&&workpiece.group.visible&&p>=.69&&(state.effect!=='none'&&state.effect!=='handoff'||state.outgoingShape!==state.shape);
    canvas.dataset.sectionInset=showSection?'true':'false';
    if(mode==='reticle'&&reticleBundle&&reticleProfile(r)){
      let bounds=null;
      const feature=siteFocus==='site'?reticleMap?.siteUm:siteFocus==='bond'?reticleMap?.bondUm:null;
      if(feature){
        const [x,z]=feature;
        const center=V((z-reticleBundle.cz)*1e-6,0,-(x-reticleBundle.cx)*1e-6),r=siteFocus==='bond'?.00009:.000045;
        bounds=new T.Box3(center.clone().sub(V(r,r*.12,r)),center.clone().add(V(r,r*.12,r)));
      }
      canvas.dataset.siteFocus=bounds?'true':'false';
      canvas.dataset.reticleFocus=bounds?siteFocus:'whole';
      renderer.setScissorTest(true);
      sectionFrame(reticleScene,{group:reticleBundle.detailRoot},0,0,width,height,.99,true,bounds);
      renderer.setScissorTest(false);
    }else if(mode==='inspect'&&r.spec!=='none'){
      const before={...state,progress:0,explode:exploded?1:0},after={...state,progress:1,explode:exploded?1:0};
      const a=inStack.update(before),b=outStack.update(after);
      layerCounts=[a?.layerCount||0,b?.layerCount||0];
      canExplode=Boolean(a?.canExplode||b?.canExplode);
      renderer.setScissorTest(true);renderer.setViewport(0,0,width,height);renderer.setScissor(0,0,width,height);
      renderer.setClearColor(0x172722,1);renderer.clear();
      const sideBySide=width>=520;
      const gap=width>400?4:2;
      if(sideBySide){
        const split=Math.floor(width/2);
        sectionFrame(beforeScene,inStack,0,0,split-gap,height,1,true);
        sectionFrame(afterScene,outStack,split+gap,0,width-split-gap,height,1,true);
      }else{
        const split=Math.floor(height/2);
        sectionFrame(beforeScene,inStack,0,split+gap,width,height-split-gap,1,true);
        sectionFrame(afterScene,outStack,0,0,width,split-gap,1,true);
      }
      renderer.setScissorTest(false);
    }else{
      frameCamera(active,pose,p);
      decor.setView?.(camera);
      renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.clear();
      renderer.render(world,camera);
      if(showSection){
        outStack.update(state);
        const dims=width>=620?[.30,.37]:[.48,.38], w=Math.round(width*dims[0]),h=Math.round(height*dims[1]);
        const gap=width>=620?10:5;
        renderer.setScissorTest(true);
        sectionFrame(afterScene,outStack,width-w-gap,gap,w,h,1.06,false);
        renderer.setScissorTest(false);
      }
    }
    notify();
  }
  function reset(){
    if(disposed)return;
    for(const e of entries.values()){
      removeBay(e);
    }
    entries.clear();latestByKey.clear();planIndices.clear();
    active=null;previous=null;lastPresented=null;p=0;prepared=[];exploded=false;siteFocus='whole';layerCounts=[0,0];canExplode=false;
    pointer.yaw=0;pointer.pitch=0;pointer.zoom=1;mode='follow';
    decor.reset();
  }
  function prepare(steps=[]){
    prepared=steps.filter(Boolean);
    for(let i=0;i<prepared.length;i++)if(!planIndices.has(keyFor(prepared[i])))planIndices.set(keyFor(prepared[i]),i);
    // Preload only reusable, compatible native loading tracks. Displays without a known
    // receiver are fetched on approach or if selected for model inspection.
    for(const s of prepared)if(exactCandidate(s))load(s.model.assetUrl).catch(()=>{});
  }
  function setStep(record){
    if(disposed)return;
    const key=keyFor(record);
    let index=planIndices.get(key);
    if(index==null)index=latestByKey.get(key)??(active?active.index+1:0);
    latestByKey.set(key,index);
    if(active?.key!==key||shapeKey(active.record)!==shapeKey(record)){
      const consecutivelyDescribed=record.routeKey&&active?.record.routeKey?
        record.routeKey===active.record.routeKey&&record.profileStage===active.record.profileStage+1:true;
      previous=active&&active.index+1===index&&consecutivelyDescribed&&!record.independent&&!record.nonphysical&&active.record.kind!=='unknown'?active:null;
      if(previous&&p>.84&&supportField.support.visible&&!supportField.support.userData.attached&&!previous.spentSupport){
        const released=supportField.support.clone(true);
        released.position.sub(previous.group.position);
        released.name='Used temporary support left at release station';
        released.userData.attached=false;
        previous.group.add(released);previous.spentSupport=released;
      }
      let next=entries.get(index);
      if(next&&(next.key!==key||shapeKey(next.record)!==shapeKey(record))){removeBay(next);entries.delete(index);next=null;}
      active=next||makeBay(index,record);
      active.record=record;
      activateExact(active);
      decor.setFocus?.(index);
      pointer.yaw=0;pointer.pitch=0;pointer.zoom=1;
      if(mode==='register'||mode==='reticle'&&!reticleProfile(record)||(mode==='inspect'&&record.spec==='none'))mode='follow';
      lastPresented=null;
    }else active.record=record;
    p=0;active.trackLocked=false;
    if(reticleProfile(record))loadReticle();
    ensureProfile(record);
    // Stage visuals one bay ahead for a real room rather than an empty background.
    const following=prepared[index+1];
    if(following&&!entries.has(index+1))makeBay(index+1,following);
    trim();notify();queue();
  }
  function setProgress(value,staticPose=false){
    const next=clamp(value);
    p=next;reduced=staticPose;
    if(active&&p>.09&&p<.94&&!staticPose)active.trackLocked=true;
    // Do not swap machines mid-take. Manual endpoints may still adopt a newly loaded model.
    if(active?.exact&&active.renderKind!=='register'&&active.compatible&&(p<=.09||p>=.94&&!active.trackLocked)){
      activateExact(active);notify();
    }
    queue();
  }
  function setMode(value){
    if(!['follow','room','inspect','register','setup','reticle'].includes(value))return;
    if(value==='inspect'&&active?.record.spec==='none')return;
    if(value==='register'&&!active?.exact)return;
    if(value==='reticle'&&(!reticleBundle||!reticleProfile(active?.record)))return;
    mode=value;
    pointer.yaw=0;pointer.pitch=0;pointer.zoom=1;
    if(active)setVis(active);notify();queue(true);
  }
  function adjust(dx=0,dy=0,z=0){
    pointer.yaw=safe(pointer.yaw+dx,.85);
    pointer.pitch=safe(pointer.pitch+dy,.42);
    pointer.zoom=Math.max(.66,Math.min(2.3,pointer.zoom+z));
    queue();
  }
  function resetCamera(){
    pointer.yaw=0;pointer.pitch=0;pointer.zoom=1;queue();
  }
  const down=e=>{
    if(e.button!==0)return;
    pointer.touches.set(e.pointerId,[e.clientX,e.clientY]);
    try{canvas.setPointerCapture(e.pointerId);}catch{/* Pointer is already gone. */}
  };
  const move=e=>{
    const prior=pointer.touches.get(e.pointerId);
    if(!prior)return;
    const next=[e.clientX,e.clientY];
    if(pointer.touches.size===1)adjust(-(next[0]-prior[0])*.006,(next[1]-prior[1])*.004);
    else if(pointer.touches.size===2){
      const other=[...pointer.touches.entries()].find(([id])=>id!==e.pointerId)[1];
      const old=Math.hypot(prior[0]-other[0],prior[1]-other[1]),current=Math.hypot(next[0]-other[0],next[1]-other[1]);
      if(old>8&&current>8)adjust(0,0,pointer.zoom*(old/current-1));
    }
    pointer.touches.set(e.pointerId,next);
  };
  const up=e=>{pointer.touches.delete(e.pointerId);};
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);
  canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('dblclick',resetCamera);
  const lost=e=>{e.preventDefault();onFailure(new Error('WebGL context lost'));};
  canvas.addEventListener('webglcontextlost',lost);
  const resize=new ResizeObserver(queue);resize.observe(host);
  const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(a=>{
    visible=a.at(-1)?.isIntersecting??true;
    if(visible)queue();
  },{rootMargin:'120px'}):null;
  intersection?.observe(host);
  return {
    setStep,setProgress,setMode,adjust,resetCamera,reset,prepare,
    refreshViewport(){
      if(disposed)return;
      const rect=host.getBoundingClientRect();
      visible=rect.width>0&&rect.height>0&&rect.bottom>=-120&&rect.top<=innerHeight+120;
      if(intersection){intersection.unobserve(host);intersection.observe(host);}
      queue(true);
    },
    setExploded(value){exploded=Boolean(value)&&canExplode;queue();},
    setSiteFocus(value){siteFocus=value===true?'site':['site','bond'].includes(value)?value:'whole';resetCamera();},
    getState:()=>({mode,hasWebGL:!disposed,hasPresented:hasDrawn,phase:p,bay:active?.index,model:active?.renderKind,hasExact:!!active?.exact,hasReticle:!!reticleBundle&&reticleProfile(active?.record),assetFailed:!!active?.assetFailed,
      mapping:reticleProfile(active?.record)?reticleBundle?.mapping(active.record.specimenIdentity?.channel,active.record.specimenIdentity?.face):null,
      specimen:canvas.dataset.specimen,track:canvas.dataset.trackId,siteFocus,exploded,canExplode,layerCounts:layerCounts.slice()}),
    dispose(){
      if(disposed)return;reset();disposed=true;cancelAnimationFrame(frame);
      resize.disconnect();intersection?.disconnect();
      if(reticleBundle){reticleBundle.worldReticle.dispose();reticleBundle.detail.dispose();reticleBundle.mat.dispose();reticleScene.clear();reticleBundle=null;}
      decor.dispose();carrier.dispose();fork.dispose();supportField.dispose();operator.dispose();processCue.geometry.dispose();processCue.material.dispose();workpiece.dispose();inStack.dispose();outStack.dispose();
      canvas.removeEventListener('webglcontextlost',lost);
      renderer.dispose();renderer.forceContextLoss();canvas.remove();
    }
  };
}
