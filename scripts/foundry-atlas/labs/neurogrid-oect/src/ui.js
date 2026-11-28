(()=>{
'use strict';
const N=window.NGBench,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=i=>String(i).padStart(2,'0');
const BASE='https://buildthesimulation.com',url=s=>location.protocol==='file:'&&s.startsWith('/')?BASE+s:s;
const blank=()=>({stage:0,reached:0,fault:'nominal',location:137,inspect:137,vG:.35,vD:-.4,map:false,curve:'a'});
const forMode={passive:blank(),oect:blank()};let mode='passive',model;const cur=()=>forMode[mode];
const colors={m:'#92ab94',ink:'#e2e7cc',gold:'#d8b77d',film:'#b08550',bath:'#375f5a',poly:'#97c598',bad:'#f89f84',blank:'#254b3e',oxide:'#77b7af'};
function pnum(value,prev){const n=Number(value);return Number.isInteger(n)&&n?Math.max(0,Math.min(255,n-1)):prev}
let liveTimer;
function status(t){clearTimeout(liveTimer);$('live').textContent='';liveTimer=setTimeout(()=>$('live').textContent=t,20)}
const stageMotion=matchMedia('(prefers-reduced-motion: reduce)'), STATION_DWELL=1850;
let stageTimer,stageAnimation,playState='ready';
function renderPlayback(){
 const a=cur(),count=N.modes[mode].route.length,b=$('stage-play');
 b.textContent={ready:'Play workflow',playing:'Pause workflow',paused:'Resume workflow',complete:'Replay workflow'}[playState];
 $('stage-player').dataset.state=playState;
 $('stage-play-label').textContent={ready:'Ready',playing:'Playing',paused:'Paused',complete:'Complete'}[playState];
 $('stage-play-step').textContent=(a.stage+1)+' / '+count;
 const p=$('stage-play-progress');p.max=count;p.value=a.stage+1;
}
function stopPlayback(next='paused',notify=false){
 clearTimeout(stageTimer);stageTimer=undefined;stageAnimation?.cancel();
 playState=next;renderPlayback();
 if(notify)status('Workflow paused at station '+(cur().stage+1)+'.');
}
function interruptPlayback(){if(playState==='playing')stopPlayback('paused',true);}
function showPlaybackFrame(){
 stageAnimation?.cancel();
 const plate=$('plate');
 if(!stageMotion.matches&&plate.animate)
  stageAnimation=plate.animate([{opacity:.42},{opacity:1}],{duration:300,easing:'ease-out'});
}
function queueStation(){
 clearTimeout(stageTimer);
 stageTimer=setTimeout(()=>{
  stageTimer=undefined;
  if(playState!=='playing')return;
  const next=cur().stage+1,last=N.modes[mode].route.length-1;
  stgo(next);
  if(next>=last){playState='complete';renderPlayback();}
  showPlaybackFrame();
  if(next<last)queueStation();
 },STATION_DWELL);
}
function togglePlayback(){
 if(playState==='playing'){stopPlayback('paused',true);return;}
 const restart=playState!=='paused'||cur().stage>=N.modes[mode].route.length-1;
 playState='playing';cur().map=false;stgo(restart?0:cur().stage);
 const scene=$('stage-detail'),art=$('plate');
 if(art.getBoundingClientRect().bottom>innerHeight)scene.scrollIntoView({block:'start',behavior:'auto'});
 showPlaybackFrame();queueStation();
}
if(stageMotion.addEventListener)stageMotion.addEventListener('change',()=>{if(stageMotion.matches)stageAnimation?.cancel();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playState==='playing')stopPlayback('paused');});
window.addEventListener('pagehide',()=>{if(playState==='playing')stopPlayback('paused');});
function stgo(stage,scroll=false){const a=cur();a.stage=Math.max(0,Math.min(7,stage));if(playState==='complete'&&a.stage<7)playState='ready';a.reached=Math.max(a.stage,a.reached);render();if(scroll){const s=$('stage-title');s.setAttribute('tabindex','-1');s.focus({preventScroll:true});$('stage-detail').scrollIntoView({block:'start'})}status('Station '+(a.stage+1)+': '+N.modes[mode].route[a.stage].title)}
const line=(x1,y1,x2,y2,c=colors.m,w=2,rest='')=>'<path d="M'+x1+' '+y1+'L'+x2+' '+y2+'" stroke="'+c+'" fill="none" stroke-width="'+w+'" '+rest+'/>';
const rect=(x,y,w,h,f,s=colors.m,rest='')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+f+'" stroke="'+s+'" '+rest+'/>';
const text=(x,y,t,s=15,c=colors.ink,a='start')=>'<text x="'+x+'" y="'+y+'" fill="'+c+'" text-anchor="'+a+'" font-family="ui-monospace,monospace" font-size="'+s+'">'+esc(t)+'</text>';
const note=(xy,t)=>text(xy[0],xy[1],t,13,colors.m);
const circle=(x,y,r,f,c,rest='')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'" stroke="'+c+'" '+rest+'/>';
const dashed='stroke-dasharray="6 5"';
const water=()=>'<path d="M65 146Q124 128 191 140T333 140T477 139T619 139T755 140V232H65Z" fill="'+colors.bath+'" stroke="#75a394" stroke-opacity=".78"/>';
function plate(){
 const a=cur(),m=model,s=m.stage,r=m.result;
 const legend=['PARYLENE C','BURIED METAL','PEDOT:PSS','INERT BATH'];
 const defs='<defs><pattern id="plate-grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0H14V14" fill="none" stroke="#8da694" stroke-opacity=".16" stroke-width=".65"/></pattern><marker id="tip" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><path d="M0 0L5 2.5 0 5" fill="none" stroke="#a3c7a5"/></marker></defs>';
 const base=defs+rect(0,0,820,370,'#20362b','none')+rect(17,15,786,337,'url(#plate-grid)','#769382')+text(43,49,mode==='passive'?'PASSIVE PLATE / 2015':'ACTIVE PLATE / 2013',18,colors.gold);
 let p=base,desc='';
 if(mode==='passive'&&a.map){
  const o=26,gx=312,gy=63,g=16;
  p+=rect(gx,gy,g*g,g*g,colors.blank,colors.m);
  for(const j of r.rows){
   const x=gx+(j.index%16)*g+g/2,y=gy+Math.floor(j.index/16)*g+g/2;
   const c=s<4?'#61756a':s>=6&&(j.dry!=='Mapped')?colors.bad:j.leakage?'#e6b87b':!j.windowOpen?'#ddcda6':colors.poly;
   p+=circle(x,y,3.4,c,'none','data-site="'+j.index+'"');
   if(j.index===a.inspect)p+=circle(x,y,7.9,'none',colors.ink,'stroke-width="1.4" pointer-events="none"');
  }
  p+=text(47,111,'16 × 16',31)+text(47,140,'INFERRED CENTER MAP',15,colors.gold)+text(47,185,'256 SITES',23)+note([47,211],'Reported 30 µm spacing');
  p+=text(47,264,'SELECTED  '+r.selected.id,22)+note([47,292],s>=6?r.selected.dry:'Not yet inspected');
  p+=note([590,115],'Green   isolated')+note([590,139],'Salmon  dry error')+note([590,163],'Cream   covered')+note([590,187],'Gold    lead leak')+note([590,245],'Symbols enlarged');
  desc='Centered, inferred 16 × 16 patch. Contact symbols are larger than geometry. Tap a marker or use the numeric site inspector; changing the inspected site does not move the fault.';
 }else if(mode==='passive'){
  const row=r.selected;
  if(s>=5)p+=water()+text(61,136,'INERT ELECTROLYTE VOLUME',14,colors.oxide);
  if(s>=1)p+=rect(108,240,609,33,colors.film,colors.gold)+text(106,303,'2 µm BASE PARYLENE',13,colors.gold);
  if(s>=2){
   p+=rect(146,229,504,9,colors.gold,colors.gold);
   if(!row.trace){p+=rect(239,228,15,12,'#23372b','#23372b')+line(237,225,255,242,colors.bad,3)+line(255,225,237,242,colors.bad,3)}
  }
  if(s>=3){p+=rect(108,196,346,29,'#85704b',colors.gold)+rect(493,196,224,29,'#85704b',colors.gold)+text(536,184,'INSULATED ROUTE',14,colors.gold);}
  if(s>=4)p+=row.windowOpen?rect(455,206,37,22,colors.poly,colors.poly)+text(474,174,'EXPOSED POLYMER',13,colors.poly,'middle'):rect(451,196,45,30,colors.film,colors.gold)+text(474,174,'COVERED SITE',13,colors.bad,'middle');
  if(s>=5){p+=line(747,107,747,173,r.ref?colors.oxide:colors.bad,3,r.ref?'':dashed)+circle(747,175,5,r.ref?colors.oxide:colors.bad,'none')+note([585,104],'SEPARATE REFERENCE');}
  if(s>=3&&row.leakage)p+=line(565,185,565,226,colors.bad,5,dashed)+text(557,167,'BREACH',14,colors.bad);
  p+=note([46,334],'ONE SITE → ONE TRACE. NO SOURCE, DRAIN OR GATE.');
  desc='Concept section, thickness exaggerated. The passive bath reference is not a gate and not an extra recording channel. Exposing only a polymer-coated site preserves the metal feedthrough insulation.';
 }else{
  if(s>=5)p+=water()+text(64,135,'INERT IONIC BOUNDARY',14,colors.oxide);
  if(s>=1)p+=rect(106,244,610,33,colors.film,colors.gold)+text(109,305,'2 µm BASE PARYLENE',13,colors.gold);
  if(s>=2){
   p+=rect(142,232,229,9,colors.gold,colors.gold)+rect(451,232,225,9,colors.gold,colors.gold);
   
   for(const [key,x] of [['s',236],['d',572]])if(!r.sources[key])p+=rect(x-7,231,14,11,'#20362b','none')+line(x-7,227,x+7,246,colors.bad,3)+line(x+7,227,x-7,246,colors.bad,3);
  }
  if(r.polymer)p+=rect(356,217,109,14,colors.poly,colors.poly)+text(411,303,'6 × 15 µm CHANNEL',13,colors.m,'middle');
  if(s>=4){
   p+=rect(107,194,248,32,'#85704b',colors.gold)+rect(465,194,251,32,'#85704b',colors.gold);
   if(!r.windowOpen)p+=rect(353,193,113,32,colors.film,colors.gold)+text(411,185,'WINDOW BLOCKED',13,colors.bad,'middle');
   else p+=text(404,187,'POLYMER WINDOW',13,colors.poly,'middle');
   p+=text(727,303,'INSULATED FEEDTHROUGH',13,colors.m,'end');
  }
  if(s>=5){
   const c=r.sources.g?colors.oxide:colors.bad;
   p+=line(582,66,582,119,c,3,r.sources.g?'':dashed)+circle(582,123,7,c,c)+text(598,108,'G · SEPARATE BATH GATE',13,c);
   if(r.drive)p+='<path d="M570 130Q510 146 451 159" stroke="'+colors.poly+'" fill="none" stroke-width="2" '+dashed+' marker-end="url(#tip)"/>';
   if(r.leakage)p+=line(556,175,556,229,colors.bad,4,dashed)+text(546,167,'LEAK',13,colors.bad);
  }
  if(s>=2){
   p+=text(144,s>=4?216:209,r.sources.s?'S · SOURCE':'S · OPEN LEAD',17,r.sources.s?colors.ink:colors.bad);
   p+=text(677,s>=4?216:209,r.sources.d?'D · DRAIN':'D · OPEN LEAD',17,r.sources.d?colors.ink:colors.bad,'end');
  }
  if(r.bridge)p+=line(363,237,457,237,colors.bad,5)+text(408,267,'METAL BYPASS',13,colors.bad,'middle');
  p+=note([45,334],'GATES THE CHANNEL THROUGH IONS; NO DIRECT G–D METAL PATH.');
  desc='Concept section, not exact artwork. Dry source and drain wiring remains buried. The channel alone has an electrolyte window; the gate is a separate electrode in the bath. Feedthrough does not mean a hermetic seal.';
 }
 if(s>=6&&!a.map){
 const caption=s===6?'DRY CHECK':'VIRTUAL BENCH';
 const result=mode==='passive'?(s===6?r.selected.dry:r.selected.wet):r.status;
 if(result){p+=text(44,82,caption+' · '+result.toUpperCase(),14,colors.oxide);desc+=' '+caption+': '+result+'.';}
 }
 $('plate').innerHTML=p;$('plate-note').textContent=desc;$('plate').setAttribute('aria-label',desc);
 $('view-toggle').hidden=mode==='oect';$('view-toggle').textContent=a.map?'Show cross-section':'Show site map';
}
function makePlot(data,props){
 if(!data.length)return '';
 const l=47,r=372,t=20,b=135,xa=data.map(x=>x[props.x]),ya=data.map(x=>x[props.y]),lo=Math.min(...ya),hi=Math.max(...ya);
 const isLog=(props.x==='fHz'),ylog=props.y==='absOhm';const tr=x=>isLog?Math.log10(x):x,tra=y=>ylog?Math.log10(y):y;
 const minX=tr(xa[0]),maxX=tr(xa.at(-1)),yMin=tra(lo),yMax=tra(hi),padY=yMax===yMin?(Math.abs(yMax)*.1+1):(yMax-yMin)*.08,y0=yMin-padY,y1=yMax+padY;
 const X=x=>l+(tr(x)-minX)*(r-l)/(maxX-minX),Y=y=>b-(tra(y)-y0)*(b-t)/(y1-y0);
 const fmt=n=>Math.abs(n)>=1000?(n/1000).toPrecision(3).replace(/\.?0+$/,'')+'k':Number(n.toPrecision(3)).toString();
 const grids=(isLog?[10,100,1000,10000,100000]:[0,.15,.3,.45,.6]).map(x=>'<path d="M'+X(x)+' '+t+'V'+b+'" opacity=".32"/><text x="'+X(x)+'" y="150" text-anchor="middle" stroke-width="0">'+fmt(x)+'</text>').join('');
 const yticks=[.1,.5,.9].map(q=>{const z=y0+(y1-y0)*q,yy=ylog?10**z:z;return '<path d="M'+l+' '+Y(yy)+'H'+r+'" opacity=".32"/><text x="42" y="'+(Y(yy)+3)+'" text-anchor="end" stroke-width="0">'+fmt(yy)+'</text>'}).join('');
 const path=data.map((x,i)=>(i?'L':'M')+X(x[props.x]).toFixed(1)+' '+Y(x[props.y]).toFixed(1)).join(' ');
 const s=props.selected;
 return '<svg class="diagramplot" role="img" aria-label="'+esc(props.a11y)+'" viewBox="0 0 392 166" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" fill="currentColor" font-family="monospace" font-size="10" stroke-width=".7">'+grids+yticks+'<text x="7" y="12" stroke-width="0">'+esc(props.unit)+'</text><text x="380" y="164" text-anchor="end" stroke-width="0">'+(isLog?'Frequency (Hz)':'Gate voltage (V)')+'</text><path d="'+path+'" stroke-width="2.4" fill="none"/>'+(s?'<circle cx="'+X(s[props.x])+'" cy="'+Y(s[props.y])+'" r="3.8"/>':'')+'</g></svg>'
}
const stamps=pairs=>'<dl class="stamp">'+pairs.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>';
function bench(){
 const a=cur(),r=model.result,p=mode==='passive',done=a.stage===7,inspected=a.stage>=6;
 $('bench-title').textContent=p?'Passive impedance bench':'Electrolyte-gated transfer bench';
 $('bench-help').textContent=p?'An AC test on one isolated electrode interface. Frequency is the horizontal axis; this device has no V_G or transconductance.':'One simulated transistor, not 17 simultaneous outputs. Source is the 0 V reference; ADC/readout electronics are not modeled.';
 $('faultloc-wrap').hidden=!p;$('vg-wrap').hidden=p;$('vd-wrap').hidden=p;
 $('vg-out').value=a.vG.toFixed(2)+' V';$('vd-out').value=a.vD.toFixed(2)+' V';
 $('fault-note').textContent=N.faults[mode][a.fault].note+(a.stage<N.faults[mode][a.fault].at?' Applies at station '+(N.faults[mode][a.fault].at+1)+'.':'');
 $('site-picker').hidden=!p;$('check-caption').textContent=p?'Selected contact':'Selected transistor';
 $('prev-site').disabled=a.inspect===0;$('next-site').disabled=a.inspect===255;
 if(document.activeElement!==$('site'))$('site').value=String(a.inspect+1);if(document.activeElement!==$('faultloc'))$('faultloc').value=String(a.location+1);
 let props,data=[];
 if(p){
  const z=r.selected;data=N.passiveZ(z);const k=data.find(x=>x.fHz===1000);
  $('stats').innerHTML=stamps([['Site',z.id],['Dry graph',z.dry],['Wet interface',z.wet],['Logical line',inspected?z.logicalOutputs.join(' / ')||'None':'Not inspected'],['|Z| at 1 kHz',k?(k.absOhm/1000).toFixed(2)+' kΩ · synthetic':'Unavailable'],['Phase at 1 kHz',k?k.phaseDeg.toFixed(1)+'° · synthetic':'Unavailable']])+(done?'<p class="statline">'+r.counts.goodRoutes+' mapped / 256 · '+r.counts.valid+' isolated wet · '+r.counts.abnormalSpectrum+' anomalous low-Z</p>':'');
  $('curve-caption').textContent='Synthetic impedance spectrum';$('curve-a').textContent='Magnitude |Z|';$('curve-b').textContent='Phase';
  $('benchmark').textContent='Passive series R + (parallel RC) is a synthetic contrast, not a numerical fit to the NeuroGrid paper or a neural sample.';
  const phase=a.curve==='b';props={x:'fHz',y:phase?'phaseDeg':'absOhm',unit:phase?'Phase (°)':'|Z| (Ω)',a11y:phase?'Synthetic phase across frequency.':'Synthetic impedance magnitude across frequency.',selected:k};
 }else{
  const k=r.selected;data=r.sweep;
  $('stats').innerHTML=stamps([['Inspection',r.status],['S–D path',r.path?'Continuous':'Not continuous'],['Polymer window',r.windowOpen?'Exposed':'Closed'],['Gate drive',r.sources.g?'Present':'Not present'],['I_D',k?k.iDuA.toFixed(2)+' µA · signed':'Unavailable'],['g_m',k?k.gmUS.toFixed(2)+' µS':'Unavailable'],['I_G',k?k.iGnA.toFixed(2)+' nA':'Unavailable']]);
  $('curve-caption').textContent='Synthetic p-type transfer';$('curve-a').textContent='Signed I_D';$('curve-b').textContent='g_m slope';
  $('benchmark').textContent='Literature Fig. 2 only: reported peak g_m ≈ 900 µS at V_G ≈ +0.42 V and V_D = −0.4 V. The virtual curve is not fitted to it. More positive gate reduces |I_D|, so signed slope is positive.';
  const g=a.curve==='b';props={x:'vG',y:g?'gmUS':'iDuA',unit:g?'g_m (µS)':'I_D (µA)',a11y:g?'Synthetic transconductance versus gate voltage.':'Synthetic signed drain current versus gate voltage.',selected:k};
 }
 $('curve-a').setAttribute('aria-pressed',String(a.curve==='a'));$('curve-b').setAttribute('aria-pressed',String(a.curve==='b'));
 $('plot').innerHTML=makePlot(data,props)||'<p class="notice">'+(!done?'Finish the virtual process to run the bench.':'No valid impedance spectrum: inspect the reference, trace, isolation and window.')+'</p>';
 $('csv').disabled=!done;
}
function render(){
 const a=cur(),d=N.modes[mode],step=d.route[a.stage];model=N.solve({mode,...a});
 for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
 $('frontier').textContent=(a.stage<a.reached?'Reviewing archive · ':'')+(a.reached+1)+' / 8 stations reached';$('progress').value=a.reached+1;
 $('prev-stage').disabled=a.stage===0;$('next-stage').disabled=a.stage>=7;$('next-stage').textContent=a.stage>=7?'At bench':'Next station →';
 $('run').disabled=a.stage===7;
 $('stage-kicker').textContent='Station '+pad(a.stage+1)+' / 08 · '+(mode==='passive'?'Passive':'Active');
 $('stage-title').textContent=step.title;$('stage-basis').textContent=step.basis;
 $('stage-description').textContent=step.desc;$('stage-check').innerHTML='<strong class="point">Check </strong>'+esc(step.check);
 $('step-tools').innerHTML=step.equipment.map(i=>'<a href="'+esc(url('/simulations/equipment/'+i+'/'))+'">'+esc(i+' · '+N.tools[i])+'</a>').join('')+'<a href="'+esc(N.docs[d.source].url)+'">Primary source ↗</a>';
 for(const b of $('steps').querySelectorAll('button')){
  const i=Number(b.dataset.step);b.disabled=i>a.reached;b.querySelector('.st-title').textContent=d.route[i].title;
  b.querySelector('.stage-symbol').textContent=i===a.stage?'▶':i<=a.reached?'✓':'·';
  if(i===a.stage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
 }
 plate();bench();renderPlayback();
}
function syncControls(){
 $('fault').innerHTML=Object.entries(N.faults[mode]).map(([key,d])=>'<option value="'+esc(key)+'">'+esc(d.label)+'</option>').join('');
 const a=cur();$('vg').value=a.vG;$('vd').value=a.vD;$('fault').value=a.fault;$('faultloc').value=a.location+1;$('site').value=a.inspect+1;
}
function download(name,kind,txt){const a=document.createElement('a');a.download=name;a.href=URL.createObjectURL(new Blob([txt],{type:kind}));document.body.append(a);a.click();const u=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
function init(){
 $('stage-play').addEventListener('click',togglePlayback);
 const manualClick='[data-step],#next-stage,#prev-stage,#run,#reset,#view-toggle,#compare-cover,[data-site],#prev-site,#next-site,[data-curve],#csv,#json';
 $('app').addEventListener('click',e=>{const b=e.target.closest(manualClick);if(b&&!b.disabled)interruptPlayback();},true);
 for(const kind of ['input','change'])$('app').addEventListener(kind,e=>{if(e.target.matches('input,select'))interruptPlayback();},true);
 $('steps').innerHTML=Array.from({length:8},(_,i)=>'<li><button type="button" data-step="'+i+'"><span class="n">'+pad(i+1)+'</span><span class="st-title"></span><span class="stage-symbol" aria-hidden="true"></span></button></li>').join('');
 $('refs').innerHTML=Object.values(N.docs).map(x=>'<dt><a href="'+esc(x.url)+'">'+esc(x.title)+'</a></dt><dd>'+esc(x.scope)+'</dd>').join('');
 if(location.protocol==='file:')for(const a of document.querySelectorAll('a[href^="/"]'))a.href=url(a.getAttribute('href'));
 for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{stopPlayback('ready');mode=b.dataset.mode;syncControls();render();status(N.modes[mode].label+' selected.')});
 $('steps').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b&&!b.disabled)stgo(+b.dataset.step,true)});
 $('next-stage').addEventListener('click',()=>stgo(cur().stage+1,true));$('prev-stage').addEventListener('click',()=>stgo(cur().stage-1,true));
 $('run').addEventListener('click',()=>{stgo(7,false);$('inspection').scrollIntoView({block:'start'})});
 $('reset').addEventListener('click',()=>{stopPlayback('ready');forMode[mode]=blank();syncControls();stgo(0)});
 $('view-toggle').addEventListener('click',()=>{cur().map=!cur().map;plate()});
 $('compare-cover').addEventListener('click',()=>{const a=cur();a.fault=mode==='passive'?'cover':'covered';if(mode==='passive')a.inspect=a.location;syncControls();stgo(7)});
 $('fault').addEventListener('change',()=>{cur().fault=$('fault').value;render()});
 $('faultloc').addEventListener('change',()=>{const a=cur();a.location=pnum($('faultloc').value,a.location);$('faultloc').value=a.location+1;render()});
 $('site').addEventListener('change',()=>{const a=cur();a.inspect=pnum($('site').value,a.inspect);$('site').value=a.inspect+1;render()});
 $('plate').addEventListener('click',e=>{const b=e.target.closest('[data-site]');if(b){cur().inspect=+b.dataset.site;render();status('Selected '+model.result.selected.id)}});
 $('prev-site').addEventListener('click',()=>{cur().inspect=Math.max(0,cur().inspect-1);render()});
 $('next-site').addEventListener('click',()=>{cur().inspect=Math.min(255,cur().inspect+1);render()});
 ['vg','vd'].forEach(k=>$(k).addEventListener('input',()=>{cur()[k==='vg'?'vG':'vD']=+$(k).value;render()}));
 for(const b of document.querySelectorAll('[data-curve]'))b.addEventListener('click',()=>{cur().curve=b.dataset.curve;bench()});
 $('csv').addEventListener('click',()=>download('neurogrid-oect-'+mode+'-synthetic.csv','text/csv;charset=utf-8',N.csv(model)));
 $('json').addEventListener('click',()=>download('neurogrid-oect-'+mode+'-traveler.json','application/json',JSON.stringify(N.report(model),null,2)+'\n'));
 syncControls();render();$('app').hidden=false;
}
try{init()}catch(e){$('error').hidden=false;console.error(e)}
})();
