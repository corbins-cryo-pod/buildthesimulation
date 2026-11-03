// Dependency-free static build. Gzip recordings are served lazily, never inlined into HTML.
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const NE=Object.assign({},require('../engine/recorder.js'),require('../engine/evidence.js'));
const order=['space.js','types.js','clutch.js','core.js','scenarios.js','recorder.js','evidence.js'];
const engine=order.map(f=>read('engine/'+f)).join('\n');
const META=[
{id:'conduit-8mm',group:'Archived V4 · nerve repair',title:'8 mm conduit · original run',desc:'Original 30-day run, before solver corrections. Raw front fluctuations remain visible.'},
{id:'conduit-10mm',group:'Archived V4 · nerve repair',title:'10 mm conduit · benchmark mismatch',desc:'Both stumps present. The original non-crossing result disagrees with the cited qualitative 10 mm outcome.'},
{id:'conduit-15mm',group:'Archived V4 · nerve repair',title:'15 mm conduit · original run',desc:'Original long-gap example. Agreement in direction is not independent model validation.'},
{id:'conduit-graft',group:'Archived V4 · nerve repair',title:'8 mm graft · original run',desc:'Pre-filled Schwann bands and matrix. Crossing is a structural, not functional-recovery, endpoint.'},
{id:'gel-0.5',group:'Archived V4 · gels and coverslip',title:'Embedded DRG · 0.5 kPa',desc:'Original soft-gel recording; calibration and material assumptions apply.'},
{id:'gel-2',group:'Archived V4 · gels and coverslip',title:'Embedded DRG · 2 kPa',desc:'Original stiff-gel recording. Do not interpret as a material-specific prediction.'},
{id:'gelsurface-2',group:'Archived V4 · gels and coverslip',title:'Gel surface · 2 kPa',desc:'Original surface control; qualitative comparison, not held-out experimental validation.'},
{id:'dish-hippocampal',group:'Archived V4 · gels and coverslip',title:'Hippocampal culture · 7 days',desc:'Original developmental calibration example. Day-4 and day-7 targets are evaluated separately.'},
];
const correctedDir=path.join(root,'runs-corrected');
if(fs.existsSync(correctedDir)) for(const file of fs.readdirSync(correctedDir).filter(x=>x.endsWith('.bin')).sort()) META.unshift({id:'corrected-'+file.slice(0,-4),source:'runs-corrected/'+file,group:'Corrected solver · v4.1',title:({'hippocampal-7days':'Hippocampal culture · 7 days','gel-surface':'Gel surface · 2 kPa','gel-stiff':'Embedded DRG · 2 kPa','gel-soft':'Embedded DRG · 0.5 kPa'}[file.slice(0,-4)]||file.slice(0,-4).replaceAll('-',' '))+' · corrected',desc:'Generated with the corrected solver. Numerical verification does not establish biological validation.'});
const lib=[],rows=[],perf=[];fs.mkdirSync(path.join(root,'dist/runs'),{recursive:true});
for(const m of META){
 const file=path.join(root,m.source||'runs/'+m.id+'.bin');if(!fs.existsSync(file))throw Error('Missing required recording '+file);
 const gz=fs.readFileSync(file),buf=zlib.gunzipSync(gz),run=NE.unpackRun(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)),H=run.header;
 fs.copyFileSync(file,path.join(root,'dist/runs',m.id+'.bin'));
 lib.push({...m,file:'runs/'+m.id+'.bin',bytes:gz.length,scenario:H.scenario,frames:run.frames.length,mb:gz.length>1e6?(gz.length/1e6).toFixed(1)+' MB':Math.ceil(gz.length/1e3)+' KB',span:H.hours>=96?Math.round(H.hours/24)+' days':H.hours+' h',modelRevision:H.modelRevision||'original-v4'});
 if(H.scenario==='conduit'){
  const last=H.series[H.series.length-1],summary=NE.nerveBenchmark(H.series,H);
  rows.push({s:m.title,m:'Distal-stump crossing (raw)',lit:summary.matched?summary.condition+'; qualitative gap comparison':'Not matched to Lundborg gap condition',v:`${last.conduit.crossed}/${last.conduit.axons} at ${H.hours/24} days; ${summary.status}`});
  const first=H.series.find(r=>r.conduit.bridged);rows.push({s:m.title,m:'Schwann density-bin bridge',lit:'Current and ever are distinct model metrics',v:`Current ${last.conduit.bridged?'met':'not met'}; ever ${first?'met at day '+(first.t/1440).toFixed(2):'not met'}`});
 }
 perf.push({id:m.id,days:H.hours/24,wall:Math.round(H.wall||0),dt:H.dt,msPerStep:H.steps?(H.wall*1000/H.steps).toFixed(2):null});
}
let page=read('src/page.html');
page=page.replace('/*__ENGINE__*/',()=>engine).replace('/*__WORKER__*/',()=>read('engine/worker.js')).replace('/*__APP__*/',()=>read('src/app.js')).replace('/*__LIBRARY__*/[]',()=>JSON.stringify(lib)).replace('/*__VALIDATION__*/null',()=>JSON.stringify({rows,perf}));
if(/\/\*__(ENGINE|WORKER|APP|LIBRARY|VALIDATION)__\*\//.test(page))throw Error('Unresolved build placeholder');
fs.writeFileSync(path.join(root,'dist/index.html'),page);fs.writeFileSync(path.join(root,'dist/library-manifest.json'),JSON.stringify(lib,null,2));
console.log('Built',page.length,'HTML characters;',lib.length,'lazy-loaded recordings');
