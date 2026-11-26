import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const base='/equipment/14-07/',url=new URL(base+'solver.mjs',location.origin).href;
const {initial,dispatch,toCsv}=await import(/* @vite-ignore */ url);
const app=document.querySelector('#q50'),$=k=>app.querySelector('#q50-'+k),f=(n,p=3)=>Number(n.toFixed(p)).toString();
let s=initial(),out=null,pos=0,update=()=>{};
function note(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
function act(a,v){
 const q=dispatch(s,a,v);if(!q.ok){if(a==='replay')out=null;note(q.message,true);return sync();}
 s=q.state;out=q.result??null;pos=out?out.rows.length-1:0;
 note(out?'Replayed '+out.rows.length+' recorded synthetic points.':a==='tare'?'Virtual empty-pan baseline captured.':'Setting applied.');
 sync();
}
for(const k of ['power','chamber','load','pan','tare','replay','reset'])$(k).onclick=()=>act(k);
for(const k of ['gross','net','drift'])$(k).onclick=()=>act('preset',k);
$('blank').onchange=e=>act('blank',e.target.checked);
$('axis').onchange=()=>plot();
$('scrub').oninput=e=>{pos=e.target.valueAsNumber;readout();plot();};
$('file').onchange=async e=>{
 const a=e.target.files[0];if(!a)return;try{if(a.size>500000)throw Error('Series JSON must be below 500 kB.');act('import',JSON.parse(await a.text()));}catch(err){note('Import: '+err.message,true);}e.target.value='';
};
function exportData(json){
 if(!out)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([json?JSON.stringify(out):toCsv(out)],{type:json?'application/json':'text/csv'}));a.href=url;a.download='q50-replay-'+out.runRevision+(json?'.json':'.csv');a.click();setTimeout(()=>URL.revokeObjectURL(url),800);
}
$('json').onclick=()=>exportData(true);$('csv').onclick=()=>exportData(false);
function readout(){
 const p=out?.rows[pos];
 $('read').textContent=p?'Record '+(pos+1)+' of '+out.rows.length+' · '+f(p.timeS)+' s · '+f(p.temperatureC)+' °C (synthetic) · '+f(p.correctedMg)+' mg · '+f(p.retainedPercent)+'% retained.':'No current record selected.';
}
function plot(){
 const canvas=$('plot'),ctx=canvas.getContext('2d'),a=75,b=58,c=canvas.width-25,d=canvas.height-63,temp=$('axis').value==='temperature';
 ctx.fillStyle='#152f3e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#b8e7e7';ctx.font='bold 22px sans-serif';ctx.fillText('Q50 / SYNTHETIC MASS REPLAY',18,33);
 const value=p=>temp?p.temperatureC:p.timeS,all=out?.rows??[];
 const xs=all.length?all.map(value):[0,10],ys=all.length?all.map(p=>p.retainedPercent):[80,100];
 const x0=Math.min(...xs),x1=Math.max(x0+1,...xs),y0=Math.min(75,Math.min(...ys)-3),y1=Math.max(105,Math.max(...ys)+3);
 const X=x=>a+(x-x0)/(x1-x0)*(c-a),Y=y=>d-(y-y0)/(y1-y0)*(d-b);
 ctx.font='15px sans-serif';ctx.strokeStyle='#4f6d79';ctx.lineWidth=1;
 for(let i=0;i<=5;i++){
  const px=a+i*(c-a)/5,py=b+i*(d-b)/5;
  ctx.beginPath();ctx.moveTo(px,b);ctx.lineTo(px,d);ctx.moveTo(a,py);ctx.lineTo(c,py);ctx.stroke();
  ctx.fillText(f(x0+(x1-x0)*i/5,0),px-11,d+23);ctx.fillText(f(y1-(y1-y0)*i/5,1),7,py+5);
 }
 ctx.fillText('Retained %',8,b-9);ctx.fillText(temp?'Synthetic temperature coordinate (°C)':'Record time (s)',a,d+51);
 if(!all.length)return;
 ctx.strokeStyle='#82efd0';ctx.lineWidth=3;ctx.beginPath();
 all.forEach((p,i)=>i?ctx.lineTo(X(value(p)),Y(p.retainedPercent)):ctx.moveTo(X(value(p)),Y(p.retainedPercent)));ctx.stroke();
 const p=all[pos];if(p){ctx.fillStyle='#f8d176';ctx.beginPath();ctx.arc(X(value(p)),Y(p.retainedPercent),5,0,2*Math.PI);ctx.fill();}
}
function sync(){
 $('power').textContent=s.power?'Standby':'Power on';
 $('chamber').textContent=s.chamber?'Lower furnace / expose pan':'Raise furnace / close chamber';$('chamber').setAttribute('aria-pressed',String(s.chamber));
 $('pan').textContent=s.pan?'Remove pan':'Install pan';$('load').textContent=s.loaded?'Remove specimen':'Load specimen';
 $('sample').textContent=s.loaded?s.record.sampleId+' · revision '+s.record.revision+' · '+s.record.basis+' readings':'Specimen not installed.';
 $('tare-info').textContent=(s.taredMg===null?'No empty-pan tare captured.':'Captured empty-pan tare: '+f(s.taredMg)+' mg.')+' Net readings never subtract this again.';
 $('blank').checked=s.applyBlank;
 $('json').disabled=$('csv').disabled=$('scrub').disabled=!out;
 $('scrub').max=out?out.rows.length-1:0;$('scrub').value=pos;
 $('result').textContent=out?(f(out.initialMg)+' mg → '+f(out.terminalMg)+' mg · '+f(out.terminalPercent)+'% retained'):'Replay a valid synthetic trace.';
 $('applied').textContent=out?'Applied pan subtraction: '+f(out.appliedTareMg)+' mg · blank correction '+(out.blankApplied?'on':'off')+'.':'';
 readout();plot();update();
}
async function viewer(){
 const host=$('viewer'),sc=new T.Scene(),c=new T.PerspectiveCamera(39,1,.006,8),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.outputColorSpace=T.SRGBColorSpace;sc.background=new T.Color('#273a46');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Metric Q50 model. Furnace and panel buttons are operable with matching form actions.');
 const cam=new OrbitControls(c,r.domElement),render=()=>r.render(sc,c);cam.minDistance=.16;cam.maxDistance=3;cam.addEventListener('change',render);
 sc.add(new T.HemisphereLight(0xffffff,0x788690,2.0));for(const [p,e] of [[[.52,.74,1.0],2],[[-.64,.57,-.60],1.4]]){const l=new T.DirectionalLight(0xffffff,e);l.position.fromArray(p);sc.add(l);}
 const floor=new T.GridHelper(1.5,25,0x68909a,0x4d6472);floor.position.y=-.002;sc.add(floor);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(base+'q50.glb'),fetch(base+'interaction.json').then(x=>x.json())]);sc.add(g.scene);
 const node=n=>{let a=[];g.scene.traverse(o=>{if(o.name===n)a.push(o)});if(a.length!==1)throw Error('Unknown model node '+n);return a[0];};
 node(m.frame.placementAnchor);m.ports.forEach(node);
 const furnace=node(m.anchors.furnace),park=furnace.position.y,pan=node(m.anchors.pan),spec=node(m.anchors.specimen),lamp=node('ready_lamp');lamp.material=lamp.material.clone();
 const targets=m.actions.map(v=>{const p=new T.Mesh(new T.BoxGeometry(...v.sizeM),new T.MeshBasicMaterial({visible:false}));p.userData.v=v;sc.add(p);return [node(v.node),p];});
 const ray=new T.Raycaster(),xy=new T.Vector2();let down=null;
 function hit(e){if(c.position.z<0)return null;const z=r.domElement.getBoundingClientRect();xy.set((e.clientX-z.left)/z.width*2-1,1-(e.clientY-z.top)/z.height*2);ray.setFromCamera(xy,c);return ray.intersectObjects(targets.map(x=>x[1]))[0]?.object.userData.v;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const x=hit(e);if(x)act(x.action);}down=null;};
 r.domElement.onpointermove=e=>{const x=hit(e);r.domElement.title=x?.label??'Orbit the Q50';r.domElement.style.cursor=x?'pointer':'grab';};
 update=()=>{
  furnace.position.y=park-(s.chamber?0:m.visualLoweringM);pan.visible=s.pan;spec.visible=s.loaded;
  lamp.material.color.set(s.power&&s.chamber?'#75eda2':'#4a6253');lamp.material.emissive.set(s.power&&s.chamber?'#244733':'#000000');
  sc.updateMatrixWorld(true);for(const [n,p] of targets){n.getWorldPosition(p.position);p.updateMatrixWorld(true);}render();
 };
 const views={orbit:[[.50,.54,.93],[0,.25,.045]],front:[[0,.30,.87],[0,.25,.12]],pan:[[-.33,.38,.51],[-.11,.30,.12]],rear:[[.36,.46,-.88],[0,.24,-.07]]};
 function go(k){c.position.fromArray(views[k][0]);cam.target.fromArray(views[k][1]);cam.update();render();}
 app.querySelectorAll('[data-q50-view]').forEach(b=>b.onclick=()=>go(b.dataset.q50View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render();}).observe(host);
 go('orbit');update();$('model').textContent='Metric GLB loaded · moving furnace and hanging pan';$('model').dataset.loaded='true';
}
sync();act('replay');viewer().catch(e=>{$('model').textContent='3D could not load: '+e.message+'; the mass replay still works.';$('viewer').style.display='none';});
