(()=>{
'use strict';
const D=window.PtFoundry, V=window.PtScene, $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASE='https://buildthesimulation.com';
const bUrl=u=>location.protocol==='file:'&&u.startsWith('/')?BASE+u:u;
const en=n=>Number(n).toLocaleString('en-US');
const stageLabel=i=>String(i+1).padStart(2,'0');
const cfg=$('configuration'), f=$('defect'), ss=$('site'), fs=$('fault-site');
const state={stage:0,frontier:0,site:512,defectSite:512,view:'panel',viewManual:false,model:null};
const names={panel:'Carrier and writing field',stack:'Exploded film and contact stack',route:'Registered routes A and B',grid:'Site index and diagnostic map',connect:'Film to extender and logical output',mold:'Passive inert mold comparison'};
const captions={
 panel:'The two squares compare sizes. The registered 150 mm write area is not a 177.8 mm square chuck specification. Pattern extent, mount and actual staging need separate evidence.',
 stack:'Exploded drawing, not to scale. The two metal deposits belong to one route stack; no intervening dielectric/crossover is modeled. Local recess is about 2 µm below the neighboring film.',
 route:'This test line illustrates the two registered metal deposits. The four overlap junctions and three spans are discretized teaching choices, not an actual mask, matched fault rate or contact-resistance model.',
 grid:'Use the site number below, or tap the map. Dots and holes are magnified; the square relief layout is a representative pattern, not the mask. Site IDs and output indices are synthetic.',
 connect:'Extender and connector map is logical only. A missing connection, swapped output and cross-net short fail different checks.',
 mold:'Illustrative drawing after Supplement Figure S3. Relief holes and a trapped pocket are shown qualitatively on a passive shape; this is not a flow solve, implant check or electrical test.'
};
function defaultView(s){if(s<2)return 'panel';if(s===2)return 'stack';if(s<=6)return'route';if(s<=14)return'stack';if(s<17)return'connect';return'grid'}
function announce(q){$('live').textContent='';setTimeout(()=>$('live').textContent=q,20)}
function forceScene(){if(matchMedia('(max-width:730px)').matches)$('traveler-box').open=false;const a=$('stage-title');a.setAttribute('tabindex','-1');a.focus({preventScroll:true});a.closest('.scene-card').scrollIntoView({block:'start'})}
function opts(){return {config:cfg.value,stage:state.stage,focus:state.defectSite,overlay:$('overlay').value,defect:f.value,thick:$('thick').value,length:$('linewidth').value}}
function safeSite(n,c,max){return Number.isInteger(+n)&&+n?Math.min(Math.max(+n,1),max)-1:c}
const rows=(pairs)=>'<dl class="site-details">'+pairs.map(([a,b])=>'<dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd>').join('')+'</dl>';
const optsHTML=obj=>Object.entries(obj).map(([k,v])=>'<option value="'+esc(k)+'">'+esc(v.title||v.label)+'</option>').join('');
function refs(xs,className=''){return xs.map(x=>'<a'+(className?' class="'+className+'"':'')+' href="'+esc(x.href)+'">'+esc(x.label)+'</a>').join('')}
function strip(){
 const m=state.model,s=D.stages[m.stage],c=m.cfg;
 $('config-note').textContent=c.figure+' · '+en(c.count)+' sites · '+c.pitch+' mm pitch · '+c.width+' × '+c.height+' mm. '+c.geometry;
 $('stage-title').textContent=s.title;$('stage-index').textContent='Station '+stageLabel(m.stage)+' / '+D.stages.length+' · '+s.chapter;
 $('stage-basis').textContent=s.basis;$('stage-description').textContent=s.desc;$('stage-check').innerHTML='<strong>Check </strong>'+esc(s.check);
 $('stage-evidence').innerHTML='<div class="links" aria-label="Station equipment candidates">'+refs(s.tools.map(x=>({href:bUrl('/simulations/equipment/'+x+'/'),label:x+' · '+D.toolNames[x]})),'equipment-link')+'</div><div class="links" aria-label="Station references">'+refs(s.src.map(k=>({href:D.sources[k].url,label:D.sources[k].title+' ↗'})))+'</div>';
 $('stage-status').textContent=(m.stage<state.frontier?'Viewing archive · ':'')+en(state.frontier+1)+' / '+D.stages.length+' stations reached';
 $('progress').max=D.stages.length;$('progress').value=state.frontier+1;
 $('next').disabled=m.stage>=D.stagesLast;$('next').textContent=m.stage>=D.stagesLast?'Traveler complete':m.stage<state.frontier?'Next saved station →':'Next station →';
 $('scene-prev').disabled=m.stage===0;$('scene-next').disabled=m.stage>=D.stagesLast;$('scene-next').textContent=m.stage>=D.stagesLast?'Completed':'Next station →';$('scene-progress').textContent=stageLabel(m.stage)+' / '+D.stages.length;
 $('run').textContent=state.frontier>=D.stagesLast?'Show final state':'Run all';
 $('run').disabled=state.frontier>=D.stagesLast&&m.stage>=D.stagesLast;
 for(const button of $('traveler').querySelectorAll('button')){
  const i=Number(button.dataset.stage),icon=button.querySelector('.stage-state');
  button.disabled=i>state.frontier;if(i===m.stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');icon.textContent=i===m.stage?'▶':i<=state.frontier?'✓':'·';
  button.setAttribute('aria-label',stageLabel(i)+' '+D.stages[i].title+(i>state.frontier?' (not reached)':''));
 }
}
function setStage(i,scroll=false){
 state.stage=Math.max(0,Math.min(D.stagesLast,i));state.frontier=Math.max(state.frontier,state.stage);
 state.view=defaultView(state.stage);state.viewManual=false;update(true);if(scroll)forceScene();
 announce('Station '+(state.stage+1)+': '+D.stages[state.stage].title+'.');
}
function visual(){
 const m=state.model,r=m.res[state.site],k=state.view;
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(k===b.dataset.view));
 const palette=V.paint($('scene'),k,m,r,$('holes').value);
 $('scene').setAttribute('aria-label',names[k]+'. '+captions[k]+(k==='grid'?' Selected '+r.id+'.':''));
 $('legend').innerHTML=palette.map(([col,t])=>'<span><i aria-hidden="true" style="background:'+esc(col)+'"></i>'+esc(t)+'</span>').join('');
 $('scene-caption').textContent=captions[k]+(k==='grid'?' '+m.cfg.geometry:'');
}
function plot(data){
 const l=43,r=325,t=21,b=129,mx=Math.max(...data.map(d=>d.magOhm)),mn=Math.min(...data.map(d=>d.magOhm));
 const low=Math.floor(Math.log10(mn)*2)/2,high=Math.max(low+1,Math.ceil(Math.log10(mx)*2)/2);
 const X=hz=>l+(Math.log10(hz)-1)*(r-l)/4;
 const Y=z=>b-(Math.log10(z)-low)*(b-t)/(high-low);
 const ax=[10,100,1000,10000,100000].map(v=>'<path d="M'+X(v)+' '+t+'V'+b+'" opacity=".33"/><text x="'+X(v)+'" y="146" text-anchor="middle">'+(v>=1000?v/1000+'k':v)+'</text>').join('');
 const ay=[low,(high+low)/2,high].map(p=>{const val=Math.pow(10,p);return '<path d="M'+l+' '+Y(val)+'H'+r+'" opacity=".33"/><text x="39" y="'+(Y(val)+4)+'" text-anchor="end">'+(val>=1000?Number((val/1000).toPrecision(2))+'k':Math.round(val))+'</text>'}).join('');
 const path=data.map(({freq,magOhm},i)=>(i?'L':'M')+X(freq).toFixed(2)+' '+Y(magOhm).toFixed(2)).join(' ');
 const ref=data.find(d=>d.freq===1000);
 return '<svg class="plot" viewBox="0 0 344 164" role="img" aria-label="Synthetic impedance magnitude falls with frequency. Axes: frequency in Hertz, log impedance in ohms."><g fill="currentColor" stroke="currentColor" stroke-width=".65" font-family="monospace" font-size="9">'+ax+ay+'<text x="8" y="11" stroke-width="0">|Z| Ω</text><text x="336" y="159" stroke-width="0" text-anchor="end">Frequency Hz</text><path d="'+path+'" fill="none" stroke-width="2.4"/><circle cx="'+X(1000)+'" cy="'+Y(ref.magOhm)+'" r="3.9"/></g></svg>'
}
function evidence(){
 const m=state.model,r=m.res[state.site],c=m.cfg,t=m.totals;
 $('overlay-o').value=m.overlay.toFixed(2).replace(/\.?0+$/,'')+' µm';$('length-o').value=m.length+' mm';
 ss.max=fs.max=String(c.count);if(document.activeElement!==ss)ss.value=String(state.site+1);if(document.activeElement!==fs)fs.value=String(state.defectSite+1);
 $('site-prev').disabled=!state.site;$('site-next').disabled=state.site>=m.n-1;
 $('hole-label').title=c.holes===null?'Hole geometry is not pinned for this variant.':'';$('holes').disabled=c.holes===null;
 $('fault-note').textContent=D.defects[m.defect].notes+(m.defect!=='none'&&m.affected===null?' Replayed once station '+stageLabel(D.defects[m.defect].at)+' is reached.':'')+(m.hasB?' Witness overlap '+m.overlap.toFixed(2)+' µm.':'');
 const counts=[['Film paths',m.hasSite?t.film:null],['Correct outputs',m.hasDry?t.correct:null],['Isolated opens',m.hasDry?t.open:null],['Wet-ready sites',m.hasWet?t.wet:null]];
 $('tally').innerHTML=counts.map(([label,value])=>'<div><strong>'+esc(value===null?'—':en(value))+'</strong><span class="tally-label">'+esc(label)+'</span></div>').join('');
 const pp=[
 ['Site',r.id+' · R'+(r.row+1)+' C'+(r.col+1)],['Route witness',m.hasA?(r.routingClosed?'Continuous':'Open'):'Not deposited'],
 ['Dry map',r.dry],['Logical output',m.hasDry?(r.outputIds.join(', ')||'None'):'Not inspected'],
 ['Window',!m.hasVia?'Not patterned':r.wetWindow?'Exposed':'Covered or capped'],
 ['Surface',r.finish],['Wet status',r.wet]
 ];
 if(r.shortWith.length)pp.push(['Shorted with',r.shortWith.join(', ')]);
 if(r.wireOhm!==null)pp.push(['Wire estimate',en(Math.round(r.wireOhm))+' Ω · witness only']);
 if(m.hasDry&&(t.bridged||t.swapped||t.covered||t.limited))pp.push(['Fault totals',[`${t.bridged} shorted`,`${t.swapped} mis-mapped`,`${t.covered} blocked`,`${t.limited} incomplete`].join(' · ')]);
 $('site-summary').innerHTML=rows(pp);
 const sp=D.spectrum(r),p1=sp.find(z=>z.freq===1000);
 const benchmark=c.eis?'<p class="benchmark"><strong>Published Fig. 1 benchmark (not simulated):</strong> '+c.eis.mean+' ± '+c.eis.sd+' kΩ at 1 kHz; contact yield up to '+c.eis.yieldUpper+'% for this reported configuration.</p>':'<p class="benchmark">No separate published impedance distribution is assigned to this form factor.</p>';
 $('impedance').innerHTML=(p1?'<p class="zfigure">'+(p1.magOhm/1000).toFixed(2)+' kΩ at 1 kHz · synthetic</p>'+plot(sp)+'<p class="benchmark">Isolated RC witness. Phase at 1 kHz: '+p1.phaseDeg.toFixed(1)+'°. Wire resistance uses a bulk Au teaching estimate.</p>':'<p class="notice">'+(!m.hasWet?'Complete the inert bench station to see a synthetic spectrum.':'No interpretable spectrum for this selected site. Check dry routing and surface exposure.')+'</p>')+benchmark;
 $('export-csv').disabled=!m.hasDry;
}
function update(recalc=false){if(recalc||!state.model)state.model=D.solve(opts());const m=state.model;state.site=Math.min(state.site,m.n-1);state.defectSite=Math.min(state.defectSite,m.n-1);strip();visual();evidence()}
function save(name,mime,body){const b=new Blob([body],{type:mime}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),25000);announce('Downloaded '+name)}
function demos(k){
 const c=D.configs[cfg.value];f.value=k;state.defectSite=k==='bank'?c.count>=1024?512:0:Math.min(512,c.count-1);state.site=state.defectSite;$('overlay').value='0';
 state.frontier=k==='first'?4:D.stagesLast;setStage(state.frontier,false);state.view=k==='first'?'route':k==='bank'?'connect':'grid';state.viewManual=true;update();forceScene()
}
function init(){
 cfg.innerHTML=optsHTML(D.configs);f.innerHTML=optsHTML(D.defects);cfg.value='square';f.value='none';
 $('traveler').innerHTML=D.stages.map((st,i)=>'<li><button type="button" data-stage="'+i+'"><span class="stage-n">'+stageLabel(i)+'</span><span class="stage-label">'+esc(st.title)+'<small>'+esc(st.chapter)+'</small></span><span class="stage-state" aria-hidden="true"></span></button></li>').join('');
 $('refs').innerHTML=Object.values(D.sources).map(s=>'<dt><a href="'+esc(s.url)+'">'+esc(s.title)+'</a></dt><dd>'+esc(s.note)+'</dd>').join('');
 if(location.protocol==='file:')for(const a of document.querySelectorAll('a[href^="/"]'))a.href=bUrl(a.getAttribute('href'));
 cfg.addEventListener('change',()=>{state.stage=0;state.frontier=0;state.site=Math.min(512,D.configs[cfg.value].count-1);state.defectSite=state.site;fs.value=ss.value=String(state.site+1);setStage(0)});
 $('next').addEventListener('click',()=>setStage(state.stage+1,true));
 $('run').addEventListener('click',()=>setStage(D.stagesLast,true));
 $('scene-next').addEventListener('click',()=>setStage(state.stage+1,true));
 $('scene-prev').addEventListener('click',()=>setStage(state.stage-1,true));
 $('reset').addEventListener('click',()=>{f.value='none';$('overlay').value=0;$('linewidth').value=120;$('thick').value='main';$('holes').value='perforated';state.site=state.defectSite=512;state.frontier=0;setStage(0)});
 $('traveler').addEventListener('click',ev=>{const b=ev.target.closest('button[data-stage]');if(b&&!b.disabled)setStage(+b.dataset.stage,true)});
 document.querySelector('.modes').addEventListener('click',ev=>{const b=ev.target.closest('button[data-view]');if(b){state.view=b.dataset.view;state.viewManual=true;visual()}});
 f.addEventListener('change',()=>update(true));
 fs.addEventListener('change',()=>{state.defectSite=safeSite(fs.value,state.defectSite,state.model.n);fs.value=String(state.defectSite+1);update(true)});
 ['overlay','linewidth'].forEach(s=>$(s).addEventListener('input',()=>update(true)));
 $('thick').addEventListener('change',()=>update(true));
 $('holes').addEventListener('change',()=>{state.view='mold';state.viewManual=true;visual()});
 ss.addEventListener('change',()=>{state.site=safeSite(ss.value,state.site,state.model.n);ss.value=String(state.site+1);visual();evidence()});
 $('site-prev').addEventListener('click',()=>{state.site=Math.max(0,state.site-1);visual();evidence();announce('Inspecting '+D.id(state.site))});
 $('site-next').addEventListener('click',()=>{state.site=Math.min(state.model.n-1,state.site+1);visual();evidence();announce('Inspecting '+D.id(state.site))});
 $('scene').addEventListener('click',e=>{if(state.view!=='grid')return;const i=V.indexAt($('scene'),e.clientX,e.clientY);if(i!==null){state.site=i;visual();evidence();announce('Inspecting '+D.id(state.site))}});
 $('demo-rescue').addEventListener('click',()=>demos('first'));$('demo-cover').addEventListener('click',()=>demos('cover'));$('demo-bank').addEventListener('click',()=>demos('bank'));
 $('export-csv').addEventListener('click',()=>save('ptnrgrid-'+cfg.value+'-virtual-ledger.csv','text/csv;charset=utf-8',D.csv(state.model)));
 $('export-json').addEventListener('click',()=>save('ptnrgrid-'+cfg.value+'-traveler.json','application/json',JSON.stringify(D.report(state.model,state.site),null,2)+'\n'));
 if(matchMedia('(max-width:730px)').matches)$('traveler-box').open=false;
 $('model-ui').hidden=false;update(true)
}
try{init()}catch(e){$('load-error').hidden=false;console.error(e)}
})();
