(function(){'use strict';
const $=id=>document.getElementById(id),{Simulation,PRESETS,LIMITS,clamp}=CellEngine;
let sim=new Simulation(2646),running=true,speed=12,accumulator=0,last=0,lastRender=0,lastUI=0,drawCount=0,computeMs=0,slow=false;
const renderer=new CellRenderer($('microscope'),$('overlay'));
const colors=['#577e5e','#9e597d','#a4813d','#5f7e96','#93755c','#8b739f','#427f7d','#9c6459','#7e8755','#67768d','#a4708c','#586953','#b09269','#695c83'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modelTime=t=>{const minutes=Math.floor(t+1e-7);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;};
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function syncPreset(){const key=Object.keys(PRESETS).find(k=>Object.keys(LIMITS).every(p=>Math.abs(PRESETS[k].params[p]-sim.params[p])<1e-10));$('preset').value=key||'custom';}
function syncControls(){syncPreset();for(const k of Object.keys(LIMITS)){$(k).value=sim.params[k];$(k+'Out').textContent=sim.params[k].toFixed(2);}$('seed').value=sim.seed;}
function updatePlay(){$('play').textContent=running?'Pause':'Run';$('play').setAttribute('aria-label',running?'Pause simulation':'Run simulation');$('stateDot').style.opacity=running?'1':'.35';}
function restart(newSeed=null){const raw=newSeed===null?Number($('seed').value):newSeed;if(!Number.isFinite(raw)||raw<0||raw>4294967295){toast('Use an integer seed between 0 and 4294967295.');return;}
 sim=new Simulation(Math.floor(raw),sim.params);accumulator=0;renderer.selected=1;renderer.pan={x:0,y:0};renderer.zoom=1;syncControls();updateUI();renderer.render(sim);toast('Restarted the same equations from seed '+sim.seed+'.');}
$('play').onclick=()=>{running=!running;accumulator=0;updatePlay();};$('reset').onclick=()=>restart();
$('newSeed').onclick=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);restart(a[0]);};
$('preset').onchange=()=>{const key=$('preset').value;sim=new Simulation(Number($('seed').value)>>>0,PRESETS[key].params);accumulator=0;renderer.selected=1;renderer.pan={x:0,y:0};renderer.zoom=1;syncControls();updateUI();renderer.render(sim);toast(PRESETS[key].name+' · new experiment.');};
$('speed').onchange=()=>{speed=Number($('speed').value);accumulator=0;};
$('step').onclick=()=>{running=false;accumulator=0;sim.advance(1);updatePlay();updateUI();renderer.render(sim);};
for(const k of Object.keys(LIMITS))$(k).addEventListener('input',()=>{const v=Number($(k).value);sim.setParams({[k]:v},false);$(k+'Out').textContent=v.toFixed(2);syncPreset();});
for(const k of Object.keys(LIMITS))$(k).addEventListener('change',()=>sim.event('parameter',k+' set to '+sim.params[k].toFixed(2)+'.',{params:{...sim.params}}));
$('exposure').oninput=()=>{renderer.exposure=Number($('exposure').value);$('exposureOut').textContent=renderer.exposure.toFixed(2);};
$('green').onchange=()=>renderer.showGreen=$('green').checked;$('pink').onchange=()=>renderer.showPink=$('pink').checked;$('labels').onchange=()=>renderer.labels=$('labels').checked;
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{renderer.mode=Number(b.dataset.mode);for(const q of document.querySelectorAll('[data-mode]')){q.classList.toggle('active',q===b);q.setAttribute('aria-pressed',q===b?'true':'false');}renderer.render(sim);};
$('fit').onclick=()=>{renderer.fit(sim);renderer.render(sim);};
$('selected').onchange=()=>renderer.selected=Number($('selected').value);
$('waveButton').onclick=()=>{sim.launchWave(renderer.selected,true);updateUI();renderer.render(sim);};
$('pulseButton').onclick=()=>{const n=sim.getNeurite(renderer.selected)||sim.neurites[0],tip=n.nodes[n.nodes.length-1];sim.pulse(tip.x,tip.y);updateUI();renderer.render(sim);};
let drag=null;
$('stage').addEventListener('pointerdown',e=>{if(e.button!==0)return;$('stage').setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,px:renderer.pan.x,py:renderer.pan.y,moved:false};});
$('stage').addEventListener('pointermove',e=>{if(!drag)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved){renderer.pan.x=drag.px+dx;renderer.pan.y=drag.py+dy;}});
$('stage').addEventListener('pointerup',e=>{if(!drag)return;if(!drag.moved){let rect=$('stage').getBoundingClientRect(),pt=renderer.screenToWorld(e.clientX-rect.left,e.clientY-rect.top);let nearest=sim.neurites.reduce((best,n)=>{const tip=n.nodes[n.nodes.length-1],d=Math.hypot(tip.x-pt.x,tip.y-pt.y);return d<best.d?{id:n.id,d}:best;},{id:1,d:Infinity});renderer.selected=nearest.id;sim.pulse(pt.x,pt.y);updateUI();}drag=null;});
$('stage').addEventListener('pointercancel',()=>drag=null);
$('stage').addEventListener('wheel',e=>{e.preventDefault();renderer.zoom=clamp(renderer.zoom*Math.exp(-e.deltaY*.001),.2,5);},{passive:false});
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||$('notesDialog').open)return;if(e.code==='Space'){e.preventDefault();running=!running;accumulator=0;updatePlay();}if(e.key.toLowerCase()==='r')restart();if(e.key.toLowerCase()==='f'){renderer.fit(sim);}});
$('notes').onclick=()=>$('notesDialog').showModal();$('closeNotes').onclick=()=>$('notesDialog').close();
function download(name,content,type){const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$('save').onclick=()=>{const state=sim.exportState();state.view={mode:renderer.mode,zoom:renderer.zoom,pan:renderer.pan,selected:renderer.selected,exposure:renderer.exposure,labels:renderer.labels,green:renderer.showGreen,pink:renderer.showPink};download(`cell-seed-${sim.seed}-${Math.floor(sim.time)}min.json`,JSON.stringify(state),'application/json');toast('Full numerical state saved.');};
$('load').onclick=()=>$('loadFile').click();
$('loadFile').onchange=async()=>{const file=$('loadFile').files[0];if(!file)return;try{if(file.size>20e6)throw Error('Experiment files must be smaller than 20 MB.');let data=JSON.parse(await file.text());const restored=CellImport.restore(data);sim=restored;running=false;accumulator=0;renderer.selected=sim.neurites[0].id;renderer.fit(sim);
if(data.view){const v=data.view;if(Number.isInteger(v.mode)&&v.mode>=0&&v.mode<=2)renderer.mode=v.mode;if(Number.isFinite(v.zoom))renderer.zoom=clamp(v.zoom,.2,5);if(v.pan&&Number.isFinite(v.pan.x)&&Number.isFinite(v.pan.y)&&Math.abs(v.pan.x)<100000&&Math.abs(v.pan.y)<100000)renderer.pan={x:v.pan.x,y:v.pan.y};if(sim.getNeurite(v.selected))renderer.selected=v.selected;if(Number.isFinite(v.exposure))renderer.exposure=clamp(v.exposure,.4,3);renderer.labels=!!v.labels;renderer.showGreen=v.green!==false;renderer.showPink=v.pink!==false;$('labels').checked=renderer.labels;$('green').checked=renderer.showGreen;$('pink').checked=renderer.showPink;$('exposure').value=renderer.exposure;$('exposureOut').textContent=renderer.exposure.toFixed(2);for(const q of document.querySelectorAll('[data-mode]')){const active=Number(q.dataset.mode)===renderer.mode;q.classList.toggle('active',active);q.setAttribute('aria-pressed',String(active));}}
syncControls();updatePlay();updateUI();renderer.render(sim);toast('Restored exact numerical state. Press Run to continue.');}catch(e){toast('Could not load: '+e.message);}finally{$('loadFile').value='';}};
function csvText(){const rows=['# Whole-cell remodeling laboratory v1.0.0 — exploratory; not biologically calibrated',`# seed=${sim.seed}; fixed_step_min=${sim.dt}; retained_samples=${sim.history.length}`,`# parameters=${JSON.stringify(sim.params)}`,'time_min,soma_area_um2,process_material_um,geometric_arclength_um,supported_material_um,free_material_budget_um,availability_fraction,soma_actin_au,global_contraction_au,process_count,extending_count,retracting_count,process_id,individual_material_um,individual_supported_um,tip_rate_um_per_min'];for(const h of sim.history)for(const n of h.lengths)rows.push([h.time,h.somaArea,h.material,h.geometric,h.stable,h.available,h.resource,h.actin,h.contraction,h.processes,h.extending,h.retracting,n.id,n.length,n.stable,n.velocity].map(v=>Number(v).toFixed(6)).join(','));return rows.join('\n');}
$('csv').onclick=()=>{download(`cell-seed-${sim.seed}-measurements.csv`,csvText(),'text/csv');toast('Measurements exported for '+sim.history.length+' retained samples.');};
$('snapshot').onclick=()=>{renderer.render(sim);const a=document.createElement('a');a.href=renderer.snapshot();a.download=`cell-seed-${sim.seed}-${Math.floor(sim.time)}min.png`;a.click();toast('Synthetic microscope snapshot saved.');};
function basePlot(id,values,minimumMax){const c=$(id),r=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);c.width=Math.max(200,Math.round(r.width*dpr));c.height=Math.max(100,Math.round(r.height*dpr));const ctx=c.getContext('2d');ctx.scale(dpr,dpr);const w=c.width/dpr,h=c.height/dpr,L=35,R=8,T=14,B=29,plotW=w-L-R,plotH=h-T-B;
 const max=Math.max(minimumMax,...values.filter(Number.isFinite))*1.12;const end=Math.max(30,sim.time),start=sim.history[0]?.time||0;const X=t=>L+(t-start)/(end-start||1)*plotW,Y=v=>T+plotH-v/max*plotH;
 ctx.font='9px Arial';ctx.fillStyle='#7a8174';ctx.strokeStyle='#d4d4c6';ctx.lineWidth=.6;
 for(let i=0;i<=2;i++){let val=max/2*i,y=Y(val);ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();ctx.fillText(Math.round(val),1,y+3);}
 for(let i=0;i<3;i++){let t=mixNumber(start,end,i/2),x=X(t);ctx.fillText(Math.round(t)+'m',clamp(x-8,0,w-28),h-8);}
 return{ctx,X,Y};}
