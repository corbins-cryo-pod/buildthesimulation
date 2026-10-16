import * as T from 'three';
import { CORTEX_PROFILES, LAYER_NAMES, createCorticalSample, sectionPoint, projectionPoint } from './cortical-model.mjs';
import { createTubeBatch, segmentsFromPaths } from './tubes.mjs';
import { fetchAtlasJSON } from './anatomy-lod.mjs';

const vec=p=>new T.Vector3(...p);
const gray=[0x626971,0x797e85,0x6c747b,0x91989d,0x727e89,0x596c79];
export function createCorticalScene(id) {
  const sample=createCorticalSample(id),p=sample.profile,scene=new T.Scene();scene.background=new T.Color(0x080f16);
  scene.add(new T.HemisphereLight(0xe0edf5,0x26363a,2));
  const light=new T.DirectionalLight(0xffedd5,2.6);light.position.set(-4,9,15);scene.add(light);
  const layers=new T.Group();layers.name='six-layer-coronal-section';scene.add(layers);
  function ribbon(start,end,color,name){
    const points=[];
    for(let i=0;i<=150;i++)points.push(sectionPoint(p,-1.48+i/150*2.96,start).slice(0,2));
    for(let i=150;i>=0;i--)points.push(sectionPoint(p,-1.48+i/150*2.96,end).slice(0,2));
    const shape=new T.Shape(points.map(q=>new T.Vector2(...q))),g=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false,steps:1});g.translate(0,0,-.43);
    const mesh=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.95,side:T.DoubleSide}));mesh.name=name;layers.add(mesh);return mesh;
  }
  for(let i=0;i<6;i++)ribbon(p.boundaries[i]*p.thickness,p.boundaries[i+1]*p.thickness,gray[i],`Layer ${LAYER_NAMES[i]}`);
  const inner=Array.from({length:151},(_,i)=>sectionPoint(p,-1.48+i/150*2.96,p.thickness).slice(0,2));
  const whiteShape=new T.Shape(inner.map(q=>new T.Vector2(...q)));whiteShape.lineTo(inner.at(-1)[0],-2.4);whiteShape.lineTo(inner[0][0],-2.4);whiteShape.closePath();
  const wm=new T.Mesh(new T.ExtrudeGeometry(whiteShape,{depth:.3,bevelEnabled:false}),new T.MeshStandardMaterial({color:0xa3a6a4,roughness:1,side:T.DoubleSide}));wm.position.z=-.43;wm.name='White matter';layers.add(wm);
  const borders=[];
  for(const d of [0,p.thickness])for(let i=0;i<150;i++)borders.push({a:sectionPoint(p,-1.48+i/150*2.96,d,-.12),b:sectionPoint(p,-1.48+(i+1)/150*2.96,d,-.12),radius:.009,color:d?0xc6d0d1:0xabb8bd});
  layers.add(createTubeBatch(borders,{readable:false,sides:5,color:0xffffff}));
  const somata=new T.InstancedMesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color:0xffffff,roughness:.67}),sample.cells.length),o=new T.Object3D();
  sample.cells.forEach((c,i)=>{o.position.fromArray(c.soma);o.scale.set(c.radius,c.radius*(c.type==='pyramidal'?1.3:1),c.radius);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vec(c.normal));o.updateMatrix();somata.setMatrixAt(i,o.matrix);somata.setColorAt(i,new T.Color(c.type==='interneuron'?0xb8a4d5:c.layer===6?0x8fb7a1:p.color));});
  somata.name='Individually packed cortical somata';somata.userData.cells=sample.cells;scene.add(somata);
  const segments=sample.cells.flatMap(c=>segmentsFromPaths(c.paths,c,c.type==='interneuron'?0xb8a4d5:c.layer===6?0x8fb7a1:p.color));
  const dendrites=createTubeBatch(segments.filter(s=>s.role==='dendrite'),{color:0xffffff,sides:7});dendrites.name='Branched dendritic cylinders';
  const axons=createTubeBatch(segments.filter(s=>s.role!=='dendrite'),{color:0xffffff,sides:8});axons.name='Soma-connected axonal cylinders';scene.add(dendrites,axons);
  // H01's glia-rich neuropil informs a context sample, not a measured M1/S1 census.
  const glia=new T.InstancedMesh(new T.SphereGeometry(1,7,5),new T.MeshStandardMaterial({color:0xa3adab,roughness:.9}),sample.cells.length*2);
  let k=0;for(const c of sample.cells)for(const sign of [-1,1]){o.position.fromArray(c.soma);o.position.x+=sign*.024;o.position.y+=.017;o.position.z=-.09;o.scale.set(.0025,.0034,.0025);o.quaternion.identity();o.updateMatrix();glia.setMatrixAt(k++,o.matrix);}glia.name='Representative glial context';scene.add(glia);
  const h01Group=new T.Group();h01Group.name='H01 measured morphology references';scene.add(h01Group);
  return {scene,sample,layers,wm,somata,glia,dendrites,axons,h01Group,segments};
}

