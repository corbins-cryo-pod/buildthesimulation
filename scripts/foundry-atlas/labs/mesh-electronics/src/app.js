/* Browser controller and export surface. */
(function(){
  'use strict';
  const E=globalThis.MeshEngine,P=E.P,$=id=>document.getElementById(id),Q=s=>Array.from(document.querySelectorAll(s));
  const siteRoot=location.protocol==='file:'?'https://buildthesimulation.com':'';
  const nlabel=E.label,fmt=(n,d=1)=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(n):'—';
  const ohm=(n)=>!Number.isFinite(n)?'—':n>=1e6?fmt(n/1e6,3)+' MΩ':n>=1e3?fmt(n/1e3,3)+' kΩ':fmt(n,2)+' Ω';
  const escape=(x)=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const equip=JSON.parse($('equipment-data').textContent),build='mesh-foundry-1.0.0';
  let options={...E.opt0},step=1,selected=16,freq=1000,model=E.analyze(options,step),geometry=E.drawing(options),currentPreset='nominal';
  let foundryPlayer=null;
  const view=globalThis.MeshView.createViewer($('specimen'),i=>changeSelected(i));
  const glyph={'good':'•','wrong-map':'↔','shared':'×','open':'×','empty':'·','not-seated':' ','unlatched':'○'};
  const translations={'good':'correct map','wrong-map':'wrong map','shared':'shared net','open':'open','empty':'unpopulated','not-seated':'not seated','unlatched':'latch open'};
  const presets={nominal:{},open:{fault:'open'},shift:{offset:500},occluded:{window:10},bridge:{fault:'bridge'},rail:{fault:'rail'}};
  const maskHierarchy=['lower','gold','platinum','upper'];

  function stageChange(n){
    step=Math.max(1,Math.min(E.STAGES.length,n));
    const target=E.STAGES[step-1].inspect;
    view.set({region:target,solo:'stage',camera:target==='section'?'explode':'plan'},true);
    refresh(false);
  }
  function changeSelected(x){
    selected=Math.max(1,Math.min(32,+x||1));
    $('selected-pin').value=selected;
    refresh(false);
  }
  function config(next,recalcGeometry=true){
    const old=options.population;
    options=E.calcOptions(next);
    if(old!==options.population&&options.population==='half')selected=16;
    if(options.population==='half'&&(options.target<9||options.target>24))options.target=16;
    $('population').value=options.population;
    ['offset','depth','ptShift','window','fault'].forEach(id=>{$(id).value=options[id]});
    ['latch','reverse'].forEach(id=>{$(id).checked=options[id]});
    ['offset','depth','ptShift','window'].forEach(id=>{$(id+'-value').textContent=(options[id]>0&&id!=='window'?'+':'')+fmt(options[id],2)+' µm'});
    $('fault-site').disabled=options.fault==='none';
    $('fault-site').innerHTML=E.routesFor(options.population).map(r=>'<option value="'+r.n+'">'+r.ids.site+' / '+r.ids.trace+'</option>').join('');
    $('fault-site').value=options.target;
    Q('[data-preset]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.preset===currentPreset?'true':'false'));
    refresh(recalcGeometry);
  }
  function applyPreset(k){
    currentPreset=k;
    let target=E.routesFor(options.population).some(r=>r.n===selected)?selected:16;
    config({...E.opt0,population:options.population,...presets[k],target});
    if(k==='shift')view.set({region:'io',camera:'plan',solo:'stage'},true);
    if(k==='occluded')view.set({region:'site',camera:'plan',solo:'stage'},true);
    if(k==='open'||k==='bridge')view.set({region:'stem',camera:'plan',solo:'stage'},true);
    if(k==='rail')view.set({region:'mesh',camera:'plan',solo:'stage'},true);
    refresh(false);
  }
  function paintStage(){
    const s=E.STAGES[step-1],v=view.state;
    $('stage-name').textContent=s.code+' · '+s.name;
    $('step-counter').textContent=s.code+' / '+E.STAGES.length;
    $('stage-result').textContent=s.result;
    $('stage-detail').textContent=s.detail;
    $('stage-check').innerHTML='<strong>Acceptance check</strong><br>'+escape(s.check)+(step>=9?'<br><a href="#results">View bench results ↓</a>':'');
    $('stage-equipment').innerHTML=s.tools.map(id=>'<a href="'+siteRoot+'/simulations/equipment/'+id+'/" title="'+escape(equip[id]?.model||'Equipment register')+'">'+id+' '+escape(equip[id]?.name||'Equipment')+'</a>').join(' · ');
    $('mode-badge').textContent=v.solo==='stage'?(step>6?'RELEASED':'ON CARRIER'):v.solo==='all'?'ARTWORK PREVIEW':'MASK '+E.MASKS[v.solo].no+' PREVIEW';
    $('prev').disabled=step===1;
    $('next').disabled=step===E.STAGES.length;
    foundryPlayer?.sync();
    Q('[data-stage]').forEach(el=>{if(+el.dataset.stage===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
    Q('[data-region]').forEach(el=>el.setAttribute('aria-pressed',v.region===el.dataset.region?'true':'false'));
    Q('[data-mask]').forEach(el=>el.setAttribute('aria-pressed',v.solo===el.dataset.mask?'true':'false'));
    $('camera').value=v.camera;
  }
  function stageResult(){
    const {counts:c,accepted,electricalPass,structurePass}=model;
    if(step<8)return {status:'UNTESTED',tone:'',text:'Reach the ZIF fixture and continuity steps to test the assembled route.'};
    if(step===8)return {status:'SEATING CHECK',tone:'',text:c.contactedPins+' physical pins meet an Au witness seat. Run dry continuity to check whether a platinum site is actually reached.'};
    if(!options.latch)return {status:'LATCH OPEN',tone:'fail',text:'There are no seated pin-to-pad paths. This is a fixture failure, not 32 manufactured lead opens.'};
    if(electricalPass&&!structurePass)return {status:'HOLD: STRUCTURE',tone:'fail',text:'All intended electrical paths read. The selected polymer rail still fails the structural witness.'};
    if(accepted)return {status:'BENCH PASS',tone:'pass',text:c.active+' intended sites reach the correct readout labels and have exposed, independently sampled Pt faces.'+(c.empty?' '+c.empty+' positions are intentionally empty.':'')};
    if(c.wrong&&c.unique)return {status:'MAP FAIL',tone:'fail',text:c.unique+' sites have independent continuity, but '+c.wrong+' land on a different readout label. A continuous trace is not evidence of the right channel.'};
    if(c.shared)return {status:'SHARED NET',tone:'fail',text:c.shared+' fixture positions now share a conducting path. A two-terminal reading cannot separate those sites.'};
    if(c.open)return {status:'OPEN PATH',tone:'fail',text:c.open+' intended positions have no site-to-pin path. Compare pad overlap, Au continuity, and the Pt landing separately.'};
    if(step===9&&c.mapped===c.active)return {status:'DRY MAP PASS',tone:'pass',text:'The dry identity check passes. Check the same sites in the virtual wet cell before accepting the finished conditions.'};
    if(step===10&&c.wet!==c.active)return {status:'WET FAIL',tone:'fail',text:c.mapped+' intended paths pass the dry map, but '+(c.active-c.wet)+' platinum windows have no accessible area. Inspect M4 over the selected site.'};
    return {status:'BENCH HOLD',tone:'fail',text:'Review the physical map and the individual structural and electrical checks.'};
  }
  function svgText(x,y,t,extra=''){return '<text x="'+x+'" y="'+y+'" '+extra+'>'+escape(t)+'</text>'}
  function impedanceChart(points,selectedValue){
    const w=520,h=279,L=59,R=13,A=w-L-R;
    const X=f=>L+Math.log10(f/10)/3*A;
    const magLo=Math.min(5,Math.floor(Math.log10(Math.min(...points.map(x=>x.abs),P.measuredWetOhms))));
    const magHi=Math.max(8,Math.ceil(Math.log10(Math.max(...points.map(x=>x.abs),P.measuredWetOhms))));
    const Y=v=>124-(Math.log10(v)-magLo)/(magHi-magLo)*85;
    const B=v=>226-(v+90)/90*69;
    const line=(x1,y1,x2,y2)=>'<path d="M'+x1+' '+y1+'H'+x2+'M'+x1+' '+y1+'V'+y2+'"/>';
    const diamond=(x,y,sz)=>'<path d="M'+x+' '+(y-sz)+'l'+sz+' '+sz+' -'+sz+' '+sz+' -'+sz+' -'+sz+'z" fill="#326c99" stroke="#f3f1de" stroke-width="1.2"><title>Published 32-site mean, Fig. 3B</title></path>';
    const path=(arr,yy)=>arr.map((q,i)=>(i?'L':'M')+X(q.frequency).toFixed(2)+' '+yy(q).toFixed(2)).join(' ');
    const rowLabels=Array.from({length:magHi-magLo+1},(_,i)=>10**(magLo+i));
    let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Calculated impedance magnitude and phase versus logarithmic frequency. Blue diamonds denote the published 1 kilohertz mean."><rect x="0" y="0" width="520" height="279" rx="5" fill="#edf0e5"/>';
    svg+='<g fill="#35544d" font-family="ui-monospace,monospace" font-size="10">';
    svg+=svgText(12,19,'MAGNITUDE')+svgText(11,150,'PHASE');
    for(const z of rowLabels)svg+=svgText(L-6,Y(z)+3,ohm(z),'text-anchor="end"');
    for(const ph of [0,-30,-60,-90])svg+=svgText(L-6,B(ph)+4,ph+'°','text-anchor="end"');
    for(const [f,l] of [[10,'10 Hz'],[100,'100 Hz'],[1000,'1 kHz'],[10000,'10 kHz']])svg+=svgText(X(f),250,l,'text-anchor="'+(f===10?'start':f===10000?'end':'middle')+'"');
    svg+=svgText(260,268,'Frequency (log scale)','text-anchor="middle"')+'</g><g stroke="#adc3b8" stroke-width="1" fill="none">';
    for(const z of rowLabels)svg+=line(L,Y(z),w-R,Y(z));
    for(const ph of [0,-30,-60,-90])svg+=line(L,B(ph),w-R,B(ph));
    for(const ff of [10,100,1000,10000])svg+='<path d="M'+X(ff)+' 39V124M'+X(ff)+' 157V226"/>';
    svg+='</g><g fill="none" stroke="#b36034" stroke-width="2.1"><path d="'+path(points,x=>Y(x.abs))+'"/><path d="'+path(points,x=>B(x.phase))+'"/></g>';
    svg+=diamond(X(1000),Y(P.measuredWetOhms),8)+diamond(X(1000),B(P.measuredWetPhase),8);
    svg+='<g fill="#fefcef" stroke="#8e4d28" stroke-width="2"><circle cx="'+X(freq)+'" cy="'+Y(selectedValue.abs)+'" r="3.2"/><circle cx="'+X(freq)+'" cy="'+B(selectedValue.phase)+'" r="3.2"/></g></svg>';
    return svg;
  }
  function waveChart(points){
    if(points.length<2)return '<div class="plot-empty">No independent wet path to replay.</div>';
    const dt=points[points.length-1].timeS,W=516,Yn=v=>49-v*.49,Xn=t=>40+t/dt*(W-53);
    const d=field=>points.map((p,i)=>(i?'L':'M')+Xn(p.timeS).toFixed(2)+' '+Yn(p[field]).toFixed(2)).join(' ');
    return '<svg viewBox="0 0 '+W+' 105" role="img" aria-label="Synthetic laboratory input tone and calculated fixture output"><rect x="0" y="0" width="516" height="105" rx="4" fill="#eef0e5"/><path d="M40 49H503M40 9V87" stroke="#b1c4b7"/><path d="'+d('inputUV')+'" fill="none" stroke="#63958d" stroke-width="1.25" stroke-dasharray="4 3"/><path d="'+d('outputUV')+'" fill="none" stroke="#a65f35" stroke-width="1.7"/><g font-family="ui-monospace,monospace" fill="#42675d" font-size="10">'+svgText(5,53,'0 µV')+svgText(40,97,'0 ms')+svgText(503,97,fmt(dt*1000,1)+' ms','text-anchor="end"')+'</g></svg>';
  }
  function paintBench(){
    const {status,tone,text}=stageResult(); const c=model.counts,sel=model.rows[selected-1],active=step>=9,wet=step>=10;
    const m=document.querySelectorAll('#metrics b');
    $('grade').textContent=status;$('grade').dataset.tone=tone;$('diagnosis').textContent=text;
    [step<8?'—':c.contactedPins+' / '+P.count,active?c.mapped+' / '+c.active:'—',wet?c.wet+' / '+c.active:'—',active?[c.shared,c.wrong,c.open].join(' / '):'—'].forEach((j,i)=>m[i].textContent=j);
    Q('[data-pin]').forEach(el=>{
      const p=model.rows[+el.dataset.pin-1],value=active?p.status:(step===8?((p.directPads.length||!p.expected)?'not-seated':p.status):'not-seated'),caption=active?translations[value]:step===8?p.directPads.length?'pad contact':'no pad contact':'not tested';
      el.dataset.code=value;el.setAttribute('aria-pressed',p.slot===selected?'true':'false');
      el.setAttribute('aria-label',p.physicalPin+', '+caption);el.title=p.physicalPin+' · '+caption;
      el.querySelector('em').textContent=active?glyph[value]:step===8&&p.directPads.length?'▧':' ';
    });
    const possible=sel.wet?E.impedance(sel,freq):null, pp=E.waveform(sel);
    $('frequency').disabled=!possible;
    $('plot-label').textContent=possible?(sel.physicalPin+' reads '+nlabel('E',sel.sites[0])+': '+ohm(possible.abs)+' / '+fmt(possible.phase,2)+'° at '+(freq>=1000?fmt(freq/1000)+' kHz':freq+' Hz')):(!wet?'No wet test yet.':'No valid wet measurement for '+sel.physicalPin+'.');
    $('bode').innerHTML=possible?impedanceChart(E.sweep(sel,freq),possible):'<div class="plot-empty">'+(wet?'This pin cannot provide an independent, exposed platinum signal in the selected configuration.':'Complete the wet impedance station to calculate the curve.')+'</div>';
    if($('waveform').parentElement.open)$('waveform').innerHTML=waveChart(pp);
    $('wave-note').textContent=pp.length?'Dashed green: '+pp[0].hz+' Hz input assigned to '+E.label('E',pp[0].site)+'. Solid copper: calculated output into a 100 MΩ ∥ 25 pF load. These are electrical test tones, not neural data.':'No valid simulated output for this pin.';
    let mapSite=sel.sites.map(x=>nlabel('E',x)).join(', '),mapPad=sel.pads.map(x=>nlabel('A',x)).join(', '),who=sel.label===sel.physicalPin?sel.label:sel.physicalPin+' as '+sel.label;
    $('read-card').innerHTML='<strong>'+who+(active?' · '+translations[sel.status]:'')+'</strong><dl><dt>Expected</dt><dd>'+ (sel.expected?nlabel('E',sel.expected):'No site populated')+
      '</dd><dt>Au pad</dt><dd>'+(step<8?'Not seated':mapPad||'None')+'</dd><dt>Pt reached</dt><dd>'+(active?mapSite||'None':'Not tested')+'</dd><dt>Seat overlap</dt><dd>'+(step>=8?fmt(100*sel.overlap,2)+'%':'—')+'</dd><dt>Dry path</dt><dd>'+(active?ohm(sel.dryOhm):'—')+
      '</dd><dt>Pt exposed</dt><dd>'+(active&&sel.unique?fmt(sel.areaUm2,2)+' µm² / '+fmt(100*sel.areaFraction,2)+'%':'—')+'</dd></dl>';
    $('download-map').disabled=!active;
    $('download-eis').disabled=!possible;
    $('download-wave').disabled=!possible;
  }
  function refresh(rebuild){
    if(rebuild)geometry=E.drawing(options);
    model=E.analyze(options,step);
    $('selected-pin').value=selected;
    view.load({steps:E.STAGES[step-1].layers,state:model,target:selected,routes:E.routesFor(options.population),geometry});
    paintStage();paintBench();
  }
  const download=(name,content,type)=>{
    const b=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200);
  };
  function csv(keys,items) {
    const field=(x)=>x===null||x===undefined?'':'"'+String(x).replaceAll('"','""')+'"';
    return keys.join(',')+'\n'+items.map(row=>row.map(field).join(',')).join('\n')+'\n';
  }
  function exportArtwork() {
    const v=view.state,mask=v.solo==='all'?maskHierarchy:v.solo==='stage'?E.STAGES[step-1].layers.filter(x=>maskHierarchy.includes(x)):[v.solo];
    const selectedMask=mask.length?mask:maskHierarchy;
    const body=selectedMask.map(k=>'<g data-mask="'+E.MASKS[k].no+'" id="mask-'+k+'" fill="'+E.MASKS[k].color+'" stroke="'+E.MASKS[k].color+'">'+geometry[k].map(p=>{
      const id=p.id;
      if(p.shape==='rect')return '<rect id="'+id+'" x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" stroke="none"/>';
      if(p.shape==='circle')return p.hole?
        '<path id="'+id+'" stroke="none" fill-rule="evenodd" d="M '+(p.x-p.r)+' '+p.y+'a '+p.r+' '+p.r+' 0 1 1 '+(2*p.r)+' 0a '+p.r+' '+p.r+' 0 1 1 -'+(2*p.r)+' 0Z M '+(p.x-p.hole)+' '+p.y+'a '+p.hole+' '+p.hole+' 0 1 1 '+(2*p.hole)+' 0a '+p.hole+' '+p.hole+' 0 1 1 -'+(2*p.hole)+' 0Z"/>':
        '<circle id="'+id+'" cx="'+p.x+'" cy="'+p.y+'" r="'+p.r+'" stroke="none"/>';
      return '<polyline id="'+id+'" points="'+p.pts.map(x=>x.map(n=>E.round(n,6)).join(',')).join(' ')+'" stroke-width="'+p.w+'" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    }).join('')+'</g>').join('');
    download('mesh-'+(selectedMask.length===1?'m'+E.MASKS[selectedMask[0]].no+'-'+selectedMask[0]:'stack')+'.svg','<svg xmlns="http://www.w3.org/2000/svg" width="39mm" height="2.45mm" viewBox="-330 -1225 39000 2450"><title>Teaching mesh artwork; not for fabrication</title><desc>1 SVG viewBox unit = 1 micrometre, Y up before reflection. Reconstructed coordinates, not source masks. '+escape(E.refLabel)+'</desc><g transform="scale(1,-1)">'+body+'</g></svg>','image/svg+xml');
  }
  function exportReport(){
    let selection=model.rows[selected-1],z=selection.wet?E.impedance(selection,freq):null;
    download('mesh-foundry-traveler.json',JSON.stringify({
      schema:'bts-mesh-foundry/1',revision:build,classification:'Teaching geometry and synthetic electronics bench. Not source CAD or manufacturing release.',
      options,step:{code:E.STAGES[step-1].code,name:E.STAGES[step-1].name},supportedMasks:E.STAGES[step-1].layers.filter(x=>maskHierarchy.includes(x)),
      stages:E.STAGES.map((stage,i)=>({code:stage.code,name:stage.name,result:stage.result,tools:stage.tools,completedInModel:i<step})),
      graphBasis:E.refLabel,counts:step>=9?model.counts:null,accepted:step===10?model.accepted:null,electricalPass:step===10?model.electricalPass:null,
      structureWitness:model.structurePass,precision:'Planar units µm, resistance Ω, phase degrees, source datum not a per-site spectrum.',
      sourceAnchor:{frequencyHz:P.measuredAtHz,magnitudeOhm:P.measuredWetOhms,phaseDeg:P.measuredWetPhase,kind:'published mean for 32 electrodes in 1× PBS'},
      modelCalibration:E.CAL,sources:E.SOURCES,selection:step>=9?{...selection,frequencyHz:freq,impedance:z}:null,
      rows:step>=9?model.rows:[],electricalFixtures:options.population==='half'?'P09–P24 are populated in this teaching configuration. Actual populated pin positions were not recovered.':'32 reconstructed one-site routes.'
    },null,2),'application/json');
  }
  $('stages').innerHTML=E.STAGES.map((s,i)=>'<li><button data-stage="'+(i+1)+'" type="button"><b>'+s.code+'</b><span>'+escape(s.name)+'</span></button></li>').join('');
  $('selected-pin').innerHTML=Array.from({length:32},(_,i)=>'<option value="'+(i+1)+'">'+nlabel('P',i+1)+' · fixture</option>').join('');
  $('pinmap').innerHTML=Array.from({length:32},(_,i)=>'<button type="button" data-pin="'+(i+1)+'"><span>'+nlabel('P',i+1)+'</span><em aria-hidden="true"></em></button>').join('');
  $('source-list').innerHTML=Object.values(E.SOURCES).map(s=>'<p><a href="'+s.url+'">'+escape(s.title)+'</a> · '+escape(s.detail)+'</p>').join('');
  $('method').innerHTML='<ul><li><strong>Artwork:</strong> internal plan units µm. The specimen overview expands its transverse axis, and the projective views exaggerate Z; local Plan views retain equal XY scale. Nickel and silicon are carrier witnesses, not modeled at a wafer-tool clearance. 16-position population is a teaching selection, not a recovered pinout.</li><li><strong>Dry graph:</strong> positive-area overlap between the planar fixture-pin rectangle and the continuous part of a pad makes a contact when the virtual latch is closed. Touching edges have zero area. Graph-connected components reveal opens, shared paths and wrong identities. Assumed Au route sheet resistance is 0.42 Ω per square. The contact estimate uses 3 Ω divided by overlap fraction, an illustrative area law, not a force/sliding fit.</li><li><strong>Visible versus conductive:</strong> Pt electrical connection requires overlap with a gold landing path; wet area is the intersection of the Pt disk and the remaining top opening. Encapsulated routes are not wet sensing sites. A cracked polymer witness is a structural fault even if the stylized model leaves the Au path intact.</li><li><strong>Wet circuit:</strong> Z = R<sub>route</sub> + R<sub>pin</sub> + 1.2 kΩ + 1 / (Q·F·(j2πf)<sup>α</sup>), where F is exposed area divided by unobstructed Pt area and α = '+E.CAL.alpha.toFixed(6)+'. Q = '+E.CAL.q.toExponential(5)+' S·s<sup>α</sup>, obtained from the one published 1 kHz mean with E16 chosen as a nominal series-path reference. All other frequencies are calculated extrapolations. No bias, stimulation, electrophysiology or biological setup.</li><li><strong>Pass:</strong> all populated sites are correctly addressed by independent pins, each has nonzero wet access and there is no structural flag. This teaching criterion is an identity and accessibility gate, not a validated tolerance, impedance range, or certification.</li></ul>';
  Q('[data-stage]').forEach(el=>el.onclick=()=>stageChange(+el.dataset.stage));
  Q('[data-region]').forEach(el=>el.onclick=()=>{let k=el.dataset.region;view.set({region:k,camera:k==='section'?'explode':view.state.camera},true);refresh(false)});
  Q('[data-mask]').forEach(el=>el.onclick=()=>{const sel=el.dataset.mask;view.set({solo:sel});refresh(false)});
  Q('[data-pin]').forEach(el=>el.onclick=()=>changeSelected(+el.dataset.pin));
  Q('[data-preset]').forEach(el=>el.onclick=()=>applyPreset(el.dataset.preset));
  $('selected-pin').onchange=e=>changeSelected(e.target.value);
  $('population').onchange=e=>{currentPreset='';config({...options,population:e.target.value})};
  $('prev').onclick=()=>stageChange(step-1);$('next').onclick=()=>stageChange(step+1);
  $('camera').onchange=e=>{view.set({camera:e.target.value},true);refresh(false)};
  $('zoom-in').onclick=()=>view.zoom(1.24);$('zoom-out').onclick=()=>view.zoom(1/1.24);$('reset-view').onclick=view.reset;
  $('clear-faults').onclick=()=>applyPreset('nominal');
  ['offset','depth','ptShift','window'].forEach(id=>{$(id).oninput=e=>{currentPreset='';config({...options,[id]:+e.target.value})}});
  ['latch','reverse'].forEach(id=>{$(id).onchange=e=>{currentPreset='';config({...options,[id]:e.target.checked},false)}});
  $('fault').onchange=e=>{currentPreset='';config({...options,fault:e.target.value,target:E.routesFor(options.population).find(r=>r.n===selected)?.n||16})};
  $('fault-site').onchange=e=>{currentPreset='';config({...options,target:+e.target.value})};
  $('frequency').onchange=e=>{freq=+e.target.value;paintBench()};
  $('waveform').parentElement.addEventListener('toggle',()=>{if($('waveform').parentElement.open)$('waveform').innerHTML=waveChart(E.waveform(model.rows[selected-1]))});
  $('download-artwork').onclick=exportArtwork;
  $('download-report').onclick=exportReport;
  $('download-map').onclick=()=>{
    if(step<9)return;
    const key=['physical_pin','logical_label','expected_site','direct_pad','component_pads','reachable_sites','status','contact_fraction','dry_ohm','exposed_um2','wet_model_readable','provenance'];
    download('mesh-pin-map.csv',csv(key,model.rows.map(r=>[r.physicalPin,r.label,r.expected?nlabel('E',r.expected):'',r.directPads.map(x=>nlabel('A',x)).join('|'),r.pads.map(x=>nlabel('A',x)).join('|'),r.sites.map(x=>nlabel('E',x)).join('|'),r.status,r.overlap,r.dryOhm,r.unique?r.areaUm2:null,r.wet,'synthetic teaching fixture'])), 'text/csv');
  };
  $('download-eis').onclick=()=>{
    const row=model.rows[selected-1];if(!row.wet)return;
    const data=E.sweep(row,freq);
    download('mesh-eis-'+row.physicalPin+'.csv',csv(['pin','site','frequency_hz','magnitude_ohm','phase_deg','re_ohm','im_ohm','source'],[...data.map(x=>[row.physicalPin,nlabel('E',row.sites[0]),x.frequency,x.abs,x.phase,x.re,x.im,'single-point-calibrated synthetic model']),['32-site mean','published comparator',1000,1.3e6,-80,null,null,'Schuhmann et al. 2017, Fig. 3B']]),'text/csv');
  };
  $('download-wave').onclick=()=>{
    const row=model.rows[selected-1],data=E.waveform(row);if(!data.length)return;
    download('mesh-wave-'+row.physicalPin+'.csv',csv(['time_s','physical_pin','site','tone_hz','input_uV','output_uV','provenance'],data.map(d=>[d.timeS,row.physicalPin,nlabel('E',d.site),d.hz,d.inputUV,d.outputUV,'synthetic electrical tone'])), 'text/csv');
  };
  if(siteRoot) Q('a[href^="/"]').forEach(a=>a.setAttribute('href',siteRoot+a.getAttribute('href')));
  config(options,false);
  foundryPlayer=window.installFoundryPlayback({
    cleanroomTracks:[{read:()=>({index:step-1,operation:E.STAGES[step-1].name})}],
    button:$('run'),frames:[$('specimen')],
    read:()=>({completed:step,total:E.STAGES.length,done:step===E.STAGES.length,
      text:step+' / '+E.STAGES.length+' · '+E.STAGES[step-1].name}),
    advance:()=>stageChange(step+1),
    replay:()=>stageChange(1)
  });
})();
