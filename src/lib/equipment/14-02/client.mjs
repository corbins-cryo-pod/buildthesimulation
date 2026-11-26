import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv} from './solver.mjs';
const $=s=>document.getElementById(s),form=$('flex-form'),els=form.elements,canvas=$('flex-model');
let state=initial(),applyModel=()=>{};const fmt=x=>x===null?'—':Number(x.toPrecision(6)).toString();
function sync(){for(const [k,v] of Object.entries(state.config))els[k].value=String(v);}
function dispatch(action,args){state=act(state,action,args);if(action==='reset'||action==='span')sync();refresh();}
function refresh(){
 const s=state,r=s.result,e=r?.points.at(-1);
 $('flex-status').textContent=s.error||(s.loaded?'Beam placed. ':'No beam. ')+(s.tared?'Nose zeroed.':'Zero nose before acquiring.');
 $('flex-load').textContent=s.loaded?'Remove beam':'Place beam';
 $('flex-result').textContent=!r?'No curve acquired.':'Revision '+r.revision+' · '+(e.forceN===null?'Last force withheld':'Last force '+fmt(e.forceN)+' N')+' · Fitted stiffness '+(r.fittedStiffnessNPerM===null?'not available':fmt(r.fittedStiffnessNPerM/1000)+' N/mm')+' · '+r.flags.outsideDomain+' out of domain; '+r.flags.overRange+' over range.';
 $('flex-json').disabled=!r;$('flex-csv').disabled=!r;
 plot(r);applyModel();
}
form.addEventListener('input',ev=>{const {name:k,value:v}=ev.target;if(k)dispatch('set',{[k]:k==='sampleId'?v:v===''?NaN:Number(v)})});
form.addEventListener('submit',ev=>{ev.preventDefault();dispatch('run')});
for(const k of ['span','load','tare','reset'])$('flex-'+k).onclick=()=>dispatch(k);
for(const k of ['json','csv'])$('flex-'+k).onclick=()=>{const r=state.result;if(!r)return;const url=URL.createObjectURL(new Blob([k==='csv'?csv(r):JSON.stringify(r,null,2)+'\n'],{type:k==='csv'?'text/csv':'application/json'})),a=document.createElement('a');a.href=url;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-flexure.'+k;a.click();setTimeout(()=>URL.revokeObjectURL(url),1600)};
function plot(r){const svg=$('flex-chart');svg.replaceChildren();if(!r)return;
 const add=(tag,props,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in props)n.setAttribute(k,props[k]);if(text!==undefined)n.textContent=text;svg.append(n)};
 const xmax=Math.max(r.points.at(-1).deltaM,1e-6),ymax=Math.max(1,...r.points.map(p=>p.forceN??0)),X=x=>64+472*x/xmax,Y=y=>153-115*y/ymax;
 for(const v of [0,.5,1]){add('line',{x1:64,y1:Y(v*ymax),x2:536,y2:Y(v*ymax),stroke:'currentColor',opacity:.23});add('text',{x:5,y:Y(v*ymax)+4,fill:'currentColor','font-size':12},fmt(v*ymax));add('text',{x:X(v*xmax)-15,y:175,fill:'currentColor','font-size':12},fmt(v*xmax*1000))}
 const pts=r.points.filter(p=>p.forceN!==null);add('path',{d:pts.map((p,i)=>(i?'L':'M')+X(p.deltaM)+' '+Y(p.forceN)).join(' '),fill:'none',stroke:'currentColor','stroke-width':2.5});
 for(const p of r.points.filter(p=>p.forceN===null))add('circle',{cx:X(p.deltaM),cy:26,r:2,fill:'#af623d'});
 add('text',{x:5,y:15,fill:'currentColor','font-size':14},'Force (N)');add('text',{x:332,y:192,fill:'currentColor','font-size':13},'Midspan drop (mm)');
}
async function view(){
 const line=$('flex-view-status');
 try{
 const R=new THREE.WebGLRenderer({canvas,antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,1.7));R.xr.enabled=true;
 const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);scene.background=new THREE.Color('#edeae3');
 scene.add(new THREE.HemisphereLight(0xfff8e7,0x9faebf,2.5));for(const [p,color,i] of [[[2,3,3],0xffffff,2.5],[[-2,1,-3],0xa8ceef,1.2]]){const l=new THREE.DirectionalLight(color,i);l.position.set(...p);scene.add(l);}
 const cam=new THREE.PerspectiveCamera(34,1,.004,20),o=new OrbitControls(cam,canvas);o.minDistance=.13;o.maxDistance=6;const render=()=>R.render(scene,cam);o.addEventListener('change',render);
 const sizes=()=>{const {width,height}=canvas.getBoundingClientRect();cam.aspect=width/Math.max(1,height);cam.updateProjectionMatrix();R.setSize(width,height,false);render()};
 new ResizeObserver(()=>{if(!R.xr.isPresenting)sizes()}).observe(canvas);
 const views={bench:[[1.17,1.31,3.18],[0,.79,.04]],front:[[0,.82,3],[0,.82,.02]],side:[[2.32,1.17,.04],[0,.81,0]],fixture:[[.065,.386,.365],[0,.301,.098]]};
 let mode='bench';const show=k=>{mode=k;cam.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()};
 $('flex-views').onclick=e=>{if(e.target.dataset.view&&!R.xr.isPresenting)show(e.target.dataset.view)};sizes();show(mode);
 const m=(await new GLTFLoader().loadAsync('/equipment/14-02/instron-5969.glb')).scene;world.add(m);
 const n=k=>m.getObjectByName(k),left=n('left_support'),right=n('right_support'),beam=n('beam'),nose=n('nose'),head=n('crosshead'),y=nose.position.y;
 const base=beam.position.y,parts=[];beam.traverse(obj=>{if(obj.isMesh){const g=obj.geometry.clone();obj.geometry=g;parts.push([g,g.attributes.position.array.slice()]);}});
 const mark=new THREE.Mesh(new THREE.BoxGeometry(.037,.002,.012),new THREE.MeshStandardMaterial({color:0x9cbfd0,transparent:true,opacity:.5}));mark.position.set(0,.294,.0975);mark.userData.action='load';world.add(mark);
 applyModel=()=>{const s=state,c=s.config,d=s.result?.points.filter(p=>p.modelValid).at(-1)?.deltaM??0,span=Math.min(.16,Math.max(.02,(Number.isFinite(c.spanMm)?c.spanMm:40)/1000)),length=Math.min(.200,Math.max(.02,(Number.isFinite(c.lengthMm)?c.lengthMm:54)/1000));
 left.position.x=-span/2;right.position.x=span/2;beam.visible=s.loaded;mark.visible=!s.loaded;head.position.y=-d;nose.position.y=y-d;
 const width=(Number.isFinite(c.widthMm)?c.widthMm:10)/10,t=(Number.isFinite(c.thicknessMm)?c.thicknessMm:2)/2;
 beam.position.y=base+(t-1)*.001;beam.scale.set(1,1,width);
 for(const [g,b] of parts){const a=g.attributes.position;for(let j=0;j<a.count;j++){const x=b[3*j]*length/.054,u=Math.min(1,2*Math.abs(x)/span),def=d*(1-1.5*u*u+.5*u*u*u);a.setXYZ(j,x,b[3*j+1]*t-def,b[3*j+2]);}a.needsUpdate=true;g.computeBoundingSphere();}
 render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;
 const hit=()=>{for(const h of ray.intersectObject(world,true)){let a,x=h.object,vis=true;do{a??=x.userData.action;vis&&=x.visible;x=x.parent}while(x&&x!==scene);if(!vis)continue;if(a)dispatch(a);break;}};
 canvas.onpointerdown=e=>press=[e.clientX,e.clientY];canvas.onpointerup=e=>{if(!press||Math.hypot(press[0]-e.clientX,press[1]-e.clientY)>4)return;const b=canvas.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);hit();};
 line.textContent='3D asset loaded · metric supports, beam, loading nose and panel are selectable.';applyModel();
 const xr=$('flex-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){
 xr.disabled=false;xr.textContent='Enter VR';xr.onclick=async()=>{if(R.xr.isPresenting){await R.xr.getSession().end();return;}try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});R.xr.setReferenceSpaceType('local-floor');world.position.set(0,.74,-.95);o.enabled=false;cam.position.set(0,0,0);cam.quaternion.identity();await R.xr.setSession(session);R.setAnimationLoop(render);xr.textContent='Exit VR';session.addEventListener('end',()=>{R.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;sizes();show(mode);xr.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;show(mode);line.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const c=R.xr.getController(i);scene.add(c);c.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.5)]),new THREE.LineBasicMaterial({color:0xecce94})));c.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(c.matrixWorld);hit()});}
 }
 }catch(e){line.textContent='3D not available: '+e.message+'. Measurement controls remain usable.';}
}
sync();refresh();view();
