import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAtlasModel } from './model.mjs';
import { createTubeBatch, segmentsFromPaths } from './tubes.mjs';
import { placeCorticalRouteCells } from './cortical-model.mjs';
import { createCorticalSections } from './cortical-sections.mjs';
import { morphologyPaths, createCellDetail } from './morphology.mjs';
import { computeDetailFocus } from './focus.mjs';
import { loadPreservedCell, createPreservedCellDetail, preservedCellPaths, preservedAnchorInfo, PRESERVED_CELL_MANIFEST } from './preserved-morphology.mjs';
import { createAnatomyLOD, fetchAtlasJSON } from './anatomy-lod.mjs';
import { getPreservedCellRegistration, registeredCellBranches, registerPreservedModel } from './preserved-registration.mjs';

const $ = id => document.getElementById(id);
const v = p => new T.Vector3(...p);
const colors = {sensory:0x7dd7dc,motor:0xf0b283,relay:0x9eabc9,interneuron:0xc8b4d9};
const budgets = {light:{cells:4,triangles:300000,pixelRatio:1},balanced:{cells:8,triangles:650000,pixelRatio:1.5},high:{cells:14,triangles:1200000,pixelRatio:2}};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {route:null,cell:null,stop:0,region:'overview',highlight:true,isolate:false,quality:'balanced',skin:true,envelopes:true,labels:true,myelin:true,supports:true};
function message(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(message.timer);message.timer=setTimeout(()=>$('toast').hidden=true,4500);}
function dispose(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();}
function fail(error){console.error(error);$('load-state').hidden=true;$('fatal-error').hidden=false;$('error-message').textContent=error instanceof Error?error.message:String(error);}
$('retry').onclick=()=>location.reload();