export function attachH01References(view,data) {

        const p=view.sample.profile;const segments=[];const used=new Set();
        for(const template of data.templates){
          // Source lamina is preserved. Every transplant is separately labeled.
          const candidates=view.sample.cells.filter(c=>c.layer===template.layer&&!used.has(c.id)&&(template.layer!==6||c.projection==='corticothalamic'));
          const cell=candidates[Math.floor(candidates.length/2)];if(!cell)continue;used.add(cell.id);
          const axis=new T.Quaternion().setFromUnitVectors(vec(data.outwardNormal),vec(cell.normal));
          const transform=q=>vec(q).applyQuaternion(axis).add(vec(cell.soma)).toArray();
          for(const path of template.paths){const transformed=path.points.map(transform);for(let i=1;i<transformed.length;i++)segments.push({a:transformed[i-1],b:transformed[i],radius:(path.radii[i-1]+path.radii[i])/2,color:0xd9cbbb,cellId:cell.id});}
          // Join the new white-matter continuation to an actual source axon
          // node. Never invent an unconnected line leaving a layer label.
          if(cell.continuation&&template.axonPort){
            const port=transform(template.axonPort),white=projectionPoint(p,cell.theta,.35,cell.soma[2]);
            segments.push({a:port,b:white,radius:cell.axonRadiusMm,color:0x99c4ac,cellId:cell.id},{a:white,b:cell.continuation.point,radius:cell.axonRadiusMm,color:0x99c4ac,cellId:cell.id});
            cell.continuation.sourcePort=port;
          }
          const oi=view.sample.cells.indexOf(cell),object=new T.Object3D();object.position.fromArray(cell.soma);object.scale.fromArray(template.somaAxesMm);object.quaternion.copy(axis);object.updateMatrix();view.somata.setMatrixAt(oi,object.matrix);view.somata.instanceMatrix.needsUpdate=true;
          cell.h01Reference={sourceId:template.sourceId,sourceLayer:template.layer,sourceRegion:'temporal cortex',registration:'rigid morphology transplant; no M1/S1 identity inferred'};
        }
        // Replace only the procedural arbors belonging to these reference
        // cells; no duplicate tree is rendered under the H01 reconstruction.
        for(const kind of ['axons','dendrites']){
          const old=view[kind];old.removeFromParent();old.geometry.dispose();old.material.dispose();
          const subset=view.segments.filter(segment=>!used.has(segment.cellId)&&(kind==='dendrites'?segment.role==='dendrite':segment.role!=='dendrite'));
          view[kind]=createTubeBatch(subset,{color:0xffffff,sides:7});view.scene.add(view[kind]);
        }
        const mesh=createTubeBatch(segments,{color:0xffffff,sides:6});mesh.name='H01 measured neurite cylinders';view.h01Group.add(mesh);
        // The full source list is retained for export and inspection.
        view.h01Metadata=data.templates.map(t=>({id:t.sourceId,layer:t.layer,nodes:t.originalNodes,paths:t.paths.length}));

}

