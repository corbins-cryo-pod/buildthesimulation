(function(){
'use strict';
const E=T4,$=s=>document.getElementById(s),N=E.nets,A=E.active;
const stages=[
['Documented topology','Separate the shaft’s 14 active terminals from two independent return legs. The return legs each have 109 openings on one common conductor. This map is not the original GDS.','Expect 7 active sites + 1 return per side and no independent nets for individual return holes.','01-01'],
['Documented carrier','The TIME-4H paper reports a silicon fabrication carrier; it does not report a complete CMOS wafer process. Place a virtual carrier and establish the later peel boundary.','Silicon must not remain as a permanent rigid shank in the folded-probe bill of materials.','16-11'],
['Documented material / inferred sequence','Define the insulating base as a polyimide film on the carrier. Thickness and cure details are not published for this specimen here.','The layer viewer must not label the temporary carrier or an assumed thickness as a permanent source dimension.','02-07 03-09'],
['Documented stack / inferred mask','Introduce a silicon-carbide adhesion promoter and platinum routes. The drawn tracks are explanatory connections, not reconstructed conductor geometry.','Each active landing reaches exactly one intended witness edge; each separate return bus fans into many openings.','01-01 03-03'],
['Documented material / inferred sequence','Represent polyimide insulation above the tracks and a separate opening mask. The paper does not give metal landing diameters or tolerances.','An offset in the virtual mask can alter surface exposure while the buried metal net remains intact.','02-01 02-12'],
['Documented RIE / synthetic overlap','RIE opens the insulator in the documented build. The witness model clips a round 80 µm aperture against an assumed circular metal landing and preserves the separate ground buses.','At zero offset a contact exposes π × (0.040 mm)²; 109 fully open holes belong to each ground conductor.','04-01 02-12'],
['Documented active-site material','TIME-4H uses porous sputtered iridium oxide on its active interfaces. A colored active surface in this schematic is not a fitted porosity, measured impedance or a claim about ground finish.','Keep active-site SIROF, Pt tracks, and unspecified ground finish distinct.','03-03 09-01'],
['Documented release','Release the thin film from the silicon carrier. The folded article will comprise the film, not a piece diced from a silicon shaft.','Terminal names must survive release unchanged even if the article flips in the viewer.','12-01'],
['Documented fold / reference fixture','The paper describes a flat U-shaped film folded to an L-shaped assembly. Here, test bending of a homogeneous witness on an inert mandrel; this is not mechanics of the source laminate.','Check the seven-active-site-per-face map. Inspect flexural outer strain separately from conductor connectivity.','12-01 14-10'],
['External interface','Use an externally supplied model of the screen-printed ceramic and microflex interconnection (MFI). The register has no verified complete process for this particular interconnect.','Record the incoming ceramic as an external part. Its sixteen paths must not be replaced by a guessed soldered thin film.',''],
['Documented cable / substitute fixture','The source reports a 10 cm custom cable of 16 helically wound MP35N wires, PEI insulation, silicone tubing, and a 16-channel Omnetics nano connector. Our fixture uses symbolic, non-OEM terminal names.','Verify terminal identity as well as continuity. A swapped pair still has two conducting wires.','08-12 16-13'],
['Documented protection / inferred check','Separate silicone protection around the cable/interconnect from intended contact windows. Inspect the rolled and cabled article on a nonliving fixture.','Occluded surface openings can coexist with entirely intact dry wiring.','08-10 12-01'],
['Synthetic dry and wet witness','Compute a pin-to-net conduction matrix and a two-terminal, frequency-dependent reference impedance. These results are synthetic bench outputs of a passive geometry, not recorded neural activity.','Check the active path and the selected return separately. A lost return or a misidentified terminal blocks a qualified loop.','09-01 09-03 09-12']
];
let cfg=E.defaults(), done=0, stage=0, view='build',focus='L4',loop='L4',zoom='GL',yaw=18,explode=32;
const labels=Object.fromEntries(N.map(n=>[n,n.startsWith('G')?n+' · '+(n==='GL'?'left':'right')+' return leg':n+' · active shaft']));
function opts(id,keys,names){$(id).replaceChildren(...keys.map(k=>{let o=document.createElement('option');o.value=k;o.textContent=names?names[k]:k;return o}))}
opts('station',stages.map((a,i)=>''+i),E.sampleStage.map((a,i)=>String(i+1).padStart(2,'0')+' · '+a));
opts('target',N,labels);opts('net',N,labels);opts('loop',A,labels);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const c={lite:'#c6debf',dark:'#213d38',gold:'#f3ba72',gold2:'#cda260',flag:'#db7950',line:'#90b398',gray:'#7b9b85',paper:'#faf5e6',ink:'#233e38'};
const T=(x,y,t,size=13,fill=c.lite,anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-family="ui-monospace,monospace" font-size="'+size+'" text-anchor="'+anchor+'">'+esc(t)+'</text>';
const path=(d,fill,stroke,sw=2,extra='')=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" '+extra+'/>';
const rect=(x,y,w,h,fill,stroke='none',rx=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="'+stroke+'" rx="'+rx+'"/>';
const circ=(x,y,r,fill,stroke='none',sw=1)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const gridbg='<defs><pattern id="microgrid1" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#6b8d73" stroke-opacity=".22" stroke-width=".65"/></pattern></defs><rect x="1" y="1" width="578" height="298" fill="url(#microgrid1)"/>';
function log(s){$('live').textContent=s}
function topo(f,def=true){
 let r=(def?gridbg:'')+T(24,30,'SOURCE PITCH · SCHEMATIC OUTLINES',13)+T(25,283,'RETURN PATCHES ON SEPARATE LEGS',13);
 r+=path('M35 70H524V119H35Z M35 141H524V190H35Z','#516953',c.gray,1);
 r+=path('M487 112V225H520 M514 161V250H415','none',c.gold2,4);
 const isG=f==='GL'||f==='GR';
 for(const {net,xMm,side} of E.positions()){let x=62+76*xMm,y=side==='L'?92:164,selected=net===f;
 r+=circ(x,y,selected?8:5,c.gold,selected?'white':c.dark,selected?2:1)+T(x,y+(side==='L'?-30:45),net,12,selected?'#fff':c.lite,'middle')}
 r+=T(38,122,'Face L',11)+T(38,155,'Face R',11)+T(277,115,'0.75 mm pitch',12)+T(215,148,'0.375 mm offset',12);
 for(const [n,x,y] of [['GL',524,225],['GR',416,249]]){r+=rect(x-17,y-9,35,18,'#ceb277',f===n?'white':c.gold,3)+T(x,y+4,n,12,c.dark,'middle')}
 r+=T(25,232,isG?'Selected: '+f+' / return leg':'Selected: '+f+' / shaft',15,'#fff');return r;
}
function renderProcess(i){
 const cap=$('processCap');let s=gridbg;
 if(i===0){s=topo('L4');cap.textContent='Topology draft. Local identifiers and outlines are illustrative; relative axial pitch and side stagger follow the source.'}
 else if(i<=6){
 s+=T(24,32,'SECTIONAL STACK · EXAGGERATED',14);const rows=[['TEMPORARY Si',211,33,'#819e9b'],['PI base',180,30,'#d4a957'],['Pt on SiC',162,15,'#c2c5ba'],['PI cover',123,37,'#e0b76a']];for(let j=0;j<rows.length;j++){const [n,y,h,co]=rows[j];if((j===0&&i>=1)||(j===1&&i>=2)||(j===2&&i>=3)||(j===3&&i>=4)){
  if(j===3&&i>=5){s+=rect(43,y,98,h,co)+rect(191,y,142,h,co)+rect(385,y,110,h,co)}else{s+=rect(43,y,452,h,co)}
  s+=T(48,y+h*.67,n,12,c.dark);}}
 if(i>=5){s+=T(143,104,'opening',12)+path('M162 108V151','none',c.lite,1.5)+T(335,104,'opening',12)+path('M357 108V151','none',c.lite,1.5)}
 if(i===6){s+=rect(142,157,48,5,'#8cc9b6')+T(42,73,'SIROF designated at active sites',13,c.lite);}
 s+=T(24,280,'ILLUSTRATIVE LAYER HEIGHTS / NOT A RECIPE',13);
 cap.textContent='Cross-section of an explanatory witness coupon. The SiC is an adhesion promoter and the silicon is temporary; thicknesses and lateral metal spans are not source measurements.';
 }else if(i===7||i===8){
 s+=T(21,27,i===7?'RELEASE · FLEX SEPARATES FROM CARRIER':'FOLD · DRY JIG / NO TISSUE',13);
 s+=path('M43 84V197Q43 228 77 228H135Q169 228 169 197V84','none',c.gold2,17);
 s+=path('M207 144H267m-13 -12 14 12-14 12','none',c.lite,3);
 s+=path('M317 91V201Q317 217 334 217H509','none',c.gold,18);
 s+=path('M329 91V190Q329 204 346 204H503','none',c.line,3);
 s+=T(64,263,'Planar U',15)+T(345,261,'Folded L',15);
 cap.textContent='Topology transition, not a die outline, fold-angle drawing, or patient procedure. Inspect the Contact map for a separate, nonliving bend witness.';
 }else{
 s+=T(23,32,'BENCH ASSEMBLY / FUNCTIONAL BOUNDARIES',13);
 const seg=[['Folded','thin film'],['MFI /','ceramic'],['16-wire','cable'],['Fixture','connector']];
 seg.forEach((b,k)=>{let x=18+k*141;s+=rect(x,115,121,65,k===1?'#bbba93':'#486352',c.line,5)+T(x+60.5,141,b[0],15,k===1?c.dark:c.paper,'middle')+T(x+60.5,161,b[1],14,k===1?c.dark:c.paper,'middle');if(k<3)s+=path('M'+(x+122)+' 148h19','none',c.gold,3)});
 s+=T(22,211,'Incoming sourced joint, not local MFI fabrication.',14,c.gold)+T(22,252,'7+1 nets per side · no vendor pin numbering',13);
 cap.textContent='Assembly and test interfaces. In the paper, 16 conductors connect the MFI/ceramic transition to the external connector. Actual pin assignments and joint dimensions are not recovered.';
 }
 $('process').innerHTML=s;$('plateNo').textContent=String(i+1).padStart(2,'0')+' / 13';
}
function showStage(){
 const a=stages[stage];$('station').value=''+stage;$('stationTitle').textContent=E.sampleStage[stage];$('stageText').textContent=a[1];$('stageCheck').textContent=a[2];$('stageEvidence').textContent=a[0];
 $('stageTools').innerHTML=a[3]?a[3].split(' ').map(id=>'<a href="https://buildthesimulation.com/simulations/equipment/'+id+'/">'+id+'</a>').join(' · ')+' (capability matches, not historical tool IDs)':'No qualified register equivalent; external handoff.';
 $('stagestatus').textContent=stage<done?'Accepted':stage===done?'Current handoff':'Preview only';$('prev').disabled=stage===0;$('next').disabled=stage===12;$('advance').disabled=stage!==done;$('advance').textContent=stage<done?'Handoff accepted':stage>done?'Earlier handoffs pending':stage===9?'Accept sourced ceramic':stage===12?'Run witness tests':'Accept handoff';
 $('runnum').textContent=String(done).padStart(2,'0')+' / 13';$('prog').value=done;$('all').textContent=done===13?'Open test results':done===0&&isNominal()?'Run nominal traveler':'Complete traveler';renderProcess(stage);
}
function isNominal(){return Object.entries(E.defaults()).every(([k,v])=>cfg[k]===v)}
function show(v){view=v;for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==v;for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===v));log(v==='build'?'Build stations may be previewed in any order; acceptance is sequential.':v==='map'?'Inspect design geometry even before the traveler is complete.':v==='bench'?'Synthetic fixture; test results require a completed traveler.':'Primary references, model equations and limitations.');render()}
function run(msg){done=13;stage=12;show('bench');log(msg||'All 13 traveler handoffs complete; fixture results below.')}
const fmt=(n,k)=>Number(n).toFixed(k);
function markEdit(k,val){cfg=E.normalize({...cfg,[k]:val}); const stageCut=({fault: cfg.fault==='swap'?10:3,target:cfg.fault==='swap'?10:3,windowLeg:5,blocked:5,overlay:5,thickness:8,radius:8,returnMode:12,hz:12})[k];done=Math.min(done,stageCut);stage=Math.min(stage,done);render();log('Updated '+k+'. Upstream handoffs retained; complete the traveler again for current fixture results.')}
function drawIso(){
 const rad=yaw*Math.PI/180,cs=Math.cos(rad),sn=Math.sin(rad),sep=.09+1.35*explode/100,shapes=[];
 function uv(x,y,z){x-=2.0;return [290+64*(x*cs-y*sn),135+64*((x*sn+y*cs)*.52-z*.82),-(x*sn+y*cs)*.82-z*.52]}
 function polygon(xy,z,col,edge){let pts=xy.map(q=>uv(q[0],q[1],z));return '<polygon points="'+pts.map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ')+'" fill="'+col+'" stroke="'+edge+'" stroke-width="1.2"/>'}
 const v=E.positions();
 for(const [letter,a] of [['L',1],['R',-1]]){
  let z=a*sep/2,plate=polygon([[-1.08,-.18],[5.18,-.18],[5.37,0],[5.18,.18],[-.55,.18],[-.55,1.1*a],[-1.08,1.1*a]],z,a===1?'#a8bb82':'#749d82','#d8deba');
  let gnet='G'+letter,ox=-.83,oy=a*1.53,poly=polygon([[ox-.52,oy-.51],[ox+.52,oy-.51],[ox+.52,oy+.51],[ox-.52,oy+.51]],z, gnet===focus?'#eabd77':'#8a946c','#ead7ac');
  for(let q of E.apertures){let u=uv(ox+q.x*.083,oy+q.y*.083,z);poly+=circ(u[0],u[1],.95,'#ffe2a0')}
  let vis=plate+poly;
  for(let o of v.filter(s=>s.side===letter)){let [x,y]=uv(o.xMm,0,z),sel=o.net===focus;vis+=circ(x,y,sel?6:2.9,sel?'#fff':'#f8c476','#3a5241',1)}
  let [x0,y0]=uv(ox,oy,z);vis+=T(x0+16,y0+5,gnet,11,'#fff');
  shapes.push({z,vis});
 }
 shapes.sort((a,b)=>a.z-b.z);$('iso').innerHTML=T(17,24,'EXPLORER  /  TWO SHAFT FACES • TWO GROUND LEGS',12)+shapes.map(o=>o.vis).join('')+T(18,265,'FOCUS '+focus+'  /  SHAFT-AXIS COORDINATES IN SOURCE PITCH',12,c.gold);
 $('yaw').value=yaw;$('explode').value=explode;$('yVal').textContent=yaw+'°';$('eVal').textContent=explode+'%';
}
function renderMap(d){
 drawIso(); const sel=d.sites.find(s=>s.net===focus);
 $('net').value=focus;$('leg').value=zoom;$('mapSvg').innerHTML=topo(focus,false);$('netfacts').innerHTML='<b>'+esc(sel.net)+' / '+esc(sel.role)+'</b><br>'+sel.nominalWindows+' nominal opening'+(sel.nominalWindows>1?'s on one net':'')+' · '+fmt(sel.exposedAreaMm2,5)+' mm² exposed in this geometry model.';
 let r='';const b=zoom===cfg.windowLeg?cfg.blocked:0;for(const p of E.apertures){let blocked=p.id<=b||d.oneAreaMm2===0;r+=circ(190+p.x*12,104+p.y*12,4.4,blocked?'#bda78d':'#4b7864',blocked?'#8c7259':'#294f43',.9)}
 r+=T(14,21,zoom+' / SINGLE BUS',12,c.ink)+T(14,193,'109 × Ø80 µm',12,c.ink);$('patch').innerHTML=r;
 $('patchcap').textContent=(109-b)+' of 109 openings not individually blocked. Current geometric area: '+fmt(d.sites.find(s=>s.net===zoom).exposedAreaMm2,4)+' mm². Partial overlap from mask offset is included in area; total nominal area is '+fmt(d.nominalGroundAreaMm2,4)+' mm².';
 $('thick').value=cfg.thickness;$('radius').value=cfg.radius;$('tVal').textContent=cfg.thickness+' µm';$('rVal').textContent=fmt(cfg.radius,2)+' mm';$('strain').textContent=fmt(d.outerStrainPct,3)+'% outer-fibre strain';
 const rr=21+8*cfg.radius,yy=86,xx=190,tt=2+cfg.thickness*.12;
 $('bend').innerHTML=circ(xx,yy,rr,'#d9ddc8','#b2bca5')+path('M38 '+yy+'H'+(xx-rr)+' A'+rr+' '+rr+' 0 0 1 '+(xx+rr)+' '+yy+'H340','none','#bd9150',tt)+path('M38 '+yy+'H'+(xx-rr)+' A'+rr+' '+rr+' 0 0 1 '+(xx+rr)+' '+yy+'H340','none','#416753',1,'stroke-dasharray="4 2"')+T(15,16,'INERT BEND WITNESS · NOT TO SCALE',11,c.ink);
}
function drawMatrix(d){
 let s='<svg role="presentation" viewBox="0 0 374 354">',a=18,x0=56,y0=43;
 N.forEach((name,j)=>{s+=T(x0+j*a,y0-18,name,9,c.ink,'middle')+T(x0-18,y0+j*a+3,name,9,c.ink,'end');});
 for(let i=0;i<16;i++)for(let j=0;j<16;j++){let good=d.matrix[i][j],own=i===j,co=good?(own?'#355c4b':'#b05c30'):'#e3e6d9';s+=rect(x0+j*a-7.8,y0+i*a-7.8,15.6,15.6,co,'none',1);if(own&&!good)s+=circ(x0+j*a,y0+i*a,5,'none','#985635',1.2)}
 s+=T(52,344,'ROWS: FIXTURE  /  COLUMNS: PHYSICAL NETS',9,c.ink);$('matrix').innerHTML=s+'</svg>';$('matrix').setAttribute('aria-label',d.registeredNets+' of 16 terminal identities correct. '+d.sites.filter(q=>!q.alignedNet).map(q=>q.net+' connects to '+(q.fixtureToPhysical.join(', ')||'no physical net')).join('. '));
}
function syncInputs(){for(const k of ['fault','target','windowLeg','blocked','overlay','returnMode','hz'])$(k).value=cfg[k];$('target').disabled=cfg.fault==='none';$('offVal').textContent=cfg.overlay+' µm';$('blockedVal').textContent=cfg.blocked+' / 109';$('loop').value=loop}
function renderBench(d){
 syncInputs();const ok=done===13;$('metN').textContent=ok?d.registeredNets+' / 16':'—';$('metA').textContent=ok?d.knownActives+' / 14':'—';$('metL').textContent=ok?d.validLoops+' / 14':'—';$('runBench').textContent=ok?'Rerun same fixture':'Complete lot & test';$('gateBanner').textContent=ok?'Results current for this configuration. Gray is unconnected; the physical site map is not altered by a wiring fault.':'Results pending: '+done+' of 13 handoffs complete. Use “Complete lot & test” after a configuration change.';
 const out=d.loops.find(o=>o.site===loop);if(!ok){$('matrix').innerHTML='<p>Complete the traveler to measure the witness graph.</p>';$('matrix').setAttribute('aria-label','Dry connectivity results pending');$('loopRead').textContent='No current result for this configuration.';$('loopTable').innerHTML='';return}
 drawMatrix(d);$('loopRead').innerHTML='<b>'+esc(out.site)+' → '+esc(out.returnNet)+'</b><br>'+(out.qualified?'Correct identity, nonzero exposed area.<br>|Z| = '+fmt(out.z.magnitudeOhm/1000,3)+' kΩ<br>Phase = '+fmt(out.z.phaseDeg,2)+'° at '+cfg.hz+' Hz':'Not qualified: '+esc(out.issues.join(' + '))+'.<br>No numerical impedance assigned.');
 $('loopTable').innerHTML=d.loops.map(o=>'<div class="tiny">'+esc(o.site)+' → '+esc(o.returnNet)+' &nbsp; '+(o.qualified?fmt(o.z.magnitudeOhm/1000,2)+' kΩ':esc(o.issues.join(' + ')))+'</div>').join('');
}
function render(){const d=E.solve(cfg);showStage();if(view==='map')renderMap(d);if(view==='bench')renderBench(d)}
$('station').onchange=e=>{stage=+e.target.value;showStage()};$('prev').onclick=()=>{stage=Math.max(0,stage-1);showStage()};$('next').onclick=()=>{stage=Math.min(12,stage+1);showStage()};$('advance').onclick=()=>{if(done===stage&&done<13){done++;stage=Math.min(done,12);if(done===13)run('Traveler complete. Dry and wet witness results are ready.');else{render();log('Accepted '+done+' of 13 handoffs.')}}};$('all').onclick=()=>run();$('runBench').onclick=()=>run();$('reset').onclick=()=>{cfg=E.defaults();done=0;stage=0;focus='L4';loop='L4';zoom='GL';yaw=18;explode=32;show('build');log('Fresh nominal lot. No handoffs accepted.')};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>show(b.dataset.view);
for(const k of ['target','fault','windowLeg','returnMode','hz'])$(k).onchange=e=>markEdit(k,e.target.value);
for(const [id,k] of [['blocked','blocked'],['overlay','overlay'],['thick','thickness'],['radius','radius']])$(id).oninput=e=>markEdit(k,+e.target.value);
$('yaw').oninput=e=>{yaw=+e.target.value;drawIso()};$('explode').oninput=e=>{explode=+e.target.value;drawIso()};
$('net').onchange=e=>{focus=e.target.value;if(focus.startsWith('G'))zoom=focus;render()};$('leg').onchange=e=>{zoom=e.target.value;render()};$('loop').onchange=e=>{loop=e.target.value;render()};
const cases={nom:{},gl:{fault:'open',target:'GL'},mask:{windowLeg:'GL',blocked:109},skin:{windowLeg:'GL',blocked:35},swap:{fault:'swap',target:'R2'},bridge:{fault:'bridge',target:'L3'}};
for(const b of document.querySelectorAll('[data-case]'))b.onclick=()=>{let k=b.dataset.case;cfg=E.normalize({...E.defaults(),...cases[k]});loop=k==='swap'?'R2':k==='bridge'?'L3':'L4';focus=loop;zoom='GL';run('Applied “'+b.textContent+'” to a fresh traveler and ran all 13 handoffs.');};
$('export').onclick=()=>{const snapshot={format:'BTS-TIME4H-LOT-1',device:'TIME-4H (2021 reference)',finished:done===13,completedHandoffs:done,stations:E.sampleStage.slice(0,done),configuration:cfg,fixtureNetNotice:'Local IDs; not manufacturer pinout. Dry buried-conductor witness and nonclinical synthetic passive loop model.',processOrder:'Publicly identified materials and components; detailed layer sequence is reconstructed, not a production recipe.',modelConstants:E.constants,activePositions:E.positions(),source:'https://www.mdpi.com/1424-8220/21/21/7219',results:done===13?E.solve(cfg):null};const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='TIME-4H-teaching-lot.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);log(done===13?'Exported completed synthetic lot and model constants.':'Exported partial lot; untested results are null.')};
show('build');
})();
