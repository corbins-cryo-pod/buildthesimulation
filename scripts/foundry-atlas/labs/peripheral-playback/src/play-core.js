/* Read-only Foundry Process Player. Elapsed display time is educational, not process time. */
window.BTSFoundryPlay = (() => {
'use strict';
const W=600,H=267;
const C={bg:'#183c34',paper:'#edf2d5',muted:'#a9c1a4',iron:'#55756b',steel:'#7ca1a0',si:'#74949b',glass:'#87a8a8',gold:'#e8b572',amber:'#c79856',poly:'#8fbeae',dark:'#234c3e',pink:'#d99c9c',red:'#ed8d73',mint:'#9de5bf',blue:'#97d2de',night:'#15332c'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=u=>{u=clamp(u);return u*u*(3-2*u)};
const mix=(a,b,u)=>a+(b-a)*u;
const num=v=>Number.isFinite(v)?Number(v.toFixed(2)):0;
const attrs=' shape-rendering="geometricPrecision"';
const rect=(x,y,w,h,col,stroke='none',sw=1,extra='')=>'<rect x="'+num(x)+'" y="'+num(y)+'" width="'+num(Math.max(0,w))+'" height="'+num(Math.max(0,h))+'" fill="'+col+'" stroke="'+stroke+'" stroke-width="'+sw+'" '+extra+'/>';
const line=(x,y,a,b,col=C.muted,n=2,extra='')=>'<line x1="'+num(x)+'" y1="'+num(y)+'" x2="'+num(a)+'" y2="'+num(b)+'" stroke="'+col+'" stroke-width="'+n+'" stroke-linecap="round" '+extra+'/>';
const dot=(x,y,r,col,stroke='none',sw=1)=>'<circle cx="'+num(x)+'" cy="'+num(y)+'" r="'+num(r)+'" fill="'+col+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const poly=(pts,col,stroke='none',sw=1,z='polygon')=>'<'+z+' points="'+pts.map(([x,y])=>num(x)+','+num(y)).join(' ')+'" fill="'+col+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"/>';
const path=(d,col='none',stroke=C.muted,n=2,extra='')=>'<path d="'+d+'" fill="'+col+'" stroke="'+stroke+'" stroke-width="'+n+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>';
const label=(x,y,t,opts={})=>'<text x="'+num(x)+'" y="'+num(y)+'" fill="'+(opts.color||C.paper)+'" font-family="ui-monospace,monospace" font-size="'+(opts.size||13)+'" text-anchor="'+(opts.anchor||'start')+'">'+esc(t)+'</text>';
const ell=(x,y,rx,ry,c,stroke='none',n=1)=>'<ellipse cx="'+num(x)+'" cy="'+num(y)+'" rx="'+num(Math.max(0,rx))+'" ry="'+num(Math.max(0,ry))+'" fill="'+c+'" stroke="'+stroke+'" stroke-width="'+n+'"/>';
const group=(p,opacity=1,extra='')=>'<g opacity="'+num(clamp(opacity))+'" '+extra+'>'+p+'</g>';
function arrow(x,y,x2,y2,c=C.gold,n=2){
 const a=Math.atan2(y2-y,x2-x),r=8;return line(x,y,x2,y2,c,n)+poly([[x2,y2],[x2-r*Math.cos(a-.5),y2-r*Math.sin(a-.5)],[x2-r*Math.cos(a+.5),y2-r*Math.sin(a+.5)]],c);
}
function tick(x,y,u,col=C.mint){return group(path('M'+(x-5)+' '+y+'l3 4 8 -10','none',col,3),u)}
function guide(x,y,w,h){return rect(x,y,w,h,'none',C.muted,1,'stroke-dasharray="4 5"')}
function opacityAttr(u){return 'opacity="'+num(clamp(u))+'"'}
function panel(id,title,caption='SCHEMATIC · NOT PROCESS TIMING'){
 return '<defs><pattern id="fpGrid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0v18" fill="none" stroke="#75a889" stroke-opacity=".25" stroke-width=".6"/></pattern></defs>'+rect(0,0,W,H,C.bg)+rect(11,10,W-22,H-20,'url(#fpGrid)','#718c78',1.1)+label(23,32,id+'  /  '+title.toUpperCase(),{color:C.gold,size:12})+label(W-22,H-17,caption,{color:C.muted,size:10,anchor:'end'});
}
function stretch(tickStart,tickStop,u){return ease((u-tickStart)/(tickStop-tickStart));}
function seqPoints(pts,u){
 u=clamp(u);if(pts.length<=1||u>=1)return pts;
 let index=u*(pts.length-1),i=Math.floor(index),t=index-i;
 return [...pts.slice(0,i+1),[mix(pts[i][0],pts[i+1][0],t),mix(pts[i][1],pts[i+1][1],t)]];
}
const lengthLabel=(x,y,w,s)=>line(x,y,x+w,y,C.muted,1)+line(x,y-4,x,y+4,C.muted,1)+line(x+w,y-4,x+w,y+4,C.muted,1)+label(x+w/2,y+16,s,{color:C.muted,size:11,anchor:'middle'});
const gfx={W,H,C,esc,clamp,ease,mix,num,attrs,rect,line,dot,poly,path,label,ell,group,arrow,tick,guide,opacityAttr,panel,stretch,seqPoints,lengthLabel};
function attach({plate,extra=[],interrupt,build,compact=false}){
 if(!plate||typeof build!=='function')return null;
 let host=document.createElement('section');host.className='fp-player';host.id='foundry-workflow-player';host.setAttribute('aria-label','Workflow animation');host.dataset.state='idle';
 host.innerHTML='<div class="fp-head"><button type="button" data-fp="action" aria-controls="fp-expanded" aria-expanded="false">Play workflow</button><button type="button" data-fp="replay" hidden>Replay</button><button type="button" data-fp="close" hidden>Close animation</button><span class="fp-head-note" data-fp="summary">Watch each modeled step. Playback does not change the specimen.</span></div>'+
 '<div class="fp-expanded" id="fp-expanded" hidden><div class="fp-card"><div class="fp-kicker"><span data-fp="position" class="fp-progress-text"></span> · PROCESS PREVIEW</div><div class="fp-label" data-fp="title" aria-live="polite"></div><div class="fp-note" data-fp="description"></div></div>'+
 '<svg class="fp-scene" data-fp="scene" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Animated process plate"></svg>'+
 '<div class="fp-card"><div class="fp-track" aria-hidden="true"><div class="fp-bar" data-fp="bar"></div></div><div class="fp-info" data-fp="timing">Display time is not a process parameter.</div>'+
 '<div class="fp-transport"><button type="button" data-fp="prev" aria-label="Previous animation scene">← Scene</button><button type="button" data-fp="next" aria-label="Next animation scene">Scene →</button><label>Speed<select data-fp="speed"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><label class="fp-choose">Animation scene<select data-fp="jump"></select></label></div></div></div>';
 plate.before(host);
 const idx=Object.fromEntries([...host.querySelectorAll('[data-fp]')].map(el=>[el.dataset.fp,el])),box=host.querySelector('.fp-expanded');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let scenes=[],phase='idle',scene=0,elapsed=0,last=null,raf=0,lastDraw=-Infinity,reduced=motion.matches,visualVersion=-1,opened=false,speed=1,staticPreview=false;
 const replace=[plate,...extra].filter(Boolean);
 function visible(on){
   opened=on;box.hidden=!on;idx.action.setAttribute('aria-expanded',String(on));
   for(const a of replace)a.classList.toggle('fp-native-hidden',on);
   idx.close.hidden=!on;
 }
 function updatePhase(p,msg){
   phase=p;host.dataset.state=p;
   idx.action.textContent=({idle:'Play workflow',playing:'Pause',paused:'Resume',finished:'Replay workflow'})[p];
   idx.replay.hidden=!opened||p==='finished';
   idx.summary.textContent=msg||({idle:'Watch each modeled step. Playback does not change the specimen.',playing:'Read-only playback. Manual controls still work.',paused:'Paused. Resume here or choose another scene.',finished:'Animation complete. The specimen is unchanged.'})[p];
 }
 const duration=s=>s.duration||2300;
 const sceneCount=()=>scenes.length;
 function render(force=false){
   const a=scenes[scene];if(!a)return;
   const fraction=clamp(elapsed/duration(a));
   const u=(reduced||staticPreview)?1:ease(Math.min(1,fraction/.67));
   if(visualVersion!==scene){
     visualVersion=scene;const label='Step '+(scene+1)+' / '+sceneCount();
     host.dataset.step=String(scene+1);host.dataset.total=String(sceneCount());host.dataset.scene=a.id;
     idx.position.textContent=label;idx.title.textContent=a.name;idx.description.textContent=a.detail;
     idx.scene.setAttribute('aria-label',label+': '+a.name+'. '+(a.alt||a.detail));
     idx.jump.value=String(scene);idx.prev.disabled=scene===0;idx.next.disabled=scene>=sceneCount()-1;
   }
   if(force||!reduced){
     idx.scene.innerHTML=a.draw(u);
     host.dataset.frame=String(Math.round(u*1000));
   }
   idx.bar.style.width=(100*(scene+(reduced?Number(fraction>=1):fraction))/sceneCount()).toFixed(2)+'%';
   idx.timing.textContent=reduced?'Reduced motion: stage snapshots. Display time is not a process parameter.':'Display time is not a process parameter.';
 }
 function loop(t){
   if(phase!=='playing')return;
   if(last!==null)elapsed+=Math.min(80,Math.max(0,t-last))*speed;
   last=t;
   let a=scenes[scene];
   if(elapsed>=duration(a)){
     elapsed=duration(a);
     render(true);
     if(scene===sceneCount()-1){raf=0;last=null;updatePhase('finished');return;}
     elapsed=0;scene++;visualVersion=-1;render(true);lastDraw=t;
   }else if(t-lastDraw>40){
     render(false);lastDraw=t;
   }
   raf=requestAnimationFrame(loop);
 }
 function stop(){cancelAnimationFrame(raf);raf=0;last=null;}
 function play(){stop();if(staticPreview){staticPreview=false;render(true);}updatePhase('playing');raf=requestAnimationFrame(loop);}
 function pause(msg){stop();updatePhase('paused',msg);}
 function begin(){
   const b=build(),list=Array.isArray(b)?b:b?.scenes;
   if(!list?.length){updatePhase('idle','No documented process playback for this branch.');return;}
   scenes=list;scene=0;elapsed=0;staticPreview=false;visualVersion=-1;lastDraw=-Infinity;
   idx.jump.replaceChildren(...scenes.map((a,i)=>new Option(String(i+1).padStart(2,'0')+' · '+a.name,String(i))));
   visible(true);render(true);play();
 }
 function close(focus=false){
   if(!opened)return;
   stop();visible(false);visualVersion=-1;phase='idle';elapsed=0;scene=0;delete host.dataset.step;delete host.dataset.total;delete host.dataset.scene;delete host.dataset.frame;
   idx.scene.replaceChildren();updatePhase('idle');if(focus)idx.action.focus();
 }
 function manual(n){
   if(!opened||n<0||n>=sceneCount())return;
   scene=n;elapsed=0;staticPreview=true;visualVersion=-1;pause('Manual animation scene. The specimen is unchanged.');
   render(true);
 }
 idx.action.onclick=()=>{if(phase==='playing')pause();else if(phase==='paused')play();else begin();};
 idx.replay.onclick=begin;idx.close.onclick=()=>close(true);
 idx.prev.onclick=()=>manual(scene-1);idx.next.onclick=()=>manual(scene+1);idx.jump.onchange=()=>manual(+idx.jump.value);
 idx.speed.onchange=()=>{speed=+idx.speed.value;last=null;};
 host.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.preventDefault();close(true)}});
 const onInterrupt=e=>{if(opened&&e.target instanceof Element&&!host.contains(e.target)&&e.target.closest(interrupt))close(false)};
 if(interrupt)for(const ev of ['click','change','input'])document.addEventListener(ev,onInterrupt,true);
 const setMotion=e=>{reduced=e.matches;if(opened)render(true);};
 if(motion.addEventListener)motion.addEventListener('change',setMotion);else motion.addListener(setMotion);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')pause('Paused when this tab was hidden. Resume here when ready.');});
 if(compact)host.classList.add('fp-compact');
 return {close};
}
return {attach,gfx};
})();
