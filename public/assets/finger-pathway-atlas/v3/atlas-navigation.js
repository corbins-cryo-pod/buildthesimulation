/* Atlas-wide presentation, anatomical navigation and guided routes.
 * This module links explicitly local specimens. It does not register their
 * microscopic coordinates to the body or calculate physiological propagation.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const wait=setInterval(()=>{if(window.atlas?.ready){clearInterval(wait);install(window.atlas);}},60);
 function install(A){
  const {T,V}=window.ATLAS_GEOMETRY,stage=$('stage');
  const specimens=[['tip','01','Sensory endings','Modeled end organs'],['nerve','02','Peripheral nerve','Myelin · axoplasm · fascicles'],['drg','03','Sensory ganglion','Pseudounipolar cells'],['spinal','04','Cervical section','Dorsal / ventral circuitry'],['cortex','05','Human cortical tissue','10 source reconstructions'],['nmj','06','Motor endplate','At a forearm muscle']];
  let guide=null,guideStep=0,guideBusy=false,savedFilter='all',lines=[],board=false;
  const primary=()=>A.model.cells.find(c=>c.subtype==='meissner')?.id||1;
  const routes={
   sensory:[
    ['overview','From the fingertip to the other hemisphere','Follow the selected right-index tactile route. The body is a shared anatomical scaffold; the cellular windows are separate inspection specimens.',null],
    ['tip','Touch begins at a specialized ending','This Meissner-associated ending belongs to one primary sensory neuron. Support membranes are not additional sensory neurons. Its modeled identity is retained in the next windows.',primary],
    ['nerve','The same afferent, inside a nerve','The selected axon is surrounded by its myelin and neighboring fiber excerpts. The four fascicles sit inside one windowed epineurial sleeve.',primary],
    ['drg','A soma beside a continuous axon','The peripheral and central branches belong to the same pseudounipolar neuron. There is no obligatory synaptic relay in the dorsal root ganglion.',primary],
    ['spinal','Dorsal entry and an ascending continuation','The selected afferent enters dorsally and continues into the dorsal-column route, with a modeled local collateral. The section boundary and micro-circuit placement are illustrative.',primary],
    ['medulla','A new neuron at the cuneate relay','The primary tactile afferent reaches the right cuneate region. A different relay neuron then crosses toward the left medial lemniscus. This is not the motor crossing.',301],
    ['thalamus','Another relay toward cortex','The modeled left-VPL neuron projects toward somatosensory cortex. Its identity is distinct from both the primary afferent and the cuneate relay.',341],
    ['cortex','Human morphology at cortical scale','The unscaled trees here come from ten human temporal/frontal source specimens. Their layer-group layout illustrates cortical tissue; it is not a measured S1 fingertip connectome.',null]
   ],
   motor:[
    ['brain','Motor output starts in the opposite hemisphere','The selected upper-motor route descends from the modeled left-M1 hand-area location. The imported gyri are anatomical surfaces; these long-range fiber trajectories are modeled.',901],
    ['cortex','Inspect the cellular architecture','These are source-based human arbors, grouped by their recorded layer. They are morphology references—not a claim that these donor cells were measured controlling this finger.',null],
    ['medulla','The separate pyramidal crossing','The descending corticospinal route crosses caudal to the sensory crossing. Its upper-motor identity remains separate from the lower motor neuron.',901],
    ['spinal','A different cell supplies the muscle','The selected lower motor neuron lies in the modeled right ventral motor pool. Local spinal circuitry mediates much of motor output; this gallery does not assert a measured synapse.',201],
    ['arm','Out through a peripheral motor route','The selected lower-motor axon follows a median-nerve example toward a forearm flexor target. Radial and ulnar examples remain available outside this guided selection.',201],
    ['nmj','The motor axon ends on muscle','The same modeled lower-motor identity supplies this connected terminal arbor and its separate postsynaptic receptor domains. The muscle target is in the forearm, not inside the fingertip.',201]
   ]
  };
  for(const [id,num,title,sub] of specimens){
   const b=$('previewGrid').querySelector(`[data-specimen="${id}"]`);if(!b)continue;
   b.querySelector('.caption').innerHTML=`<b>${num}</b><strong>${esc(title)}</strong><span>${esc(sub)} <em>↗</em></span>`;
   b.title='Open the linked 3D '+title.toLowerCase();$('previewGrid').appendChild(b);
   const pin=document.createElement('button');pin.className='anatomical-pin';pin.dataset.specimen=id;pin.textContent=num;pin.title=title;pin.setAttribute('aria-label','Inspect '+title);pin.onclick=()=>A.setRegion(id);$('anatomicalPins').appendChild(pin);
   b.addEventListener('pointerenter',()=>{pin.classList.add('hover');});b.addEventListener('pointerleave',()=>pin.classList.remove('hover'));
  }
  // Keep controls reachable without an entire screen of sliders preceding the model.
  document.querySelectorAll('.side .controlgroup').forEach(group=>{
   const h=group.querySelector('h3');if(!h)return;const d=document.createElement('details'),sum=document.createElement('summary');sum.textContent=h.textContent;h.remove();d.appendChild(sum);while(group.firstChild)d.appendChild(group.firstChild);group.appendChild(d);
  });
  function layout(){
   if(!A.camera)return;const w=stage.clientWidth,h=stage.clientHeight,cinema=document.body.classList.contains('cinema');
   const info=!document.body.classList.contains('hide-info');board=A.region.id==='overview'&&w>=1030&&!cinema&&!guide&&!info;
   document.body.classList.toggle('atlas-board',board);document.body.classList.toggle('guided',!!guide);
   $('previewGrid').style.display=board?'grid':'none';$('plateHeading').style.display=board?'block':'none';
   $('journeyBar').style.display=guide||cinema?'none':'flex';$('journeyPanel').hidden=!guide||cinema;
   const reserve=cinema?0:board?414:guide&&w>880?335:info&&w>760?260:0;
   A.camera.clearViewOffset();
   if(reserve)A.camera.setViewOffset(w,h,reserve*.50,0,w,h);
   else if(guide&&w<=880)A.camera.setViewOffset(w,h,0,100,w,h);
   A.camera.updateProjectionMatrix();A.invalidate();
  }
  function labelCollision(){
   if(board){$('labels').style.display='none';return;} $('labels').style.display='block';
   const avoid=[$('sceneheading'),$('journeyBar'),!$('journeyPanel').hidden?$('journeyPanel'):null,!document.body.classList.contains('hide-info')?$('info'):null].filter(Boolean).map(e=>e.getBoundingClientRect());
   const overlaps=(a,b)=>a.left<b.right+8&&a.right>b.left-8&&a.top<b.bottom+6&&a.bottom>b.top-6;
   for(const el of $('labels').children){if(el.style.display==='none')continue;const box=el.getBoundingClientRect();if(avoid.some(r=>overlaps(box,r)))el.style.display='none';else avoid.push(box);}
  }
  function makeLeaders(){
   const svg=$('atlasLeaders'),pins=$('anatomicalPins');svg.replaceChildren();lines=[];pins.style.display=board?'block':'none';if(!board)return;
   const w=stage.clientWidth,h=stage.clientHeight,rect=stage.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
   let lastY=-100;
   // Anatomical anchors are millimeter locations in the shared source coordinate frame.
   for(const [id] of specimens){
    const p=A.macro?.routeAnchors?.[id],card=$('previewGrid').querySelector(`[data-specimen="${id}"]`),pin=pins.querySelector(`[data-specimen="${id}"]`);if(!p||!card||!pin)continue;
    const q=V(p).project(A.camera),x=(q.x*.5+.5)*w,y=(-q.y*.5+.5)*h;
    if(q.z>=1||x<10||x>w-15||y<70||y>h-55){pin.style.display='none';continue;}pin.style.display='block';
    const shift=id==='spinal'?[-22,29]:id==='drg'?[17,-10]:[0,0],px=x+shift[0],py=y+shift[1];pin.style.left=px+'px';pin.style.top=py+'px';
    const box=card.getBoundingClientRect(),endX=box.left-rect.left,endY=box.top-rect.top+box.height*.50,controlX=Math.min(endX-24,px+Math.max(55,(endX-px)*.53));
    const d=`M ${x} ${y} L ${px} ${py} C ${controlX} ${py}, ${controlX} ${endY}, ${endX} ${endY}`;
    const el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',d);el.setAttribute('class',id==='nmj'?'motor-leader':'sensory-leader');svg.appendChild(el);
    lines.push({x,y,px,py,endX,endY,controlX,id});
   }
  }
  function updateLocator(){
   const marker=$('locatorDot'),p=A.macro?.routeAnchors?.[A.region.id];
   if(!p||$('contextMini').style.display==='none'){marker.style.display='none';return;}
   const q=V(p).project(A.miniCamera),x=(q.x*.5+.5)*158,y=(-q.y*.5+.5)*123;
   marker.style.display=q.z<1&&x>4&&x<154&&y>20&&y<119?'block':'none';marker.style.left=x+'px';marker.style.top=y+'px';
  }
  function afterRegion(opts={}){
   const r=A.region;const context=A.maker.REGIONS.find(x=>x.id===r.context)||A.maker.REGIONS[0];
   $('crumbContext').innerHTML=r.id==='overview'?' / RIGHT INDEX FINGER':` / <button data-go="${context.id}">${esc(context.name)}</button> / <span>${esc(r.name)}</span>`;
   $('opening').textContent='Opening '+r.name.toLowerCase()+'…';
   if(guide)document.body.classList.add('hide-info');
   else if(!A.current.entries.some(m=>String(m.userData.id)===String(A.getState().selected)))document.body.classList.add('hide-info');
   layout();
   try{history.replaceState(null,'','#view='+r.id);}catch(e){/* Managed or embedded documents may not allow URL mutation. */}
   $('sceneheading').classList.remove('arrived');requestAnimationFrame(()=>$('sceneheading').classList.add('arrived'));
  }
  function selectionChanged(id){
   if(!guide){document.body.classList.toggle('hide-info',id==null);layout();}
  }
  const UI={layout,selectionChanged,afterRegion,beforeRegion(id,opts){if(guide&&!opts?.fromGuide)closeGuide();$('opening').textContent='Opening '+(A.maker.REGIONS.find(r=>r.id===id)?.name||'specimen')+'…';},afterDraw(){labelCollision();makeLeaders();updateLocator();},get guide(){return guide;},get guideStep(){return guideStep;},get board(){return board;}};
  window.atlasUI=UI;
  $('breadcrumb').onclick=e=>{const b=e.target.closest('[data-go]');if(b)A.setRegion(b.dataset.go);};
  $('returnLocation').onclick=()=>A.setRegion(A.region.context||'overview');
  async function goStep(i){
   if(!guide||guideBusy)return;const list=routes[guide];i=Math.max(0,Math.min(list.length-1,i));guideStep=i;const [id,title,text,selection]=list[i];
   guideBusy=true;$('nextStep').disabled=true;$('prevStep').disabled=true;
   try{
    $('journeyTag').textContent=guide==='sensory'?'SENSORY ROUTE · RIGHT INDEX':'MOTOR ROUTE · LEFT CORTEX';
    $('journeyTitle').textContent=title;$('journeyText').textContent=text;$('journeyCount').textContent=`${i+1} / ${list.length}`;
    $('journeySteps').replaceChildren();list.forEach((entry,k)=>{const b=document.createElement('button');b.className=k===i?'active':'';b.title=entry[1];b.setAttribute('aria-label',entry[1]);b.setAttribute('aria-current',k===i?'step':'false');b.textContent=String(k+1);b.onclick=()=>goStep(k);$('journeySteps').appendChild(b);});
    // Never treat the cortical tracing library as the measured continuation of a
    // named macroscopic projection. It is a separately identified source gallery.
    $('filter').value=id==='cortex'?'all':guide==='sensory'?'sensory':'motor';
    await A.setRegion(id,{animate:false,fromGuide:true});A.select(typeof selection==='function'?selection():selection);layout();
   }finally{guideBusy=false;$('prevStep').disabled=i===0;$('nextStep').disabled=false;$('nextStep').textContent=i===list.length-1?'Finish':'Next →';}
  }
  async function startGuide(kind){if(guideBusy)return;savedFilter=$('filter').value;guide=kind;guideStep=0;document.body.classList.add('hide-info');await goStep(0);}
  function closeGuide(){guide=null;guideStep=0;$('filter').value=savedFilter;A.select(null);A.applyState();layout();}
  $('touchJourney').onclick=()=>startGuide('sensory');$('motorJourney').onclick=()=>startGuide('motor');$('prevStep').onclick=()=>goStep(guideStep-1);$('nextStep').onclick=()=>guideStep>=routes[guide].length-1?closeGuide():goStep(guideStep+1);$('closeJourney').onclick=closeGuide;
  UI.startGuide=startGuide;UI.goStep=goStep;UI.closeGuide=closeGuide;
  window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||e.altKey||e.ctrlKey||e.metaKey)return;if(guide&&e.key==='ArrowRight'){e.preventDefault();$('nextStep').click();}if(guide&&e.key==='ArrowLeft'){e.preventDefault();$('prevStep').click();}});
  // Save the current anatomical plate with its real rendered specimen thumbnails.
  // Canvas meshes, not the generated concept poster, are the only image sources.
  async function savePlate(){
   A.draw();const scale=2,w=stage.clientWidth,h=stage.clientHeight,canvas=document.createElement('canvas');canvas.width=Math.round(w*scale);canvas.height=Math.round((h+75)*scale);const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#050a0f';ctx.fillRect(0,0,w,h+75);ctx.drawImage(A.renderer.domElement,0,50,w,h);
   ctx.fillStyle='#dce7e9';ctx.font='24px Georgia';ctx.fillText('Finger Pathway Atlas',22,31);ctx.font='10px sans-serif';ctx.fillStyle='#8aa2ad';ctx.fillText('VERSION 3  /  '+A.region.name.toUpperCase(),270,30);
   if(board){
    for(const l of lines){ctx.beginPath();ctx.moveTo(l.x,l.y+50);ctx.lineTo(l.px,l.py+50);ctx.bezierCurveTo(l.controlX,l.py+50,l.controlX,l.endY+50,l.endX,l.endY+50);ctx.strokeStyle=l.id==='nmj'?'#826953':'#3e6775';ctx.lineWidth=.8;ctx.stroke();}
    const base=stage.getBoundingClientRect();for(const [id,num,title,sub] of specimens){const b=$('previewGrid').querySelector(`[data-specimen="${id}"]`),img=b?.querySelector('img');if(!b||!img?.complete)continue;const r=b.getBoundingClientRect(),x=r.left-base.left,y=r.top-base.top+50,iw=r.width,ih=img.getBoundingClientRect().height;ctx.fillStyle='#08141c';ctx.fillRect(x,y,iw,r.height);ctx.drawImage(img,x,y,iw,ih);ctx.strokeStyle='#2b404b';ctx.strokeRect(x,y,iw,r.height);ctx.fillStyle='#b7d3db';ctx.font='10px sans-serif';ctx.fillText(num+'  '+title,x+9,y+ih+15);ctx.fillStyle='#7c929e';ctx.font='8px sans-serif';ctx.fillText(sub,x+9,y+ih+31);}
    for(const l of lines){ctx.beginPath();ctx.arc(l.px,l.py+50,10,0,Math.PI*2);ctx.fillStyle='#07151d';ctx.fill();ctx.strokeStyle=l.id==='nmj'?'#be9870':'#659ca9';ctx.stroke();ctx.fillStyle='#dce7e9';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(specimens.find(s=>s[0]===l.id)[1],l.px,l.py+53);ctx.textAlign='left';}
   }
   ctx.fillStyle='#92a7b0';ctx.font='10px sans-serif';ctx.fillText('Source anatomy + human tracing sources + modeled pathways. Linked local specimens; not a measured end-to-end connectome.',22,h+64);
   return new Promise(resolve=>canvas.toBlob(blob=>{const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='Finger_Pathway_Atlas_v3_'+A.region.id+'_plate.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);resolve({bytes:blob.size,width:canvas.width,height:canvas.height});},'image/png'));
  }
  const save=document.createElement('button');save.id='savePlate';save.className='desktop';save.textContent='Save plate';save.onclick=()=>savePlate().catch(console.error);$('capture').before(save);UI.savePlate=savePlate;
  const requested=new URLSearchParams(location.hash.slice(1)).get('view');afterRegion();if(requested&&A.maker.REGIONS.some(r=>r.id===requested)&&requested!=='overview')A.setRegion(requested,{animate:false});
 }
})();
