/* Independent travelers, process inspectors, provenance-preserving reports. */
(function(){
'use strict';
const E=globalThis.GrapheneEngine,V=globalThis.GrapheneVisual,$=x=>document.getElementById(x),Q=x=>[...document.querySelectorAll(x)];
const EQ=JSON.parse($('equipment-data').textContent),siteRoot=location.protocol==='file:'?'https://buildthesimulation.com':'';
const samples=['clear','delft'],ruler={clear:0,delft:0};
let cond=Object.fromEntries(samples.map(k=>[k,{...E.PRESETS[k]}])),model={},current='plan',preset=null,timer=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const es=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const id=(k,j)=>k+'-'+j;
const ft=(n,p=1)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:p}).format(n);
const viewhelp={
  plan:'Plan view, same physical XY scale for both coupon layouts.',
  section:'Exploded cross-section, with Z enlarged. Materials are placed in process order.',
  aperture:'Local windows enlarged to their own diameters. Geometric proof, not a transmission test.'
};
function stageText(k,i){
  return String(i+1).padStart(2,'0')+' · '+E.SAMPLE[k].stages[i][0];
}
function install(){
  $('samples').innerHTML=samples.map(k=>{
    const s=E.SAMPLE[k];
    return '<article class="sample" id="'+k+'" data-sample="'+k+'" aria-labelledby="'+id(k,'head')+'"><div class="sample-head"><div><p>'+es(s.short)+' / '+es(s.sub)+'</p><h3 id="'+id(k,'head')+'">'+es(s.name)+'</h3></div><span class="tag">'+es(s.id)+'</span></div>'+
      '<div class="stage-strip"><button id="'+id(k,'prev')+'" aria-label="Previous '+s.short+' stage" type="button">←</button><label class="sr-only" for="'+id(k,'process')+'">Select '+s.short+' process stage</label><select id="'+id(k,'process')+'">'+s.stages.map((a,i)=>'<option value="'+i+'">'+es(stageText(k,i))+'</option>').join('')+'</select><button id="'+id(k,'next')+'" aria-label="Next '+s.short+' stage" type="button">→</button></div>'+
      '<figure class="specimen" id="'+id(k,'figure')+'"></figure><div class="sample-body"><div class="stage-index" id="'+id(k,'idx')+'"></div><span class="stage-title" id="'+id(k,'title')+'"></span><p id="'+id(k,'desc')+'"></p>'+
      '<div class="stage-dep" id="'+id(k,'external')+'" hidden></div><p class="stage-tools" id="'+id(k,'tools')+'"></p><p class="stage-read" id="'+id(k,'status')+'"></p></div></article>';
  }).join('');
  const sel=(k,name,label,choices)=>'<label>'+es(label)+'<select id="'+id(k,name)+'">'+choices.map(x=>'<option value="'+x[0]+'">'+es(x[1])+'</option>').join('')+'</select></label>';
  const slider=(k,name,label,max,increment)=>'<label>'+es(label)+' · <output id="'+id(k,name+'-value')+'">0</output><input type="range" id="'+id(k,name)+'" min="0" max="'+max+'" step="'+increment+'" value="0" aria-label="'+es(label)+'"></label>';
  $('parameters').innerHTML='<fieldset class="parameters-card"><legend>CL-04 · CLEAR</legend><div class="fields">'+
    sel('clear','tear','Transfer defects',[['none','No modeled tear'],['one','A break in the newest sheet'],['aligned','Coincident breaks in every sheet'],['staggered','Staggered breaks across sheets']])+
    sel('clear','transferPath','Inter-sheet electrical access',[['terminal','Common terminals only'],['ideal','Ideal interior ties (hypothetical)']])+
    slider('clear','windowShift','Contact-window X offset',2,.02)+'</div></fieldset>'+
    '<fieldset class="parameters-card"><legend>DL-ML · Delft</legend><div class="fields">'+
    sel('delft','diameter','Reported site diameter choices',[[10,'10 µm'],[30,'30 µm'],[50,'50 µm']])+
    sel('delft','inner','Inner track fault',[['intact','Graphene and Mo connected'],['carbon-break','Graphene interrupted; Mo intact'],['mo-open','Mo interrupted; graphene intact'],['both-break','Both paths interrupted']])+
    slider('delft','moAtFace','Residual Mo at the opened face',1,.01)+slider('delft','windowShift','Contact-window X offset',2,.02)+
    '</div></fieldset>';
  $('reports').innerHTML=samples.map(k=>{
    const d=E.SAMPLE[k];
    return '<article class="read-card" id="'+id(k,'results')+'" aria-labelledby="'+id(k,'result-head')+'"><div class="read-head"><h3 id="'+id(k,'result-head')+'">'+d.id+' · '+d.short+'</h3><span id="'+id(k,'verdict')+'" class="verdict"></span></div><dl class="results-list" id="'+id(k,'values')+'"></dl><p class="result-why" id="'+id(k,'why')+'"></p><button data-artwork="'+k+'" type="button">Download '+d.id+' inspection SVG</button></article>';
  }).join('');
  $('witnesses').innerHTML=samples.map(k=>{
    const d=E.SAMPLE[k],p=E.SOURCE[k];
    return '<article class="witness-card" id="'+id(k,'evidence')+'"><h3>'+d.id+' · '+d.short+'</h3>'+V.evidenceChart(k)+d.evidence.map(s=>'<div class="witness-item"><h4>'+es(s.label)+'</h4><p class="witness-main">'+es(s.main)+'</p><p>'+es(s.desc)+'</p></div>').join('')+
      '<p class="source"><a href="'+p.url+'">'+es(p.title)+'</a><br>'+es(p.scope)+'</p><p class="source"><a href="'+siteRoot+'/devices/'+d.catalog+'/">Catalog device record →</a></p></article>';
  }).join('');
  $('method-body').innerHTML='<ul><li><strong>CLEAR virtual line:</strong> The 1-layer and 4-layer reported TLM witness endpoints are 152 and 76 Ω/□. For n transferred sheets the intentionally simple interpolation is 152/√n; equivalent sheet paths have four equal sections and are then solved at 1 V between common terminals. The hypothetical interior-tie mode imposes perfect local electrical exchange. Neither individual-sheet conductivity nor bridging between torn segments was recovered from the source.</li>'+
    '<li><strong>Delft virtual line:</strong> The inner circuit solves equivalent sheet paths in parallel, followed by a common carbon-facing section and lead term. Model assumptions are 120 Ω/□ graphene, 1.06 Ω/□ Mo (a bulk-based illustration, not a thin-film measurement) and an assumed end term. The graph is a dry teaching model and never borrows CLEAR resistance values or estimates the wet electrode impedance.</li>'+
    '<li><strong>Optical area:</strong> Under equal-radius design contact and opening masks, calculate their exact plan-area overlap after X offset. Temporary caps block qualified access; for the Delft fault remove the declared residual-Mo area fraction from the overlap. Color and sector labels are diagrammatic, not optical constants or physical metrology. Nominally the top carbon can be visible even while residual Mo below it still intercepts the optical window.</li>'+
    '<li><strong>Bench gate:</strong> An independent stage-12 read requires an end-to-end dry path and a nominal clear aperture within this calculator. Recorded process defects still display a hold when they survive the gate. Sample IDs, fabrication ledger, geometry calculations and primary-source witness records stay independent.</li>'+
    '<li><strong>Scope:</strong> These virtual coupons do not reproduce INBRAIN, another rGO technology, or either paper\'s full mask artwork. Geometry drawn beyond the source specifications is labeled; process classes do not imply a qualified powder, substrate, tool or recipe. No optical device-use, tissue, efficacy, or biological application is modeled.</li></ul>';
  if(siteRoot)Q('a[href^="/"]').forEach(a=>a.setAttribute('href',siteRoot+a.getAttribute('href')));
}
function verdict(m){
  if(!m.ready)return ['IN PROCESS','','Complete this traveler or run both to the bench. Readouts from the other sample are unchanged.'];
  if(m.dry===null)return ['DRY OPEN','fail',m.key==='clear'?'The selected electrical coupling rules do not create an end-to-end carbon path. Four logged transfers are not proof of four intact sheets.':'Neither inner path reaches the common carbon-facing section.'];
  if(m.clearFraction<.999)return ['WINDOW HOLD','hold',m.note||'The line conducts, but the modeled opening is not nominal. Optical aperture and dry continuity are separate.'];
  const hid=m.key==='clear'?m.o.tear!=='none':m.o.inner!=='intact';
  if(hid)return ['READS WITH DEFECT','hold',m.key==='clear'?'The dry path and window pass this limited gate. The transfer defect is still present.':'The dry path survived through the remaining conductor. This does not prove the buried stack is intact.'];
  return ['VIRTUAL BENCH PASS','pass','The reconstructed path reaches the terminal and the modeled aperture is clear. This is not manufacturing qualification.'];
}
function refresh(k){
  const p=E.SAMPLE[k],m=(model[k]=E.model(k,ruler[k],cond[k])),s=m.s,st=p.stages[s];
  $(id(k,'process')).value=s;
  $(id(k,'prev')).disabled=s===0;
  $(id(k,'next')).disabled=s===11;
  $(id(k,'idx')).textContent='TRAVELER '+String(s+1).padStart(2,'0')+' / 12';
  $(id(k,'title')).textContent=st[0];
  $(id(k,'desc')).textContent=st[1];
  const ex=$(id(k,'external'));ex.hidden=!st[3];ex.textContent=st[3]?'EXTERNAL / '+st[3]:'';
  $(id(k,'tools')).innerHTML='<span class="micro">REGISTER</span> '+st[2].map(i=>'<a href="'+siteRoot+'/simulations/equipment/'+i+'/" title="'+es(EQ[i]?.model||'Process-class link')+'">'+i+' '+es(EQ[i]?.name||'Equipment')+'</a>').join(' · ');
  $(id(k,'status')).textContent=k==='clear'?(m.n+' / 4 transfers logged · '+(m.backed?'temporary silicon retained at this stage':'carrier removed')):((m.hasCarbon?'Grown carbon present, no device transfer':'Carbon not grown')+' · silica retained');
  $(id(k,'figure')).innerHTML=V.render(m,current);
  const [v,t,why]=verdict(m);$(id(k,'verdict')).textContent=v;$(id(k,'verdict')).dataset.tone=t;
  $(id(k,'why')).textContent=why;
  const val=[
    ['Path resistance',!m.art?'Not yet routed':m.dry===null?'Open':ft(m.dry,2)+' Ω · model'],
    ['Aperture overlap',m.apertureFormed?ft(100*m.geom/m.nominalA,1)+'% of target':'Not yet cut'],
    ['Unobstructed carbon window',m.apertureFormed?ft(100*m.clearFraction,1)+'% of target':'Not yet cut'],
    ['Carbon thickness proof',k==='clear'?(m.n+' transfer'+(m.n===1?'':'s')+' logged'):(m.hasCarbon?'MLG present; layer count not resolved':'No carbon yet')],
    ['Substrate disposition',k==='clear'?(m.backed?'Si still supports coupon':'Released parylene film'):'Retained fused silica'],
  ];
  if(k==='clear')val.splice(1,0,['Entire sheets with through-path',m.n?m.film.fullSheets+' / '+m.n:'No carbon yet']);
  else val.splice(1,0,['Inner conductor paths',m.hasCarbon?((m.film.carbon?'Carbon':'Carbon open')+' · '+(m.film.moly?'Mo':'Mo open')):'Not yet grown']);
  $(id(k,'values')).innerHTML=val.map(([a,b])=>'<dt>'+es(a)+'</dt><dd>'+es(b)+'</dd>').join('');
  for(const [x,n] of Object.entries(m.o)) {
    const fld=$(id(k,x));if(fld)fld.value=n;
  }
  $(id(k,'windowShift-value')).textContent=ft(m.windowDx,2)+' µm';
  if(k==='delft')$('delft-moAtFace-value').textContent=ft(m.o.moAtFace*100)+'%';
}
function all(){samples.forEach(refresh);Q('[data-case]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.case===preset?'true':'false'));}
function stop(){clearInterval(timer);timer=null;$('run-all').textContent='Run both to bench';}
function setmode(m){current=m;$('viewhint').textContent=viewhelp[m];Q('[data-view]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.view===m?'true':'false'));all();}
function step(k,i){stop();ruler[k]=Math.max(0,Math.min(11,+i));refresh(k);}
function start(){
  if(timer){stop();return;}
  if(reduced){ruler.clear=11;ruler.delft=11;all();return;}
  if(samples.every(k=>ruler[k]===11)){ruler.clear=0;ruler.delft=0;all();}
  $('run-all').textContent='Pause both';
  timer=setInterval(()=>{
    samples.forEach(k=>{ruler[k]=Math.min(11,ruler[k]+1)});all();
    if(samples.every(k=>ruler[k]===11))stop();
  },108);
}
const CAS={
  tear:['clear',{tear:'one',transferPath:'terminal'},'section'],
  stagger:['clear',{tear:'staggered',transferPath:'terminal'},'plan'],
  mores:['delft',{moAtFace:.4,inner:'intact'},'aperture'],
  track:['delft',{moAtFace:0,inner:'carbon-break'},'plan']
};
function scenario(n){
  stop();
  const [key,change,view]=CAS[n];
  cond[key]={...E.PRESETS[key],...change};ruler[key]=11;preset=n;setmode(view);
}
function download(name,text,type){
  const el=document.createElement('a');el.download=name;el.href=URL.createObjectURL(new Blob([text],{type}));document.body.append(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(el.href),1100);
}
install();
for(const k of samples) {
  $(id(k,'process')).onchange=e=>step(k,e.target.value);
  $(id(k,'prev')).onclick=()=>step(k,ruler[k]-1);
  $(id(k,'next')).onclick=()=>step(k,ruler[k]+1);
  for(const name of Object.keys(E.PRESETS[k])){
    const field=$(id(k,name)),numeric=typeof E.PRESETS[k][name]==='number';
    const change=e=>{preset=null;cond[k][name]=numeric?+e.target.value:e.target.value;refresh(k);Q('[data-case]').forEach(b=>b.setAttribute('aria-pressed','false'));};
    field.addEventListener(field.type==='range'?'input':'change',change);
  }
}
$('run-all').onclick=start;
$('reset').onclick=()=>{stop();samples.forEach(k=>{cond[k]={...E.PRESETS[k]};ruler[k]=0});preset=null;setmode('plan')};
Q('[data-view]').forEach(b=>b.onclick=()=>setmode(b.dataset.view));
Q('[data-case]').forEach(b=>b.onclick=()=>scenario(b.dataset.case));
Q('[data-artwork]').forEach(b=>b.onclick=()=>{
  const m=model[b.dataset.artwork],svg=V.render(m,current);
  download(m.sample.toLowerCase()+'-'+current+'.svg',svg.replace('</title>','</title><desc>Teaching SVG, not a mask. '+es(E.SAMPLE[m.key].dimensionEvidence)+' Source DOI '+E.SOURCE[m.key].doi+'.</desc>'),'image/svg+xml');
});
$('download').onclick=()=>{
  const out={schema:'bts-graphene-coupon-comparison/1',revision:'1.0.0',
    classification:'Original virtual single-contact teaching coupons, not source CAD or production recipes. No shared transmittance calibration.',
    mode:current,
    samples:samples.map(key=>{
      const s=E.SAMPLE[key],m=model[key],v=verdict(m);
      return {id:s.id,reference:s.short,state:{...m,film:{...m.film,edges:m.art?m.film.edges:[]}},modeledResult:{status:v[0],reason:v[2]},
        includedSpecs:s.dimensionEvidence,stages:s.stages.map((a,i)=>({stage:i+1,name:a[0],completed:i<=m.s,registerToolIds:a[2],unqualifiedDependency:a[3]||null})),
        measuredWitness:{sampleRelationship:key==='clear'?'four transferred layers on 15 µm parylene witness':'transferred cm-scale film on glass, glass contribution subtracted',
          transmittance:key==='clear'?.90:.475,wavelengthScope:s.bands,approximate:key==='clear',description:s.evidence,source:E.SOURCE[key]}}
    })};
  download('graphene-coupon-comparison.json',JSON.stringify(out,null,2),'application/json');
};
setmode('plan');
})();
