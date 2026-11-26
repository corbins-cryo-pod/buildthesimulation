import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStation,dimensionRows,file,pose,svgSheet,targets} from '../../../../public/equipment/01-07/draft.mjs';
const S=createStation(),$=id=>document.getElementById(id),root='/equipment/01-07/',ns='http://www.w3.org/2000/svg';
let draw3=()=>{},activeImport=0;
function e(tag,attr={},parent=null,txt=null){
 const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attr))n.setAttribute(k,v);if(txt!==null)n.textContent=txt;if(parent)parent.append(n);return n;
}
function svg(s){
 const out=$('drawing'),d=s.drawing,pts=d.vertices.map(v=>[v.xMm+d.datum.xMm,v.yMm+d.datum.yMm]),dx=pts.map(p=>p[0]),dy=pts.map(p=>p[1]);
 const minX=Math.min(...dx),maxX=Math.max(...dx),minY=Math.min(...dy),maxY=Math.max(...dy);
 const w=Math.max(12,Math.max(maxX-minX,(maxY-minY)*1.7)*6.7/s.view.zoom),h=w/1.7,x0=(minX+maxX)/2,y0=(minY+maxY)/2;
 out.setAttribute('viewBox',`${x0-w/2} ${y0-h/2} ${w} ${h}`);out.replaceChildren();
 e('rect',{x:x0-w/2,y:y0-h/2,width:w,height:h,fill:'#f3efe2'},out);
 const g=e('g',{transform:`rotate(${s.view.rotationDeg} ${x0} ${y0})`},out);
 const f=e('polygon',{points:pts.map(x=>x.join(',')).join(' '),fill:s.overlay?'#c2d9c7':'none',stroke:'#2b5149','stroke-width':w*.006},g);
 f.dataset.overlay=s.overlay?'on':'off';
 for(const [i,p] of pts.entries()){
  e('circle',{cx:p[0],cy:p[1],r:w*.012,fill:'#27443b'},g);
  e('text',{x:p[0]+w*.018,y:p[1]-w*.017,'font-size':w*.035,fill:'#284039','font-family':'system-ui'},g,d.vertices[i].id);
 }
 for(const a of dimensionRows(d)){
  const [[x1,y1],[x2,y2]]=a.sheetEndpointsMm;const q=e('g',{'data-from':a.anchorVertexIds[0],'data-to':a.anchorVertexIds[1]},g);
  e('line',{x1,y1,x2,y2,stroke:'#926334','stroke-width':w*.006,'stroke-dasharray':w*.015+' '+w*.018},q);
  e('text',{x:(x1+x2)/2,y:(y1+y2)/2-w*.05,'font-size':w*.046,'text-anchor':'middle','font-family':'system-ui','font-weight':600,fill:'#8b561e'},q,Number(a.lengthMm.toFixed(5))+' mm');
 }
}
function refresh(s){
 $('view').textContent=`View ×${s.view.zoom} · ${s.view.rotationDeg}° · physical scale 1:1.`;
 $('overlay').textContent=s.overlay?'Hide specimen overlay':'Show specimen overlay';$('tilt').textContent='Tilt worktop · '+s.tiltDeg+'°';$('drawer').textContent=s.drawer?'Close top drawer':'Open top drawer';$('lamp').textContent=s.lamp?'Switch task lamp off':'Switch task lamp on';
 const box=$('dims');box.replaceChildren();for(const t of dimensionRows(s.drawing)){const tr=document.createElement('tr');for(const x of [t.id,t.anchorVertexIds.join(' → '),Number(t.lengthMm.toFixed(5))+' mm']){const td=document.createElement('td');td.textContent=x;tr.append(td);}box.append(tr);}
 svg(s);draw3();
}
function act(k,p){
 const s=S.dispatch(k,p);refresh(s);$('status').classList.toggle('err',!!s.error);
 $('status').textContent=s.error?.message??'Drawing-space dimensions and anchors stay fixed as you inspect.';
 return s;
}
for(const k of ['zoomIn','zoomOut','rotateView','resetView','overlay','tilt','drawer','lamp','reset'])$(k).onclick=()=>{if(k==='reset')activeImport++;act(k);};
$('example').onclick=()=>{activeImport++;for(const k of ['reset','zoomIn','zoomIn'])S.dispatch(k);const s=act('rotateView');const d=dimensionRows(s.drawing)[0];$('status').textContent='Two zoom steps and 30° rotation: '+d.anchorVertexIds.join(' → ')+' remains '+d.lengthMm+' mm.';};
$('import').onchange=async()=>{
 const v=$('import').files?.[0];if(!v)return;const i=++activeImport;
 try{if(v.size>15000)throw Error('Outline exceeds 15 kB.');const data=JSON.parse(await v.text());if(i===activeImport)act('load',data);}
 catch(e){if(i===activeImport){$('status').textContent='Import rejected: '+e.message;$('status').classList.add('err');}}
 finally{$('import').value='';}
};
function save(n,b,ty){const u=URL.createObjectURL(new Blob([b],{type:ty})),a=document.createElement('a');a.download=n;a.href=u;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('export-json').onclick=()=>save('dimensioned-sheet.json',JSON.stringify(file(S.read()),null,2)+'\n','application/json');
$('export-svg').onclick=()=>save('dimensioned-A3-sheet.svg',svgSheet(S.read()),'image/svg+xml');
async function model(){
 const c=$('bench'),r=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});r.setClearColor('#28383e');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.002,15),o=new OrbitControls(cam,c);o.minDistance=.055;o.maxDistance=6;
 scene.add(new T.HemisphereLight('#eff9ff','#d3c2a8',2.1));
 for(const [p,col,k] of [[[1.0,2,1],'#fff0db',3.1],[[-1,.8,-1],'#c4e5fc',1.8]]){const l=new T.DirectionalLight(col,k);l.position.set(...p);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync(root+'drafting-table.glb')).scene;scene.add(m);const n=x=>m.getObjectByName(x);
 const top=n('Tilt_worktop'),drawer=n('Drawer_slide'),lamp=n('Task_lamp_diffuser'),datum=n('Sheet_datum');
 const off=new T.MeshStandardMaterial({color:'#554a34'}),lit=new T.MeshBasicMaterial({color:'#fff1ba'});
 const geo=new T.BufferGeometry(),stroke=new T.LineLoop(geo,new T.LineBasicMaterial({color:'#234d42'}));stroke.frustumCulled=false;datum.add(stroke);
 const views={bench:[[1.64,1.67,2.15],[.035,.78,-.036]],paper:[[.17,1.34,.17],[-.043,.95,-.073]],rear:[[-1.53,1.47,-2.06],[.05,.74,-.065]]},render=()=>r.render(scene,cam);
 draw3=()=>{
  const s=S.read(),p=pose(s),d=s.drawing;top.rotation.x=p.hingeRotationRad;drawer.position.z=p.drawerOffsetM;lamp.material=p.light?lit:off;stroke.visible=p.specimenVisible;
  const a=d.vertices.flatMap(v=>[(d.datum.xMm+v.xMm)/1000,.001,(d.datum.yMm+v.yMm)/1000]);geo.setAttribute('position',new T.Float32BufferAttribute(a,3));render();
 };
 function view(k){const [a,b]=views[k]??views.bench;cam.position.set(...a);o.target.set(...b);o.update();draw3();}
 document.querySelectorAll('[data-view]').forEach(e=>e.onclick=()=>view(e.dataset.view));$('camera-reset').onclick=()=>view('bench');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let d;c.onpointerdown=e=>d=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!d||Math.hypot(e.clientX-d[0],e.clientY-d[1])>4)return;const b=c.getBoundingClientRect(),q=new T.Raycaster();
  q.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of q.intersectObject(m,true)){let n=h.object;while(n){if(Object.hasOwn(targets,n.name)){act(targets[n.name]);return;}n=n.parent;}}
 };
 view('bench');c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · original 1100 × 650 mm worktop.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The drawing preview and exports still work.';});
