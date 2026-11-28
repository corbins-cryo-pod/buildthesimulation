(function(){
'use strict';
const $=id=>document.getElementById(id),db=JSON.parse($('equipment-data').textContent),F=ToolFit;
const nodes=Object.fromEntries(Object.keys(F.base).map(k=>[k,$(k)])), a=$('station-a'),b=$('station-b'),preset=$('preset'),job=$('job');
const tag=(type,txt,cls)=>{const e=document.createElement(type);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;};
const link=(txt,url)=>{const e=tag('a',txt);e.href=url;return e;};
const site=p=>p&&p.startsWith('/')?'https://buildthesimulation.com'+p:p;
const fmt=n=>Intl.NumberFormat('en-US',{maximumSignificantDigits:5}).format(n);
const read=()=>Object.fromEntries(Object.entries(nodes).map(([k,e])=>[k,['size','width','height','feature'].includes(k)?(e.value===''?null:Number(e.value)):e.value]));
function option(v,t){const o=tag('option',t);o.value=v;return o;}
for(const p of F.presets)preset.append(option(p.id,p.label));
preset.append(option('custom','Custom comparison'));
for(const [k,v] of Object.entries(F.jobs))job.append(option(k,v));
for(const pick of [a,b]){
 const groups={};
 for(const r of db.records){if(!groups[r.zoneId]){groups[r.zoneId]=tag('optgroup');groups[r.zoneId].label=r.zoneId+' · '+r.zone;pick.append(groups[r.zoneId]);}groups[r.zoneId].append(option(r.id,r.id+' · '+r.name));}
}
function gates(box,title,res,layer){
 const container=tag('div',undefined,'group'),top=tag('div',undefined,'group-head');top.append(tag('h4',title),tag('span',F.labels[res.status],'chip '+res.status));container.append(top);
 container.dataset.fitLayer=layer;
 const ul=tag('ul',undefined,'gates');for(const [i,g] of res.gates.entries()){
  const li=tag('li'),key=tag('span',({within:'Within',outside:'Outside',unknown:'Unknown'})[g.status]+' · ','gate-key '+g.status);
  li.dataset.fitGate=String(i);
  li.append(key,tag('strong',g.title),tag('p',g.reason));ul.append(li);
 }container.append(ul);box.append(container);
}
function renderTool(box,r,v){
 box.replaceChildren();const title=tag('h3');const l=link(r.model,site(r.url));l.className='title-link';title.append(l);box.append(title,tag('p',r.realization+' · '+r.simulationScope,'kit'));
 gates(box,'Documentation',v.reference,'reference');gates(box,'Virtual experiment',v.virtual,'virtual');
 const details=tag('details',undefined,'evidence'),sr=tag('summary','Show limits and sources');details.append(sr);
 const limits=tag('ul');for(const lim of r.limits)limits.append(tag('li',lim));details.append(limits);
 const roles=tag('p','Dictionary roles: '+r.operations.map(x=>db.operations[x]||x).join('; ')+'.','tiny');details.append(roles);
 const sources=tag('ul'),keys=new Set(v.reference.gates.flatMap(x=>x.sourceIds));
 sources.append(tag('li'));sources.lastChild.append(link('Equipment register: '+r.id,site(r.url)));
 if(r.simulatorUrl){sources.append(tag('li'));sources.lastChild.append(link('Existing virtual experiment and its documented configuration',site(r.simulatorUrl)));}
 for(const k of keys)if(db.sources[k]){const li=tag('li');li.append(link(db.sources[k].title,db.sources[k].url));sources.append(li);}
 if(keys.has('geometry'))sources.append(tag('li','Analytic comparison: side lengths of a square, or Pythagoras for the four corners of a centered rectangle on a circle.'));
 details.append(sources);box.append(details);
}
const svgEl=(type,o)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',type);for(const [k,v] of Object.entries(o))el.setAttribute(k,String(v));return el;};
const desc={
 dry:'A cassette, arm and chuck share a fixture configuration. A different nominal wafer diameter does not become a match because the product family supports other tooling.',
 spin:'Look for a film map or material revision. A dry transport ledger can show that a wafer moved; it cannot show a thickness.',
 deep:'A calibration for a single silicon trench is not a mounted 200 mm wafer or a validated through-release. A saw and an ICP chamber are not interchangeable.',
 eis:'The measurement instrument, test cell and electrode are distinct. An ideal circuit is a reference signal, not measured electrode performance.',
 plate:'Distinguish deposition from characterization. A credible coating claim would require an actual material process and a witness; an EIS model supplies neither.',
 bond:'Distinguish the ability to place parts, align a wafer pair and make a permanent joint. One station can illustrate a single stage without realizing the next.',
 seam:'A complete seam path is a geometric observation. It is not evidence that a real weld exists or is leak tight.',
 leak:'Inspecting a synthetic detector trace checks the readout model, not the seal of any particular physical package.',
 qualify:'The manufacturing path, observed seam, detector model and measured physical article are four different records. Physical acceptance needs its own test evidence.'
};
function draw(d){
 const aside=$('sample-view');aside.replaceChildren(tag('p',d.job==='optical'?'Top view · schematic':'What this comparison means','eyebrow'));
 if(d.job!=='optical'){aside.append(tag('p',desc[d.job],'tip'));return;}
 if(![d.width,d.height,d.size].every(v=>Number.isFinite(v)&&v>0)){aside.append(tag('p','Enter positive dimensions to draw the sample and footprint.','tip'));return;}
 const scale=134/Math.max(d.size,d.width,d.height),s=d.size*scale,w=d.width*scale,h=d.height*scale;
 const figure=svgEl('svg',{viewBox:'0 0 280 160',role:'img','aria-label':'Centered rectangular written area on a '+(d.shape==='square'?'square sample':'round wafer')});
 const samp=d.shape==='square'?svgEl('rect',{x:140-s/2,y:80-s/2,width:s,height:s}):svgEl('circle',{cx:140,cy:80,r:s/2});
 samp.setAttribute('fill','#e0e8dc');samp.setAttribute('stroke','#527265');samp.setAttribute('stroke-width','1.5');figure.append(samp);
 figure.append(svgEl('path',{d:'M15 80H265M140 4V156',fill:'none',stroke:'#b0b8ad','stroke-width':'.8','stroke-dasharray':'3 4'}));
 figure.append(svgEl('rect',{x:140-w/2,y:80-h/2,width:w,height:h,fill:'#ac734a','fill-opacity':'.5',stroke:'#905624','stroke-width':'2'}));aside.append(figure);
 aside.append(tag('p','Green: '+fmt(d.size)+' mm '+(d.shape==='square'?'square carrier.':'diameter wafer.')+' Ochre: '+fmt(d.width)+' × '+fmt(d.height)+' mm written footprint, centered with all four corners occupied.','caption'));
}
const fitPlay=$('fit-play'),fitBack=$('fit-back'),fitNext=$('fit-next');
const stagesFor={intake:'Requirement',reference:'Documentation',virtual:'Virtual experiment',result:'Decision'};
const briefStatus={within:'Within this gate',outside:'Outside configuration',unknown:'Not established'};
let recent,plan=[],pair=[],seenStep=-1;
const fitRoom=FoundryBenchCleanroom.create($('fit-cleanroom'),'tool-fit');
const player=FoundryBenchPlay.create({paint:showStage,delay:FoundryBenchCleanroom.duration});
function fitRoomStage(current,stage){
 if(!current||pair.length!==2)return null;
 const names=pair.map((r,i)=>(i?'B':'A')+' · '+r.id+' '+r.model);
 const verdict=current.gates
  ?current.gates.map((g,i)=>(i?'B':'A')+': '+(g?briefStatus[g.status]+' — '+g.title:'no additional gate')).join(' · ')
  :current.results
   ?current.results.map((result,i)=>(i?'B':'A')+': documentation '+F.labels[result.reference.status]+'; virtual experiment '+F.labels[result.virtual.status]).join(' · ')
   :'The same requirement is queued for both stations. No device is loaded.';
 return {phaseId:'fit-'+stage,kind:'handoff',effect:'handoff',machine:'Two-station comparison bay',
  operation:current.title,specimen:'Digital requirement card',before:current.note,after:verdict,
  settings:[['Station A',names[0]],['Station B',names[1]],['Programming and loading','None; this page does not execute either station.']],
  evidence:'Compare the published configuration and the implemented software independently. This is a review of fit evidence, not physical processing or qualification.'};
}
function summaryFor(d){
 const val=(x,u)=>Number.isFinite(x)?fmt(x)+' '+u:'not specified';
 if(d.job==='optical'){
  const shape=d.shape==='round'?'wafer diameter':'carrier side';
  const f=d.pattern==='dense'?'each line and each gap':'isolated feature';
  return 'Compare the same '+shape+' ('+val(d.size,'mm')+'), written footprint ('+val(d.width,'mm')+' by '+val(d.height,'mm')+'), and '+f+' ('+val(d.feature,'µm')+').';
 }
 if(d.job==='deep')return 'Compare '+(d.material==='si'?'silicon':d.material==='iii-v'?'a III–V material':'an unspecified material')+' at '+val(d.size,'mm')+', asking for '+(d.end==='trench'?'one isolated trench':'a through-release of the device')+'. Diameter, material and output state are separate gates.';
 if(d.job==='dry'||d.job==='bond')return 'Compare a '+val(d.size,'mm')+' '+(d.shape==='square'?'square carrier':'round wafer')+' and the selected '+(d.job==='bond'?'alignment and bond requirement.':'dry handling role.');
 return desc[d.job]||'Compare the reviewed gates without substituting similar tools.';
}
function prepareTour(d,records,results){
 pair=records;
 plan=[{phase:'intake',title:F.jobs[d.job],note:summaryFor(d)}];
 for(const layer of ['reference','virtual']){
  const n=Math.max(...results.map(v=>v[layer].gates.length));
  for(let i=0;i<n;i++){
   const gates=results.map(v=>v[layer].gates[i]||null);
   plan.push({phase:layer,gateIndex:i,gates,title:stagesFor[layer]+' · gate '+(i+1)+' of '+n,note:layer==='reference'?'Current reference checks for each named configuration.':'Current checks in each selected browser experiment, not evidence of hardware operation.'});
  }
 }
 plan.push({phase:'result',title:'Read the two verdicts separately',note:'No physical result, equipment access, process qualification or permission is established by these checks.',results});
 seenStep=-1;player.load(plan.length);
}
function showStage(state){
 const {progress,total,mode}=state,current=plan[progress-1],phase=current?.phase||'intake';
 const rail=$('fit-player'),meter=$('fit-progress'),stage=$('fit-stage');
 rail.dataset.playback=mode;rail.dataset.step=String(progress);stage.dataset.phase=phase;
 fitPlay.textContent=FoundryBenchPlay.playLabel[mode];
 fitBack.disabled=progress===0;fitNext.disabled=!total||progress===total;
 meter.max=total||1;meter.value=progress;
 rail.style.setProperty('--fit-travel',((total?progress/total:0)*100)+'%');
 $('fit-count').textContent=progress+' of '+total+' stages reviewed';
 $('fit-stage-title').textContent=current?.title||'Ready to compare';
 $('fit-stage-note').textContent=current?.note||'Play checks the current pair one stage at a time. Change any input or select another station to stop and reset the tour.';
 for(const li of rail.querySelectorAll('[data-fit-phase]')){
  if(li.dataset.fitPhase===phase)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');
 }
 const cards=$('fit-stage-cards');cards.replaceChildren(...pair.map((r,i)=>{
  const box=tag('div',undefined,'fit-stage-card');
  box.append(tag('p','Station '+(i?'B':'A')+' · '+r.id,'caption'),tag('h4',r.model));
  if(current?.gates){
   const g=current.gates[i];
   if(g){
    const line=tag('p',undefined,'fit-gate-label');line.append(tag('strong',g.title),tag('span',briefStatus[g.status],'chip '+g.status));box.append(line,tag('p',g.reason,'fit-reason'));
   }else box.append(tag('p','No additional '+(phase==='reference'?'documentation':'virtual')+' gate for this station.','fit-reason'));
  }else if(current?.results){
   const result=current.results[i];
   for(const [layer,label] of [['reference','Documentation'],['virtual','Virtual experiment']]){
    const st=result[layer].status,line=tag('p',undefined,'fit-gate-label');line.append(tag('strong',label),tag('span',F.labels[st],'chip '+st));box.append(line);
   }
  }else box.append(tag('p',current?r.name:r.realization,'fit-reason'));
  return box;
 }));
 for(const x of document.querySelectorAll('.fit-current-gate')){x.classList.remove('fit-current-gate');x.removeAttribute('aria-current');}
 if(current?.gates)for(const station of ['result-a','result-b']){
  const li=$(station).querySelector('[data-fit-layer="'+phase+'"] [data-fit-gate="'+current.gateIndex+'"]');
  if(li){li.classList.add('fit-current-gate');li.setAttribute('aria-current','step');}
 }
 if(seenStep!==progress){
  const headline=current?('Stage '+progress+' of '+total+'. '+current.title+'. '+(current.gates?current.gates.filter(Boolean).map(g=>g.title).join('; '):'')):'Playback reset to the current comparison.';
  $('fit-announce').textContent=headline;seenStep=progress;
 }
 fitRoom.update(state,fitRoomStage(current,progress));
}
fitPlay.addEventListener('click',()=>player.toggle());
fitBack.addEventListener('click',()=>player.previous());
fitNext.addEventListener('click',()=>player.next());
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
function show(){
 const d=read(),r1=db.records.find(x=>x.id===a.value),r2=db.records.find(x=>x.id===b.value);
 const v1=F.evaluate(db,a.value,d),v2=F.evaluate(db,b.value,d);
 document.querySelectorAll('[data-jobs]').forEach(e=>e.hidden=!e.dataset.jobs.split(' ').includes(d.job));
 $('size-label').textContent=d.shape==='square'?'Carrier side (mm)':'Wafer diameter (mm)';$('feature-label').textContent=d.pattern==='dense'?'Each line and each space (µm)':'Feature width (µm)';
 renderTool($('result-a'),r1,v1);renderTool($('result-b'),r2,v2);draw(d);
 $('summary').textContent=[v1,v2].map((v,i)=>'Station '+(i?'B':'A')+': '+F.labels[v.reference.status]+' in documentation; '+F.labels[v.virtual.status]+' in virtual experiment.').join(' ');
 recent={schema:'bts.tool-fit-comparison.v1',modelVersion:F.version,dictionarySnapshot:db.snapshot,dictionarySha256:db.dictionarySha256,requirement:Object.fromEntries(Object.entries(d).filter(([k])=>k==='job'||!nodes[k].closest('[data-jobs]')?.hidden)),evidence:{},stations:[v1,v2],physicalQualification:'Not evaluated. This is not a fabrication, ownership, permission or test result.'};
 for(const [r,v] of [[r1,v1],[r2,v2]]){
  recent.evidence[r.id]={model:r.model,register:site(r.url),simulator:site(r.simulatorUrl),limits:r.limits,external:Object.fromEntries([...new Set(v.reference.gates.flatMap(q=>q.sourceIds))].filter(k=>db.sources[k]).map(k=>[k,db.sources[k]]))};
 }
 prepareTour(d,[r1,r2],[v1,v2]);
}
function apply(id){
 const p=F.presets.find(p=>p.id===id);if(!p)return;
 const data=F.jobState(id);for(const [k,n] of Object.entries(nodes))n.value=data[k];preset.value=id;a.value=p.a;b.value=p.b;$('case-note').textContent=p.note;show();
}
function custom(){preset.value='custom';$('case-note').textContent='Custom comparison. Unknowns remain explicit; compare the same requirement across any two registered stations.';show();}
preset.addEventListener('change',()=>preset.value==='custom'?custom():apply(preset.value));
$('request').addEventListener('input',custom);$('request').addEventListener('submit',e=>e.preventDefault());a.addEventListener('change',custom);b.addEventListener('change',custom);
$('export').addEventListener('click',()=>{player.pause();const blob=new Blob([JSON.stringify(recent,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=link('Export',u);a.download='tool-fit-'+recent.stations.map(x=>x.toolId).join('-vs-')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);});
$('provenance').textContent=Object.keys(F.jobs).length+' questions · '+db.records.length+' selectable register entries · '+Object.keys(F.expectedOps).length+' explicitly reviewed station IDs · model '+F.version+' · source revision '+db.snapshot.commit.slice(0,12)+' · evidence checked '+db.snapshot.checked+'.';
const fromURL=new URLSearchParams(location.hash.slice(1)).get('case');apply(F.presets.some(p=>p.id===fromURL)?fromURL:'panel');
})();
