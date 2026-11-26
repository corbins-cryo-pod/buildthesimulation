import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStation,exportFile,targets} from '../../../../public/equipment/01-05/analysis.mjs';
const S=createStation(),$=id=>document.getElementById(id),root='/equipment/01-05/',ns='http://www.w3.org/2000/svg';
const palette=['#7de0c6','#f0ba70','#b3c9f3','#ef9cb6'],viewBox=[480,185];let draw3=()=>{},importId=0;
function panel(s,view,el){
 const raster=view==='raster',a=s.result;
 if(!a){el.text(240,92,'Run analysis to display '+(raster?'the event raster':'mean waveforms'),'#e4efec',{anchor:'middle'});return;}
 const l=57,r=453,t=21,b=147;
 const data=raster?a.events.map(d=>d.offsetMs):a.waveformTimeMs;
 const domain=raster?s.recording.triggers.flatMap(t=>a.events.map(d=>(d.sampleIndex-t.sampleIndex)*a.samplePeriodMs)):data;
 const period=a.samplePeriodMs, min=Math.min(0,...domain)-period, max=Math.max(0,...domain)+period;
 const x=i=>l+(i-min)/(max-min)*(r-l),zero=x(0);
 for(let i=0;i<5;i++){const p=l+(r-l)*i/4,m=min+(max-min)*i/4;el.line(p,t,p,b,'#415964');el.text(p,161,Number(m.toFixed(4)).toString(),'#c9d9dd',{anchor:'middle',size:10});}
 el.line(zero,t,zero,b,'#d9dce1');el.text(zero+4,16,raster?'Trigger':'Event center','#d9dce1',{size:10});
 if(raster){
  for(const [i,c] of a.summary.entries()){
   const y=t+(b-t)*(i+.5)/a.summary.length, col=palette[i];
   el.text(12,y+4,c.channelId.slice(0,7),col,{size:11});el.line(l,y,r,y,'#4b6770');
   for(const e of a.events.filter(e=>e.channelId===c.channelId)){const px=x(e.offsetMs);el.line(px,y-12,px,y+12,col,2.8);}
  }
 }else{
  const all=a.summary.flatMap(c=>c.meanWaveformUV??[]),lo=Math.min(0,...all),hi=Math.max(0,...all),pad=Math.max(1,(hi-lo)*.12),y=u=>b-(u-(lo-pad))/(hi-lo+2*pad)*(b-t);
  for(const [i,c]of a.summary.entries()){
   const col=palette[i];el.text(l+23+i*54,33,c.channelId.slice(0,6),col,{size:11});
   if(c.meanWaveformUV){for(let k=1;k<5;k++)el.line(x(data[k-1]),y(c.meanWaveformUV[k-1]),x(data[k]),y(c.meanWaveformUV[k]),col,2.6);}
  }
  el.text(12,18,'µV','#c9d9dd',{size:11});
  for(const v of [...new Set([lo,0,hi])])el.text(54,y(v)+3,Number(v.toFixed(3)).toString(),'#c9d9dd',{anchor:'end',size:9});
  if(!all.length)el.text(243,104,'No complete waveform snippets','#c9d9dd',{anchor:'middle'});
 }
 el.text(255,178,raster?'Time from trigger (ms)':'Time from labeled event (ms)','#e3efed',{anchor:'middle',size:11});
}
function svg(s){
 const e=$('plot');e.replaceChildren();
 const add=(n,a,txt)=>{const q=document.createElementNS(ns,n);for(const [k,v] of Object.entries(a))q.setAttribute(k,v);if(txt)q.textContent=txt;e.append(q);};
 panel(s,s.view,{line:(x1,y1,x2,y2,c,w=1)=>add('line',{x1,y1,x2,y2,stroke:c,'stroke-width':w}),
 text:(x,y,str,c,o={})=>add('text',{x,y,fill:c,'font-size':o.size??13,'font-family':'system-ui','text-anchor':o.anchor??'start'},str)});
}
function refresh(s){
 const r=s.recording,a=s.result,select=$('trigger-select');select.replaceChildren();
 for(const t of r.triggers){const o=new Option(t.id+' · sample '+t.sampleIndex,t.id,t.id===s.triggerId,t.id===s.triggerId);select.append(o);}
 $('recording-meta').textContent=r.recordingId+' rev '+r.revision+' · '+r.channels.length+' channels · '+r.sampleRateHz+' Hz · '+r.channels[0].traceUV.length+' samples · µV (synthetic)';
 const rows=$('events');rows.replaceChildren();
 for(const x of a?.events??[]){const tr=document.createElement('tr');for(const y of [x.id,x.channelId,x.sampleIndex,x.offsetSamples,Number(x.offsetMs.toFixed(8))]){const d=document.createElement('td');d.textContent=y;tr.append(d);}rows.append(tr);}
 for(const a of ['raster','waveform'])$(a).setAttribute('aria-pressed',s.view===a?'true':'false');
 $('export').disabled=!a;$('status').classList.toggle('err',!!s.error);
 $('status').textContent=s.error??(a?a.events.length+' events · '+a.summary.map(c=>c.channelId+': '+c.count).join(', ')+' · trigger sample '+a.trigger.sampleIndex+' · '+a.samplePeriodMs+' ms/sample.':'Recording ready. Press Run analysis.');
 svg(s);draw3();
}
function act(k,p){if(k==='reset')importId++;const s=S.dispatch(k,p);refresh(s);return s;}
for(const b of ['run','reset','raster','waveform'])$(b).onclick=()=>act(b);
$('trigger-select').onchange=e=>act('trigger',e.target.value);
$('import').onchange=async()=>{
 const f=$('import').files?.[0];if(!f)return;const i=++importId;
 try{if(f.size>350000)throw Error('File exceeds 350 kB.');const p=JSON.parse(await f.text());if(i===importId)act('load',p);}
 catch(e){if(i===importId){$('status').textContent='Import rejected: '+e.message;$('status').classList.add('err');}}
 finally{if(i===importId)$('import').value='';}
};
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(exportFile(S.read()),null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='synthetic-event-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
async function model(){
 const c=$('console-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#26383e');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const world=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.004,12),o=new OrbitControls(cam,c);o.minDistance=.12;o.maxDistance=6;
 world.add(new T.HemisphereLight('#f1fbff','#d7b99a',2.3));
 for(const [xyz,col,i] of [[[2,3,2],'#fff1df',3.2],[[-2,1,-2],'#cce9ff',1.9]]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);world.add(l);}
 const m=(await new GLTFLoader().loadAsync(root+'analysis-console.glb')).scene;world.add(m);
 const render=()=>r.render(world,cam);const views={bench:[[1.57,1.58,2.34],[0,.70,-.015]],screens:[[.05,1.28,1.28],[0,1.214,-.19]],controls:[[.71,1.32,.78],[.26,.956,.119]],rear:[[-1.5,1.42,-2.26],[.05,.759,-.043]]};
 const screens=['raster','waveform'].map((k,i)=>{
  const el=document.createElement('canvas');[el.width,el.height]=viewBox;
  const tx=new T.CanvasTexture(el);tx.colorSpace=T.SRGBColorSpace;
  const face=new T.Mesh(new T.PlaneGeometry(.362,.196),new T.MeshBasicMaterial({map:tx,toneMapped:false}));
  const name=(i?'Waveform':'Raster');face.userData.action=targets[name+'_screen'];m.getObjectByName(name+'_screen_origin').add(face);
  return {k,el,tx};
 });
 draw3=()=>{
  const s=S.read();
  for(const {k,el,tx}of screens){
   const d=el.getContext('2d');d.fillStyle=s.view===k?'#162b32':'#1a3035';d.fillRect(0,0,el.width,el.height);
   panel(s,k,{line:(x1,y1,x2,y2,col,w=1)=>{d.strokeStyle=col;d.lineWidth=w;d.beginPath();d.moveTo(x1,y1);d.lineTo(x2,y2);d.stroke();},
    text:(x,y,t,col,o={})=>{d.fillStyle=col;d.font=(o.size??13)+'px system-ui';d.textAlign=o.anchor==='middle'?'center':o.anchor==='end'?'right':'left';d.fillText(t,x,y);}});
   tx.needsUpdate=true;
  }render();
 };
 function set(k){const [p,q]=views[k]??views.bench;cam.position.set(...p);o.target.set(...q);o.update();render();}
 document.querySelectorAll('[data-camera]').forEach(e=>e.onclick=()=>set(e.dataset.camera));$('camera-reset').onclick=()=>set('bench');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of ray.intersectObject(m,true)){let g=h.object;while(g){const k=g.userData.action??(Object.hasOwn(targets,g.name)?targets[g.name]:null);if(k){act(k);return;}g=g.parent;}}
 };
 set('bench');draw3();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · original 1100 × 620 mm workstation.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Analysis and export still work.';});
