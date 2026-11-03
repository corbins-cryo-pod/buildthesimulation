import {PROFILES} from './engine/profiles.js';
import {Microscope,plot} from './renderer.js';

const $=id=>document.getElementById(id),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
let state=null,metrics=null,busy=false,selectedCell=0,selectedTip=null,assay=null,comparison=null,lastError='',checkpointCount=0;
const fmt=(v,d=1)=>Number.isFinite(v)?v.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const post=d=>{lastError='';$('status').classList.remove('error');worker.postMessage(d);};
const scope=()=>({cellId:selectedCell,tipId:selectedTip});
const microscope=new Microscope($('scene'),(cell,tip)=>{selectedCell=cell;selectedTip=tip;updateSelection();});
for(const p of PROFILES)$('profile').add(new Option(p.name,p.id));
const sliderDefs=[
  ['adhesion','Substrate adhesion',0,1,.05,''],['actin','Actin drive',0,3,.1,'×'],['microtubules','Microtubule support',0,3,.1,'×'],
  ['branching','Branch initiation',0,3,.1,'×'],['membraneSupply','Membrane supply',0,3,.1,'×'],['cargoRate','Material supply',0,100,1,'µm/h'],['transportSpeed','Cargo transport',0,1000,10,'µm/h'],
  ['motility','Cell motility',0,3,.1,'×'],['tension','Membrane tension',0,4,.1,'×'],['guidance','Cue response',0,3,.1,'×'],['fieldSource','Cue source',0,10,.1,'×'],['glialSupport','Repair support',0,2,.1,'×'],['synaptogenesis','Contact organization',0,1,.05,''],['synapticSupport','Contact support',0,1,.05,'']
];
for(const [i,[key,label,min,max,step,unit]] of sliderDefs.entries()){
  const l=document.createElement('label');l.className='control';l.htmlFor=`param-${key}`;l.append(document.createTextNode(label));const output=document.createElement('output');output.id=`value-${key}`;output.htmlFor=`param-${key}`;l.append(output);
  const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.id=`param-${key}`;input.dataset.unit=unit;l.append(input);$(i<7?'sliders':'environment-sliders').append(l);
  input.addEventListener('input',()=>{output.textContent=fmt(Number(input.value),step<1?2:0)+' '+unit;});
  input.addEventListener('change',()=>post({type:'intervene',action:{type:'parameter',key,value:Number(input.value)}}));
}
function init(){
  const seed=Number($('seed').value);if(!Number.isInteger(seed)||seed<0||seed>4294967295){error('Seed must be an integer between 0 and 4294967295.');return;}
  assay=comparison=null;$('assay-result').hidden=$('comparison-result').hidden=true;
  selectedCell=0;selectedTip=null;microscope.autoFit=true;
  $('loading').hidden=false;$('loading').textContent='Preparing experiment…';
  post({type:'init',profile:$('profile').value,options:{seed}});
}
function error(message){lastError=message;$('status').classList.add('error');$('status').textContent=message;$('loading').hidden=true;}
function download(content,name,type='application/json'){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function readings(id,rows){const box=$(id);box.replaceChildren();for(const [label,value] of rows){const row=document.createElement('div');row.className='reading';const l=document.createElement('span'),v=document.createElement('b');l.textContent=label;v.textContent=value;row.append(l,v);box.append(row);}}
function updateSelection(){
  if(!state)return;if(!state.cells[selectedCell])selectedCell=0;
  if(!state.tips[selectedTip]?.active||state.tips[selectedTip]?.cellId!==selectedCell)selectedTip=null;
  const cell=state.cells[selectedCell],m=metrics.perCell[selectedCell],cargo=metrics.cargo[selectedCell];
  $('cell-select').value=selectedCell;
  $('mobile-clock').textContent=`${fmt(state.timeHours,2)} h · Cell ${selectedCell+1}`;
  const tips=state.tips.filter(t=>t.active&&t.cellId===selectedCell),sig=tips.map(t=>`${t.id}-${t.kind}`).join(',');
  if($('tip-select').dataset.signature!==sig){$('tip-select').replaceChildren(new Option('Automatic', ''));for(const t of tips)$('tip-select').add(new Option(`Cone ${t.id+1} · ${t.kind}`,t.id));$('tip-select').dataset.signature=sig;}
  $('tip-select').value=selectedTip??'';
  const tip=state.tips[selectedTip];
  readings('cell-detail',[
    ['Development',cell.stage],['Minor neurites',fmt(m.minorLength)+' µm'],['Axons',fmt(m.axonLength)+' µm'],['Dendrites',fmt(m.dendriteLength)+' µm'],['Soma displacement',fmt(m.displacement)+' µm'],['Surface area',fmt(m.membraneArea,0)+' µm²'],['Area strain',fmt(m.areaStrain*100)+'%'],['Membrane reserve',fmt(m.reserve*100,0)+'%'],
    ...(tip?[['Cone state',tip.behavior.phase],['Cone speed',fmt(tip.forces.speed)+' µm/h'],['Clutch traction',fmt(tip.forces.traction)+' pN'],['Membrane load',fmt(tip.forces.membrane)+' pN'],['MT support',fmt(tip.mt,2)],['Local activator',fmt(state.segments[tip.segmentId].excitation?.a||0,3)]]:[])
  ]);
  readings('cargo-detail', [['At soma',fmt(cargo.free)+' µm-eq'],['In transit',fmt(cargo.transit)+' µm-eq'],['At tips',fmt(cargo.tips)+' µm-eq'],['Incorporated',fmt(cargo.incorporated)+' µm-eq'],['Lost / degraded',fmt(cargo.lost)+' µm-eq'],['Balance residual',Math.abs(cargo.residual).toExponential(1)]]);
  readings('contact-detail', [['Appositions',metrics.appositions],['Structural',metrics.structuralSynapses],['Functional',metrics.functionalSynapses],['Lost contacts',metrics.lostContacts],['Support agents',metrics.supportAgents],...(state.config.mode==='repair'?[['Support fronts meet',state.tissue.bridge.current?'Yes (proxy)':'No'],['Proximal front',fmt(state.tissue.bridge.frontProxUm)+' µm'],['Distal front',fmt(state.tissue.bridge.frontDistUm)+' µm']]:[])]);
  microscope.selectedCell=selectedCell;microscope.selectedTip=selectedTip;microscope.draw();
}
function updateState(d){
  state=d.state;metrics=d.metrics;busy=d.busy;$('loading').hidden=true;
  const profile=PROFILES.find(p=>p.id===state.config.profile)||PROFILES[0];$('profile').value=profile.id;$('profile-description').textContent=profile.subtitle;$('seed').value=state.config.seed;
  $('clock').textContent=fmt(state.timeHours,2);$('stage-label').textContent=state.cells.length===1?state.cells[0].stage:`${state.cells.length} cells`;
  $('play').disabled=busy||state.limits.reached||state.timeHours>=168;$('pause').disabled=!busy;
  $('mobile-toggle').textContent=busy?'Pause':'▶ Run';$('mobile-toggle').disabled=!busy&&(state.limits.reached||state.timeHours>=168);$('mobile-advance').disabled=busy||state.limits.reached||state.timeHours>=168;
  for(const b of document.querySelectorAll('[data-advance]'))b.disabled=busy||state.limits.reached||state.timeHours>=168;
  $('compare').disabled=busy||state.limits.reached||state.timeHours>=168;$('assay').disabled=busy;
  $('activate').disabled=$('cut').disabled=busy||!state.tips.some(t=>t.active&&t.cellId===selectedCell);
  document.querySelector('.live-dot').classList.toggle('running',busy);
  $('m-length').textContent=fmt(metrics.totalLength,0);$('m-tips').textContent=metrics.activeTips;$('m-branches').textContent=metrics.branches;$('m-contacts').textContent=metrics.functionalSynapses;
  if($('cell-select').options.length!==state.cells.length){$('cell-select').replaceChildren();for(const c of state.cells)$('cell-select').add(new Option(`Cell ${c.id+1}`,c.id));}
  for(const [key,,,,step,unit] of sliderDefs){const input=$(`param-${key}`);if(document.activeElement!==input){input.value=state.config[key];$(`value-${key}`).textContent=fmt(state.config[key],step<1?2:0)+' '+unit;}}
  $('excitation').value=state.config.excitation;
  $('checkpoint').replaceChildren();d.checkpoints.forEach((s,i)=>$('checkpoint').add(new Option(`${fmt(s.timeHours,2)} h · ${s.interventions} edits`,i)));
  if(checkpointCount!==d.checkpoints.length||d.reset)$('checkpoint').value=d.checkpoints.length-1;else $('checkpoint').value=Math.min(checkpointCount-1,d.checkpoints.length-1);checkpointCount=d.checkpoints.length;
  $('rewind').disabled=busy;$('checkpoint').disabled=busy;
  const limited=state.limits.tipLimitedCount+(state.limits.contactLimitedCount||0);$('limit-status').textContent=state.limits.reached?`${state.limits.reason}. Run paused; this is a computational limit.`:`${metrics.totalSegments.toLocaleString()} / ${state.config.maxSegments.toLocaleString()} allocated segments · ${state.config.maxTipsPerCell} tips/cell cap${limited?` · ${limited} allocation attempts capped`:''}`;
  $('limit-status').classList.toggle('caution',state.limits.reached||limited>0);
  $('scene-label').textContent=({culture:'COVERSLIP',pattern:'PATTERNED SUBSTRATE',gel:'3D GEL',repair:'300 µm REPAIR GAP',interface:'INTERFACE CULTURE'})[state.config.mode]+(microscope.view==='structure'?' / STRUCTURE':' / X–Z');
  if(!lastError){$('status').textContent=state.limits.reached?state.limits.reason:busy?(d.target?`Calculating to ${fmt(d.target,1)} h…`:'Calculating matched experiment…'):state.timeHours>=168?'168 h session horizon reached. Export this run to preserve it.':`Paused at ${fmt(state.timeHours,2)} h · seed ${state.config.seed} · ${state.interventions.length} interventions`;}
  microscope.setState(state);updateSelection();drawGrowth();
}
function drawGrowth(){if(!state)return;const rows=[...state.history];if(rows.at(-1)?.timeHours!==state.timeHours)rows.push(metrics);else rows[rows.length-1]=metrics;plot($('growth-chart'),[['minorLength','#a1854c'],['totalAxonLength','#4a796c'],['totalDendriteLength','#827099']].map(([key,color])=>({color,points:rows.map(r=>[r.timeHours,r[key]||0])})));}
function drawAssay(){if(!assay)return;plot($('assay-chart'),[{color:'#4a796c',points:assay.passive.samples.map(s=>[s.timeMs,s.somaMV])},{color:'#a1854c',points:assay.passive.samples.map(s=>[s.timeMs,s.distalMV])}],{xLabel:'Time (ms)',yLabel:'Voltage (mV)',minY:null});}
function drawComparison(){if(!comparison)return;plot($('comparison-chart'),[{color:'#4a796c',points:comparison.samples.map(s=>[s.hours-comparison.startHours,s.control])},{color:'#a1854c',points:comparison.samples.map(s=>[s.hours-comparison.startHours,s.intervention])}],{xLabel:'Elapsed (h)',maxX:comparison.endHours-comparison.startHours});}
worker.onmessage=({data:d})=>{
  if(d.type==='state')updateState(d);
  else if(d.type==='error')error(d.message);
  else if(d.type==='export')download(d.content,`neural-growth-v5-${state.config.seed}-${state.timeHours.toFixed(2)}h.${d.format}`,d.format==='json'?'application/json':'text/plain');
  else if(d.type==='assay'){
    assay=d.result;$('assay-result').hidden=false;const a=assay.enabled,b=assay.blocked,received=a.deliveries.length;
    $('assay-caption').textContent=`At ${fmt(a.growthTimeHours,2)} h, cell ${a.sourceCellId+1}. Passive cable: ${assay.passive.compartments} compartments, 10 pA pulse. Green: soma; brass: distal end. Separate point-neuron assay: ${a.edges.length} functional edges, ${received} delivered events (${b.deliveries.length} blocked), ${a.spikes.length} vs ${b.spikes.length} total spikes. ${!a.edges.length?'No functional connections exist in this snapshot. ':''}Growth is unchanged.`;drawAssay();
  }else if(d.type==='comparison'){
    comparison=d.result;$('comparison-result').hidden=false;$('comparison-caption').textContent=`Seed ${comparison.seed} · checkpoint ${fmt(comparison.startHours,2)} h → ${fmt(comparison.endHours,2)} h · ${comparison.action.key} = ${comparison.action.value}. Green: unchanged control. Brass: intervention. Original experiment remains at its checkpoint.`;
    const table=document.createElement('table'),head=table.createTHead().insertRow();for(const value of ['Measure','Control','Intervention','Difference']){const th=document.createElement('th');th.textContent=value;head.append(th);}const body=table.createTBody();
    for(const [key,label] of [['totalLength','Arbor length (µm)'],['branches','Branch points'],['activeTips','Active tips'],['functionalSynapses','Functional contacts'],['meanDisplacement','Soma displacement (µm)']]){const row=body.insertRow(),a=comparison.control[key]??0,b=comparison.intervention[key]??0;for(const value of [label,fmt(a),fmt(b),(b-a>=0?'+':'')+fmt(b-a)])row.insertCell().textContent=value;}
    $('comparison-table').replaceChildren(table);drawComparison();$('comparison-result').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
};
worker.onerror=e=>error(`The calculation stopped: ${e.message||'worker failed to load'}. Reload the workspace to retry.`);
$('reset').onclick=init;$('profile').onchange=init;
$('play').onclick=()=>post({type:'play'});$('pause').onclick=()=>post({type:'pause'});
$('mobile-toggle').onclick=()=>post({type:busy?'pause':'play'});$('mobile-advance').onclick=()=>post({type:'advance',hours:6});
for(const button of document.querySelectorAll('[data-advance]'))button.onclick=()=>post({type:'advance',hours:Number(button.dataset.advance)});
$('excitation').onchange=()=>post({type:'intervene',action:{type:'parameter',key:'excitation',value:$('excitation').value}});
$('activate').onclick=()=>post({type:'intervene',action:{type:'activate',...scope()}});$('cut').onclick=()=>post({type:'intervene',action:{type:'cut',...scope()}});
$('compare').onclick=()=>{const [key,value]=({transport:['transportSpeed',0],actin:['actin',.2],adhesion:['adhesion',0],supply:['cargoRate',0],support:['glialSupport',0]})[$('comparison-action').value];post({type:'compare',action:{type:'parameter',key,value},hours:4});};
$('assay').onclick=()=>post({type:'assay',cellId:selectedCell});
$('cell-select').onchange=()=>{selectedCell=Number($('cell-select').value);selectedTip=null;updateSelection();};$('tip-select').onchange=()=>{selectedTip=$('tip-select').value===''?null:Number($('tip-select').value);updateSelection();};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{microscope.view=button.dataset.view;$('scene-label').textContent=$('scene-label').textContent.replace(/ \/ (X–Z|STRUCTURE)$/,microscope.view==='structure'?' / STRUCTURE':' / X–Z');for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b===button));$('gesture').textContent=microscope.view==='structure'?'Drag to orbit · shift-drag to pan · scroll to zoom':'Drag to pan · scroll to zoom';$('view-note').textContent=microscope.view==='structure'?'Orthographic projection · same state':'Illustrative contrast · solved geometry';if(microscope.autoFit)microscope.fit();microscope.draw();};
$('fit').onclick=()=>{microscope.fit();microscope.draw();};$('overlay').onchange=()=>{microscope.overlay=$('overlay').value;microscope.draw();};$('show-field').onchange=()=>{microscope.showField=$('show-field').checked;microscope.draw();};
$('rewind').onclick=()=>post({type:'rewind',index:Number($('checkpoint').value)});
for(const button of document.querySelectorAll('[data-export]'))button.onclick=()=>post({type:'export',format:button.dataset.export,cellId:selectedCell});
$('export-assay').onclick=()=>download(JSON.stringify(assay,null,2),'neural-growth-v5-assay.json');$('export-comparison').onclick=()=>download(JSON.stringify(comparison,null,2),'neural-growth-v5-comparison.json');
$('import-button').onclick=()=>$('import-file').click();$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>32*1024*1024)throw Error('Checkpoint exceeds the 32 MB import limit.');const state=JSON.parse(await file.text());post({type:'restore',state});}catch(e){error(e.message);}$('import-file').value='';};
$('methods-open').onclick=()=>$('methods').showModal();$('methods-close').onclick=()=>$('methods').close();$('methods').addEventListener('click',e=>{if(e.target===$('methods')){const r=$('methods').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('methods').close();}});
new ResizeObserver(()=>{drawGrowth();drawAssay();drawComparison();}).observe($('growth-chart'));
// Read-only diagnostic snapshots also make the numerical state inspectable.
Object.defineProperty(window,'v5App',{value:Object.freeze({get state(){return structuredClone(state);},get metrics(){return structuredClone(metrics);},get busy(){return busy;},get assay(){return structuredClone(assay);},get comparison(){return structuredClone(comparison);}})});
init();
