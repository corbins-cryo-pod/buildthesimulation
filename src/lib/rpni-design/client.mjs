import { DEFAULT_CONFIG, MODEL_VERSION, PRESETS, PARAMETER_META, normalizeConfig, sampleAt } from './model.mjs';
import { drawAllCharts, drawRecording, drawGrowth } from './charts.mjs';
import { createExperiment, parseExperiment, recordingCsv, growthCsv } from './export.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(n,d=2)=>Number.isFinite(n)?Number(n).toLocaleString(undefined,{maximumFractionDigits:d}):n===Infinity?'∞':n===-Infinity?'−∞':'—';
const voltage=n=>Number.isFinite(n)&&n!==0&&Math.abs(n)<.01?n.toExponential(2):fmt(n,3);
const ratioDb=(value,state)=>Number.isFinite(value)?`${fmt(value,1)} dB`:state==='no-signal'?'No clean signal':state==='no-noise'?'No imposed noise':'Undefined';
const pct=n=>Number.isFinite(n)?`${fmt(n*100,1)}%`:'—';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table=(headers,rows)=>`<table><thead><tr>${headers.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>`<${i?'td':'th'}${i?'':' scope="row"'}>${esc(x)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table>`;
const quantile=(xs,p)=>{const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*p,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);};
function download(name,body,type){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}

export function initializeRpniLab(){
 const root=document.querySelector('[data-rpni-lab]');if(!root||root.dataset.initialized)return;root.dataset.initialized='true';
 const q=name=>root.querySelector(`[data-rp="${name}"]`),qa=s=>[...root.querySelectorAll(s)],inputs=qa('[data-rp-param]');
 const canvases={trace:q('trace-chart'),growth:q('growth-chart'),oxygen:q('oxygen-chart'),sweep:q('sweep-chart')};
 let result=null,reference=null,sweep=null,ensemble=null,viewer=null,worker=null,requestId=0,pending=null,dirty=false,disposed=false,startedAt=0;
 let day=DEFAULT_CONFIG.observationDay,timeMs=0,channelIndex=0,contactId=null,mode=null,raf=0,lastFrame=0,lastPaint=0,resizeTimer=0,backingConfig={...DEFAULT_CONFIG};
 function status(text,state='ready'){q('status').textContent=text;q('status').dataset.state=state;}
 function readConfig(){const c={...backingConfig};for(const i of inputs)c[i.dataset.rpParam]=i.value.trim()===''?NaN:Number(i.value);return c;}
 function writeConfig(c){backingConfig={...c};for(const i of inputs)i.value=String(c[i.dataset.rpParam]);updateConstraints();}
 function updateConstraints(){
  const c=readConfig();for(const i of inputs){i.disabled=!!pending;const key=i.dataset.rpParam;
   if(key==='targetModule'&&i.tagName==='SELECT')for(const option of i.options)option.disabled=Number(option.value)>=c.moduleCount;if(key==='observationDay')i.max=String(c.durationDays);
  }
 }
 function setPreset(id){for(const b of qa('[data-rp-preset]'))b.setAttribute('aria-pressed',String(b.dataset.rpPreset===id));}
 function setDirty(value){dirty=value;q('dirty').hidden=value===false;for(const key of['pin','export-json','export-traces','export-growth','sweep','ensemble'])q(key).disabled=!result||value||!!pending;}
 function setBusy(type=null){pending=type;root.setAttribute('aria-busy',String(!!type));q('run').disabled=!!type;q('cancel').hidden=!type;q('run').textContent=type==='simulate'?'Calculating design…':'Build & test design →';q('sweep').textContent=type==='sweep'?'Calculating…':'Test five values';q('ensemble').textContent=type==='ensemble'?'Calculating…':'Test eight seeds';for(const b of qa('[data-rp-preset]'))b.disabled=!!type;for(const key of['import-paste','import-file','import-json','sweep-parameter','sweep-low','sweep-high'])q(key).disabled=!!type;updateConstraints();setDirty(dirty);}
 function chartState(){return {result,reference,sweep,day,timeMs,channelIndex,sweepMetric:q('sweep-metric').value};}
 function draw(){drawAllCharts(canvases,chartState());}
 function selectedSummary(sample=result?.summary){return sample?.channels?.[channelIndex]||sample?.channels?.[0]||{};}
 function selectedRecording(){return result?.recording.metrics?.[channelIndex]||result?.recording.channels?.[channelIndex]?.metrics||{};}
 function setOptions(){const options={selectedElectrodeId:contactId};for(const i of qa('[data-rp-layer]'))options[i.dataset.rpLayer]=i.checked;viewer?.setOptions(options);}
 function updateContact(){if(!result)return;const contact=result.geometry.contacts.find(c=>String(c.id)===String(contactId))||result.geometry.contacts[0];if(!contact)return;contactId=contact.id;q('contact-select').value=String(contactId);const p=contact.positionMm;q('contact-detail').textContent=`${contact.id} · module ${Number(contact.moduleId)+1} · position (${p.map(x=>fmt(x,2)).join(', ')}) mm · disk radius ${fmt(contact.radiusMm,2)} mm · ${fmt(Math.PI*contact.radiusMm**2,3)} mm² contact area.`;setOptions();}
 function selectContact(id){contactId=id;updateContact();}
 function setDay(value,{signal=false}={}){
  if(!result)return;day=clamp(Number(value)||0,0,result.config.durationDays);const sample=sampleAt(result,day),c=result.config,n=result.motorUnits.length;
  q('day').value=String(day);q('day-label').textContent=`Day ${fmt(day,1)}`;q('recorded-day').textContent=`day ${fmt(result.recording.day,1)}`;root.querySelector('[data-rp-metric="rms"]').nextElementSibling.textContent=`µV · day ${fmt(result.recording.day,1)} · signal + noise`;
  const values={volume:fmt(c.graftLengthMm*c.graftWidthMm*c.graftThicknessMm,0),arrived:`${sample.arrivedUnits} <em>/ ${n}</em>`,maturity:pct(sample.matureSourceFraction),rms:fmt(selectedRecording().rmsUv,2)};
  for(const el of qa('[data-rp-metric]'))el.innerHTML=values[el.dataset.rpMetric];
  viewer?.setTime(day,signal?timeMs:0);
  q('growth-endpoint').textContent=`${n} synthetic motor units · ${c.durationDays} days`;
  const sc=selectedSummary(sample),rows=[
   ['Displayed biological age',`${fmt(day,2)} days`,'Days after the graft is constructed; independent of the recording window.'],
   ['Recording biological age',`${fmt(result.recording.day,2)} days`,'All displayed voltage traces and their empirical RMS are computed at this age.'],
   ['Synthetic motor units reached',`${sample.arrivedUnits} / ${n}`,'Geometric arrival under the specified delay and speed; does not demonstrate a functioning NMJ.'],
   ['Mean source amplitude gain',pct(sample.matureSourceFraction),'Mean assumed source availability across the original synthetic cohort.'],
   ['Assigned source routing fraction',pct(sample.routingFraction),'Fraction assigned to the matching command pool; a construction assumption.'],
   ['Expected clean source RMS',`${fmt(sc.cleanRmsUv,3)} µV`,'Independent-source expectation at the displayed age; distinct from finite-trace RMS.'],
   ['Expected target contribution',`${fmt(sc.targetRmsUv,3)} µV`,'Contribution from the selected target command pool.'],
   ['Expected other contribution',`${fmt(sc.otherRmsUv,3)} µV`,'Contribution from all other command pools.'],
   ['Expected target power fraction',pct(sc.targetFraction),'Target power divided by target plus other source power; noise excluded.'],
   ['Assumed acquisition noise',`${fmt(c.noiseRmsUv,3)} µV RMS`,'Specified Gaussian white-noise standard deviation.'],
   ['Hypothetical slab center ratio',pct(sample.oxygenCenterRatio),'Steady center-to-face concentration; no internal vessels, no viability gate.']
  ];q('results-table').innerHTML=rows.map(row=>`<tr><th scope="row">${esc(row[0])}</th><td>${esc(row[1])}</td><td>${esc(row[2])}</td></tr>`).join('');
  drawGrowth(canvases.growth,result,day,reference);
 }
 function updateChannel(){
  if(!result)return;channelIndex=clamp(channelIndex,0,result.geometry.channels.length-1);q('channel-select').value=String(channelIndex);
  const sc=selectedSummary(),rc=selectedRecording(),channel=result.geometry.channels[channelIndex];
  const stats=[['Finite-trace clean RMS',`${fmt(rc.cleanRmsUv,2)} µV`,'At the recording day'],['Finite-trace noise RMS',`${fmt(rc.noiseRmsUv,2)} µV`,'Actual seeded noise segment'],['Clean/noise ratio',ratioDb(rc.snrDb,rc.snrState),'20 log₁₀(clean RMS / noise RMS)'],['Expected target fraction',pct(sc.targetFraction),'At recording day · target / all source power'],['Expected other-pool RMS',`${voltage(sc.otherRmsUv)} µV`,'At recording day · source pickup only'],['Expected target / other',Number.isFinite(sc.targetOtherDb)?`${fmt(sc.targetOtherDb,1)} dB`:'Undefined','Power ratio · noise excluded']];
  q('channel-stats').innerHTML=stats.map(([label,value,note])=>`<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  q('trace-note').textContent=`${channel.id} · differential voltage · day ${fmt(result.recording.day,1)} · ${fmt(result.config.sampleRateHz,0)} samples/s · ${fmt(result.config.traceDurationMs,0)} ms window. Total includes both source contributions and additive noise. Voltage magnitude is conditional on the equivalent source current and tissue assumptions.`;
  updateMatrices();updateSweep();updateEnsemble();updateComparison();setDay(day,{signal:mode==='signal'});draw();
 }
 function updateMatrices(){
  if(!result)return;const matrix=result.recording.transferMatrix,n=result.config.moduleCount;let max=0;for(const row of matrix)for(const x of row)if(Number.isFinite(x))max=Math.max(max,x);
  q('transfer-matrix').innerHTML=`<table><thead><tr><th>µV RMS</th>${Array.from({length:n},(_,i)=>`<th>Pool ${i+1}${i===result.config.targetModule?' · target':''}</th>`).join('')}</tr></thead><tbody>${matrix.map((row,i)=>`<tr><th scope="row">${esc(result.geometry.channels[i].id)}</th>${row.map(v=>`<td style="background:rgba(164,123,52,${.06+.4*(max>0?v/max:0)})"><button type="button" data-rp-matrix-channel="${i}" aria-label="Select ${esc(result.geometry.channels[i].id)}, pickup ${voltage(v)} microvolts RMS" aria-pressed="${i===channelIndex}">${voltage(v)}</button></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  q('matrix-note').textContent=result.recording.metricDefinitions?.transferMatrix||'Each cell is the expected RMS contribution of a source command pool to a bipolar channel, at the recording day and specified drive. Noise is excluded. A routing change can mix command identity within a physical graft.';
  const similarity=result.recording.channelSimilarity||[];q('similarity-table').innerHTML=table(['Channel',...result.geometry.channels.map(c=>c.id)],similarity.map((row,i)=>[result.geometry.channels[i].id,...row.map(x=>fmt(x,3))]));
 }
 function sweepRange(){
  const key=q('sweep-parameter').value,meta=PARAMETER_META[key],c=result?.config||readConfig(),v=c[key];
  let lo=clamp(v*.5,meta.min,meta.max),hi=clamp(v*1.5,meta.min,meta.max);
  if(key==='moduleGapMm'){lo=0;hi=Math.min(meta.max,Math.max(30,v*2));}
  if(key==='electrodeDepthMm'){lo=meta.min;hi=Math.min(meta.max,c.graftThicknessMm*.9);}
  if(key==='electrodeSpacingMm')hi=Math.min(hi,c.graftLengthMm*.8);
  if(key==='routingFidelity'){lo=0;hi=1;}
  if(key==='electrodeOffsetMm'){lo=-c.graftLengthMm*.25;hi=c.graftLengthMm*.25;}
  if(key==='observationDay'){lo=0;hi=c.durationDays;}
  if(!(hi>lo))hi=Math.min(meta.max,lo+(meta.max-meta.min)*.2);
  q('sweep-low').value=String(Number(lo.toFixed(4)));q('sweep-high').value=String(Number(hi.toFixed(4)));
  for(const key2 of['sweep-low','sweep-high']){q(key2).min=String(meta.min);q(key2).max=String(meta.max);}
 }
 function updateSweep(){
  if(!sweep?.points?.length)return;const key=sweep.parameter,meta=PARAMETER_META[key];
  sweep.unit=meta?.unit||'';
  const rows=sweep.points.map(p=>{const s=p.summary||p,sc=s.channels?.[channelIndex]||{},effective=p.config?.[key]??p.value;return [fmt(p.requestedValue??p.value,4),fmt(effective,4),voltage(sc.cleanRmsUv),voltage(sc.otherRmsUv),fmt(sc.targetOtherDb,2),pct(sc.targetFraction),pct(s.oxygenCenterRatio),pct(s.matureSourceFraction)];});
  q('sweep-table').innerHTML=table([`${meta?.label||key} / ${meta?.unit||''}`,'Effective value','Clean RMS / µV','Other-pool RMS / µV','Target / other / dB','Target power fraction','Slab center ratio','Mean source amplitude gain'],rows);
  q('sweep-note').textContent=`Five ${meta?.label.toLowerCase()||key} values · channel ${channelIndex+1} · common seed ${result.config.seed}. RMS is the independent-source expectation at each design’s recording age. Geometry constraints can change effective values; inspect the table. Transport remains an independent diagnostic.`;
 }
 function updateEnsemble(){
  const rows=ensemble?.rows||ensemble?.runs||ensemble?.endpoints;if(!rows?.length)return;const values=rows.map(r=>(r.summary||r).channels?.[channelIndex]||{}),metrics=[['Expected source RMS',values.map(c=>c.cleanRmsUv),'µV'],['Target power fraction',values.map(c=>Number.isFinite(c.targetFraction)?c.targetFraction*100:null),'%'],['Expected clean/noise',values.map(c=>c.snrDb),'dB']];
  q('ensemble-results').innerHTML=`<div class="rp-ensemble-grid">${metrics.map(([label,xs,unit])=>`<div><span>${label}</span><strong>${fmt(quantile(xs,.5),2)} ${unit}</strong><small>Median · 10th–90th percentile ${fmt(quantile(xs,.1),2)}–${fmt(quantile(xs,.9),2)} ${unit}</small></div>`).join('')}</div><p class="rp-plot-note">${rows.length} seeds · channel ${channelIndex+1} · fixed parameters. Nonfinite ratios are omitted from the percentile calculation; silent or noise-free cases can have no finite decibel interval.</p>`;
 }
 function updateComparison(){
  q('clear-reference').disabled=!reference;if(!reference||!result){q('comparison').innerHTML='<p class="rp-plot-note">Pin a result, edit the design and run again. Changed assumptions and computed differences will remain visible together.</p>';return;}
  const a=reference.summary,b=result.summary,ac=a.channels[Math.min(channelIndex,a.channels.length-1)]||{},bc=b.channels[channelIndex]||{},differences=Object.keys(result.config).filter(k=>reference.config[k]!==result.config[k]).map(k=>`${PARAMETER_META[k]?.label||k}: ${reference.config[k]} → ${result.config[k]}`);
  const rows=[['Recording day',reference.config.observationDay,result.config.observationDay],['Compared channel',Math.min(channelIndex,a.channels.length-1)+1,channelIndex+1],['Units arrived',a.arrivedUnits,b.arrivedUnits],['Mean source amplitude gain',pct(a.matureSourceFraction),pct(b.matureSourceFraction)],['Expected clean RMS / µV',fmt(ac.cleanRmsUv,3),fmt(bc.cleanRmsUv,3)],['Expected target power fraction',pct(ac.targetFraction),pct(bc.targetFraction)],['Hypothetical slab center ratio',pct(a.oxygenCenterRatio),pct(b.oxygenCenterRatio)]];
  q('comparison').innerHTML=`<p class="rp-comparison-changes">${esc(differences.length?differences.join(' · '):'Reference pinned. Change one design parameter and run again.')}</p><div class="rp-table-scroll">${table(['Readout at each recording day','Pinned reference','Current design'],rows)}</div>`;
 }
 function receiveResult(next,elapsed){
  result=next;sweep=null;ensemble=null;channelIndex=Math.min(channelIndex,result.geometry.channels.length-1);timeMs=0;writeConfig(result.config);setDirty(false);setBusy();
  q('day').max=String(result.config.durationDays);q('signal-time').max=String(result.config.traceDurationMs);q('signal-time').value='0';q('signal-time-label').textContent='0 ms';
  q('geometry-label').textContent=`${result.config.moduleCount} graft${result.config.moduleCount>1?'s':''} · ${fmt(result.config.graftLengthMm)} × ${fmt(result.config.graftWidthMm)} × ${fmt(result.config.graftThicknessMm)} mm each`;
  q('contact-select').replaceChildren(...result.geometry.contacts.map(c=>{const o=document.createElement('option');o.value=String(c.id);o.textContent=String(c.id);return o;}));
  q('channel-select').replaceChildren(...result.geometry.channels.map((c,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=String(c.id);return o;}));
  contactId=result.geometry.contacts[Math.min(channelIndex*2,result.geometry.contacts.length-1)]?.id;
  const lambda=result.oxygen.lambdaMm,center=result.oxygen.centerRatio??result.summary.oxygenCenterRatio,mean=result.oxygen.meanRatio??result.summary.oxygenMeanRatio;
  q('oxygen-center').textContent=`Center / face ${pct(center)}`;
  q('oxygen-note').textContent=`Hypothetical avascular slab · thickness ${fmt(result.config.graftThicknessMm)} mm · diffusion length ${fmt(lambda,3)} mm · mean / face ${pct(mean)}. Equal fixed supply at both faces, steady first-order consumption. No internal vessels, concentration threshold, or survival calculation.`;
  q('manifest').textContent=`Model ${result.modelVersion} · seed ${result.config.seed} · ${result.motorUnits.length} motor units · ${fmt(elapsed,0)} ms computation`;
  q('warnings').replaceChildren(...(result.warnings||[]).map(message=>{const li=document.createElement('li');li.textContent=message;return li;}));
  q('sweep-table').textContent='Run a study to inspect exact values.';q('sweep-note').textContent='The same seed, drive and recording horizon are used at each point. Results describe sensitivity to the selected variable within this model.';q('ensemble-results').textContent='Run independent seeds at fixed design parameters to inspect synthetic source placement, current-strength multipliers and routing variability.';
  viewer?.setResult(result);updateContact();day=result.config.observationDay;updateChannel();sweepRange();
  status(`Calculated ${result.motorUnits.length} motor-unit sources and ${result.geometry.channels.length} bipolar channels in ${fmt(elapsed,0)} ms. Recording day ${result.config.observationDay}; seed ${result.config.seed}.`);
 }
 function createWorker(){
  worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});const current=worker;
  current.addEventListener('message',event=>{const m=event.data||{};if(disposed||current!==worker||m.id!==requestId)return;const elapsed=performance.now()-startedAt;
   if(m.type==='error'){setBusy();status(`Calculation failed: ${m.message}`,'error');return;}
   if(m.type==='result')receiveResult(m.result,elapsed);
   else if(m.type==='sweep'){sweep=m.result;setBusy();updateSweep();draw();status(`Completed a five-value controlled study in ${fmt(elapsed/1000,2)} s.`);}
   else if(m.type==='ensemble'){ensemble=m.result;setBusy();updateEnsemble();status(`Completed eight independent seeds in ${fmt(elapsed/1000,2)} s.`);}
  });
  current.addEventListener('error',event=>{if(disposed||worker!==current)return;setBusy();status(`Numerical worker could not complete: ${event.message||'unknown error'}`,'error');current.terminate();worker=null;});
 }
 function run(type='simulate'){
  stop();if(type!=='simulate'&&(!result||dirty))return;
  try{
   const raw=type==='simulate'?readConfig():result.config;for(const [key,value] of Object.entries(raw))if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${PARAMETER_META[key]?.label||key} requires a finite number.`);
   const config=normalizeConfig(raw);if(type==='simulate'){const changes=Object.keys(config).filter(k=>config[k]!==raw[k]);q('normalization-note').textContent=changes.length?`Geometry or sampling constraints adjusted: ${changes.map(k=>`${PARAMETER_META[k]?.label||k} → ${config[k]}`).join('; ')}.`:'';writeConfig(config);}
   const parameter=q('sweep-parameter').value;let values;
   if(type==='sweep'){const lo=Number(q('sweep-low').value),hi=Number(q('sweep-high').value),meta=PARAMETER_META[parameter];if(!Number.isFinite(lo)||!Number.isFinite(hi)||!(hi>lo)||lo<meta.min||hi>meta.max)throw new Error(`Choose an increasing sweep within ${meta.min}–${meta.max} ${meta.unit}.`);values=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);}
   if(!worker)createWorker();setBusy(type);startedAt=performance.now();requestId++;status(type==='simulate'?'Calculating source propagation, finite-contact pickup and seeded recordings…':type==='sweep'?'Testing five designs with a common random seed…':'Testing eight independent synthetic populations…','computing');worker.postMessage({type,id:requestId,config,parameter,values,n:8});
  }catch(error){setBusy();status(`Could not start: ${error.message}`,'error');}
 }
 function cancel(){requestId++;worker?.terminate();worker=null;setBusy();status('Calculation cancelled. The last completed design remains displayed.');}
 function stop(){mode=null;if(raf)cancelAnimationFrame(raf);raf=0;q('play-growth').textContent='Play growth';q('play-signal').textContent='Play signal';}
 function frame(now){if(!mode||disposed||!result)return;if(document.hidden){lastFrame=now;raf=requestAnimationFrame(frame);return;}const elapsed=Math.min(.15,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(mode==='growth'){day=Math.min(result.config.durationDays,day+elapsed*10);if(now-lastPaint>65||day>=result.config.durationDays){lastPaint=now;setDay(day);}if(day>=result.config.durationDays){stop();return;}}
  else{timeMs+=elapsed*100;if(timeMs>result.config.traceDurationMs)timeMs=0;if(now-lastPaint>33){lastPaint=now;q('signal-time').value=String(timeMs);q('signal-time-label').textContent=`${fmt(timeMs,1)} ms`;viewer?.setTime(result.config.observationDay,timeMs);drawRecording(canvases.trace,result,channelIndex,timeMs);}}
  raf=requestAnimationFrame(frame);
 }
 function play(next){if(!result)return;if(mode===next){stop();return;}stop();if(next==='growth'){if(day>=result.config.durationDays)setDay(0);q('play-growth').textContent='Pause growth';}else{setDay(result.config.observationDay,{signal:true});q('play-signal').textContent='Pause signal';}mode=next;lastFrame=performance.now();lastPaint=0;raf=requestAnimationFrame(frame);}
 async function restore(input){try{const config=parseExperiment(input);writeConfig(config);setPreset(null);q('preset-description').textContent='Restored exact-version parameters. Saved traces, comparisons and results are recomputed.';setDirty(true);run();}catch(error){status(`Restore failed: ${error.message}`,'error');}}
 for(const input of inputs)input.addEventListener('input',()=>{setPreset(null);q('preset-description').textContent='Custom interface design. Run the calculation to apply your edits.';setDirty(true);updateConstraints();if(result)status('Design edited. The geometry and results shown still belong to the previous calculation.','edited');});
 for(const b of qa('[data-rp-preset]'))b.addEventListener('click',()=>{const preset=PRESETS.find(p=>p.id===b.dataset.rpPreset);if(!preset)return;writeConfig(normalizeConfig({...DEFAULT_CONFIG,...preset.config}));q('preset-description').textContent=preset.description;setPreset(preset.id);setDirty(true);run();});
 q('run').addEventListener('click',()=>run());q('cancel').addEventListener('click',cancel);q('sweep').addEventListener('click',()=>run('sweep'));q('ensemble').addEventListener('click',()=>run('ensemble'));q('sweep-parameter').addEventListener('change',sweepRange);q('sweep-metric').addEventListener('change',()=>{q('sweep-chart').setAttribute('aria-label',`Controlled design sweep: ${q('sweep-metric').selectedOptions[0].textContent}`);draw();});
 q('channel-select').addEventListener('change',()=>{channelIndex=Number(q('channel-select').value);updateChannel();});q('contact-select').addEventListener('change',()=>selectContact(q('contact-select').value));
 q('transfer-matrix').addEventListener('click',event=>{const b=event.target.closest('[data-rp-matrix-channel]');if(b){channelIndex=Number(b.dataset.rpMatrixChannel);updateChannel();}});
 for(const b of qa('[data-rp-view]'))b.addEventListener('click',()=>{for(const other of qa('[data-rp-view]'))other.setAttribute('aria-pressed',String(other===b));viewer?.setOptions({view:b.dataset.rpView});viewer?.resetCamera();});q('reset-camera').addEventListener('click',()=>viewer?.resetCamera());for(const input of qa('[data-rp-layer]'))input.addEventListener('change',setOptions);
 q('day').addEventListener('input',()=>{stop();setDay(q('day').value);});q('signal-time').addEventListener('input',()=>{stop();timeMs=Number(q('signal-time').value);q('signal-time-label').textContent=`${fmt(timeMs,1)} ms`;setDay(result?.config.observationDay||0,{signal:true});drawRecording(canvases.trace,result,channelIndex,timeMs);});q('play-growth').addEventListener('click',()=>play('growth'));q('play-signal').addEventListener('click',()=>play('signal'));q('recording-day').addEventListener('click',()=>{stop();setDay(result?.config.observationDay||0);});
 q('pin').addEventListener('click',()=>{if(!result||dirty)return;reference=result;updateComparison();draw();status('Current completed design pinned. Edit a parameter and run again to compare.');});q('clear-reference').addEventListener('click',()=>{reference=null;updateComparison();draw();});
 q('export-json').addEventListener('click',()=>{if(!result||dirty)return;download(`rpni-design-${result.config.seed}.json`,JSON.stringify(createExperiment(result,{reference,sweep,ensemble,day,timeMs,channelIndex})),'application/json');status('Exported the complete design, results, comparisons and model provenance.');});
 q('export-traces').addEventListener('click',()=>{if(result&&!dirty){download(`rpni-recording-${result.config.seed}.csv`,recordingCsv(result),'text/csv');status('Exported every recording sample and separate source/noise contributions in microvolts.');}});
 q('export-growth').addEventListener('click',()=>{if(result&&!dirty){download(`rpni-growth-${result.config.seed}.csv`,growthCsv(result),'text/csv');status('Exported biological-age samples and expected source metrics.');}});
 q('import-paste').addEventListener('click',()=>restore(q('import-json').value));q('import-file').addEventListener('change',async()=>{const file=q('import-file').files?.[0];if(!file)return;if(file.size>50_000_000){status('Restore failed: choose an experiment smaller than 50 MB.','error');return;}await restore(await file.text());q('import-file').value='';});
 const resizeObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(draw,100);});resizeObserver.observe(q('trace-chart'));const themeObserver=new MutationObserver(draw);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 function dispose(){if(disposed)return;disposed=true;stop();worker?.terminate();viewer?.dispose();resizeObserver.disconnect();themeObserver.disconnect();clearTimeout(resizeTimer);}
 window.addEventListener('pagehide',dispose,{once:true});document.addEventListener('astro:before-swap',dispose,{once:true});
 writeConfig(DEFAULT_CONFIG);const first=PRESETS[0];if(first){q('preset-description').textContent=first.description;setPreset(first.id);}sweepRange();
 import('./viewer.mjs').then(({createRpniViewer})=>{if(disposed)return;q('viewport').replaceChildren();viewer=createRpniViewer(q('viewport'),{onSelect:selectContact});q('renderer-note').textContent=`${viewer.renderer==='canvas2d'?'Canvas anatomy view':'Interactive 3D view'} · physical coordinates and ruler in mm · drag to ${viewer.renderer==='canvas2d'?'pan':'orbit'}, scroll to zoom. Tissue and motor-unit anatomy are procedural.`;if(result){viewer.setResult(result);viewer.setTime(day,timeMs);setOptions();}}).catch(error=>{q('viewport').textContent=`The anatomical viewer could not start: ${error.message}. Numerical results and exports remain available.`;});
 run();
}