function mixNumber(a,b,f){return a+(b-a)*f;}
function plots(){let ids=[...new Set(sim.history.flatMap(h=>h.lengths.map(n=>n.id)))];let values=sim.history.flatMap(h=>h.lengths.map(n=>n.length));const {ctx,X,Y}=basePlot('lengthPlot',values,30);
 for(const id of ids){ctx.strokeStyle=colors[(id-1)%colors.length];ctx.lineWidth=id===renderer.selected?1.6:1.05;ctx.beginPath();let pen=false;for(const h of sim.history){const n=h.lengths.find(n=>n.id===id);if(!n){pen=false;continue;}if(!pen){ctx.moveTo(X(h.time),Y(n.length));pen=true;}else ctx.lineTo(X(h.time),Y(n.length));}ctx.stroke();}
 $('lengthLegend').innerHTML=sim.neurites.map(n=>`<span><span class="legend-line" style="background:${colors[(n.id-1)%colors.length]}"></span>N${n.id}</span>`).join('');
 const p=basePlot('statePlot',sim.history.map(h=>h.somaArea),200);p.ctx.strokeStyle='#617959';p.ctx.lineWidth=1.6;p.ctx.beginPath();sim.history.forEach((h,i)=>{if(!i)p.ctx.moveTo(p.X(h.time),p.Y(h.somaArea));else p.ctx.lineTo(p.X(h.time),p.Y(h.somaArea));});p.ctx.stroke();
}
function updateUI(){const m=sim.metrics();$('areaValue').textContent=m.somaArea.toFixed(0);$('lengthValue').textContent=m.material.toFixed(0);$('stableValue').textContent=(100*m.stable/Math.max(m.material,1e-9)).toFixed(0);$('waveValue').textContent=sim.stats.delivered;
 $('resourceText').textContent=Math.round(m.resource*100)+'%';$('resourceBar').style.width=100*m.resource+'%';$('activity').textContent=`${m.extending} extending / ${m.retracting} withdrawing`;
 $('phase').textContent=!running?'Paused · '+modelTime(sim.time):m.contraction>.3?'Somatic contraction':sim.waves.length?'Selective wave transport':'Local exploration';
 const ids=sim.neurites.map(n=>n.id).join(',');if($('selected').dataset.ids!==ids){$('selected').innerHTML=sim.neurites.map(n=>`<option value="${n.id}">N${n.id}${n.parent?' · lateral':''}</option>`).join('');$('selected').dataset.ids=ids;}
 if(!sim.getNeurite(renderer.selected))renderer.selected=sim.neurites[0].id;$('selected').value=renderer.selected;
 $('events').innerHTML=sim.events.slice(0,6).map(e=>`<div class="event"><time>${modelTime(e.t)}</time><span>${esc(e.text)}</span></div>`).join('');plots();
 $('backend').textContent=slow?'Playback limited by device · fixed solver step':'Solver 0.04 min · '+renderer.backend;
}
function frame(now){let elapsed=last?Math.min(.10,(now-last)/1000):0;last=now;
 if(running&&!document.hidden){accumulator+=elapsed*speed;const start=performance.now();let count=0;while(accumulator>=sim.dt&&count<200){sim.step();accumulator-=sim.dt;count++;if(count%10===0&&performance.now()-start>10)break;}computeMs=performance.now()-start;slow=accumulator>speed*.4;if(accumulator>speed*.6)accumulator=speed*.6;}
 if(now-lastRender>=32){renderer.render(sim);lastRender=now;drawCount++;}
 if(now-lastUI>=240){updateUI();lastUI=now;}
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;});
window.addEventListener('resize',()=>{renderer.resize();plots();});
// Explicit automation/testing API; the state is exposed for inspection.
window.lab={get simulation(){return sim;},get renderer(){return renderer;},get running(){return running;},setRunning(v){running=!!v;accumulator=0;updatePlay();},advance(min){running=false;accumulator=0;sim.advance(min);updatePlay();updateUI();renderer.render(sim);},reset(seed=2646,params=null){sim=new Simulation(seed,params||sim.params);accumulator=0;renderer.selected=1;syncControls();updateUI();renderer.render(sim);},restore(state){sim=CellImport.restore(state);accumulator=0;running=false;syncControls();updatePlay();updateUI();renderer.render(sim);},csv:csvText,render(){renderer.render(sim);updateUI();},get frameCount(){return drawCount;}};
syncControls();updatePlay();updateUI();renderer.render(sim);requestAnimationFrame(frame);
})();
