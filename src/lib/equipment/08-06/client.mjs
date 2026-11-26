import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStation,targets,pose,csv} from '../../../../public/equipment/08-06/pull.mjs';
const S=createStation(),$=k=>document.getElementById(k),root='/equipment/08-06/';
let view3=()=>{};
const format=(x,n=2)=>x.toFixed(n);
function act(action,payload){
 const s=S.dispatch(action,payload);update(s);
 if(s.error)$('status').textContent=s.error.message;
 else if(action==='run')$('status').textContent='Replay complete. '+s.event.bondId+' invalidated; all other bonds unchanged.';
 else if(s.engaged)$('status').textContent='Hook engaged on '+s.selected+'. Replay the synthetic pull.';
 else if(!s.loaded)$('status').textContent='Coupon unseated. Seat the inert fixture before replay.';
 else $('status').textContent='Selected '+s.selected+'. Engage an intact connection to replay.';
 $('status').classList.toggle('failed',!!s.error);
}
$('bond').onchange=()=>act('select',$('bond').value);$('coupon').onclick=()=>act('toggleSample');$('hook').onclick=()=>act('engage');$('run').onclick=()=>act('run');$('reset').onclick=()=>act('reset');
$('example').onclick=()=>{S.dispatch('reset');S.dispatch('engage');act('run');};
function update(s){
 $('bond').value=s.selected;$('coupon').textContent=s.loaded?'Unseat coupon':'Seat coupon';$('hook').textContent=s.engaged?'Disengage virtual hook':'Engage virtual hook';
 $('lineage').textContent=s.event?`Event retains pre-test revision ${s.event.preTest.revision}; current assembly revision ${s.assembly.revision}.`:'Assembly revision '+s.assembly.revision+'.';
 const tab=$('bonds');tab.replaceChildren();
 for(const b of s.assembly.bonds){const tr=document.createElement('tr');for(const v of [b.id,b.pads.join(' → '),b.state]){const td=document.createElement('td');td.textContent=v;tr.append(td);}tab.append(tr);}
 const e=s.event;$('csv').disabled=$('json').disabled=!e;
 const batch=s.log.length?s.log.length+' · '+format(1e3*s.log.reduce((v,q)=>v+q.peak.forceN,0)/s.log.length,1)+' mN':'—';
 const meter=e?{force:format(e.peak.forceMilliN,1)+' mN',dist:format(e.peak.displacementUm,0)+' µm',failure:e.classification,batch}:{force:'—',dist:'—',failure:'—',batch};
 for(const [k,v] of Object.entries(meter))document.querySelector('[data-v="'+k+'"]').textContent=v;
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#24353d';g.fillRect(0,0,w,h);g.fillStyle='#dfebe4';g.font='22px system-ui';
 if(!e)g.fillText('Replay a selected bond to show the observed peak.',38,44);
 else{
  const p=e.trace.samples,maxX=p.at(-1)[1],maxY=e.peak.forceN*1.12,X=x=>110+(w-150)*x/maxX,Y=y=>h-51-(h-98)*y/maxY;
  g.strokeStyle='#719597';g.beginPath();g.moveTo(110,30);g.lineTo(110,h-51);g.lineTo(w-40,h-51);g.stroke();
  g.fillText('mN',20,32);g.fillText('0',75,h-50);g.fillText(maxX+' µm',w-128,h-15);g.fillText(format(maxY*1000,0),14,64);
  g.strokeStyle='#b3e1c3';g.lineWidth=3;g.beginPath();p.forEach((r,i)=>i?g.lineTo(X(r[1]),Y(r[2])):g.moveTo(X(r[1]),Y(r[2])));g.stroke();
  g.fillStyle='#f5bf80';g.beginPath();g.arc(X(e.peak.displacementUm),Y(e.peak.forceN),6,0,2*Math.PI);g.fill();
 }
 view3();
}
function save(n,b,t){const u=URL.createObjectURL(new Blob([b],{type:t})),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('json').onclick=()=>{const e=S.read().event;if(e)save('wire-pull-event.json',JSON.stringify(e,null,2)+'\n','application/json');};$('csv').onclick=()=>{const e=S.read().event;if(e)save('wire-pull-force.csv',csv(e),'text/csv');};
async function viewer(){
 const c=$('device'),r=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});r.setClearColor('#28373f');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.002,8),o=new OrbitControls(cam,c);o.minDistance=.035;o.maxDistance=3.2;
 scene.add(new T.HemisphereLight('#eff9ff','#d3c2a8',2.1));
 for(const [p,col,k] of [[[.55,1,1],'#fff0da',3.2],[[-.6,.41,-.73],'#c9e2fc',1.8]]){const l=new T.DirectionalLight(col,k);l.position.set(...p);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync(root+'dage-4000.glb')).scene;scene.add(m);const N=n=>m.getObjectByName(n);
 const holder=N('Stage_X'),spec=N('Specimen'),hook=N('Hook_pose');
 const render=()=>r.render(scene,cam),views={bench:[[.65,.68,1.03],[0,.34,-.024]],hook:[[.111,.250,.235],[0,.181,.055]],rear:[[.66,.61,-.98],[0,.34,-.11]]};
 view3=()=>{
  const z=pose(S.read());holder.position.x=z.stageOffsetM;spec.visible=z.couponVisible;hook.position.y=z.hookDropM;
  for(const id of ['B1','B2','B3']){const bad=z.invalidated.includes(id);N('Wire_intact_'+id).visible=!bad;for(const f of [46,60])N('Wire_end_'+id+'_'+f).visible=bad;}
  render();
 };
 function view(key){const [a,b]=views[key]??views.bench;cam.position.set(...a);o.target.set(...b);o.update();view3();}
 document.querySelectorAll('[data-view]').forEach(q=>q.onclick=()=>view(q.dataset.view));$('reset-view').onclick=()=>view('bench');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=c.getBoundingClientRect(),q=new T.Raycaster();q.setFromCamera({x:(e.clientX-b.left)*2/b.width-1,y:1-(e.clientY-b.top)*2/b.height},cam);
  for(const hit of q.intersectObject(m,true)){let n=hit.object,k=null,hidden=false;while(n){if(!n.visible){hidden=true;break;}if(!k&&Object.hasOwn(targets,n.name))k=targets[n.name];n=n.parent;}if(k&&!hidden){act(k);return;}}
 };
 view('bench');c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · 105 nodes · documented legacy envelope.';
}
update(S.read());viewer().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Wire-pull replay remains usable.';});
