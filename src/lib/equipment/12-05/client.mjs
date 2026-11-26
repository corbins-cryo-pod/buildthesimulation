import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,reconstruct,report,picks,size,pixelPitchUm} from '../../../../public/equipment/12-05/fixed-grid.mjs';
const $=k=>document.getElementById('w1-'+k);
let state=initial(),renderer,camera,controls,scene,model;
const views={front:[[.66,.74,1.52],[-.09,.17,.05]],module:[[-1.00,.54,.71],[-.28,.115,0]],cards:[[.32,.38,.84],[.173,.050,.446]]};
const tone=[[80,224,193],[91,178,252],[207,132,242]];
function render(){if(renderer) renderer.render(scene,camera)}
function view(k){camera.position.set(...views[k][0]);controls.target.set(...views[k][1]);controls.update();render()}
function refresh(){
  $('plane').value=state.plane;$('expression').value=state.expression;
  const r=reconstruct(state),c=$('grid').getContext('2d'),im=c.createImageData(size,size),hue=tone[['lower','middle','upper'].indexOf(state.plane)];
  r.image.forEach((v,i)=>{const t=v/255;im.data.set([12+hue[0]*t,17+hue[1]*t,25+hue[2]*t,255],4*i)});
  c.putImageData(im,0,0);
  $('readout').textContent='z '+r.zUm+' µm · centroid ('+r.centroidPx.map(v=>v*pixelPitchUm).join(', ')+') µm · raw shift ('+r.rawOffsetPx.join(', ')+') px';
  $('readout').dataset.z=r.zUm;$('readout').dataset.mode=state.expression;
  if(model)for(const [name,p] of Object.entries(picks)){
    const o=model.getObjectByName(name);o.material.emissiveIntensity=p.id===state.plane?.55:0;
  }
  render();
}
function dispatch(a,id){state=reduce(state,a,id);refresh()}
for(const k of ['plane','expression'])$(k).onchange=()=>dispatch(k,$(k).value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(state))],{type:'application/json'}));a.href=u;a.download='12-05-fixed-grid-'+state.plane+'-r'+state.revision+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){
  const cv=$('model');
  try{
    renderer=new T.WebGLRenderer({canvas:cv,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    scene=new T.Scene();scene.background=new T.Color(0xcbd4d1);
    camera=new T.PerspectiveCamera(36,1,.01,8);controls=new OrbitControls(camera,cv);controls.minDistance=.11;controls.maxDistance=3;controls.addEventListener('change',render);
    scene.add(new T.HemisphereLight(0xffffff,0x55706a,2.8));const sun=new T.DirectionalLight(0xffffff,3);sun.position.set(.5,1,1);scene.add(sun);
    const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render()};new ResizeObserver(size).observe(cv);size();view('front');
    model=(await new GLTFLoader().loadAsync('/equipment/12-05/csu-w1-tie.glb')).scene;scene.add(model);
    for(const name of Object.keys(picks)){const o=model.getObjectByName(name);o.material=o.material.clone();o.material.emissive.setHex(0x555555)}
    refresh();$('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or pick a card on the separate stand.';
    let d;cv.addEventListener('pointerdown',e=>{d=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
      if(!d||Math.hypot(e.clientX-d[0],e.clientY-d[1])>5)return;
      const b=cv.getBoundingClientRect(),r=new T.Raycaster();r.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),camera);
      const hit=r.intersectObject(model,true).find(q=>picks[q.object.name]);if(hit){const q=picks[hit.object.name];dispatch(q.action,q.id)}
    });
    for(const k of Object.keys(views))$(k).onclick=()=>view(k)
  }catch(e){$('viewstatus').textContent='WebGL unavailable; the offline grid viewer still works.'}
}
refresh();init();
