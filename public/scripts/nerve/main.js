import {fascicles,generateSites,evaluate,field,initialState,validateState} from './model.js';
const $=id=>document.getElementById(id), canvas=$('nerveCanvas'), ctx=canvas.getContext('2d');
let state=initialState(),sites=generateSites(state.seed),selected=0,sweep=[];
const colors={target:'#62e4d0',off:'#ffb86b',idle:'#425b70'};
const pos=(x,y)=>[480+x*260,325+y*260];
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function sync(){for(const key of ['amplitude','spread','threshold','target'])$(key).value=state[key];$('contact').replaceChildren(...state.electrodes.map((e,i)=>new Option(`Contact ${i+1}`,i)));$('contact').value=selected;const e=state.electrodes[selected];$('contactX').value=e.x.toFixed(2);$('contactY').value=e.y.toFixed(2);$('removeContact').disabled=state.electrodes.length===1;$('addContact').disabled=state.electrodes.length===6;}
function render(){
 const result=evaluate(sites,state.electrodes,state.amplitude,state.spread,state.threshold,state.target);
 $('amplitudeValue').textContent=state.amplitude+' a.u.';$('spreadValue').textContent=state.spread.toFixed(2)+' mm';$('thresholdValue').textContent=state.threshold+' a.u.';
 $('targetMetric').textContent=result.target.toFixed(1)+'%';$('offMetric').textContent=result.off.toFixed(1)+'%';$('purityMetric').textContent=result.total?result.purity.toFixed(1)+'%':'—';$('contactCount').textContent=`${state.electrodes.length} contacts · 1,200 sites`;
 ctx.fillStyle='#0a121c';ctx.fillRect(0,0,960,650);
 ctx.strokeStyle='#182b3b';ctx.lineWidth=1;for(let x=0;x<960;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,650);ctx.stroke();}for(let y=5;y<650;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}
 ctx.beginPath();ctx.arc(480,325,260,0,Math.PI*2);ctx.fillStyle='#152636';ctx.fill();ctx.strokeStyle='#64859b';ctx.lineWidth=2;ctx.stroke();
 if($('showField').checked){ctx.save();ctx.clip();for(let y=-1;y<=1;y+=.035)for(let x=-1;x<=1;x+=.035){const v=state.amplitude*field({x,y},state.electrodes,state.spread);ctx.fillStyle=`rgba(75,205,183,${Math.min(.6,v/150*.65)})`;ctx.fillRect(...pos(x,y),10,10);}ctx.restore();}
 fascicles.forEach((f,i)=>{const [x,y]=pos(f.x,f.y);ctx.beginPath();ctx.arc(x,y,f.r*260,0,Math.PI*2);ctx.strokeStyle=i===state.target?colors.target:'#647b8e';ctx.lineWidth=i===state.target?3:1;ctx.stroke();ctx.fillStyle=i===state.target?colors.target:'#a3bacb';ctx.font='17px system-ui';ctx.fillText(`F${i+1}`,x-12,y-f.r*260-12);});
 sites.forEach((s,i)=>{ctx.fillStyle=result.mask[i]?(s.f===state.target?colors.target:colors.off):colors.idle;const [x,y]=pos(s.x,s.y);ctx.beginPath();ctx.arc(x,y,result.mask[i]?2.6:1.8,0,Math.PI*2);ctx.fill();});
 state.electrodes.forEach((e,i)=>{const [x,y]=pos(e.x,e.y);ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fillStyle='#f1f7fb';ctx.fill();ctx.strokeStyle=i===selected?'#ffcf70':'#8d9fb0';ctx.lineWidth=3;ctx.stroke();if(i===selected){ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#f1f7fb';ctx.font='bold 16px system-ui';ctx.fillText('E'+(i+1),x+19,y+5);});
 ctx.fillStyle='#b3c7d7';ctx.font='16px system-ui';ctx.fillText('0.5 mm',50,598);ctx.fillRect(50,610,130,2);
 $('fascicleBars').innerHTML=result.active.map((n,i)=>`<div class="fascicle-row"><header><span>F${i+1}${i===state.target?' · target':''}</span><span>${n} / ${result.totals[i]} · ${(n/result.totals[i]*100).toFixed(1)}%</span></header><meter min="0" max="${result.totals[i]}" value="${n}" aria-label="Fascicle ${i+1} recruitment"></meter></div>`).join('');
 sweep=Array.from({length:31},(_,i)=>{const amp=i*5;return {amp,...evaluate(sites,state.electrodes,amp,state.spread,state.threshold,state.target)};});
 const c=$('recruitmentChart').getContext('2d');c.clearRect(0,0,520,230);c.font='13px system-ui';c.fillStyle='#a8bfce';c.strokeStyle='#304253';for(let p=0;p<=100;p+=50){const y=175-p*1.4;c.beginPath();c.moveTo(40,y);c.lineTo(500,y);c.stroke();c.fillText(p+'%',0,y+4);}
 for(const [key,color] of [['target',colors.target],['off',colors.off]]){c.strokeStyle=color;c.lineWidth=2;c.beginPath();sweep.forEach((r,i)=>{const x=40+r.amp/150*460,y=175-r[key]*1.4;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}
 const x=40+state.amplitude/150*460;c.strokeStyle='#f6f9ff';c.setLineDash([3,4]);c.beginPath();c.moveTo(x,30);c.lineTo(x,180);c.stroke();c.setLineDash([]);c.fillStyle='#a8bfce';c.fillText('0',38,196);c.fillText('150 a.u.',452,196);c.fillStyle=colors.target;c.fillText('Target',40,219);c.fillStyle=colors.off;c.fillText('Other fascicles',140,219);
}
function changed(){sync();render();}
for(const key of ['amplitude','spread','threshold','target'])$(key).addEventListener('input',()=>{state[key]=Number($(key).value);render();});
$('showField').addEventListener('change',render);$('contact').addEventListener('change',()=>{selected=Number($('contact').value);changed();});
function move(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;const r=Math.hypot(x,y);if(r>1.05){x*=1.05/r;y*=1.05/r;}state.electrodes[selected]={x,y};changed();}
for(const id of ['contactX','contactY'])$(id).addEventListener('change',()=>move(Number($('contactX').value),Number($('contactY').value)));
$('addContact').onclick=()=>{if(state.electrodes.length<6){state.electrodes.push({x:0,y:0});selected=state.electrodes.length-1;changed();}};
$('removeContact').onclick=()=>{if(state.electrodes.length>1){state.electrodes.splice(selected,1);selected=Math.min(selected,state.electrodes.length-1);changed();}};
$('nerveReset').onclick=()=>{state=initialState();sites=generateSites(state.seed);selected=0;changed();$('nerveStatus').textContent='Experiment reset.';};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{state=initialState();sites=generateSites(state.seed);if(b.dataset.preset==='cuff'){state.electrodes=[{x:-1.04,y:0},{x:1.04,y:0}];state.amplitude=100;state.spread=.5;}if(b.dataset.preset==='multi'){state.electrodes=fascicles.map(({x,y})=>({x,y}));state.amplitude=70;}selected=0;changed();$('nerveStatus').textContent=b.textContent+' loaded with fixed geometry.';};
let dragging=false;
const point=ev=>{const r=canvas.getBoundingClientRect();return {x:((ev.clientX-r.left)/r.width*960-480)/260,y:((ev.clientY-r.top)/r.height*650-325)/260};};
canvas.onpointerdown=ev=>{const p=point(ev);const idx=state.electrodes.findIndex(e=>Math.hypot(e.x-p.x,e.y-p.y)<.10);if(idx>=0){selected=idx;dragging=true;canvas.setPointerCapture(ev.pointerId);changed();}else{const f=fascicles.findIndex(f=>Math.hypot(f.x-p.x,f.y-p.y)<f.r);if(f>=0){state.target=f;changed();}}};
canvas.onpointermove=ev=>{if(dragging){const p=point(ev);move(p.x,p.y);}};canvas.onpointerup=canvas.onpointercancel=()=>{dragging=false;};
$('saveNerve').onclick=()=>download('nerve-experiment.json',JSON.stringify(state,null,2),'application/json');$('loadNerve').onclick=()=>$('nerveFile').click();
$('nerveFile').onchange=async()=>{try{const f=$('nerveFile').files[0];if(!f)return;if(f.size>100000)throw Error('Choose an experiment file under 100 KB.');state=validateState(JSON.parse(await f.text()));sites=generateSites(state.seed);selected=0;changed();$('nerveStatus').textContent='Experiment restored.';}catch(e){$('nerveStatus').textContent=e.message;}$('nerveFile').value='';};
$('exportSweep').onclick=()=>download('nerve-recruitment.csv','amplitude_au,target_percent,other_percent,target_share_percent\n'+sweep.map(r=>[r.amp,r.target,r.off,r.purity].join(',')).join('\n'),'text/csv');
changed();