try { start(); } catch(error) { fail(error); }
function start(){
  const model=placeCorticalRouteCells(registerPreservedModel(createAtlasModel(),PRESERVED_CELL_MANIFEST)),byId=new Map(model.cells.map(c=>[c.id,c]));
  const regions=model.regions,stage=$('stage'),canvas=$('viewport');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',logarithmicDepthBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,budgets.balanced.pixelRatio));renderer.setClearColor(0x060d13);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.00001,8000),controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.13;controls.minDistance=.018;controls.maxDistance=4500;controls.screenSpacePanning=true;controls.zoomSpeed=.85;
  const hemisphere=new T.HemisphereLight(0xd2eaf0,0x182334,2.0);scene.add(hemisphere);
  for(const [position,color,intensity] of [[[450,700,900],0xe2f5ff,2.3],[[-500,50,-400],0x84b7ce,1.6],[[0,-500,200],0xffd3ad,.6]]){const light=new T.DirectionalLight(color,intensity);light.position.copy(v(position));scene.add(light);}
  const scaffoldGroup=new T.Group(),envelopeGroup=new T.Group(),globalGroup=new T.Group(),highlightGroup=new T.Group(),detailGroup=new T.Group(),fiberGroup=new T.Group();
  scene.add(scaffoldGroup,envelopeGroup,globalGroup,highlightGroup,detailGroup,fiberGroup);
  const pathMap=new Map(),sampleMap=new Map(),batches=new Set(),detailCache=new Map(),sourceLines=new Map(),detailFailures=new Map();
  const sourceLineGroup=new T.Group();scene.add(sourceLineGroup);
  const anatomyLOD=createAnatomyLOD({group:scaffoldGroup,camera,controls,state,requestDraw,reportError:error=>console.warn('Original anatomical surface unavailable; overview retained.',error)});
  let focusRequest=0;
  let raf=0,dirty=true,tween=null,hidden=false,frameMs=0,detailPending=false,lastDetailKey='',currentDetails=[],contextLost=false;
  let buildTime=performance.now(),lastPointer=null,lastFiberKey='',scaffoldLoaded=false,lastMove=0,settleTimer;
  function requestDraw(){dirty=true;if(!raf&&!hidden&&!contextLost)raf=requestAnimationFrame(draw);}
  controls.addEventListener('change',()=>{lastMove=performance.now();clearTimeout(settleTimer);settleTimer=setTimeout(requestDraw,150);requestDraw();});controls.addEventListener('start',()=>{tween=null;focusRequest++;});controls.addEventListener('end',()=>{lastDetailKey='';requestDraw();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;fail(new Error('The graphics context was lost. Close other graphics-heavy tabs, then try again.'));});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden&&raf){cancelAnimationFrame(raf);raf=0;}else if(!hidden)requestDraw();});
  const corticalSections=createCorticalSections({renderer,canvas,stage,requestDraw,onExit:()=>goRegion('cortex',{distance:75,point:[42,355,-10]}),onOriginal:()=>inspectCell(false,true)});
  for(const cell of model.cells){
    // Keep the registered long-range axons at overview scale. Original V3 local
    // arbors are loaded with their source meshes, never replaced with new trees.
    const branches=registeredCellBranches(cell,getPreservedCellRegistration(cell,PRESERVED_CELL_MANIFEST));
    const unsupported=(cell.terminal?['soma','terminal']:['soma']).filter(anchor=>!preservedAnchorInfo(cell,anchor));
    const local=unsupported.length?morphologyPaths(cell).filter(path=>unsupported.includes(path.anchor||'soma')):[],all=[...branches,...local];pathMap.set(cell.id,all);
    const sampledBranches=branches.map(branch=>({...branch,controls:branch.points.map(v)}));sampleMap.set(cell.id,sampledBranches);
    batches.add(cell.kind);

  }
  for(const kind of batches.keys()){
    const segments=model.cells.filter(c=>c.kind===kind).flatMap(c=>segmentsFromPaths(pathMap.get(c.id),c));
    const mesh=createTubeBatch(segments,{color:colors[kind]||colors.sensory,opacity:.65});mesh.name=kind;globalGroup.add(mesh);
  }
  buildTime=performance.now()-buildTime;
  function createEnvelope(points,radius,color,opacity){const curve=new T.CatmullRomCurve3(points.map(v));const geometry=new T.TubeGeometry(curve,Math.max(32,points.length*8),radius,12,false);const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,transparent:true,opacity,roughness:.7,depthWrite:false,side:T.FrontSide}));envelopeGroup.add(mesh);return mesh;}
  const pose=([x,y,z])=>[x,z-1250,-y-95];
  createEnvelope(Array.from({length:33},(_,i)=>pose([0,-72+4*Math.sin(i*.12),1338+i*4.4])),4.6,0x8faabd,.13);
  for(const z of [1398,1414,1430])for(const side of [-1,1]){
    createEnvelope([[side*3,-68,z],[side*10,-76,z+1],[side*24,-91,z],[side*36,-95,z-4]].map(pose),.48,0xb5b198,.16);
  }
  const capsuleMaterial=new T.MeshStandardMaterial({color:0x86a8b4,transparent:true,opacity:.07,roughness:.8,depthWrite:false});
  for(const z of [1398,1414]){const mesh=new T.Mesh(new T.SphereGeometry(1,24,16),capsuleMaterial);mesh.position.copy(v(pose([-24,-91,z])));mesh.scale.set(2.5,3,2);envelopeGroup.add(mesh);}
  // Paired cortical sections are an explicit inspection mode. The body route stays intact.
  function refreshHighlight(){
    [...highlightGroup.children].forEach(dispose);
    if(!state.highlight||!state.route)return;
    const segments=state.route.cellIds.flatMap(id=>segmentsFromPaths(pathMap.get(id),byId.get(id)));
    highlightGroup.add(createTubeBatch(segments,{color:state.route.kind==='motor'?0xffc397:0xb9fff2}));
    globalGroup.visible=!state.isolate;for(const lines of globalGroup.children)lines.material.opacity=state.highlight?.22:.55;
    lastDetailKey='';lastFiberKey='';requestDraw();
  }
  function activeIds(){return state.isolate&&state.route?new Set(state.route.cellIds):null;}
  function anchorKey(cell,anchor){return `${cell.id}:${anchor}`;}
  function anchorBounds(cell,anchor){
    const key=anchorKey(cell,anchor),cached=detailCache.get(key);
    if(cached)return cached.bounds;
    const info=preservedAnchorInfo(cell,anchor);
    if(info)return new T.Box3(v(info.boundsWorldMm[0]),v(info.boundsWorldMm[1]));
    const point=v(anchor==='terminal'?cell.terminal:cell.soma),radius=anchor==='terminal'?.7:.25;
    return new T.Box3(point.clone().addScalar(-radius),point.clone().addScalar(radius));
  }
  function wantedDetails(){
    const distance=camera.position.distanceTo(controls.target)*Math.min(1,Math.max(.48,camera.aspect));
    if(distance>40)return [];
    const ids=activeIds(),candidates=[],frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    for(const cell of model.cells){
      if(ids&&!ids.has(cell.id))continue;
      for(const anchor of cell.terminal?['soma','terminal']:['soma']){
        const bounds=anchorBounds(cell,anchor),d=bounds.distanceToPoint(controls.target),radius=bounds.getSize(new T.Vector3()).length()/2;
        if(d>Math.max(.25,distance*.8)||!frustum.intersectsBox(bounds))continue;
        if(radius/Math.max(.001,distance)<.012&&distance>3)continue;
        const info=preservedAnchorInfo(cell,anchor),key=anchorKey(cell,anchor);
        if(performance.now()-(detailFailures.get(key)||-Infinity)<30000)continue;
        candidates.push({cell,anchor,key,bounds,triangles:info?.triangles||24000,d:cell.id===state.cell?.id&&d<distance*.5?-1:d});
      }
    }
    candidates.sort((a,b)=>a.d-b.d);const wanted=[];let triangles=0;
    for(const candidate of candidates){
      if(wanted.length>=budgets[state.quality].cells)break;
      if(wanted.length&&triangles+candidate.triangles>budgets[state.quality].triangles)continue;
      wanted.push(candidate);triangles+=candidate.triangles;
    }
    return wanted;
  }
  function createAnchorDetail(cell,anchor){
    if(preservedAnchorInfo(cell,anchor))return createPreservedCellDetail(cell,{anchors:[anchor],includeModeledFineDetail:state.quality==='high'});
    const group=createCellDetail(cell,{quality:state.quality==='light'?'low':'high'});
    for(const child of [...group.children])if(child.userData.anchor!==anchor)dispose(child);
    return group;
  }
  function addSourceLines(cell,anchor){
    const key=anchorKey(cell,anchor);if(sourceLines.has(key)||!preservedAnchorInfo(cell,anchor))return;
    const paths=preservedCellPaths(cell,{anchors:[anchor]});
    const retained=(pathMap.get(cell.id)||[]).filter(path=>path.anchor!==anchor);
    pathMap.set(cell.id,[...retained,...paths]);
    if(!paths.some(path=>path.points.length>1))return;
    const tubes=createTubeBatch(segmentsFromPaths(paths,cell),{color:colors[cell.kind],opacity:.6});
    tubes.userData.cellId=cell.id;tubes.userData.anchor=anchor;sourceLineGroup.add(tubes);sourceLines.set(key,tubes);
    refreshHighlight();
  }
  async function ensureDetail(cell,anchor){
    const key=anchorKey(cell,anchor);if(detailCache.has(key))return detailCache.get(key);
    if(preservedAnchorInfo(cell,anchor))await loadPreservedCell(cell,{anchors:[anchor]});
    // An explicit inspection and the idle loader can await the same asset.
    if(detailCache.has(key))return detailCache.get(key);
    const group=createAnchorDetail(cell,anchor);group.userData.cellId=cell.id;group.visible=false;
    let triangles=0;group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
    const entry={group,triangles,bounds:new T.Box3().setFromObject(group),used:performance.now()};
    group.traverse(o=>{if(o.isMesh&&['support','skin'].includes(o.userData.layer))o.visible=state.supports;});
    detailGroup.add(group);detailCache.set(key,entry);addSourceLines(cell,anchor);return entry;
  }
  function refreshDetails(){
    const wanted=wantedDetails(),key=wanted.map(c=>c.key).join('|')+state.quality;
    const wantedSet=new Set(wanted.map(item=>item.key));currentDetails=[...wantedSet].filter(id=>detailCache.has(id));
    for(const [id,entry]of detailCache){entry.group.visible=wantedSet.has(id);if(entry.group.visible)entry.used=performance.now();}
    for(const [id,lines]of sourceLines)lines.visible=!detailCache.get(id)?.group.visible&&(!state.isolate||state.route?.cellIds.includes(lines.userData.cellId))&&camera.position.distanceTo(controls.target)<40;
    let cachedTriangles=[...detailCache.values()].reduce((sum,entry)=>sum+entry.triangles,0);
    while(detailCache.size>24||cachedTriangles>1800000){
      const old=[...detailCache.entries()].filter(([id])=>!wantedSet.has(id)).sort((a,b)=>a[1].used-b[1].used)[0];if(!old)break;
      dispose(old[1].group);cachedTriangles-=old[1].triangles;detailCache.delete(old[0]);
    }
    if(key===lastDetailKey)return;lastDetailKey=key;
    const missing=wanted.find(item=>!detailCache.has(item.key));if(!missing||detailPending)return;
    detailPending=true;
    const run=async()=>{
      try{
        if(!hidden&&!contextLost&&wantedDetails().some(item=>item.key===missing.key))await ensureDetail(missing.cell,missing.anchor);
      }catch(error){detailFailures.set(missing.key,performance.now());console.error('V3 cell detail could not load',error);message('The original cell detail could not load. Its pathway remains available; retry Inspect cell.');}
      finally{detailPending=false;lastDetailKey='';requestDraw();}
    };
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:180});else setTimeout(run,0);
  }
  function closestOnSegment(point,a,b){const delta=b.clone().sub(a),den=delta.lengthSq(),t=den?T.MathUtils.clamp(point.clone().sub(a).dot(delta)/den,0,1):0;return a.clone().addScaledVector(delta,t);}
  function refreshFibers(){
    const distance=camera.position.distanceTo(controls.target),key=[state.quality,state.isolate,state.myelin,state.route?.id,...controls.target.toArray().map(x=>x.toFixed(2)),distance.toFixed(2)].join('|');
    if(key===lastFiberKey)return;lastFiberKey=key;[...fiberGroup.children].forEach(dispose);if(distance>3)return;
    const allowed=activeIds(),candidates=[];
    for(const cell of model.cells){if(allowed&&!allowed.has(cell.id))continue;for(const branch of sampleMap.get(cell.id)||[]){let best=null,dist=Infinity;for(let i=1;i<branch.controls.length;i++){const p=closestOnSegment(controls.target,branch.controls[i-1],branch.controls[i]),d=p.distanceToSquared(controls.target);if(d<dist){best={p,i};dist=d;}}if(best&&dist<Math.max(.08,distance*.6)**2)candidates.push({cell,branch,best,dist});}}
    candidates.sort((a,b)=>a.dist-b.dist);
    const max=state.quality==='high'?36:state.quality==='light'?10:24;
    for(const {cell,branch,best} of candidates.slice(0,max)){
      const range=Math.max(.07,Math.min(1,distance*.7)),samples=branch.controls;let start=best.i-1,end=best.i;
      while(start>0&&samples[start].distanceTo(best.p)<range)start--;while(end<samples.length-1&&samples[end].distanceTo(best.p)<range)end++;
      const selected=[...samples.slice(start,end+1)];if(selected.length<2)continue;
      // Trim long segment endpoints to the local viewing neighborhood.
      const a=selected[0],b=selected.at(-1);if(a.distanceTo(best.p)>range)selected[0]=best.p.clone().add(a.clone().sub(best.p).setLength(range));if(b.distanceTo(best.p)>range)selected[selected.length-1]=best.p.clone().add(b.clone().sub(best.p).setLength(range));
      const origin=best.p.clone(),local=selected.map(p=>p.clone().sub(origin)),curve=new T.CatmullRomCurve3(local),length=curve.getLength(),radius=Math.max(.00025,cell.axonRadiusMm||.002);
      const group=new T.Group();group.position.copy(origin);group.userData.cellId=cell.id;
      if(state.myelin&&cell.myelinated!==false&&branch.role!=='stem'&&cell.type!=='free'&&radius>.0006){
        const internode=Math.min(.35,Math.max(.045,radius*90)),count=Math.min(32,Math.ceil(length/internode)),mat=new T.MeshStandardMaterial({color:0xb8b6a1,transparent:true,opacity:.45,roughness:.7,depthWrite:false});
        const sheaths=[];for(let j=0;j<count;j++){const t0=j/count+.003,t1=(j+1)/count-.003;if(t1<=t0)continue;const pts=Array.from({length:7},(_,k)=>curve.getPoint(t0+(t1-t0)*k/6));sheaths.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),8,radius/0.66,8,false));}
        if(sheaths.length){const merged=mergeGeometries(sheaths);sheaths.forEach(g=>g.dispose());group.add(new T.Mesh(merged,mat));}else mat.dispose();
      }
      fiberGroup.add(group);
    }
  }
  function resize(){const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.setViewOffset(w,h,0,h*.09,w,h);camera.updateProjectionMatrix();requestDraw();}
  new ResizeObserver(resize).observe(stage);
  function frame(point,distance,animate=true){
    const target=v(point),d=distance*(camera.aspect<1?1/Math.max(.48,camera.aspect):1),position=target.clone().add(new T.Vector3(.18,.10,1).normalize().multiplyScalar(d));
    if(animate&&!reducedMotion)tween={start:performance.now(),from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target};else{camera.position.copy(position);controls.target.copy(target);controls.update();}
    lastDetailKey='';lastFiberKey='';requestDraw();
  }
  function goRegion(id,{point,distance,animate=true}={}){
    focusRequest++;
    const paired=id==='cortex'&&!distance;
    corticalSections.setActive(paired);controls.enabled=!paired;
    if(paired&&state.cell?.region!=='cortex'){const cell=state.route?.cellIds.map(id=>byId.get(id)).find(c=>c.region==='cortex');if(cell)setCell(cell.id);}
    const region=regions.find(r=>r.id===id)||regions[0];state.region=region.id;
    updateInspectLabel(region.id);
    $('view-title').textContent=region.name;$('view-description').textContent=region.description;
    $('view-eyebrow').textContent='ONE SPATIAL MODEL / '+(distance&&distance<5?'CELLULAR DETAIL':'ANATOMICAL CONTEXT');
    document.querySelectorAll('.region-button').forEach(b=>b.classList.toggle('active',b.dataset.region===region.id));
    if(paired){tween=null;collapseInspector(true);$('view-title').textContent='M1 & S1 · paired coronal sections';$('view-description').textContent='Six layers in each gyrus. Zoom and pan together from cortical ribbon to connected axons.';}else frame(point||region.center,distance||region.distance,animate);try{history.replaceState(null,'',`#view=${region.id}&route=${state.route?.id||''}`);}catch{}
  }
  async function inspectCell(ending=false,preserved=false){
    if(!state.cell)return;
    if(state.cell.region==='cortex'&&!ending&&!preserved){goRegion('cortex');corticalSections.preset('deep');return;}
    const cell=state.cell,anchor=ending&&cell.terminal?'terminal':'soma',token=++focusRequest;
    const key=anchorKey(cell,anchor);detailFailures.delete(key);
    const button=$(ending?'focus-ending':'focus-cell'),label=ending?'Inspect ending':'Inspect cell';button.textContent='Opening detail…';
    try{
      const entry=await ensureDetail(cell,anchor);
      if(token!==focusRequest||state.cell!==cell)return;
      const focus=computeDetailFocus(cell,entry.group,{ending,organ:true,fov:camera.fov});
      goRegion(focus.region,{point:focus.center,distance:focus.distance});collapseInspector(true);
    }catch(error){console.error(error);message('The original detail could not load. Select Inspect again to retry.');}
    finally{button.textContent=label;lastDetailKey='';requestDraw();}
  }
  function updateInspectLabel(region){
    if(region==='cortex'){$('inspect-region').textContent='Open both cortical sections ↗';return;}
    const ending=['tip','nmj','proprio'].includes(region)&&state.cell?.terminal,anchor=ending?'terminal':'soma';
    const preserved=state.cell&&preservedAnchorInfo(state.cell,anchor);
    $('inspect-region').textContent=`Open ${preserved?'V3':'modeled'} ${ending?'ending':'cell'} detail ↗`;
  }
  function cellInfo(){
    const cell=state.cell;if(!cell)return;$('cell-select').value=cell.id;
    $('cell-description').textContent=`${cell.id} · ${cell.name} · soma prior ${(cell.somaRadiusMm*2000).toFixed(0)} µm · axon prior ${((cell.axonRadiusMm||0)*2000).toFixed(1)} µm. ${cell.sourceNote||'Reference-informed, constructed cell.'}`;
    $('focus-ending').disabled=!cell.terminal;
    const source=preservedAnchorInfo(cell,'soma');if(source)$('cell-description').textContent+=` Original V3 detail: ${source.sourceRegion||cell.region} · ${source.sourceCellId||source.key}.`;
    updateInspectLabel(state.region);
  }
  function setCell(id){focusRequest++;state.cell=byId.get(id)||byId.get(state.route.cellIds[0]);cellInfo();lastDetailKey='';requestDraw();}
  function showStop(index,animate=true){
    if(!state.route)return;state.stop=T.MathUtils.clamp(index,0,state.route.landmarks.length-1);const stop=state.route.landmarks[state.stop];
    setCell(stop.cellId);document.querySelectorAll('#route-stops button').forEach((b,i)=>{b.classList.toggle('active',i===state.stop);b.setAttribute('aria-current',i===state.stop?'step':'false');});
    $('previous').disabled=state.stop===0;$('next').disabled=state.stop===state.route.landmarks.length-1;
    // Region stops keep context; Inspect cell/ending moves down to micrometers.
    goRegion(stop.region,{point:stop.point,animate});
  }
  function setRoute(id,move=false){
    state.route=model.routes.find(r=>r.id===id)||model.routes[0];state.stop=0;state.highlight=true;
    $('route-kind').value=state.route.kind;$('route-select').value=state.route.id;$('route-title').textContent=state.route.name;$('route-tag').textContent=`MODELED ${state.route.kind.toUpperCase()} ROUTE · ${state.route.cellIds.length} DISTINCT CELLS`;
    $('connection-note').textContent=state.route.kind==='motor'?'M1 → spinal interneuron → lower motor neuron → muscle. Motor fibers bypass the DRG.':'The route continues across modeled synapses; each relay has a separate cell identity. The DRG is not a synaptic relay.';
    $('route-stops').replaceChildren();state.route.landmarks.forEach((stop,i)=>{const b=document.createElement('button');b.textContent=stop.label;b.onclick=()=>showStop(i);$('route-stops').appendChild(b);});
    $('cell-select').replaceChildren();for(const id of state.route.cellIds){const c=byId.get(id),option=document.createElement('option');option.value=id;option.textContent=`${id} · ${c.name}`;$('cell-select').appendChild(option);}
    setCell(state.route.cellIds[0]);refreshHighlight();if(move)showStop(0);else{$('previous').disabled=true;$('next').disabled=state.route.landmarks.length<2;}
  }
  function populateRoutes(kind){$('route-select').replaceChildren();for(const route of model.routes.filter(r=>r.kind===kind)){const o=document.createElement('option');o.value=route.id;o.textContent=route.name;$('route-select').appendChild(o);}}
  function exploreRegion(id){
    if(id==='nmj'&&state.route.kind!=='motor'){populateRoutes('motor');setRoute($('route-select').value);}
    if(id==='proprio'&&state.route.kind!=='proprioception'){populateRoutes('proprioception');setRoute($('route-select').value);}
    const stopIndex=state.route.landmarks.findIndex(s=>s.region===id);
    if(stopIndex>=0){state.stop=stopIndex;setCell(state.route.landmarks[stopIndex].cellId);$('previous').disabled=state.stop===0;$('next').disabled=state.stop===state.route.landmarks.length-1;}
    document.querySelectorAll('#route-stops button').forEach((b,i)=>b.classList.toggle('active',i===stopIndex));goRegion(id);
  }
  for(const [i,region] of regions.filter(r=>r.id!=='overview'&&!['hand','arm'].includes(r.id)).entries()){const b=document.createElement('button');b.className='region-button';b.dataset.region=region.id;const text=document.createTextNode(region.name),number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');b.append(text,number);b.onclick=()=>exploreRegion(region.id);$('region-list').appendChild(b);}
  const labels=[];for(const region of regions.filter(r=>['tip','nerve','drg','spinal','medulla','thalamus','cortex','nmj'].includes(r.id))){const b=document.createElement('button');b.className='region-label';b.textContent=region.name;b.onclick=()=>exploreRegion(region.id);$('region-labels').appendChild(b);labels.push({region,element:b});}
  function updateLabels(){
    const w=stage.clientWidth,h=stage.clientHeight,d=camera.position.distanceTo(controls.target),occupied=[];
    for(const {region,element} of labels){const p=v(region.center).project(camera),x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;let show=state.labels&&d>12&&p.z<1&&p.z>-1&&x>55&&x<w-65&&y>140&&y<h-235;
      if(show&&occupied.some(q=>Math.abs(q[0]-x)<140&&Math.abs(q[1]-y)<27))show=false;
      element.hidden=!show;if(show){element.style.left=x+'px';element.style.top=y+'px';occupied.push([x,y]);}
    }
  }
  function updateStats(){
    const d=camera.position.distanceTo(controls.target),mmPerPixel=2*d*Math.tan(T.MathUtils.degToRad(camera.fov/2))/stage.clientHeight,ideal=mmPerPixel*75,power=10**Math.floor(Math.log10(ideal)),fraction=ideal/power,scale=(fraction>=5?5:fraction>=2?2:1)*power;
    $('scale-bar').querySelector('i').style.width=(scale/mmPerPixel)+'px';$('scale-bar').querySelector('span').textContent=scale>=1?`${Number(scale.toPrecision(2))} mm`:`${Number((scale*1000).toPrecision(2))} µm`;
    $('scene-stats').textContent=`${model.cells.length} cells · ${model.routes.length} complete modeled routes · ${currentDetails.length} detailed · ${Math.round(renderer.info.render.triangles/1000)}k triangles`;
  }
  function draw(now){
    raf=0;if(hidden||contextLost)return;const start=performance.now();
    if(tween){const t=Math.min(1,(now-tween.start)/650),e=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,e);if(t>=1)tween=null;else requestDraw();}
    if(corticalSections.state.active){if(dirty){renderer.clear();corticalSections.render();dirty=false;frameMs=performance.now()-start;}return;}
    controls.update();camera.updateMatrixWorld();
    if(!tween&&performance.now()-lastMove>125){refreshDetails();refreshFibers();anatomyLOD.update();}
    if(dirty){const floor=camera.position.distanceTo(controls.target)*2*Math.tan(T.MathUtils.degToRad(camera.fov/2))/stage.clientHeight*.65;for(const g of [globalGroup,highlightGroup,sourceLineGroup])g.traverse(o=>o.userData.setMinimumRadius?.(floor));renderer.render(scene,camera);updateLabels();updateStats();dirty=false;frameMs=performance.now()-start;}
  }
  async function loadScaffold(){
    $('load-text').textContent='Opening intact anatomy…';
    try{
      const data=await fetchAtlasJSON('/assets/finger-pathway-atlas/v4/scaffold.json');
      for(const record of data.meshes)if(record.category!=='cortex'||['FMA72662','FMA72666'].includes(record.id))anatomyLOD.add(record);
      scaffoldLoaded=true;$('load-state').hidden=true;requestDraw();
    }catch(error){console.error(error);$('load-state').hidden=true;message('Anatomical surfaces could not load. Individual cell pathways are still available. Reload to retry.');}
  }
  $('inspect-region').onclick=()=>state.region==='cortex'?goRegion('cortex'):inspectCell(['tip','nmj','proprio'].includes(state.region)&&!!state.cell?.terminal);
  $('overview').onclick=()=>goRegion('overview');$('route-kind').onchange=e=>{populateRoutes(e.target.value);setRoute($('route-select').value,true);};$('route-select').onchange=e=>setRoute(e.target.value,true);$('cell-select').onchange=e=>setCell(e.target.value);$('previous').onclick=()=>showStop(state.stop-1);$('next').onclick=()=>showStop(state.stop+1);$('focus-cell').onclick=()=>inspectCell(false);$('focus-ending').onclick=()=>inspectCell(true);
  $('isolate').onchange=e=>{state.isolate=e.target.checked;state.highlight=true;refreshHighlight();};$('clear-selection').onclick=()=>{state.highlight=false;state.isolate=false;$('isolate').checked=false;globalGroup.visible=true;[...highlightGroup.children].forEach(dispose);for(const lines of globalGroup.children)lines.material.opacity=.55;lastDetailKey='';requestDraw();};
  for(const name of ['skin','envelopes','labels','myelin','supports'])$(name).onchange=e=>{state[name]=e.target.checked;detailGroup.traverse(o=>{if(o.isMesh&&['support','skin'].includes(o.userData.layer))o.visible=state.supports;});for(const mesh of scaffoldGroup.children)mesh.visible=mesh.userData.category==='skin'?state.skin:state.envelopes;envelopeGroup.visible=state.envelopes;lastFiberKey='';requestDraw();};
  $('quality').onchange=e=>{state.quality=e.target.value;renderer.setPixelRatio(Math.min(devicePixelRatio,budgets[state.quality].pixelRatio));for(const {group}of detailCache.values())dispose(group);detailCache.clear();lastDetailKey='';lastFiberKey='';resize();};
  $('export-map').onclick=()=>{const exported={...model,corticalSections:corticalSections.export(),cells:model.cells.map(cell=>({...cell,branches:registeredCellBranches(cell,getPreservedCellRegistration(cell,PRESERVED_CELL_MANIFEST)),loadedLocalArbors:(pathMap.get(cell.id)||[]).filter(path=>path.anchor),preservedSources:Object.fromEntries((cell.terminal?['soma','terminal']:['soma']).map(anchor=>[anchor,preservedAnchorInfo(cell,anchor)]))})),sourceTemplates:PRESERVED_CELL_MANIFEST,localGeometryNote:'Complete source manifest and registrations included; loadedLocalArbors contains only already-visited centerlines. Download the referenced source templates for complete local mesh geometry.',displayNote:'Millimeter coordinates; preserved V3 source geometry and constructed pathways/placements, not a measured connectome. Display radius padding is not physical diameter; all neurites render as lit cylinder meshes.'};const url=URL.createObjectURL(new Blob([JSON.stringify(exported)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Finger_Pathway_Atlas_v4_cell_map.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
  function help(open){$('help-panel').hidden=!open;$('help-toggle').setAttribute('aria-expanded',String(open));if(open)$('help-close').focus();else $('help-toggle').focus();}
  function collapseInspector(collapsed){$('inspector').classList.toggle('collapsed',collapsed);$('inspector-toggle').textContent=collapsed?'Show details':'Collapse';$('inspector-toggle').setAttribute('aria-expanded',String(!collapsed));requestDraw();}
  $('inspector-toggle').onclick=()=>collapseInspector(!$('inspector').classList.contains('collapsed'));
  $('help-toggle').onclick=()=>help($('help-panel').hidden);$('help-close').onclick=()=>help(false);$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('Use the Open viewer link for a full-window view.');}};
  window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='Escape'){help(false);return;}if(e.key==='Home'){e.preventDefault();goRegion('overview');}if(e.key==='ArrowRight'){e.preventDefault();showStop(state.stop+1);}if(e.key==='ArrowLeft'){e.preventDefault();showStop(state.stop-1);}});
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();canvas.addEventListener('pointerdown',e=>{lastPointer=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{
    if(corticalSections.state.active)return;
    if(!lastPointer||Math.hypot(e.clientX-lastPointer[0],e.clientY-lastPointer[1])>4||e.button!==0)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,camera);raycaster.params.Line.threshold=Math.max(.002,camera.position.distanceTo(controls.target)*.0015);
    const surfaces=[...detailGroup.children.filter(g=>g.visible),...fiberGroup.children.filter(g=>g.visible),...sourceLineGroup.children.filter(g=>g.visible)];
    const detailHit=raycaster.intersectObjects(surfaces,true)[0],lineHit=!detailHit&&raycaster.intersectObjects(globalGroup.visible?globalGroup.children:highlightGroup.children,false)[0],hit=detailHit||lineHit;if(!hit)return;
    let owner=hit.object;while(owner&&!owner.userData.cellId&&!owner.userData.owners)owner=owner.parent;
    const id=owner?.userData.cellId||owner?.userData.owners?.[hit.instanceId??Math.floor(hit.index/2)],route=model.routes.find(r=>r.cellIds.includes(id));if(route){populateRoutes(route.kind);setRoute(route.id);setCell(id);}
  });
  populateRoutes('touch');const requested=new URLSearchParams(location.hash.slice(1));setRoute(requested.get('route')||model.routes[0].id);populateRoutes(state.route.kind);$('route-select').value=state.route.id;resize();goRegion(requested.get('view')||'overview',{animate:false});loadScaffold();
  window.fingerAtlasV4={corticalSections,model,state,scene,camera,renderer,controls,goRegion,setRoute,showStop,inspectCell,byId,pathMap,get diagnostics(){return{version:4,registeredCells:model.cells.length,routes:model.routes.length,buildMs:buildTime,lastFrameMs:frameMs,detailCache:detailCache.size,visibleDetails:currentDetails.length,scaffoldLoaded,anatomy:anatomyLOD.diagnostics,restoredAnchors:detailCache.size,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,units:'mm',clippingPlanes:renderer.clippingPlanes.length};}};
}
