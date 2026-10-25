import {ADVANCED_VERSION,ADVANCED_SCHEMA,defaults,validateAdvanced,generateCells,preset} from './config.js';
import {OPSINS} from './opsins.js';
import {chlorideReversal} from './chloride.js';
import {sourceField,sourcePowers} from './optics.js';
import {populationNodes} from './engine.js';
import {makeLedArray,parseImport,convertContacts,validateDevice} from './device.js';
import {createNeuronScene} from '../scene.js';
import {pulseIntervals} from '../simulation.js';
import {tracePlot,rasterPlot,setCursors,heatSlice} from './plots.js';
function initAdvanced(model,activate){
 const $=id=>document.getElementById(id),root=$('advanced-panel'),copy=x=>JSON.parse(JSON.stringify(x));
 let config=defaults(),result=null,worker=null,url=null,job=0,busy=false,cellIndex=0,nodeIndex=0,frame=0,emitterIndex=0,preview=null,playing=false,last=0,raf=0;
 let viewConfig=copy(config);
 let nodes=[],byCell=[],cellOffsets=[],selectedFlat=0;
 const scene=createNeuronScene($('advanced-scene'),{onSelect:index=>{const i=cellOffsets.findLastIndex(x=>x<=index);cellIndex=Math.max(0,i);nodeIndex=index-cellOffsets[cellIndex];syncInspection();drawPlots();refresh();}});
 const fmt=(x,d=2)=>Number.isFinite(x)?x.toFixed(d).replace('-','−'):'—';
 const text=(id,t)=>{$(id).textContent=t;};
 const err=message=>{$('adv-error').hidden=!message;text('adv-error',message??'');};
 const number=id=>$(id).valueAsNumber;
 function download(name,content,type='application/json'){
  const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000);
 }
 const encode=x=>JSON.stringify(x,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v,2);
 function stopPlay(){playing=false;cancelAnimationFrame(raf);text('adv-play','Play');}
 function invalidate(message='Setup changed. Run to recalculate.'){
  stopPlay();result=null;frame=0;$('adv-time').value=0;$('adv-time').disabled=true;$('adv-play').disabled=true;$('adv-csv').disabled=true;$('adv-json').disabled=true;
  text('adv-events','—');text('adv-reduction','—');text('adv-temp','—');text('adv-ecl','—');text('adv-reduction-note','Compared with matched dark trial');
  $('adv-summary').querySelector('tbody').replaceChildren();$('adv-diagnostics').replaceChildren();text('adv-heat-ledger','Enable heat to calculate a temperature field.');heatSlice($('adv-heatmap'),null);
  text('adv-status',message);try{drawPlots();refresh();}catch{}
 }
 function setBusy(value){busy=value;root.classList.toggle('adv-busy',value);for(const el of root.querySelectorAll('.adv-controls input,.adv-controls select,.adv-controls button'))el.disabled=value;
  for(const id of ['adv-preset','adv-load','adv-import-device','adv-apply-import','adv-convert','adv-example-device','adv-example-designer'])$(id).disabled=value;
  $('adv-cancel').disabled=false;$('adv-cancel').hidden=!value;$('adv-run').disabled=value;syncKinetics();
 }
 function cancel(){worker?.terminate();worker=null;if(url)URL.revokeObjectURL(url);url=null;job++;setBusy(false);$('adv-progress').value=0;invalidate('Cancelled. No partial or stale result is displayed.');}
 function rebuildNodes(){byCell=config.population.cells.map(c=>populationNodes(model,config,c));nodes=[];cellOffsets=[];
  for(let i=0;i<byCell.length;i++){const offset=nodes.length;cellOffsets.push(offset);nodes.push(...byCell[i].map(n=>({...n,parent:n.parent<0?-1:n.parent+offset})));}
  if(cellIndex>=byCell.length)cellIndex=0;if(nodeIndex>=byCell[cellIndex].length||!byCell[cellIndex][nodeIndex].areaUm2)nodeIndex=0;
  scene.setNodes(nodes);syncInspection();viewConfig=copy(config);scene.setDevice(viewConfig.device);scene.setLightSampler(p=>sourceField(p,viewConfig.source,viewConfig.device));scene.setLight(viewConfig.source);
 }
 function options(select,items,value){const a=items.map(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;return o;});select.replaceChildren(...a);select.value=String(value);}
 function syncInspection(){
  options($('adv-cell'),config.population.cells.map((c,i)=>[i,c.id]),cellIndex);
  options($('adv-node'),byCell[cellIndex].map((n,i)=>[i,(n.sectionType==='axon'?'axon stub':n.sectionType)+' · '+n.id]).filter(([i])=>byCell[cellIndex][i].areaUm2>0),nodeIndex);
  selectedFlat=cellOffsets[cellIndex]+nodeIndex;scene.setSelected(selectedFlat);
 }
 const bindings={
 'adv-opsin':['opsin','string'],'adv-mode':['experiment.mode','string'],'adv-clamp':['experiment.clampMv'],
 'adv-expression':['experiment.expression','string'],'adv-density':['experiment.conductanceDensityScm2','density'],
 'adv-ci':['chloride.insideMm'],'adv-axon-ci':['chloride.axonMm'],'adv-co':['chloride.outsideMm'],'adv-recovery':['chloride.recoveryMs'],'adv-volume':['chloride.volumeFraction'],'adv-dynamic-cl':['chloride.dynamic','bool'],
 'adv-source':['source.kind','string'],'adv-irradiance':['source.irradianceMwMm2'],'adv-wavelength':['source.wavelengthNm'],'adv-fiber-power':['source.powerMw'],'adv-absorption':['source.absorptionMmInv'],'adv-loss':['source.lossMmInv'],
 'adv-protocol':['experiment.protocol','string'],'adv-duration':['experiment.durationMs'],'adv-onset':['experiment.onsetMs'],'adv-width':['experiment.pulseWidthMs'],'adv-frequency':['experiment.frequencyHz'],'adv-epoch':['experiment.trainDurationMs'],'adv-gap':['experiment.pairGapMs'],
 'adv-current':['drive.currentNa'],'adv-drive-start':['drive.startMs'],'adv-drive-end':['drive.endMs'],'adv-control':['matchedControl','bool'],
 'adv-heat':['thermal.enabled','bool'],'adv-grid':['thermal.gridN'],'adv-h':['thermal.spacingUm'],'adv-k':['thermal.conductivityWmK'],'adv-perfusion':['thermal.perfusionPerS'],'adv-rho':['thermal.densityKgM3'],'adv-cp':['thermal.heatCapacityJkgK'],'adv-heat-dt':['thermal.dtMs'],'adv-heat-fraction':['thermal.deviceHeatFraction'],
 'adv-mesh':['experiment.segmentLengthUm'],'adv-dt':['experiment.dtMs'],'adv-sample':['experiment.sampleMs']};
 const getPath=(obj,path)=>path.split('.').reduce((a,k)=>a[k],obj);
 function assign(path,value){const keys=path.split('.'),last=keys.pop(),o=keys.reduce((a,k)=>a[k],config);o[last]=value;}
 function sync(){
  $('adv-run').disabled=busy;
  for(const[id,[path,type]]of Object.entries(bindings)){const v=getPath(config,path);if(type==='bool')$(id).checked=v;else $(id).value=type==='density'?v*1000:v;}
  $('adv-count').value=config.population.count;$('adv-spacing').value=config.population.spacingUm;$('adv-variation').value=config.population.expressionVariation;$('adv-seed').value=config.population.seed;$('adv-layout').value=config.population.layout;
  $('adv-fiber-x').value=config.source.positionUm[0];['x','y','z'].forEach((k,i)=>$('adv-heat-'+k).value=config.thermal.centerUm[i]);
  options($('adv-emitter'),config.device.emitters.map((e,i)=>[i,e.id]),Math.min(emitterIndex,Math.max(0,config.device.emitters.length-1)));syncEmitter();syncKinetics();syncCells();notes();
 }
 function syncKinetics(){const m={...OPSINS[config.opsin],...config.kinetics};for(const[id,key]of [['adv-tau-on','tauOnMs'],['adv-tau-off','tauOffMs'],['adv-half','halfMwMm2'],['adv-tau-des','tauDesMs'],['adv-tau-rec','tauRecMs']]){$(id).disabled=config.opsin==='chr2'||busy;$(id).value=m[key]??'';}}
 function notes(){
  text('adv-model-note',OPSINS[config.opsin].name+' — '+OPSINS[config.opsin].evidence+' Chloride concentrations and expression are user assumptions. Thermal results do not change membrane kinetics.');
  try{text('adv-ecl-note','Initial ECl: soma '+fmt(chlorideReversal(config.chloride.insideMm,config.chloride.outsideMm),1)+' mV · axon '+fmt(chlorideReversal(config.chloride.axonMm,config.chloride.outsideMm),1)+' mV.');}catch{text('adv-ecl-note','Enter positive chloride concentrations.');}
  $('adv-clamp-wrap').hidden=config.experiment.mode!=='clamp';$('adv-uniform-fields').hidden=config.source.kind!=='uniform';$('adv-led-fields').hidden=config.source.kind!=='microled';$('adv-fiber-fields').hidden=config.source.kind!=='fiber';
  text('adv-scene-kicker',config.population.count+' independent '+(config.experiment.mode==='clamp'?'patch':'cell')+(config.population.count===1?'':'s')+' · source-prescribed human morphology');
  const p=sourcePowers(config.source,config.device);text('adv-power-note','Array power: '+fmt(p.opticalMw,3)+' mW optical / '+fmt(p.electricalMw,3)+' mW electrical / '+fmt(p.deviceHeatMw,3)+' mW local device loss.');
 }
 function syncEmitter(){const e=config.device.emitters[emitterIndex];if(!e)return;$('adv-led-on').checked=e.enabled;
  for(const[id,key]of [['power','powerMw'],['wave','wavelengthNm'],['width','widthUm'],['height','heightUm'],['eff','efficiency']])$('adv-led-'+id).value=e[key];
  ['x','y','z'].forEach((k,i)=>{$('adv-led-'+k).value=e.positionUm[i];$('adv-n'+k).value=e.normal[i];});
 }
 function syncCells(){const box=$('adv-cell-editors');box.replaceChildren();
  config.population.cells.forEach((c,i)=>{
   const row=document.createElement('div');row.className='adv-cell-editor';const name=document.createElement('small');name.textContent=c.id+' · offset '+c.offsetUm.map(x=>fmt(x,0)).join(', ')+' µm';row.append(name);
   const label=document.createElement('label');label.textContent='Expression multiplier';const input=document.createElement('input');input.type='number';input.min=0;input.max=3;input.step=.1;input.value=c.expressionScale;input.setAttribute('aria-label',c.id+' expression multiplier');
   input.addEventListener('change',()=>{config.population.cells[i].expressionScale=input.valueAsNumber;edited();});label.append(input);row.append(label);
   const sel=document.createElement('select');sel.setAttribute('aria-label',c.id+' opsin');options(sel,[['','Global opsin'],...Object.values(OPSINS).map(o=>[o.id,o.name])],c.opsin??'');sel.addEventListener('change',()=>{if(sel.value)config.population.cells[i].opsin=sel.value;else delete config.population.cells[i].opsin;edited();});row.append(sel);box.append(row);
  });
 }
 function edited(rebuild=false){err('');invalidate();try{config=validateAdvanced(config);$('adv-run').disabled=false;if(rebuild)rebuildNodes();else{viewConfig=copy(config);scene.setDevice(viewConfig.device);scene.setLightSampler(p=>sourceField(p,viewConfig.source,viewConfig.device));scene.setLight(viewConfig.source);}notes();refresh();}catch(e){$('adv-run').disabled=true;err(e.message);}}
 for(const[id,[path,type]]of Object.entries(bindings))$(id).addEventListener('change',()=>{
  const value=type==='bool'?$(id).checked:type==='string'?$(id).value:type==='density'?number(id)/1000:$(id).tagName==='SELECT'?Number($(id).value):number(id);assign(path,value);
  if(id==='adv-opsin'){config.kinetics={};syncKinetics();}
  if(id==='adv-source'&&value==='fiber'){config.source.wavelengthNm=470;config.thermal.enabled=false;$('adv-wavelength').value=470;$('adv-heat').checked=false;}
  if(id==='adv-mode'&&value==='clamp'){config.population.count=1;config.population.cells=generateCells(1);config.source.kind='uniform';config.drive.currentNa=0;config.matchedControl=false;sync();}
  edited(['adv-mesh','adv-mode'].includes(id));
 });
 for(const[id,key]of [['adv-tau-on','tauOnMs'],['adv-tau-off','tauOffMs'],['adv-half','halfMwMm2'],['adv-tau-des','tauDesMs'],['adv-tau-rec','tauRecMs']])$(id).addEventListener('change',()=>{config.kinetics[key]=number(id);edited();});
 $('adv-fiber-x').addEventListener('change',()=>{config.source.positionUm=[number('adv-fiber-x'),0,0];config.source.targetUm=[0,0,0];edited();});
 ['x','y','z'].forEach((k,i)=>$('adv-heat-'+k).addEventListener('change',()=>{config.thermal.centerUm[i]=number('adv-heat-'+k);edited();}));
 $('adv-emitter').addEventListener('change',()=>{emitterIndex=Number($('adv-emitter').value);syncEmitter();});
 function editEmitter(){const e=config.device.emitters[emitterIndex];if(!e)return;e.enabled=$('adv-led-on').checked;
  for(const[id,key]of [['power','powerMw'],['wave','wavelengthNm'],['width','widthUm'],['height','heightUm'],['eff','efficiency']])e[key]=number('adv-led-'+id);
  e.positionUm=['x','y','z'].map(k=>number('adv-led-'+k));e.normal=['x','y','z'].map(k=>number('adv-n'+k));
  try{config.device=validateDevice(config.device);syncEmitter();}catch(e){err(e.message);}edited();
 }
 for(const id of ['on','power','wave','width','height','eff','x','y','z'])$('adv-led-'+id).addEventListener('change',editEmitter);
 for(const k of ['x','y','z'])$('adv-n'+k).addEventListener('change',editEmitter);
 $('adv-aim-led').onclick=()=>{const e=config.device.emitters[emitterIndex];if(!e)return;const target=config.population.cells[cellIndex].offsetUm,delta=target.map((x,k)=>x-e.positionUm[k]),l=Math.hypot(...delta);if(!l)return err('Move the LED away from the target.');e.normal=delta.map(x=>x/l);syncEmitter();edited();};
 $('adv-add-led').onclick=()=>{if(config.device.emitters.length>=16)return err('Maximum 16 emitters.');let k=1;while(config.device.emitters.some(e=>e.id==='LED-'+k))k++;const e=copy(makeLedArray(1).emitters[0]);e.id='LED-'+k;e.positionUm[1]=k*80;config.device.emitters.push(e);emitterIndex=config.device.emitters.length-1;sync();edited();};
 $('adv-remove-led').onclick=()=>{config.device.emitters.splice(emitterIndex,1);emitterIndex=0;sync();edited();};
 function regenerate(){invalidate();try{const next=copy(config),p=next.population;p.count=number('adv-count');p.spacingUm=number('adv-spacing');p.seed=number('adv-seed');p.expressionVariation=number('adv-variation');p.layout=$('adv-layout').value;p.cells=generateCells(p.count,p.spacingUm,p.seed,p.expressionVariation,p.layout);config=validateAdvanced(next);edited(true);syncCells();}catch(e){sync();err(e.message);}}
 $('adv-generate').onclick=regenerate;
 for(const id of ['adv-count','adv-spacing','adv-variation','adv-seed','adv-layout'])$(id).addEventListener('change',regenerate);
 $('adv-cell').onchange=()=>{cellIndex=Number($('adv-cell').value);nodeIndex=0;syncInspection();drawPlots();refresh();};
 $('adv-node').onchange=()=>{nodeIndex=Number($('adv-node').value);selectedFlat=cellOffsets[cellIndex]+nodeIndex;scene.setSelected(selectedFlat);drawPlots();refresh();};
 $('adv-overlay').onchange=refresh;$('adv-field').onchange=refresh;$('adv-fit').onclick=()=>scene.fit();$('adv-front').onclick=()=>scene.setView('front');$('adv-oblique').onclick=()=>scene.setView('oblique');
 function setTime(ms){if(!result)return;const times=result.cells[0].timeMs;frame=Math.min(times.length-1,Math.max(0,Math.round(ms/config.experiment.sampleMs)));$('adv-time').value=frame;refresh();setCursors(root,times[frame]);}
 $('adv-time').oninput=()=>{stopPlay();setTime(Number($('adv-time').value)*config.experiment.sampleMs);};
 $('adv-play').onclick=()=>{if(!result)return;if(playing)return stopPlay();playing=true;text('adv-play','Pause');if(frame>=result.cells[0].frames-1)frame=0;last=performance.now();let accumulated=0;
  function tick(now){if(!playing)return;accumulated+=now-last;last=now;if(accumulated>=90){setTime(result.cells[0].timeMs[frame]+accumulated*.04);accumulated=0;if(frame===result.cells[0].frames-1)return stopPlay();}raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);};
 function refresh(){
  if(!nodes.length)return;const overlay=$('adv-overlay').value,r=result?.cells[cellIndex],n=nodes.length,values=new Float32Array(n);let max=1,low='0',high='',mode=overlay,offset=0;
  const time=result?result.cells[0].timeMs[frame]:0,drive=result?result.cells[0].lightDrive[frame]:1;
  for(let i=0;i<byCell.length;i++){
   const rr=result?.cells[i],nn=byCell[i].length;
   for(let j=0;j<nn;j++){
    let v=NaN;
    if(overlay==='light')v=(rr?.lightMwMm2[j]??sourceField(byCell[i][j].centerUm,viewConfig.source,viewConfig.device))*drive;
    else if(rr){const at=frame*nn+j;v=overlay==='voltage'?rr.voltageMv[at]:overlay==='conductance'?rr.effectiveOpen[at]:overlay==='chloride'?rr.chlorideMm[at]:overlay==='ecl'?rr.chlorideReversalMv[at]:result.thermal?.temperatureRiseC[frame*n+offset+j]??NaN;}
    values[offset+j]=v;
   }offset+=nn;
  }
  if(['voltage','ecl'].includes(overlay)){low='≤ −90';high='≥ +40 mV';mode='voltage';$('adv-scale').style.background='linear-gradient(90deg,#375d81,#598492,#9c9b69,#c28c43,#ef402f)';}
  else {max=overlay==='conductance'?1:Math.max(.00001,...Array.from(values).filter(Number.isFinite));high=fmt(max,overlay==='heat'?3:2)+(overlay==='heat'?' °C':overlay==='chloride'?' mM':overlay==='light'?' mW/mm²':'');mode=overlay==='light'?'light':'conductance';$('adv-scale').style.background=overlay==='light'?'linear-gradient(90deg,#a0aaa5,#145d9a)':'linear-gradient(90deg,#9aa497,#ad5d25)';}
  text('adv-legend-min',low);text('adv-legend-max',high);scene.setValues(values,mode,{max});scene.setFieldVisible($('adv-field').checked);scene.setIllumination(drive);
  text('adv-time-value',fmt(time,1)+' ms');text('adv-scene-state',result?(drive?'Recorded · light on':'Recorded · light off'):'Setup · not a recording');
  if(r){
   const at=frame*r.n+nodeIndex,summary=result.summaries[cellIndex],base=result.control[cellIndex];
   text('adv-inspect-value',r.id+' / '+r.nodes[nodeIndex].id+' · '+fmt(r.voltageMv[at],1)+' mV · '+fmt(r.photocurrentNa[at],4)+' nA · Clᵢ '+fmt(r.chlorideMm[at],3)+' mM · local light '+fmt(r.lightMwMm2[nodeIndex]*drive,3)+' mW/mm²');
   text('adv-events',r.spikes.length+(base?' / '+base.spikes.length:''));text('adv-events-note',base?'Light trial / dark control · whole recording':'Selected cell · whole recording');
   text('adv-reduction',summary.eventReductionFraction===null?'—':fmt(summary.eventReductionFraction*100,0)+'%');text('adv-reduction-note',summary.baselineEpochEvents===0?'Dark trial has zero in-light-window events':base?summary.illuminatedEvents+' / '+summary.baselineEpochEvents+' events during illumination windows':'Matched dark control not calculated');
   text('adv-ecl',fmt(r.chlorideReversalMv[at],1)+' mV');text('adv-ecl-detail','Clᵢ '+fmt(r.chlorideMm[at],3)+' mM · '+(config.chloride.dynamic?'dynamic':'fixed reservoir'));
   text('adv-temp',result.thermal?fmt(result.thermal.diagnostics.maximumC,3)+' °C':'Not solved');
  }else text('adv-inspect-value','Setup geometry · no response trace yet. Drag to orbit, wheel/pinch to zoom.');
 }
 function drawPlots(){
  const r=result?.cells[cellIndex],b=result?.control[cellIndex],times=r?.timeMs??[0,config.experiment.durationMs];let pulses=[];try{pulses=pulseIntervals(config.experiment);}catch{}
  const series=(values,color='var(--ink)',dash=false)=>({values,color,dash});const local=key=>r?Array.from(times,(_,i)=>r[key][i*r.n+nodeIndex]):[];
  const scrub=t=>{stopPlay();setTime(t);};
  tracePlot($('adv-vplot'),'Membrane voltage · mV',times,r?[series(r.somaVoltageMv),series(local('voltageMv'),'var(--blue)'),...(b?[series(b.somaVoltageMv,'var(--brass)',true)]:[])]:[],pulses,[-105,45],scrub);
  tracePlot($('adv-iplot'),'Selected photocurrent · nA · outward +',times,r?[series(local('photocurrentNa'))]:[],pulses,null,scrub);
  tracePlot($('adv-lplot'),'Selected physical light · mW/mm²',times,r?[series(Array.from(times,(_,i)=>r.lightDrive[i]*r.lightMwMm2[nodeIndex]))]:[],pulses,null,scrub);
  tracePlot($('adv-clplot'),'Selected intracellular chloride · mM',times,r?[series(local('chlorideMm'))]:[],pulses,null,scrub);
  tracePlot($('adv-eplot'),'Selected chloride reversal · mV',times,r?[series(local('chlorideReversalMv'))]:[],pulses,null,scrub);
  const thermal=result?.thermal,flat=cellOffsets[cellIndex]+nodeIndex;
  tracePlot($('adv-tplot'),'Temperature rise · °C · local / grid max',times,thermal?[series(Array.from(times,(_,i)=>thermal.temperatureRiseC[i*nodes.length+flat])),series(thermal.peakC,'var(--brass)')]:[],pulses,null,scrub);
  rasterPlot($('adv-raster'),result,scrub);if(r)setCursors(root,times[frame]);
 }
 function displayResult(r){result=r;setBusy(false);$('adv-progress').value=1;frame=0;rebuildNodes();$('adv-time').max=r.cells[0].frames-1;$('adv-time').disabled=false;$('adv-play').disabled=false;$('adv-csv').disabled=false;$('adv-json').disabled=false;
  text('adv-status','Calculated '+r.cells.length+' cell(s)'+(r.control.length?' with matched dark controls':'')+'. All displayed traces are solver outputs.');
  const tbody=$('adv-summary').querySelector('tbody');tbody.replaceChildren();for(const s of r.summaries){const row=document.createElement('tr');for(const v of [s.cellId,OPSINS[s.opsin].name,fmt(s.somaExposureMwMm2,3),s.spikes+' / '+(s.matchedDarkSpikes??'—'),s.illuminatedEvents+' / '+(s.baselineEpochEvents??'—'),s.eventReductionFraction===null?'—':fmt(s.eventReductionFraction*100,0)+'%']){const td=document.createElement('td');td.textContent=v;row.append(td);}tbody.append(row);}
  const detail=$('adv-diagnostics');detail.replaceChildren();const paragraphs=[`Engine ${ADVANCED_VERSION}. ${r.cells.length} independent cell(s). Numerical time: ${(r.diagnostics.computationMs/1000).toFixed(2)} s on this browser.`,...r.cells.map(c=>c.id+': sampled maximum KCL residual '+c.diagnostics.maximumKclResidualNa.toExponential(2)+' nA; final probability sum error '+c.diagnostics.maximumProbabilitySumError.toExponential(2)+'.'),...r.diagnostics.limitations,...(r.thermal?.diagnostics.limitations??[])];
  for(const msg of paragraphs){const p=document.createElement('p');p.textContent=msg;detail.append(p);}
  heatSlice($('adv-heatmap'),r.thermal);if(r.thermal){const d=r.thermal.diagnostics;text('adv-heat-ledger',`Deposited: ${fmt(d.opticalEnergyUj,4)} µJ optical absorption + ${fmt(d.deviceHeatEnergyUj,4)} µJ device heat. Stored: ${fmt(d.storedEnergyUj,4)} µJ; boundary removal: ${fmt(d.boundaryLossUj,4)} µJ; perfusion removal: ${fmt(d.perfusionLossUj,4)} µJ. Maximum energy-ledger residual: ${d.energyResidualJ.toExponential(2)} J. Outside-grid recording points: ${d.outsidePoints} (shown as gaps, not zero).`);}
  drawPlots();setTime(config.experiment.onsetMs+Math.min(5,config.experiment.pulseWidthMs));
 }
 function run(){err('');try{config=validateAdvanced(config);sync();rebuildNodes();invalidate('Starting numerical calculation…');setBusy(true);$('adv-progress').value=0;
   worker?.terminate();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([$('advanced-worker-source').textContent],{type:'text/javascript'}));worker=new Worker(url);const id=++job;
   worker.onmessage=e=>{if(e.data.id!==job)return;const d=e.data;if(d.type==='progress'){$('adv-progress').value=Math.max(0,Math.min(1,d.progress));text('adv-status',d.stage);}if(d.type==='result')displayResult(d.result);if(d.type==='error'){setBusy(false);err(d.message);text('adv-status','Calculation stopped; no result retained.');}};
   worker.onerror=e=>{setBusy(false);err('Worker error: '+e.message);};worker.postMessage({type:'init',model});worker.postMessage({type:'run',id,config});
  }catch(e){setBusy(false);err(e.message);}}
 $('adv-run').onclick=run;$('adv-cancel').onclick=cancel;
 function loadPreset(id){if(busy)cancel();config=preset(id);cellIndex=0;nodeIndex=0;emitterIndex=0;sync();rebuildNodes();invalidate('Preset loaded. Calculate to compare its numerical responses.');err('');}
 $('adv-preset').onchange=()=>loadPreset($('adv-preset').value);
 $('adv-save').onclick=()=>{try{const c=validateAdvanced(config);download('opto-experiment-v3.json',encode({schema:ADVANCED_SCHEMA,config:c,modelId:model.id,sourceCommit:model.sourceCommit}));}catch(e){err(e.message);}};
 $('adv-device-export').onclick=()=>{try{download('opto-device-v1.json',encode(validateDevice(config.device)));}catch(e){err(e.message);}};
 $('adv-json').onclick=()=>{if(result)download('opto-result-v3.json',encode(result));};
 $('adv-csv').onclick=()=>{if(!result)return;const lines=['cell,time_ms,soma_mV,selected_mV,soma_Cl_mM,soma_ECl_mV,total_photo_nA,soma_physical_mW_mm2,injected_nA,dark_soma_mV,soma_deltaT_C'];
  const csv=x=>Number.isFinite(x)?x:'';for(let c=0;c<result.cells.length;c++){const r=result.cells[c],b=result.control[c],si=r.somaIndex,id="'"+r.id.replaceAll('"','""');for(let k=0;k<r.frames;k++){const t=result.thermal?.temperatureRiseC[k*nodes.length+cellOffsets[c]+si];lines.push(['"'+id+'"',r.timeMs[k],r.somaVoltageMv[k],c===cellIndex?r.voltageMv[k*r.n+nodeIndex]:'',r.somaChlorideMm[k],r.somaChlorideReversalMv[k],r.totalPhotocurrentNa[k],r.lightMwMm2[si]*r.lightDrive[k],r.injectionNa[k],b?b.somaVoltageMv[k]:'',csv(t)].join(','));}}
  download('opto-traces-v3.csv',lines.join('\n'),'text/csv');};
 const sampleDesigner=()=>({schema:'bts-neural-interface',version:1,units:'um',name:'Four-site layout for explicit conversion',contacts:Array.from({length:4},(_,i)=>({id:'E'+(i+1),x:(i-1.5)*80,y:0,shape:'square',w:22,h:22,rotation:0})),routing:{material:'Au',dielectric:'Parylene-C',substrateThickness:10}});
 function showImport(input){if(busy)throw Error('Cancel the running calculation before importing.');
  if((input.schema===ADVANCED_SCHEMA||input.schema==='bts-opto-result/3')){
   if(input.modelId&&input.modelId!==model.id)throw Error('Neuron model mismatch.');if(input.sourceCommit&&input.sourceCommit!==model.sourceCommit)throw Error('Cell source revision mismatch.');
   const next=validateAdvanced(input.config??input);if(busy)cancel();config=next;cellIndex=0;nodeIndex=0;emitterIndex=0;sync();rebuildNodes();invalidate('Experiment loaded; saved results are never trusted as new calculations.');text('adv-import-status','Experiment loaded and validated.');return;
  }
  preview=parseImport(input);$('adv-import-preview').hidden=false;const box=$('adv-import-table');box.replaceChildren();
  text('adv-import-status',preview.kind.toUpperCase()+' preview\n'+preview.warnings.join('\n'));
  $('adv-convert').hidden=preview.kind!=='designer';$('adv-apply-import').textContent=preview.kind==='recipe'?'Attach recipe provenance':'Apply device geometry';
  const rows=preview.device?.contacts??[];
  if(rows.length){const table=document.createElement('table');const head=document.createElement('tr');for(const s of ['Select','Site','x, y, z · µm','Size · µm','Role']){const th=document.createElement('th');th.textContent=s;head.append(th);}table.append(head);
   for(const c of rows){const tr=document.createElement('tr'),td=document.createElement('td'),check=document.createElement('input');check.type='checkbox';check.dataset.contactId=c.id;check.setAttribute('aria-label','Convert '+c.id);td.append(check);tr.append(td);for(const v of [c.id,c.positionUm.map(x=>fmt(x,0)).join(', '),c.widthUm+' × '+c.heightUm,'electrode / display only']){const cell=document.createElement('td');cell.textContent=v;tr.append(cell);}table.append(tr);}box.append(table);
  }else{const p=document.createElement('p');p.textContent=preview.device?preview.device.name+' · '+preview.device.emitters.length+' emitters. Applying will replace the current device.':'This recipe is provenance only and does not change simulated geometry or efficiency.';box.append(p);}
 }
 async function loadFile(file){if(!file)return;try{if(file.size>1000000)throw Error('Import must be at most 1 MB.');showImport(JSON.parse(await file.text()));err('');}catch(e){err('Import failed: '+e.message);text('adv-import-status','Import rejected. Existing device and setup were not replaced.');}}
 $('adv-file').onchange=e=>{loadFile(e.target.files[0]);e.target.value='';};for(const id of ['adv-load','adv-import-device'])$(id).onclick=()=>$('adv-file').click();
 $('adv-drop').onclick=()=>{if(!busy)$('adv-file').click();};$('adv-drop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('adv-file').click();}};
 $('adv-drop').ondragover=e=>{e.preventDefault();$('adv-drop').classList.add('dragover');};$('adv-drop').ondragleave=()=>$('adv-drop').classList.remove('dragover');$('adv-drop').ondrop=e=>{e.preventDefault();$('adv-drop').classList.remove('dragover');if(!busy)loadFile(e.dataTransfer.files[0]);};
 $('adv-example-device').onclick=()=>{try{showImport(makeLedArray());}catch(e){err(e.message);}};
 $('adv-example-designer').onclick=()=>showImport(sampleDesigner());$('adv-export-designer-example').onclick=()=>download('designer-optical-bridge-example.json',encode(sampleDesigner()));
 $('adv-reject-import').onclick=()=>{preview=null;$('adv-import-preview').hidden=true;text('adv-import-status','Preview discarded.');};
 function applyDevice(d){config.device=validateDevice(d);config.source.kind='microled';emitterIndex=0;sync();edited();$('adv-import-preview').hidden=true;preview=null;text('adv-import-status','Device applied. All optical/thermal properties remain explicit and editable. Run to calculate.');}
 $('adv-apply-import').onclick=()=>{try{if(!preview)return;if(preview.kind==='recipe'){const next=copy(config);next.device.metadata={...next.device.metadata,cleanroomRecipe:preview.recipe};config=validateAdvanced(next);preview=null;$('adv-import-preview').hidden=true;edited();text('adv-import-status','Recipe archived; no optical efficiency, geometry or device conduction inferred.');}else applyDevice(preview.device);}catch(e){err(e.message);}};
 $('adv-convert').onclick=()=>{try{if(!preview?.device)return;const ids=[...$('adv-import-table').querySelectorAll('input:checked')].map(e=>e.dataset.contactId);applyDevice(convertContacts(preview.device,ids,{powerMw:.02,wavelengthNm:470,efficiency:.065,zUm:-75}));}catch(e){err(e.message);}};
 $('tab-advanced').onclick=()=>{activate();requestAnimationFrame(()=>{scene.fit();drawPlots();refresh();});};
 for(const name of ['neuron','clamp','sweep','evidence'])$('tab-'+name).addEventListener('click',()=>{stopPlay();if(busy)cancel();});
 new MutationObserver(()=>{scene.setTheme(document.documentElement.dataset.theme);drawPlots();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 let resizeId;new ResizeObserver(()=>{clearTimeout(resizeId);resizeId=setTimeout(drawPlots,100);}).observe($('adv-vplot'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay();});window.addEventListener('beforeunload',()=>{worker?.terminate();if(url)URL.revokeObjectURL(url);});
 scene.setTheme(document.documentElement.dataset.theme);sync();rebuildNodes();invalidate('Ready. Calculate the inhibition experiment or choose a microLED/population example.');activate();
 // Mobile starts with fewer expanded controls; desktop retains the full instrument panel.
 if(innerWidth<760)for(const d of root.querySelectorAll('.adv-controls > details'))d.open=false;
 globalThis.OptoAdvanced=Object.freeze({version:ADVANCED_VERSION,getConfig:()=>copy(config),getResult:()=>result,isBusy:()=>busy,run,cancel,setTime,
  setConfig(input){if(busy)throw Error('Cancel the active job first.');config=validateAdvanced(input);cellIndex=0;nodeIndex=0;emitterIndex=0;sync();rebuildNodes();invalidate();},
  loadPreset,importObject(input){showImport(input);},getImportPreview:()=>preview?copy(preview):null});
}
export {initAdvanced};