export function createCorticalSections({renderer,canvas,stage,requestDraw,onExit,onOriginal}) {
  const root=document.getElementById('cortical-sections'),panes=[...root.querySelectorAll('.cortical-pane')];
  const views=['m1','s1'].map(id=>({...createCorticalScene(id),camera:new T.OrthographicCamera(),id}));
  const state={active:false,preset:'layers',height:5.3,x:0,depth:0,readable:true,oblique:false,h01:true};
  const statuses=root.querySelectorAll('.cortical-source-status');
  let sourceLoading=false,sourceLoaded=false,sourceError=false;
  const points=new Map();let drag=null;
  function sync(){
    root.querySelectorAll('[data-cortex-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cortexPreset===state.preset)));
    root.querySelector('#cortex-zoom').value=String(Math.log10(22/state.height));
    root.querySelector('#cortex-depth').value=String(state.depth);
    root.querySelector('#cortex-width-note').textContent=state.readable?'Fiber radius widened only for visibility; switch off for physical diameter.':'Physical axon diameters · micrometre scale';
    requestDraw();
  }
  function preset(name){state.preset=name;state.x=0;state.depth=0;state.height={gyrus:14.8,layers:5.3,deep:1.25,axon:.20}[name]||5.3;sync();}
  function center(view){const p=view.sample.profile;const depth=state.preset==='axon'?p.thickness+.2:state.preset==='deep'?p.thickness*.94:state.preset==='gyrus'?(p.height+2.4)/2:p.thickness*.5;return new T.Vector3(state.x,p.height-depth+state.depth,0);}
  function resizeCamera(view,width,height){
    const c=view.camera,aspect=width/height,half=(state.preset==='gyrus'?Math.max(state.height,16/aspect):state.height)/2;c.left=-half*aspect;c.right=half*aspect;c.top=half;c.bottom=-half;c.near=.01;c.far=100;
    const target=center(view);c.position.copy(target).add(state.oblique?new T.Vector3(1.5,.6,8):new T.Vector3(0,0,8));c.up.set(0,1,0);c.lookAt(target);c.updateProjectionMatrix();c.updateMatrixWorld();
  }
  async function loadH01(){
    if(sourceLoading||sourceLoaded)return;sourceLoading=true;statuses.forEach(el=>el.textContent='Loading H01 reconstructions…');
    try{
      const data=await fetchAtlasJSON('/assets/finger-pathway-atlas/v4/h01/reference-neurites.json');
      for(const view of views) attachH01References(view,data);
      sourceLoaded=true;sourceError=false;statuses.forEach(el=>el.textContent=`${data.templates.length} H01 source cells · temporal-cortex morphology references`);
    }catch(error){sourceError=true;statuses.forEach(el=>el.textContent='H01 download unavailable · toggle H01 to retry');console.error('H01 reference load failed',error);}
    finally{sourceLoading=false;requestDraw();}
  }
  function render(){
    const rect=canvas.getBoundingClientRect(),size=renderer.getSize(new T.Vector2());renderer.setScissorTest(true);
    views.forEach((view,i)=>{
      const pr=panes[i].getBoundingClientRect(),x=pr.left-rect.left,y=rect.bottom-pr.bottom,w=pr.width,h=pr.height;
      if(w<=0||h<=0)return;resizeCamera(view,w,h);
      const mmPerPixel=(view.camera.top-view.camera.bottom)/h,floor=state.readable?Math.min(.004,mmPerPixel*.6):0;
      view.axons.userData.setMinimumRadius(floor);view.dendrites.userData.setMinimumRadius(Math.min(.0018,floor));
      view.dendrites.visible=state.height<8;view.glia.visible=state.height<8;
      view.h01Group.visible=state.h01&&state.height<8;view.h01Group.traverse(o=>o.userData.setMinimumRadius?.(Math.min(.0013,floor)));
      renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.render(view.scene,view.camera);
      const p=view.sample.profile;
      panes[i].querySelectorAll('[data-layer]').forEach(el=>{
        const li=Number(el.dataset.layer),depth=(p.boundaries[li]+p.boundaries[li+1])/2*p.thickness;
        const q=vec(sectionPoint(p,0,depth,0)).project(view.camera),py=(-q.y*.5+.5)*h;
        el.hidden=py<(h<300?32:50)||py>h-48||(state.preset==='gyrus'&&state.height>9);el.style.top=py+'px';
      });
      const ideal=mmPerPixel*65,power=10**Math.floor(Math.log10(ideal)),scale=(ideal/power>=5?5:ideal/power>=2?2:1)*power;
      panes[i].querySelector('.cortex-scale i').style.width=(scale/mmPerPixel)+'px';panes[i].querySelector('.cortex-scale span').textContent=scale>=1?`${scale} mm`:`${Math.round(scale*1000)} µm`;
      panes[i].querySelector('.cortex-tissue').textContent=state.preset==='deep'||state.preset==='axon'?`VI → ${p.target} · modeled continuation`:'Pia → I–VI → white matter';
    });
    renderer.setScissorTest(false);renderer.setViewport(0,0,size.x,size.y);
  }
  root.querySelectorAll('[data-cortex-preset]').forEach(b=>b.onclick=()=>preset(b.dataset.cortexPreset));
  root.querySelector('#cortex-zoom').oninput=e=>{state.height=22/10**Number(e.target.value);sync();};
  root.querySelector('#cortex-depth').oninput=e=>{state.depth=Number(e.target.value);sync();};
  root.querySelector('#cortex-readable').onchange=e=>{state.readable=e.target.checked;sync();};
  root.querySelector('#cortex-oblique').onchange=e=>{state.oblique=e.target.checked;requestDraw();};
  root.querySelector('#cortex-h01').onchange=e=>{state.h01=e.target.checked;if(state.h01&&(!sourceLoaded||sourceError))loadH01();requestDraw();};
  root.querySelector('#cortex-back').onclick=()=>onExit();
  root.querySelector('#cortex-original').onclick=()=>onOriginal();
  canvas.addEventListener('wheel',e=>{if(!state.active)return;e.preventDefault();state.height=T.MathUtils.clamp(state.height*Math.exp(e.deltaY*.0015),.06,26);sync();},{passive:false});
  canvas.addEventListener('pointerdown',e=>{if(!state.active)return;points.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);drag={x:state.x,depth:state.depth,at:[e.clientX,e.clientY],height:state.height,gap:points.size===2?Math.hypot(...[...points.values()][0].map((n,i)=>n-[...points.values()][1][i])):0};});
  canvas.addEventListener('pointermove',e=>{if(!state.active||!points.has(e.pointerId))return;points.set(e.pointerId,[e.clientX,e.clientY]);if(points.size===2&&drag.gap){const [a,b]=[...points.values()];state.height=T.MathUtils.clamp(drag.height*drag.gap/Math.hypot(a[0]-b[0],a[1]-b[1]),.06,26);}else if(points.size===1){const h=panes[0].clientHeight;state.x=T.MathUtils.clamp(drag.x-(e.clientX-drag.at[0])*state.height/h,-6,6);state.depth=T.MathUtils.clamp(drag.depth+(e.clientY-drag.at[1])*state.height/h,-8,8);}sync();});
  const release=e=>{points.delete(e.pointerId);if(!points.size)drag=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  return {state,views,render,preset,setActive(active){state.active=active;root.hidden=!active;stage.classList.toggle('paired-cortex',active);if(active){loadH01();sync();}else{points.clear();drag=null;}},export(){return {evidence:views[0].sample.evidence,profiles:CORTEX_PROFILES,samples:views.map(v=>({...v.sample,h01References:v.h01Metadata||[]}))};}};
}
