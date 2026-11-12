import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import os from 'node:os';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {createStage1FieldModel,solveStage1Channel,solveStage1Load,sampleMembraneTransfer,exportStage1FieldFixture,normalizeStage1FieldSettings,FIELD_STAGE1_VERSION} from '../../src/lib/axon-interface/field-stage1.mjs';
import {stage1FieldFixture} from './field-stage1-fixtures.mjs';
import {cylinderBenchmark,boundaryReaction} from './field-stage1-benchmarks.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),docs=path.join(root,'docs/axon-interface'),history=path.join(docs,'field-stage1-history.jsonl');
const acceptance=JSON.parse(fs.readFileSync(path.join(docs,'field-stage1-acceptance.json'))),L=acceptance.limits,startedAt=new Date().toISOString(),results=[];
const sourceFiles=['src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/vendor/cdt2d.mjs','src/lib/axon-interface/bipolar.mjs','src/lib/axon-interface/mrg.mjs','scripts/axon-interface/field-stage1-validate.mjs','scripts/axon-interface/field-stage1-reference.py','scripts/axon-interface/field-stage1-fixtures.mjs','scripts/axon-interface/field-stage1-benchmarks.mjs','docs/axon-interface/field-stage1-acceptance.json'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),sourceHashes=Object.fromEntries(sourceFiles.map(f=>[f,hash(f)]));
function check(name,value,tolerance,detail={}){const r={name,value,tolerance,status:Number.isFinite(value)&&value<=tolerance?'pass':'fail',...detail};results.push(r);console.log(JSON.stringify(r));if(r.status==='fail')fs.appendFileSync(history,JSON.stringify({timestamp:new Date().toISOString(),event:'failed-field-study',...r,sourceHashes})+'\n');return r;}
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length),relative=(a,b)=>rms(a.map((v,i)=>v-b[i]))/rms(b);
const fixture=stage1FieldFixture(),settings=fixture.settings;
let baseDiagnostics=null,reference=null;
try{
 console.log('Constructing four explicit wells with fixed surface contacts');
 const model=createStage1FieldModel(settings,fixture),a=solveStage1Channel(model,fixture.channels[0]);baseDiagnostics=a.diagnostics;
 check('IC-PCG true relative residual',a.diagnostics.relativeResidual,L.linearSolveRelativeResidual);
 check('Matched finite-surface source and return',Math.abs(a.diagnostics.sourceReturnImbalanceUa),L.sourceReturnImbalanceUa);
 check('Global current closure',Math.abs(a.diagnostics.globalCurrentClosureUa),L.currentClosureUa);
 const allTransfers=s=>fixture.cells.flatMap(cell=>Array.from(sampleMembraneTransfer(s,fixture.morphology,cell)));
 const ta=allTransfers(a);
 const zero=solveStage1Load(model,new Float64Array(model.points.length));check('Zero drive is exactly zero',Math.max(...zero.potentialMvPerUa.map(Math.abs)),0);
 const constant=solveStage1Load(model,new Float64Array(model.points.length),{boundaryMv:()=>1});check('Constant potential with natural insulating boundaries',Math.max(...constant.potentialMvPerUa.map(v=>Math.abs(v-1))),L.constantPotentialErrorMv);
 const b=solveStage1Channel(model,fixture.channels[1]),ab=solveStage1Load(model,Float64Array.from(a.loadUa,(v,i)=>v+b.loadUa[i]));
 let error=0,scale=0,recAB=0,recBA=0;for(let i=0;i<a.loadUa.length;i++){error=Math.max(error,Math.abs(ab.potentialMvPerUa[i]-a.potentialMvPerUa[i]-b.potentialMvPerUa[i]));scale=Math.max(scale,Math.abs(a.potentialMvPerUa[i]),Math.abs(b.potentialMvPerUa[i]));recAB+=a.loadUa[i]*b.potentialMvPerUa[i];recBA+=b.loadUa[i]*a.potentialMvPerUa[i];}
 check('Finite-surface field superposition',error/scale,L.superpositionRelative);
 check('Finite-surface field reciprocity',Math.abs(recAB-recBA)/Math.max(Math.abs(recAB),Math.abs(recBA),1e-12),L.reciprocityRelative,{sourceToReturnAB:recAB,sourceToReturnBA:recBA});
 const wanted=new Map(),vertices=new Set();for(const q of model.contacts)for(const f of q.facets){wanted.set([...f].sort((a,b)=>a-b).join(','),0);for(const v of f)vertices.add(v);}
 for(let t=0;t<model.regions.length;t++){const ids=Array.from(model.tetrahedra.subarray(t*4,t*4+4));if(ids.filter(v=>vertices.has(v)).length<3)continue;for(let k=0;k<4;k++){const f=ids.filter((_,i)=>i!==k).sort((a,b)=>a-b).join(',');if(wanted.has(f))wanted.set(f,wanted.get(f)+1);}}
 check('Every finite contact is an exterior conductor facet',Math.max(...[...wanted.values()].map(v=>Math.abs(v-1))),0,{facets:wanted.size});
 const file=path.join(docs,'field-stage1-reference-input.json'),output=path.join(docs,'field-stage1-reference.json');fs.writeFileSync(file,JSON.stringify(exportStage1FieldFixture(model,a)));
 const py=spawnSync(process.env.AXON_REFERENCE_PYTHON||'python3',[path.join(root,'scripts/axon-interface/field-stage1-reference.py'),file,output],{encoding:'utf8',maxBuffer:10e6});
 if(py.status!==0)check('Independent Python reference execution',1,0,{stderr:py.stderr,error:py.error?.message??null});else{reference=JSON.parse(fs.readFileSync(output));check('Independent Python maximum nodal error, uV',reference.maximumAbsoluteMicrovolt,L.independentPythonMaxErrorUv,{loadDifferenceUa:reference.maximumLoadDifferenceUa,runtime:reference.runtime});}
 for(const [name,change,tolerance]of [
  ['radial',{radialRefinement:2},L.radialRefinementRelativeRms],['angular',{wellAngularSegments:24,angularSegments:64},L.angularRefinementRelativeRms],['axial',{axialRefinement:2},L.axialRefinementRelativeRms],['local-domain-extension',{resolvedCellExtensionUm:40},L.localDomainExtensionRelativeRms]]){
  console.log(`Refinement study: ${name}`);const refined=solveStage1Channel(createStage1FieldModel({...settings,...change},fixture),fixture.channels[0]);
  check(`Field ${name} relative RMS change`,relative(ta,allTransfers(refined)),tolerance,{sampleCount:ta.length,nodes:refined.model.points.length,tetrahedra:refined.model.regions.length});
 }
 const highQuadrature=fixture.cells.flatMap(cell=>Array.from(sampleMembraneTransfer(a,fixture.morphology,cell,{angularSamples:24})));
 check('Membrane surface quadrature12 to24 relative RMS change',relative(ta,highQuadrature),L.membraneSurfaceQuadratureRelativeRms);
 const highAxial=fixture.cells.flatMap(cell=>Array.from(sampleMembraneTransfer(a,fixture.morphology,cell,{axialSamples:7})));
 check('Membrane axial quadrature5 to7 relative RMS change',relative(ta,highAxial),L.membraneAxialQuadratureRelativeRms);
 const drivenApertures=a.diagnostics.apertures.filter(q=>q.wellId===fixture.channels[0].wellId);
 check('Driven well bore flux is conserved across discrete cuts',Math.max(...drivenApertures.map(q=>Math.abs(q.currentSpreadUaPerUa))),L.currentClosureUa);
 check('Driven well bore voltage-to-flux resistance',Math.max(...drivenApertures.map(q=>Math.abs(q.measuredBoreResistanceMvPerUa-q.uniformAnnulusResistanceMvPerUa)/q.uniformAnnulusResistanceMvPerUa)),L.straightBoreResistanceRelative,{apertures:drivenApertures});
 const boreRadius=3.5,neuriteRadius=2.85,length=2.5,sigma=.3;
 const bore=cylinderBenchmark({radii:[neuriteRadius,(neuriteRadius+boreRadius)/2,boreRadius],axial:[0,length/2,length],angles:12,sigma,boundary:p=>p[2]===0||p[2]===length});
 const bs=solveStage1Load(bore,new Float64Array(bore.points.length),{boundaryMv:p=>p[2]/length}),bi=Math.abs(boundaryReaction(bore,bs,p=>p[2]===length)),br=1/bi,exactBore=1000*length/(sigma*Math.PI*(boreRadius**2-neuriteRadius**2));
 check('Finite annular bore analytic resistance',Math.abs(br-exactBore)/exactBore,L.straightBoreResistanceRelative,{numericalMvPerUa:br,analyticMvPerUa:exactBore,angularSegments:12,scope:'Isolated uniform annular bore; not the full well pair resistance.'});
 const radius=3.5,R=100*radius,H=100*radius,radial=[0,.25,.5,.75,.9,1,1.05,1.1,1.25,1.5,2,3,5,8,12,20,35,60,100].map(v=>v*radius),axial=[0,.01,.025,.05,.1,.25,.5,1,2,3,5,8,12,20,35,60,100].map(v=>v*radius);
 const access=cylinderBenchmark({radii:radial,axial,angles:32,sigma,boundary:p=>(p[2]===0&&Math.hypot(p[0],p[1])<=radius+1e-7)||Math.hypot(p[0],p[1])>=R-1e-7||p[2]===H});
 const ac=solveStage1Load(access,new Float64Array(access.points.length),{boundaryMv:p=>p[2]===0&&Math.hypot(p[0],p[1])<=radius+1e-7?1:0}),ai=Math.abs(boundaryReaction(access,ac,p=>p[2]===0&&Math.hypot(p[0],p[1])<=radius+1e-7)),ar=1/ai,exactAccess=1000/(4*sigma*radius);
 check('Isolated circular aperture access resistance',Math.abs(ar-exactAccess)/exactAccess,L.isolatedAccessResistanceRelative,{numericalMvPerUa:ar,analyticMvPerUa:exactAccess,outerRadiusOverAperture:100,scope:'One half-space disk access benchmark with finite distant ground; Hall1975 R=1/(4 sigma a).'});
 let strict=true;for(const invalid of [{constructor:1},{sigmaWellFluid:0},{wellAngularSegments:7},{electrodeRadiusUm:75},{localAxialStepUm:1e-12},{resolvedCellExtensionUm:1e-12}]){try{normalizeStage1FieldSettings(invalid);strict=false;}catch{}}
 check('Strict direct field input guards',strict?0:1,0);
 const absent=createStage1FieldModel(settings,{constructPresent:false,morphology:fixture.morphology});let rejected=false;try{solveStage1Channel(absent,fixture.channels[0]);}catch{rejected=true;}
 check('True no-device removes contacts and rejects implant drive',absent.contacts.length===0&&rejected?0:1,0);
}catch(error){check('Validation execution failure',1,0,{error:error.message,stack:error.stack});}
const sourceChangedDuringRun=sourceFiles.filter(f=>hash(f)!==sourceHashes[f]);if(sourceChangedDuringRun.length)check('Source stability',sourceChangedDuringRun.length,0,{files:sourceChangedDuringRun});
const report={schema:'explicit-well-field-validation/1',modelVersion:FIELD_STAGE1_VERSION,startedAt,completedAt:new Date().toISOString(),status:results.length&&results.every(r=>r.status==='pass')?'pass':'fail',results,baseDiagnostics,reference,sourceHashes,sourceChangedDuringRun,
 acceptance,retainedFailures:fs.existsSync(history)?fs.readFileSync(history,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)).filter(r=>r.status==='fail'):[],runtime:{node:process.version,cpu:os.cpus()[0]?.model,memoryBytes:os.totalmem()},
 limitations:['Four-cell continuous-discretization and same-mesh studies are distinct from the separate128-cell resource measurement.','Explicit local soma/stems/near-well axon geometry transitions to effective outer endoneurial tissue. Distal nodes are not individually meshed in3D.','Lumped membrane surface averages omit circumferential nonlinear membrane polarization.','Finite source-current patches omit metal interface impedance, electrode polarization and biological/device safety calibration.']};
fs.writeFileSync(path.join(docs,'field-stage1-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length}));if(report.status!=='pass')process.exitCode=1;
