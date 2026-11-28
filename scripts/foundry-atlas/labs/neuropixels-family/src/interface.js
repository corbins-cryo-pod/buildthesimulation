(()=>{'use strict';
const E=NPBench,$=s=>document.getElementById(s),fmt=v=>typeof v==='number'?v.toLocaleString('en-US'):String(v),ns='http://www.w3.org/2000/svg';
const sitePath=x=>location.protocol==='file:'?'https://buildthesimulation.com'+x:x;
if(location.protocol==='file:')document.querySelectorAll('a[href^="/"]').forEach(a=>a.href=sitePath(a.getAttribute('href')));
const statusNames={address:'1.0 line check passed',pattern:'Documented layout',capacity:'Documented capacity',bounds:'Within bounds only',invalid:'Rejected'};
let selected=null,last=null,boot=true;
const el=(tag,t='',a={})=>{let z=document.createElement(tag);if(t!=='')z.textContent=t;for(const [k,v] of Object.entries(a))z.setAttribute(k,v);return z;};
const option=(v,t)=>el('option',t,{value:v});
const svg=(parent,tag,a,t)=>{let z=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(a))z.setAttribute(k,v);if(t!==undefined)z.textContent=t;parent.append(z);return z;};
function numeric(s){const x=String(s??'').trim();return /^\d+$/.test(x)?Number(x):NaN;}
function labelInput(parent,id,label,type,attrs={}){
 const group=el('div','','field'===type?{}:{class:'field'}),l=el('label',label,{for:id});group.append(l);const x=el(type,'',{id,...attrs});group.append(x);parent.append(group);return x;
}
function opts(node,arr){node.replaceChildren(...arr.map(([k,v])=>option(k,v)));}
function changeModel(k,mode,vals={}){
 const m=E.profiles[k];if(!m)return;
 $('model').value=k;opts($('pattern'),E.preset[k]);$('pattern').value=E.preset[k].some(v=>v[0]===mode)?mode:E.preset[k][0][0];
 opts($('faultshank'),Array.from({length:m.n},(_,i)=>[i,'Shank '+i]));$('fault').value='none';$('faultnum').value='0';
 $('specTitle').textContent=m.spec;$('specDescription').textContent=m.text;$('traveler').href=sitePath('/simulations/foundry/atlas/#profile='+m.ref);
 const src=$('sources');src.replaceChildren();for(let id of m.sources){const v=E.source[id],li=el('li'),a=el('a',v[0],{href:v[1],rel:'noreferrer'});li.append(a,el('span',v[2]));src.append(li);}
 buildOptions(vals); update();
}
function buildOptions(o={}){
 const k=$('model').value,mode=$('pattern').value,p=$('specific'),m=E.profiles[k];p.replaceChildren();
 if(mode==='manual'){const a=labelInput(p,'siteList','Physical sites · zero-based','textarea',{spellcheck:'false',rows:2});a.value=o.sites??'0-7, 392';p.append(el('p','Use commas or spaces and a hyphen for inclusive ranges. Try 0,384, then change 384 to 385.',{class:'hint'}));}
 if(mode==='window'){const a=labelInput(p,'start','First site · valid aligned start 0–896','input',{type:'number',min:0,max:896,step:32,inputmode:'numeric'});a.value=o.start??0;p.append(el('p','A step is 32 sites. You may type another start to test the limit of what the paper guarantees.',{class:'hint'}));}
 if(mode==='one'&&k==='np2m'){const a=labelInput(p,'onlyShank','Selected shank','select');opts(a,Array.from({length:4},(_,i)=>[i,'Shank '+i]));a.value=o.shank??0;}
 if(mode==='color'){
  const w=labelInput(p,'wavelength','Optical input','select'),a=labelInput(p,'emitter','Emitter position · zero-based','select');opts(w,[[450,'450 nm · blue'],[638,'638 nm · red']]);opts(a,Array.from({length:14},(_,i)=>[i,String(i)]));w.value=o.wavelength??450;a.value=o.emitter??0;
 }
 if(mode==='counts'){
  const grid=el('div','',{class:'counts'});p.append(grid);for(let i=0;i<m.n;i++){
   const a=labelInput(grid,'count'+i,'Shank '+i+' · lines','input',{min:0,step:1,type:'number',inputmode:'numeric'});a.value=o.counts?.[i]??Math.floor(m.total/m.n);
  }
  if(k==='quad'||k==='nxt'||k==='np2m'){const target=k==='quad'?'nxt':'quad',btn=el('button','Keep these counts → '+E.profiles[target].short,{type:'button',class:'inlineNote'});btn.addEventListener('click',()=>{let counts=Array.from({length:m.n},(_,i)=>$('count'+i).value);changeModel(target,'counts',{counts});});p.append(btn);}
 }
}
function read(){
 const m=E.profiles[$('model').value],mode=$('pattern').value;
 return {sites:$('siteList')?.value,start:$('start')?numeric($('start').value):undefined,shank:$('onlyShank')?numeric($('onlyShank').value):0,wavelength:$('wavelength')?numeric($('wavelength').value):undefined,emitter:$('emitter')?numeric($('emitter').value):undefined,counts:mode==='counts'?Array.from({length:m.n},(_,i)=>numeric($('count'+i).value)):undefined};
}
function faultUi(){
 const kind=$('fault').value,n=$('model').value,sh=E.profiles[n].n;
 $('faultnumWrap').hidden=kind!=='site'&&kind!=='lane';$('faultshankWrap').hidden=!['site','shank'].includes(kind)||sh===1;
 $('faultnumLabel').textContent=kind==='site'?'Physical site ID':'Output lane ID';
 const texts={none:'First run without a fault. Compare exact tags, not just whether packets arrived.',site:'Keep the same faulty physical site and change a selection. An unselected site does not lose an active output.',lane:n==='np1'?'A broken 1.0 readout line stays broken when its bank switches to a different physical site.':'This fault addresses a numbered synthetic slot; it does not assert the device’s actual ADC routing.',shank:'Every selected word on this shank is lost. An unselected shank contributes no active words.',swap:'The first two active output words trade places. Packet count stays unchanged even though two channel identities are wrong.',common:'Every selected word disappears, independent of site map or shank.'};
 $('faultHint').textContent=texts[kind];
}
function strip(svgRoot,x,y,w,h,fill,stroke){return svg(svgRoot,'rect',{x,y,width:w,height:h,rx:2,fill,stroke:stroke||'none'});}
function tx(g,x,y,s,fill='#d9e6d8',size=13,extra={}){return svg(g,'text',{x,y,fill,'font-size':size,'font-family':'ui-monospace,monospace',...extra},s);}
function plot(ev){
 const m=E.profiles[ev.key],g=$('art');g.replaceChildren();const narrow=$('diagram').clientWidth<480;$('diagram').setAttribute('viewBox',narrow?'0 0 360 255':'0 0 680 255');
 const known=ev.groups.some(x=>x.site!==null),bad=ev.code==='invalid',area='#34564a',lime='#b9dfb6',gold='#e1bd69',light='#e4eddf';const tone=bad?'#eba382':ev.code==='bounds'?gold:lime;
 let caption='';
 if(ev.key==='ultra'&&ev.rows){
  tx(g,narrow?12:20,26,'SELECTED FOOTPRINT · SCHEMATIC',lime,13);
  const n=ev.cols,rows=ev.rows,h=168,xd=narrow?10:24,yt=52,ww=narrow?99:165,rr=Math.min(32,rows);
  const align=ww/n,cw=Math.min(13,align*.56),rh=h/rr;for(let j=0;j<rr;j++)for(let i=0;i<n;i++){strip(g,xd+(i+.5)*align-cw/2,yt+j*rh,cw,Math.min(3.4,rh-1),j%4===0?'#d6edc6':'#9dcf9e');}
  tx(g,narrow?11:25,239,n+(narrow?' columns':' selected column'+(n===1?'':'s')),light,14);
  tx(g,narrow?125:216,72,rows+' rows × '+n+' columns',light,19);tx(g,narrow?125:216,103,'384 nominal site positions',lime,16);
  tx(g,narrow?125:216,139,'First–last row centers',gold,15);tx(g,narrow?125:216,172,fmt(ev.centerSpan)+' µm',light,29);
  tx(g,narrow?125:216,201,'(rows − 1) × 6 µm',light,14);tx(g,narrow?125:216,226,'Outer contact edges: '+fmt(ev.edgeSpan)+' µm',light,14);
  caption='The swatch preserves the number of selected columns; vertical samples are compressed. It is not a diagram of the hardware switch groups.';
 }else{
  tx(g,narrow?10:18,24,narrow?'SHANKS':'SHANK ADDRESS SPACE',lime,13);tx(g,narrow?138:295,24,narrow?'LINES PER SHANK':'REQUESTED LINES / SHANK',lime,13);
  const len=154,top=55,bottom=top+len,barx=narrow?138:296,bw=narrow?143:291,step=39;
  for(let i=0;i<m.n;i++){
   const sx=(narrow?21:35)+i*(narrow?29:53);
   // Silhouette is unitless; height is normalized per family, never a model of a wafer/shank dimension.
   svg(g,'path',{d:'M'+(sx-9)+' '+top+'H'+(sx+9)+'V'+(bottom-8)+'L'+sx+' '+(bottom+8)+'L'+(sx-9)+' '+(bottom-8)+'Z',fill:'#325849',stroke:'#96b09b','stroke-width':1.5});
   if(known&&m.sites){
    let bands=new Set(ev.groups.filter(a=>a.sh===i&&a.site!==null).map(a=>Math.floor(a.site*60/m.sites)));
    for(let b of bands)strip(g,sx-7,top+len-(b+1)*len/60-4,14,Math.max(2,len/60),lime);
   }else if(!bad){tx(g,sx,bottom-57,'?',gold,17,{'text-anchor':'middle'});}
   tx(g,sx,238,'S'+i,light,13,{'text-anchor':'middle'});
   let value=ev.counts[i],p=Number.isFinite(value)?Math.min(Math.max(value/m.per,0),1):0;
   let y=57+i*step;
   tx(g,barx,y,'S'+i,light,14);strip(g,barx+36,y-8,bw-41,10,area);if(p>0)strip(g,barx+36,y-8,(bw-41)*p,10,Number.isFinite(value)&&value>m.per?'#efa888':tone);
   tx(g,barx+bw+8,y+1,Number.isFinite(value)?(value>99999?'>99k':fmt(value)):'—',light,15);
  }
  tx(g,barx,231,'Per-shank ceiling: '+fmt(m.per),light,14);
  if(known)caption='The tip is at the bottom; site IDs increase upward. Each green band contains selected physical sites. Bars show the fraction of each shank’s readout ceiling. Silhouettes are not to scale.';
  else if(bad)caption='The request is rejected before a route is generated. A bar can fit its shank ceiling yet still exceed a shared total across shanks.';
  else caption='Question marks mean no physical-site map was established for this selection. Bars show shank-local counts, not an accepted pin map.';
  if(ev.wavelength)caption+=' Independent optical address: '+ev.wavelength+' nm, emitter '+ev.emitter+'.';
 }
 $('caption').textContent=caption;$('diagramDesc').textContent=caption+' '+ev.counts.map((x,i)=>'Shank '+i+': '+fmt(x)+' requested.').join(' ');
}
function clearRun(msg='Selection or fault changed. Run the loopback to generate fresh tags.'){
 last=null;$('csv').disabled=true;$('json').disabled=true;$('metrics').replaceChildren();$('words').replaceChildren();$('runStatus').classList.remove('bad');$('runStatus').textContent=msg;
}
function update(){
 const key=$('model').value,mode=$('pattern').value,m=E.profiles[key];
 selected=E.evaluate(key,mode,read());const ev=selected;
 $('physical').textContent=m.sites===null?'Unstated':fmt(m.n*m.sites);$('available').textContent=fmt(m.total);$('requested').textContent=fmt(ev.requested);
 $('status').className='badge '+ev.code;$('status').textContent=statusNames[ev.code];$('reason').textContent=ev.why;plot(ev);faultUi();$('run').disabled=ev.code==='invalid';
 clearRun(boot?'No run yet. Run a clean baseline, then introduce a fault.':ev.code==='invalid'?'No output: the selection was rejected before acquisition.':undefined);boot=false;
 try{const u=new URL(location.href);u.searchParams.set('model',key);u.searchParams.set('pattern',mode);history.replaceState(null,'',u.href);}catch{/* Standalone file access stays functional. */}
}
function run(){
 if(!selected||selected.code==='invalid')return;
 const kind=$('fault').value,n=kind==='site'||kind==='lane'?numeric($('faultnum').value):0,sh=(kind==='shank'||kind==='site')?numeric($('faultshank').value):0;
 const t=E.tags(selected,{kind,num:n,shank:sh});clearRun();
 if(t.error){$('runStatus').textContent=t.error;$('runStatus').classList.add('bad');return;}
 last={t,ev:selected};$('csv').disabled=false;$('json').disabled=false;$('runStatus').classList.toggle('bad',t.wrong+t.missing>0);
 $('runStatus').textContent=t.wrong?'Identity mismatch: '+fmt(t.received)+' packets arrived, but '+fmt(t.wrong)+' tags reached the wrong output.':t.missing?'Missing data: '+fmt(t.missing)+' selected tag'+(t.missing===1?' did':'s did')+' not reach the receiver.':kind!=='none'?'No active word changed: the chosen fault does not intersect this selection.':'Clean synthetic loopback: every selected tag arrived at its assigned output.';
 const entries=[['Expected',t.rows.length],['Arrived',t.received],['Missing',t.missing],['Wrong tag',t.wrong]];
 for(const [k,v] of entries){let d=el('div');d.append(el('strong',fmt(v)),el('span',k));$('metrics').append(d);}
 let grid=el('div','',{class:'wordgrid','aria-label':'Sampled expected and received digital tag words'});
 for(const h of ['Output','Expected tag','Received tag','Result'])grid.append(el('span',h,{class:'thead'}));
 const mismatch=t.rows.filter(x=>x.expected!==x.observed),indices=new Set();
 // Preserve actual mismatches in the visible sample; complete data stays in the download.
 for(let x of mismatch.slice(0,2))indices.add(t.rows.indexOf(x));
 const groups=Array.from({length:selected.n},(_,i)=>t.rows.findIndex(x=>x.sh===i)).filter(i=>i>=0);for(let j of groups)if(indices.size<5)indices.add(j);
 for(const j of [0,1,Math.floor(t.rows.length/2),t.rows.length-1])if(indices.size<5&&j<t.rows.length)indices.add(j);
 const word=v=>v===null?'— no word':v.toString(16).toUpperCase().padStart(5,'0');
 Array.from(indices).sort((a,b)=>a-b).forEach(i=>{let x=t.rows[i],correct=x.observed===x.expected;for(const [val,cl] of [['L'+x.lane,''],[word(x.expected),'word'],[word(x.observed),'word'+(correct?'':' off')],[correct?'OK':x.observed===null?'LOST':'SWAP',correct?'':'off']])grid.append(el('span',val,{class:cl}));});
 $('words').append(grid,el('p','Hexadecimal digital words; up to five representative outputs shown. The exported table retains every requested input and its shank.',{class:'hint'}));
}
function download(type){
 if(!last)return;const ev=last.ev,t=last.t,small=t.rows.map(r=>({shank:r.sh,physical_site_id:r.site,fixture_slot:r.lane,slot_role:r.hardwareLane?'NP1_nominal_hardware_line':'illustrative_slot',expected_tag:r.expected,observed_tag:r.observed,result:r.observed===null?'missing':r.expected===r.observed?'match':'wrong_tag'}));
 const header=Object.keys(small[0]);const sourceKeys=E.profiles[ev.key].sources;
 const value=type==='csv'?[header,...small.map(v=>header.map(k=>v[k]??''))].map(a=>a.join(',')).join('\r\n')+'\r\n':JSON.stringify({schema:'BTS-NP-loopback-v1',synthetic:true,not_hardware_configuration:true,model:ev.key,preset:ev.mode,evidence:ev.code,interpretation:ev.why,request:read(),counts:ev.counts,fault:{kind:t.kind,shank:t.shank,address:t.num},summary:{expected:t.rows.length,received:t.received,missing:t.missing,wrong_tag:t.wrong},sources:sourceKeys.map(k=>({title:E.source[k][0],url:E.source[k][1]})),rows:small},null,2);
 const url=URL.createObjectURL(new Blob([value],{type:type==='csv'?'text/csv;charset=utf-8':'application/json'}));const a=el('a','',{download:'neuropixels-'+ev.key+'-synthetic-tags.'+type,href:url});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
opts($('model'),Object.entries(E.profiles).map(([k,v])=>[k,v.name]));
$('model').addEventListener('change',()=>changeModel($('model').value));$('pattern').addEventListener('change',()=>{buildOptions();update();});
$('specific').addEventListener('input',update);
for(const id of ['fault','faultshank','faultnum'])$(id).addEventListener('input',()=>{faultUi();clearRun();});
$('run').addEventListener('click',run);$('csv').addEventListener('click',()=>download('csv'));$('json').addEventListener('click',()=>download('json'));
document.querySelectorAll('[data-demo]').forEach(btn=>btn.addEventListener('click',()=>{const d=btn.dataset.demo;if(d==='collision')changeModel('np1','manual',{sites:'0,384'});else if(d==='fixed')changeModel('quad','counts',{counts:[385,383,384,384]});else{const ids=['u8','u4','u2','u1'],now=$('model').value==='ultra'?ids.indexOf($('pattern').value):-1;changeModel('ultra',ids[(now+1)%4]);}$('controls').scrollIntoView({block:'start'});}));
let lastNarrow=null;window.addEventListener('resize',()=>{const now=$('diagram').clientWidth<480;if(selected&&lastNarrow!==now){lastNarrow=now;plot(selected);}});
const p=new URLSearchParams(location.search),k=p.get('model');changeModel(Object.prototype.hasOwnProperty.call(E.profiles,k)?k:'np1',p.get('pattern'));
})();
