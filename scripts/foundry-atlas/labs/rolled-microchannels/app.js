(function(){
'use strict';
const E=RMF,C=E.C,$=s=>document.getElementById(s);
const colors={cream:'#e4eed1',gold:'#e9b16f',bright:'#ffc48a',ink:'#213e36',glass:'#9cbab3',wall:'#d7a35f',pdms:'#74a790',cool:'#abc8b5',hot:'#e17554',wire:'#f3e3ab',dark:'#14372f'};
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(x,n=0)=>(+x).toFixed(n), local=(x,n=0)=>(+x).toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
const lid=n=>'L'+String(n).padStart(3,'0'), pct=x=>f(x*100,1)+'%';
const text=(x,y,t,size=12,col=colors.cream,anc='start')=>'<text x="'+x+'" y="'+y+'" fill="'+col+'" font-family="ui-monospace,monospace" font-size="'+size+'" text-anchor="'+anc+'">'+e(t)+'</text>';
const rect=(x,y,w,h,c,st='none',rx=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'" stroke="'+st+'" rx="'+rx+'"/>';
const circ=(x,y,r,c,st='none',sw=1)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'" stroke="'+st+'" stroke-width="'+sw+'"/>';
const path=(p,fill,stroke,sw=1,extra='')=>'<path d="'+p+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" '+extra+'/>';
const poly=(p,fill,st,sw=1,attr='')=>'<polygon points="'+p.map(q=>f(q[0],2)+','+f(q[1],2)).join(' ')+'" fill="'+fill+'" stroke="'+st+'" stroke-width="'+sw+'" '+attr+'/>';
const pp=(g,w=555,h=288)=>'<defs><pattern id="'+g+'" width="17" height="17" patternUnits="userSpaceOnUse"><path d="M17 0H0v17" fill="none" stroke="#638e74" stroke-opacity=".35" stroke-width=".55"/></pattern></defs>'+rect(1,1,w-2,h-2,'url(#'+g+')','#638370',2);
const kv=(k,v)=>'<dt>'+e(k)+'</dt><dd>'+v+'</dd>';
let draft=E.defaults(), result=E.solve(draft), order=E.sequence(draft.mode), done=0, stage=0, focus=draft.plugSite, current='build', faceAngle=0, mask=true, marks=true;
const modeOpts=E.modeList.map(m=>[m.id,m.label]);
function fill(id,options){
 const q=$(id);q.replaceChildren(...options.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o}));}
fill('mode',modeOpts);
function log(str){$('status').textContent=str}
function setSelect(){
 fill('step',order.map((t,i)=>[i,String(i+1).padStart(2,'0')+' · '+E.stages[t].name]));
 const rows=result.rows.map(q=>[q.lumen,lid(q.lumen)+(q.wireId?' · '+q.wireId:'')]);
 for(const name of ['focus','benchFocus','plugSite'])fill(name,rows);
 fill('wire',result.dry.wires.length?result.dry.wires.map(w=>[w.index,w.id+' · '+lid(w.lumen)]):[[0,'No installed wires']]);
}
setSelect();
function useNew(cfg,go,finish,announcement){
 result=E.solve(cfg);draft=result.config;order=E.sequence(draft.mode);
 done=finish?order.length:0;stage=finish?done-1:0;focus=draft.plugSite;
 setSelect();
 if(go!==null)show(go);
 else render();
 if(announcement)log(announcement);
}
function change(key,val){
 const stageFor=order.indexOf(key==='driftPct'?'roll':key==='fault'||key==='faultWire'?'wire':'inspect');
 if(result.config[key]===val)return;
 result=E.solve({...draft,[key]:val});draft=result.config;
 if(stageFor>=0){done=Math.min(done,stageFor);if(stage>done)stage=done;}
 if(key==='plugSite')focus=draft.plugSite;
 render();
 let msg={dxUm:'X registration',dyUm:'Y registration',plugPct:'Obstruction',plugSite:'Lumen target',pressurePa:'Test pressure',driftPct:'Width trend',fault:'Wire fault',faultWire:'Electrical target'}[key];
 log(msg+' changed. Upstream handoffs retained; test the current configuration again.');
}
function show(mode){
 current=mode;
 for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==mode;
 for(const el of document.querySelectorAll('[data-view]'))el.setAttribute('aria-pressed',String(el.dataset.view===mode));
 log({build:'Inspect any handoff. Acceptance follows the selected route in order.',section:'Design preview: geometry, fixture overlay and route identities.',bench:'Complete the selected traveler to see test results.',evidence:'Source results are separate from teaching fixture assumptions.'}[mode]);render();
}
function finish(msg){done=order.length;stage=order.length-1;show('bench');log(msg||'Selected traveler complete. Geometry, flow and electrical records are separate.')}
const equip=id=>'<a href="https://buildthesimulation.com/simulations/equipment/'+id+'/">'+id+'</a>';
function inspectStep(){
 const key=order[stage],s=E.stages[key];
 $('mode').value=draft.mode;$('step').value=stage;$('stageTitle').textContent=s.name;$('basis').textContent=s.basis;$('stageDesc').textContent=s.desc;
 $('stageGate').textContent=s.gate;$('stageTools').innerHTML=s.tools.map(equip).join(' · ')+' <span class="fine">(equipment analogues)</span>';
 $('stageState').textContent=stage<done?'Accepted':stage===done?'Current':'Preview';
 $('tag').classList.toggle('ref',result.mode.status==='Teaching only');$('tag').textContent=result.mode.status;
 $('progressLabel').textContent=String(done).padStart(2,'0')+' / '+order.length+' accepted';$('progress').max=order.length;$('progress').value=done;
 $('runTop').textContent=done===order.length?'Open current test':'Run selected build';
 $('advance').disabled=stage!==done;$('advance').textContent=stage<done?'Already accepted':stage>done?'Earlier handoffs pending':stage===order.length-1?'Accept & test':'Accept handoff';
 $('previous').disabled=stage===0;$('next').disabled=stage===order.length-1;
 $('stageNum').textContent=String(stage+1).padStart(2,'0')+' / '+order.length;
 if(current==='build')renderProcess(key);
}
function plateArea(spec){
 const {cx,cy,factor,angle,drawWires,obstructions,fitColor,stencil}=spec,w=result.mode;
 const g=result.geometry,t=g.angularSpanRad,A=angle*Math.PI/180,cos=Math.cos(A),sin=Math.sin(A),P=q=>[cx+factor*(q[0]*cos-q[1]*sin),cy-factor*(q[0]*sin+q[1]*cos)];
 let body=poly(E.outline(0,t,-E.halfThickness,E.halfThickness,225).map(P),'#ba975e','#d6bb7e',1)+poly(E.outline(0,t,-E.halfThickness,E.bandMin,225).map(P),colors.pdms,'#9cc1a2',.55)+poly(E.outline(0,t,E.bandMax,E.halfThickness,225).map(P),'#87b198','#a9c9ad',.45);
 for(const rr of result.rows){
   let selected=rr.lumen===focus,tone=obstructions&&rr.plugPct===100?'#83472e':fitColor&&!rr.fixtureQualified?'#24443a':'#142f2a';
   body+=poly(rr.sectionPolygonUm.map(P),tone,selected?'#fff4bd':'#b29355',selected?2:.4,'class="hit" data-lumen="'+rr.lumen+'"');
 }
 if(stencil&&(draft.dxUm||draft.dyUm)){
   body+='<g fill-opacity=".22" stroke-opacity=".75" pointer-events="none">';
   for(const q of result.rows)body+=poly(q.sectionPolygonUm.map(v=>P([v[0]+draft.dxUm,v[1]+draft.dyUm])),colors.hot,colors.bright,.7);
   body+='</g>';
 }
 if(drawWires)for(const rr of result.rows.filter(c=>c.wireId)){
   let [u,v]=P(rr.centerUm),d=result.dry.rows.find(q=>q.id===rr.wireId),isOpen=d&&!d.correct;
   body+=circ(u,v,Math.max(2,factor*C.wireDiameterUm/2),isOpen?'#c57954':colors.wire,'#5e5435',.75).replace('<circle ','<circle pointer-events="none" ');
   if(isOpen)body+=path('M'+(u-3)+' '+(v-3)+'l6 6m0 -6-6 6','none','#fff2d3',1.1,'pointer-events="none"');
 }
 return body;
}
function renderProcess(id){
 let s=pp('stagegrid'),m=result.mode,g=result.geometry,w=m.widthUm,n=m.count;
 if(id==='design'){
   s+=text(21,26,'WALL MASK / REPRESENTATIVE CENTER WINDOW',13);
   for(let i=0;i<9;i++){const x=44+i*53;s+=rect(x,67,12,136,colors.wall);s+=rect(x+12,67,41,136,'#325749',colors.cool,.5)}
   s+=text(45,229,w+' µm nominal clear + 20 µm wall → '+g.flatPitchUm+' µm flat pitch',12,colors.gold);
   s+=text(45,251,n+' model slots | no electrical nets in mask',12);
   $('stageCaption').textContent='Concept stripes represent mask pitch. The illustrated nine-period window is not the full author mask.';
 }else if(['roll','wire','inspect'].includes(id)){
   s+=plateArea({cx:295,cy:143,factor:.150,angle:0,drawWires:id!=='roll',obstructions:id==='inspect',fitColor:id==='inspect',stencil:id==='inspect'});
   s+=text(19,25,id==='roll'?'ROLL / TRANSVERSE WINDING':id==='wire'?'WIRE BOUNDARY / SEPARATE NETS':'INERT SECTION / FIXTURE REGISTRATION',13);
   s+=text(21,265,n+' patterned openings · '+(id==='roll'?0:m.wireCount)+' intraluminal wires at this stage',12,colors.gold);
   $('stageCaption').textContent=id==='roll'?'The axially continuous openings survive the roll. The free core is not counted.':id==='wire'?'Only selected bores get wires. The gold dots are reconstructed wire positions, not the paper’s random assignments.':'Dimensional inspection and the dry electrical check run on separate fixtures.';
 }else{
   const uncapped=['base','basePlasma','su8','expose','develop','openQC','lid','bondPlasma'].includes(id),prepared=!(id==='base'||id==='basePlasma'),whole=id==='su8'||id==='expose';
   s+=text(21,26,'LAYER STACK / SECTION NOT TO SCALE',13);
   let glow=-1;
   if(id==='basePlasma')glow=173;
   if(id==='bondPlasma')glow=63;
   if(id!=='releaseWeb'&&id!=='openQC')s+=rect(39,208,435,26,colors.glass)+text(48,226,'temporary Ti/Au-treated glass',12,colors.dark);
   s+=rect(39,173,435,35,colors.pdms)+text(48,194,'40 µm PDMS base',12,colors.dark);
   if(prepared){
     if(whole)s+=rect(39,89,435,84,'#aa814e')+text(48,146,'100 µm SU-8 precursor',13);
     else{for(let j=0;j<7;j++)s+=rect(39+j*69,89,21,84,colors.wall);s+=text(57,148,w+' µm clear',13,colors.cream);}
   }
   if(!uncapped)s+=rect(39,77,435,12,'#9dc3a7')+text(50,70,'10 µm PDMS lid',13);
   if(['lid','bondPlasma','cap'].includes(id)){
     let y=id==='cap'?39:44;s+=rect(39,y,435,20,colors.glass)+text(51,y+14,'separate glass/PAA release support',11,colors.dark);
     s+=rect(39,y+20,435,8,'#ce8ca0');if(uncapped)s+=rect(39,y+28,435,7,'#9dc3a7');
   }
   if(glow>0)s+=path('M52 '+glow+'H454','none','#ffdc90',4,'stroke-dasharray="6 6"')+text(42,257,'Surface activation state only',12,colors.gold);
   if(id==='expose')s+=path('M90 55v34m84-34v34m84-34v34m84-34v34m84-34v34','none','#f9dba6',2,'stroke-dasharray="4 4"');
   $('stageCaption').textContent=uncapped?'These grooves are still open unless a subsequent cap is selected. No enclosed flow is demonstrated by an uncapped coupon.':'The cap creates enclosed lumens; the upper PAA release is separate from lower Ti/Au carrier treatment.';
 }
 $('process').innerHTML=s;
}
function stripePlate(){
 let q=result.rows[focus-1],n=result.rows.length;
 const short=Math.min(12,n),first=Math.max(1,Math.min(focus-5,n-short+1)),factor=40;
 let base=rect(36,278,short*factor+7,32,colors.pdms,'#9ac0a3')+text(49,337,'40 µm lower PDMS · no cap',14);
 for(let k=0;k<short;k++){
   const id=first+k,x=41+k*factor;
   base+=rect(x-5,157,10,121,colors.wall);
   base+=rect(x+5,157,30,121,id===q.lumen?'#5a7154':'#2b4b40',id===q.lumen?'#f7e1ad':'#426d58',1).replace('<rect ','<rect class="hit" data-lumen="'+id+'" ');
   base+=text(x+20,259,String(id),10,colors.cream,'middle');
 }
 return base+text(27,55,'FLAT GAPS · '+first+'–'+(first+short-1)+' OF '+n,14)+text(27,83,'No roof or confined flow in this branch.',12,colors.gold);
}
function renderSection(){
 const m=result.mode,q=result.rows[focus-1],g=result.geometry;
 $('focus').value=focus;$('modeNote').textContent=m.note;$('faceAngle').value=faceAngle;$('angleOut').textContent=faceAngle+'°';$('drift').value=draft.driftPct;$('driftOut').textContent=m.rolled?draft.driftPct+'%':'n/a';
 for (let id of ['faceAngle','maskVisible','drift'])$(id).disabled=!m.rolled;
 $('wiresVisible').disabled=m.wireCount===0;$('maskVisible').checked=mask;$('wiresVisible').checked=marks;
 $('faceHeading').textContent=m.rolled?'CUT FACE / PATTERNED LUMENS':'FLAT WITNESS / OPEN GROOVES';
 $('faceLabel').textContent=lid(focus)+' / '+m.count;
 let s=pp('facegrid',555,470);
 if(m.rolled){
   s+=plateArea({cx:276,cy:231,factor:.218,angle:faceAngle,drawWires:marks,obstructions:true,fitColor:true,stencil:mask});
   s+=text(16,25,'PATTERNED FACE / '+m.count+' LUMENS',14);
   s+=circ(277,231,19,'none','#85a98d',.9)+text(277,236,'CORE',11,colors.cream,'middle');
   s+=path('M34 425h'+(200*.218),'none',colors.cream,2)+text(34,447,'200 µm',11)+text(529,446,'Section shown from one end',12,colors.cream,'end');
   $('faceCaption').textContent='Gold walls, green PDMS, clear lumens. Gold dots mark wired bores; a broken lead remains physically drawn. Orange tint is the shifted virtual aperture plate. The central gap does not count.';
 }else{
   s+=stripePlate();
   $('faceCaption').textContent='Window around the selected groove. Width and pitch follow the nominal open branch; apparent wall shape is illustrative.';
 }
 $('face').innerHTML=s;
 let projection=m.rolled?f(g.spanXUm/1000,3)+' × '+f(g.spanYUm/1000,3)+' mm projected caliper spans · '+f(g.turns,2)+' turns.':'Unrolled and uncapped. No roll-width interpolation.';
 $('driftCaption').textContent=m.rolled?'Inner two-ring mean is '+f(g.innerAverageAreaRisePct,2)+'% wider in area than the outer-turn mean at this setting. '+projection:projection;
 const reg=q.registration;
 $('lumenFacts').innerHTML=kv('Pattern slot',lid(focus)+(q.turn?' · turn '+q.turn:' · open strip'))+
  kv('Ideal local clear section',f(q.widthUm,1)+' × '+f(q.heightUm,0)+' µm; '+local(q.idealAreaUm2,0)+' µm² before a wire')+
  kv('Intraluminal wire',q.wireId?e(q.wireId)+' · teaching assignment':'None')+
  (reg?kv('Matching plate aperture',pct(reg.ownFraction)+' overlap; '+pct(reg.neighborFraction)+' from other holes'):kv('Pressure test','Not applicable without a cap'));
 renderZoom(q,m);
 renderAxial(q,m);
}
function renderZoom(q,m){
 const sc=Math.min(1.22,205/q.widthUm),w=q.widthUm*sc,h=q.heightUm*sc,x=195-w/2,y=49,baseH=C.pdmsBaseUm*sc,capH=C.pdmsLidUm*sc;
 let p=rect(x-21,y+h,w+42,baseH,'#81ac98')+rect(x-20,y,20,h,colors.wall)+rect(x+w,y,20,h,colors.wall);
 if(m.rolled)p+=rect(x-20,y-capH,w+40,capH,'#92b7a7');
 p+=rect(x,y,w,h,'#dce4d6','#9bae9b');
 if(q.wireId)p+=circ(195,y+h/2,C.wireDiameterUm/2*sc,'#b87941','#5e5d36',1.5)+text(195,y+h/2+5,q.wireId,11,colors.cream,'middle');
 p+=path('M'+x+' 20h'+w,'none','#557267',1.2)+text(195,17,f(q.widthUm,1)+' µm',12,colors.ink,'middle');
 p+=text(405,70,m.rolled?'LID':'OPEN AIR',11,colors.ink,'end')+text(405,y+h+22,'BASE',11,colors.ink,'end');
 $('zoom').innerHTML=p;
 $('zoomText').textContent=q.wireId?'Nominal 60 µm wire disk excludes '+local(q.flow.wireAreaUm2)+' µm². Estimated local remaining area: '+local(q.flow.freeAreaUm2)+' µm² in the ideal rectangle; insulation thickness and actual packing are not resolved.':'No assigned wires. Open area is geometric and does not indicate an addressable electrode.';
}
function renderAxial(q,m){
 let s=text(18,23,m.rolled?'AXIAL CUT / '+lid(focus):'OPEN STRIP / NO ENCLOSED DUCT',13,colors.ink);
 const left=45,right=378,l=right-left,y=92;
 s+=rect(left,y+63,l,14,'#8eb69e')+rect(left,y,l,63,'#e3ece0','#8aa481',2);
 if(m.rolled)s+=rect(left,y-10,l,10,'#82ae97');
 if(q.plugPct>0)s+=rect(left+4,y+63*(1-q.plugPct/100),31,63*q.plugPct/100,'#b06749');
 if(q.wireId){
   const a=left+l*.5,b=a+l/6;
   s+=path('M395 122H'+b,'none','#596659',9)+path('M'+b+' 122H'+a,'none','#ae7745',8)+text(a-2,112,'bare tip',10,colors.ink);
   if(result.dry.rows.find(d=>d.id===q.wireId)?.correct===false)s+=path('M383 115l12 13m-1-13-12 13','none','#a4482a',2);
 }
 if(m.rolled&&q.registration.ownFraction<.999)s+=rect(left-13,y,7,63,'#c47c63')+text(19,182,'shifted test plate',11,colors.ink);
 s+=text(right,185,m.rolled?'3 mm trimmed length':'10 mm flat walls',11,colors.ink,'end');
 s+=text(left,48,'stencil / entrance',11,colors.ink)+text(right,48,q.wireId?'wire-side end':'other end',11,colors.ink,'end');
 $('axial').innerHTML=s;
}
function inputs(){
 for(const [id,key] of [['dx','dxUm'],['dy','dyUm'],['plugSite','plugSite'],['plugPct','plugPct'],['pressure','pressurePa'],['fault','fault'],['wire','faultWire']])$(id).value=draft[key];
 const m=result.mode,has=m.wireCount>0,closed=m.rolled;
 for(const k of ['dx','dy','plugSite','plugPct','pressure'])$(k).disabled=!closed;
 $('fault').disabled=!has;$('wire').disabled=!has||draft.fault==='none';
 $('dxOut').textContent=closed?draft.dxUm+' µm':'n/a';$('dyOut').textContent=closed?draft.dyUm+' µm':'n/a';$('plugOut').textContent=closed?draft.plugPct+'%':'n/a';$('pressureOut').textContent=closed?draft.pressurePa+' Pa':'n/a';
 $('wireNotice').textContent=!has?'No in-lumen conductors in this branch. An uninstrumented aperture cannot pass an electrical identity check.':m.id==='counter84'?'Eight hypothetical witness conductors, not a specimen reported by Srinivasan et al.':'Published count: eight intraluminal wires. Witness labels and their selected positions are illustrative.';
}
function renderBench(){
 inputs();const d=result,m=d.mode,t=d.stats,finished=done===order.length,q=d.rows[focus-1];
 $('benchFocus').value=focus;$('benchFocusTitle').textContent='Inspect '+lid(focus)+(q.wireId?' · '+q.wireId:'');
 $('metOpen').textContent=t.patterned;$('mOpenCap').textContent=m.rolled?'Central core excluded':'Open mask grooves, not ducts';
 const ready=finished&&m.rolled;
 $('metPatent').textContent=ready?t.physicalPatent+' / '+t.patterned:'—';$('metFit').textContent=ready?t.fixtureQualified+' / '+t.patterned:'—';
 $('metElectrical').textContent=finished&&m.wireCount?t.correctElectrical+' / '+t.installedWires:'—';
 $('test').textContent=finished?'Rerun same fixture':m.rolled?'Complete build & test':'Complete open witness';
 $('csv').disabled=!ready;
 $('testMessage').textContent=!finished?'Results stale or not yet run. Finishing the traveler changes nothing about the source counts.':!m.rolled?'Open specimen complete. No pressurized duct or electrical test applies.':t.fixtureQualified<t.physicalPatent?'Some physically patent lumens fail the teaching registration gate; a path can still pass fluid under part of an aperture.':'The dry continuity check does not use aperture area or measured fluid flow.';
 if(!ready){
   $('lumenTest').innerHTML=kv('Test state',!finished?'Complete the traveler to see current fixture results.':'Open geometry only.');
   $('sumFlow').textContent='';$('pathTable').innerHTML='';$('wireTable').innerHTML='';return;
 }
 const o=q.registration,row=q.wireId?d.dry.rows.find(z=>z.id===q.wireId):null;
 $('lumenTest').innerHTML=kv('Physical opening',q.physicalPatency?'Present and not fully obstructed':'Present, fully plugged')+kv('Projected registration',pct(o.ownFraction)+' to its own stencil · '+pct(o.neighborFraction)+' to other stencil apertures')+
  kv('Teaching registration/plug gate',q.fixtureQualified?'Pass':'Fail')+
  kv('Same-ID flow surrogate',f(q.flow.mappedFlowUlMin,4)+' µL/min at '+draft.pressurePa+' Pa (not a measured value)')+
  kv('Electrical witness',row?e(row.id)+': '+(row.correct?'mapped correctly':row.detectedWireIds.length?'wrong or bridged identity':'no conductor detected'):'No assigned wire')+
  (o.hits.length?kv('Which stencil holes?',e(o.hits.map(h=>lid(h.lumen)+' '+pct(h.fraction)).join(' · '))):'');
 $('sumFlow').textContent='Model sum over independent same-ID paths: '+local(t.waterPathModelSumUlMin,2)+' µL/min at ΔP '+draft.pressurePa+' Pa. Does not include cross-flow.';
 let rows=d.rows.map(r=>'<tr><th scope="row">'+lid(r.lumen)+(r.wireId?' · '+r.wireId:'')+'</th><td>'+pct(r.registration.ownFraction)+'</td><td>'+pct(r.registration.neighborFraction)+'</td><td'+(r.fixtureQualified?'':' class="bad"')+'>'+(r.fixtureQualified?'pass':'fail')+'</td><td>'+f(r.flow.mappedFlowUlMin,4)+'</td></tr>').join('');
 $('pathTable').innerHTML='<table><caption>Independent teaching fixture outputs</caption><thead><tr><th scope="col">Lumen</th><th scope="col">Own</th><th scope="col">Neighbor</th><th scope="col">Gate</th><th scope="col">µL/min</th></tr></thead><tbody>'+rows+'</tbody></table>';
 rows=d.dry.rows.map(r=>'<tr><th scope="row">'+r.id+'</th><td>'+lid(r.lumen)+'</td><td>'+r.detectedLumens.map(lid).join(', ').replace(/^$/,'No path')+'</td><td'+(r.correct?'':' class="bad"')+'>'+(r.correct?'Pass':'Fail')+'</td></tr>').join('');
 $('wireTable').innerHTML=rows?'<table><caption>Correct '+t.correctElectrical+' · connected '+d.dry.connectedTerminals+' · installed '+t.installedWires+'</caption><thead><tr><th scope="col">Fixture pin</th><th scope="col">Expected</th><th scope="col">Detected</th><th scope="col">Identity</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p>Zero installed wires for this variant.</p>';
}
function syncFocus(id){const n=Math.max(1,Math.min(result.rows.length,Math.round(+id)));if(isFinite(n))focus=n;render()}
function render(){inspectStep();if(current==='section')renderSection();if(current==='bench')renderBench();}
function makeFile(name,body,type){
 const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1800);
}
const pres={
  ref:[{},'Wired reference: 59 lumens and eight installed wires.'],
  geom84:[{mode:'g100'},'Published 84-lumen geometry. No independently mapped wires.'],
  counter:[{mode:'counter84'},'Teaching-only comparison: 84 lumens and eight hypothetical wires.'],
  offset:[{dxUm:33,dyUm:-19},'Test plate translated +33 / −19 µm. Independent wire netlist is unchanged.'],
  plug:[{plugPct:100},'One lumen is fully blocked. Wire W04 is still connected to its expected terminal.'],
  break:[{fault:'open',faultWire:4},'One modeled lead is open; fluid patency and physical geometry are unchanged.'],
  swap:[{fault:'swap',faultWire:4},'W04/W05 transposed: all leads conduct, but two terminal identities fail.']
};
for(const b of document.querySelectorAll('[data-case]'))b.onclick=()=>{const [cfg,msg]=pres[b.dataset.case];useNew({...E.defaults(cfg.mode||'wire150'),...cfg},'bench',true,msg)};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>show(b.dataset.view);
$('mode').onchange=ev=>{let m=ev.target.value;useNew(E.defaults(m),null,false,'Selected '+E.MODES[m].short+'. Previous lot state cleared.');};
$('reset').onclick=()=>{faceAngle=0;mask=true;marks=true;useNew(E.defaults(draft.mode),'build',false,'Fresh lot in the same configuration. No tests are current.');};
$('runTop').onclick=()=>finish();$('test').onclick=()=>finish();
$('step').onchange=e=>{stage=+e.target.value;inspectStep();};$('previous').onclick=()=>{stage=Math.max(0,stage-1);inspectStep();};$('next').onclick=()=>{stage=Math.min(order.length-1,stage+1);inspectStep();};
$('advance').onclick=()=>{if(stage===done&&done<order.length){done++;stage=Math.min(done,order.length-1);if(done===order.length)finish();else{render();log('Accepted '+done+' of '+order.length+' handoffs.');}}};
for(const [id,key] of [['dx','dxUm'],['dy','dyUm'],['plugPct','plugPct'],['pressure','pressurePa'],['drift','driftPct']])$(id).oninput=ev=>change(key,+ev.target.value);
$('plugSite').onchange=ev=>change('plugSite',+ev.target.value);$('fault').onchange=ev=>change('fault',ev.target.value);$('wire').onchange=ev=>change('faultWire',+ev.target.value);
for(const id of ['focus','benchFocus'])$(id).onchange=ev=>syncFocus(ev.target.value);
$('face').onclick=ev=>{const a=ev.target.closest('[data-lumen]');if(a)syncFocus(a.getAttribute('data-lumen'));};
$('faceAngle').oninput=ev=>{faceAngle=+ev.target.value;renderSection()};$('maskVisible').onchange=ev=>{mask=ev.target.checked;renderSection()};$('wiresVisible').onchange=ev=>{marks=ev.target.checked;renderSection()};
$('obj').onclick=()=>makeFile('microchannel-witness.obj',E.meshOBJ(draft).obj,'text/plain');$('mtl').onclick=()=>makeFile('microchannel-witness.mtl',E.meshOBJ(draft).mtl,'text/plain');
$('json').onclick=()=>{
 const ready=done===order.length;
 const draftData={format:'BTS-ROLLED-MICROCHANNELS-LOT-1',scope:'Inert virtual fixture. No actual process traveler, channel map, or research yield.',publishedSources:['https://doi.org/10.1016/j.biomaterials.2014.11.035','https://fluid.dtu.dk/Publications/Lecture_notes'],config:draft,finished:ready,provenance:result.mode.note,constants:C,completedHandoffs:order.slice(0,done),stats:ready?result.stats:null,netMatrix:ready?result.dry.matrix:null,results:ready?result.rows:null,electricalReferenceNotes:ready?result.referenceNotes:null,axisUnits:'Micrometers unless explicitly named otherwise; pressure Pa, flow µL/min'};
 makeFile('microchannel-lot.json',JSON.stringify(draftData,null,2),'application/json');
 log(ready?'Exported complete teaching lot.':'Exported progress only; pending test results are null.');
};
$('csv').onclick=()=>{
 if(done!==order.length||!result.mode.rolled)return;
 const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 const lines=[['fixture-mode','fixture-status','lumen','mapped-wire','turn','nominal-width-um','ideal-width-um','height-um','patterned','physically-patent','plug-percent','matched-fraction','neighbor-fraction','fixture-qualified','pressure-pa','same-id-flow-uL-min','wire-correct']];
 for(const x of result.rows)lines.push([draft.mode,result.mode.status,lid(x.lumen),x.wireId,x.turn,x.nominalWidthUm,f(x.widthUm,6),x.heightUm,1,+x.physicalPatency,x.plugPct,f(x.registration.ownFraction,7),f(x.registration.neighborFraction,7),+x.fixtureQualified,draft.pressurePa,f(x.flow.mappedFlowUlMin,8),x.wireId?+result.dry.rows.find(r=>r.id===x.wireId).correct:null]);
 makeFile('microchannel-bench.csv',lines.map(line=>line.map(quote).join(',')).join('\r\n')+'\r\n','text/csv');
};
show('build');
})();
