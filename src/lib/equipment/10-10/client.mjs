import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,csv,targets} from '../../../../public/equipment/10-10/replay.mjs';
const S=createStation(),$=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';let draw=()=>{},token=0;
function plot(r){
 const g=$('plot');g.replaceChildren();
 const e=(tag,attr,txt)=>{const q=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attr))q.setAttribute(k,v);if(txt)q.textContent=txt;g.append(q);};
 const text=(x,y,q,f='#d4e7e7',o={})=>e('text',{x,y,fill:f,'font-size':11,'font-family':'system-ui',...o},q);
 if(!r){text(265,93,'Replay to inspect the original clock','#d4e7e7',{'text-anchor':'middle'});return;}
 const l=35,w=470,t=19,b=131,idx=r.clock.firstCounter,n=r.samples.length,cell=w/n,x=i=>l+(i+.5)*cell;
 const channels=r.channelIds.slice(0,3),colors=['#81dfc2','#eab96e','#aebdf4'],vv=r.samples.flatMap(s=>s.valuesMv?.slice(0,3)??[]),lo=Math.min(0,...vv),hi=Math.max(1,...vv),pad=(hi-lo)*.08;
 const y=v=>b-(v-lo+pad)/(hi-lo+2*pad)*(b-t);
 for(const d of r.gaps)e('rect',{x:l+(d.counterStart-idx)*cell,y:t,width:d.missingSampleCount*cell,height:b-t,fill:'#6f5549'});
 for(let j=0;j<=4;j++){const a=t+(b-t)*j/4;e('line',{x1:l,y1:a,x2:l+w,y2:a,stroke:'#38525c'});}
 for(const [k,id]of channels.entries()){
  let path='',open=false;
  for(const [i,s]of r.samples.entries()){
   if(!s.valuesMv){open=false;continue;}
   const X=x(i),Y=y(s.valuesMv[k]);
   path+=(open?'L':'M')+X.toFixed(2)+' '+Y.toFixed(2)+' ';open=true;
   if(n<=64)e('circle',{cx:X,cy:Y,r:2.1,fill:colors[k]});
  }
  e('path',{d:path,stroke:colors[k],'stroke-width':1.8,fill:'none'});text(39+k*43,15,id.slice(0,6),colors[k]);
 }
 for(const m of r.markers.slice(0,12)){const X=x(m.zeroBasedSample);e('line',{x1:X,y1:t,x2:X,y2:b,stroke:'#ecd1ce','stroke-dasharray':'3 2'});text(Math.min(X+3,460),31,m.id.slice(0,8),'#ecd1ce');}
 text(l,149,String(idx));text(l+w,149,String(r.clock.lastCounter),'#d4e7e7',{'text-anchor':'end'});text(263,167,'Original sample counter','#d4e7e7',{'text-anchor':'middle'});text(5,31,'mV');
}
function refresh(s){
 const r=s.result;$('gap').textContent=s.missing===null?'Use built-in gap fixture':s.missing?'Restore missing block':'Omit example block';
 $('cutaway').textContent=s.cutaway?'Show cover':'Hide cover for inspection';$('csv').disabled=$('json').disabled=!r;
 const status=s.error??(r?r.gapSampleCount+' missing sample'+(r.gapSampleCount===1?'':'s')+(r.markers.length?' · '+r.markers[0].id+' at counter '+r.markers[0].counter+' ('+r.markers[0].timeS.toFixed(6)+' s).':'.'):'Source '+s.source.streamId+' ready. Replay numbered blocks.');
 $('status').textContent=status;
 const th=$('heads'),tb=$('rows');th.replaceChildren();tb.replaceChildren();
 const h=document.createElement('tr');
 for(const t of ['Counter','Elapsed (s)',...s.source.channelIds.map(a=>a+' (mV)')]){const a=document.createElement('th');a.textContent=t;h.append(a);}th.append(h);
 for(const item of r?.samples.slice(0,24)??[]){const tr=document.createElement('tr');tr.dataset.counter=item.counter;tr.classList.toggle('gap',!item.valuesMv);
  for(const x of [item.counter,item.timeS.toFixed(6),...(item.valuesMv??s.source.channelIds.map(()=> '—'))]){const td=document.createElement('td');td.textContent=x;tr.append(td);}tb.append(tr);
 }
 plot(r);draw();
}
function act(a,p){if(a==='reset'||a==='toggleGap')token++;refresh(S.dispatch(a,p));}
for(const [id,k]of [['cutaway','cutaway'],['run','run'],['gap','toggleGap'],['reset','reset']])$(id).onclick=()=>act(k);
$('import').onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;const i=++token;
 try{if(f.size>800000)throw Error('Synthetic import exceeds 800 kB.');const p=JSON.parse(await f.text());if(i===token)act('load',p);}
 catch(e){if(i===token)$('status').textContent='Import rejected: '+e.message;}
 finally{if(i===token)$('import').value='';}
};
function save(n,b,type){const u=URL.createObjectURL(new Blob([b],{type})),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('json').onclick=()=>save('synthetic-counter-replay.json',JSON.stringify(S.read().result,null,2)+'\n','application/json');
$('csv').onclick=()=>save('synthetic-counter-replay.csv',csv(S.read().result),'text/csv');
async function model(){
 const c=$('acq-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#293d43');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const w=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.001,8),o=new OrbitControls(cam,c);o.minDistance=.028;o.maxDistance=2.3;
 w.add(new T.HemisphereLight('#f0fbff','#d4c1aa',2.5));
 for(const [xyz,col,i]of [[[1,2,1.4],'#fff0dc',3.55],[[-1,1.4,-1],'#d0edff',2.1]]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);w.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/10-10/open-ephys-gen3-display.glb')).scene;w.add(m);
 const lid=m.getObjectByName('Display_lid'),mark=m.getObjectByName('Run_marker'),low=mark.material;
 const high=new T.MeshBasicMaterial({color:'#e97059'}),render=()=>r.render(w,cam);
 draw=()=>{const s=S.read();lid.visible=!s.cutaway;mark.material=s.result?high:low;render();};
 const views={whole:[[.24,.19,.33],[.04,.012,.013]],front:[[.022,.052,.207],[-.002,.012,.08]],rear:[[-.05,.064,-.23],[.01,.012,-.076]],board:[[.020,.234,.30],[.008,.012,.01]]};
 function set(k){const [a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(e=>e.onclick=()=>set(e.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let start;c.onpointerdown=e=>start=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=c.getBoundingClientRect(),q=new T.Raycaster();q.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of q.intersectObject(m,true)){let a=h.object,k,v=true;while(a){if(!a.visible)v=false;if(!k&&Object.hasOwn(targets,a.name))k=targets[a.name];a=a.parent;}if(v&&k){act(k);return;}}
 };
 set('whole');draw();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · case extent from the pinned Gen 3 design.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Replay and exports still work.';});
