#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createFieldModel, solveChannel, solveFieldLoad, sampleTransfer, analyticHomogeneousTransfer, exportFieldFixture, FIELD_VERSION, FIELD_DEFAULTS } from '../../src/lib/axon-interface/field.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const docs = path.join(root, 'docs/axon-interface'); fs.mkdirSync(docs,{recursive:true});
const acceptance = JSON.parse(fs.readFileSync(path.join(docs,'field-acceptance.json'),'utf8'));
const gates=acceptance.studies, results=[];
const history=path.join(docs,'field-history.jsonl');
const started=new Date().toISOString();
const report=(name,value,tolerance,details={})=>{
 const entry={name,value,tolerance,status:value<=tolerance?'pass':'fail',...details};results.push(entry);
 if(entry.status==='fail')fs.appendFileSync(history,JSON.stringify({timestamp:new Date().toISOString(),...entry})+'\n');
 console.log(JSON.stringify(entry));return entry;
};
const rms = a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
const relRms=(a,b)=>rms(Array.from(a,(v,i)=>v-b[i]))/rms(Array.from(b));
const channel={source:[355,0,0],return:[355,0,600],electrodeRadiusUm:75};
console.log('Building fixed default FEM mesh');
const model=createFieldModel();const base=solveChannel(model,channel);
const samplePoints=[0,75,150,220].flatMap(r=>[-800,-400,-100,0,100,300,600,900].map(z=>[r,0,z]));
report('Default PCG true relative residual',base.diagnostics.relativeResidual,gates.linearSolveRelativeResidual);
report('Matched source/return current imbalance',Math.abs(base.diagnostics.sourceReturnImbalanceUa),gates.matchedSourceReturnRelativeImbalance);
report('Global current conservation',Math.abs(base.diagnostics.globalCurrentClosureUa),gates.globalCurrentConservationRelativeResidual);
const zero=solveFieldLoad(model,new Float64Array(model.points.length));
report('Zero current field is exactly zero',Math.max(...zero.potentialMvPerUa.map(Math.abs)),0);

const channelB={source:[0,355,0],return:[0,355,600],electrodeRadiusUm:75};
const b=solveChannel(model,channelB);
const sum=solveFieldLoad(model,Float64Array.from(base.loadUa,(v,i)=>v+b.loadUa[i]));
const scale=Math.max(...base.potentialMvPerUa.map(Math.abs),...b.potentialMvPerUa.map(Math.abs));
const superpositionError=Math.max(...sum.potentialMvPerUa.map((v,i)=>Math.abs(v-base.potentialMvPerUa[i]-b.potentialMvPerUa[i])))/scale;
report('Discrete field superposition',superpositionError,gates.superpositionRelativeMax);
const pair=(load,mv)=>load.reduce((s,v,i)=>s+v*mv[i],0);
const ab=pair(base.loadUa,b.potentialMvPerUa),ba=pair(b.loadUa,base.potentialMvPerUa);
report('Discrete reciprocity',Math.abs(ab-ba)/Math.max(Math.abs(ab),Math.abs(ba),1e-12),gates.reciprocityRelative,{sourceToReturnAB:ab,sourceToReturnBA:ba});

const fixture=path.join(docs,'field-reference-input.json');
fs.writeFileSync(fixture,JSON.stringify(exportFieldFixture(model,base,samplePoints)));
const pyOut=path.join(docs,'field-reference.json');
const py=spawnSync(process.env.AXON_REFERENCE_PYTHON||'python3',[path.join(root,'scripts/axon-interface/field-reference.py'),fixture,pyOut],{encoding:'utf8',maxBuffer:10e6});
if(py.status!==0){console.error(py.stderr);report('Independent Python assembly failed',1,0,{stderr:py.stderr});}
else{const ref=JSON.parse(fs.readFileSync(pyOut));report('Independent scipy maximum node potential error, microvolt',ref.maximumAbsoluteMicrovolt,gates.independentPythonPotentialMaxMicrovolt,{runtime:ref.runtime,durationSeconds:ref.durationSeconds});}

const homogeneousSettings={sigmaEndoTransverse:0.3,sigmaEndoLongitudinal:0.3,sigmaPerineurium:0.3,sigmaEpineurium:0.3,sigmaSurrounding:0.3};
const hm=createFieldModel(homogeneousSettings), hc={source:[0,0,0],return:[0,0,600],electrodeRadiusUm:75};
const hs=solveChannel(hm,hc);
const exact=p=>analyticHomogeneousTransfer(p,hc.source,[.3,.3,.3])-analyticHomogeneousTransfer(p,hc.return,[.3,.3,.3]);
const ha=solveFieldLoad(hm,hs.loadUa,{boundaryMv:exact});
const hp=[100,150,200,300,500].flatMap(r=>[-200,0,150,450,600,800].map(z=>[r,0,z]));
const predicted=sampleTransfer(ha,hp), truth=hp.map(exact);
report('Homogeneous analytic point-source benchmark outside finite sources',relRms(predicted,truth),gates.homogeneousFiniteDomainAnalyticRelativeRms,{sampleCount:hp.length,boundary:'Exact infinite-medium analytic Dirichlet data applied at finite boundary; no baseline fit',sourceRadiusUm:75,minimumSampleRadiusUm:100});

const inner=50; const layerEdges=[inner,250,265,400,1200],sigmas=[.083,1/1149,.083,.3];
function radialResistance(r){let R=0;for(let i=0;i<sigmas.length;i++){const a=Math.max(r,layerEdges[i]),end=layerEdges[i+1];if(a<end)R+=Math.log(end/a)/sigmas[i];}return R;}
const totalR=radialResistance(inner), radialExact=p=>Math.hypot(p[0],p[1])<=inner?1:radialResistance(Math.hypot(p[0],p[1]))/totalR;
const radialModel={...model,boundary:model.boundary.map((v,i)=>v||Math.hypot(model.points[i][0],model.points[i][1])<=inner+1e-9)};
const radial=solveFieldLoad(radialModel,new Float64Array(model.points.length),{boundaryMv:radialExact});
const rp=[60,100,180,245,252,260,270,300,500,800,1000].flatMap(r=>[0,Math.PI/32,Math.PI/16].map(t=>[r*Math.cos(t),r*Math.sin(t),0]));
report('Layered-cylinder radial analytic benchmark',relRms(sampleTransfer(radial,rp),rp.map(radialExact)),gates.layeredRadialAnalyticRelativeRms,{innerRadiusUm:inner,perineuriumThicknessUm:15,boundary:'Exact radial Dirichlet at inner radius, outer surface and axial ends',sampleCount:rp.length});

for(const [label,settings]of[['radial',{radialRefinement:2}],['angular',{angularSegments:64}],['axial',{axialRefinement:2}]]){
 console.log(`Field refinement: ${label}`);const refined=solveChannel(createFieldModel(settings),channel);
 report(`Field refinement ${label}`,relRms(sampleTransfer(base,samplePoints),sampleTransfer(refined,samplePoints)),gates.fieldRefinementRelativeRms,{sampleCount:samplePoints.length,nodes:refined.model.points.length,tetrahedra:refined.model.tetrahedra.length});
}
const sensitivity=[];
for(const multiplier of[0.1,1,10]){const f=multiplier===1?base:solveChannel(createFieldModel({sigmaPerineurium:FIELD_DEFAULTS.sigmaPerineurium*multiplier}),channel);const v=Array.from(sampleTransfer(f,[[0,0,0],[220,0,0],[0,0,600],[220,0,600]]));sensitivity.push({perineuriumConductivityMultiplier:multiplier,sigmaPerineurium:f.model.settings.sigmaPerineurium,potentialMvPerUa:v});}
const files=['src/lib/axon-interface/field.mjs','scripts/axon-interface/field-reference.py','scripts/axon-interface/field-validate.mjs','docs/axon-interface/field-acceptance.json'];
const output={schema:'axon-interface-field-validation/1',modelVersion:FIELD_VERSION,started,completed:new Date().toISOString(),status:results.every(r=>r.status==='pass')?'pass':'fail',acceptanceFile:'field-acceptance.json',results,retainedFailures:fs.existsSync(history)?fs.readFileSync(history,'utf8').trim().split('\n').filter(Boolean).map(v=>JSON.parse(v)):[],perineuriumSensitivity:sensitivity,defaultMesh:base.diagnostics,sourceHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),runtime:{node:process.version,platform:process.platform,arch:process.arch,cpus:os.cpus()[0]?.model,memoryBytes:os.totalmem()},limitations:['Same-mesh Python agreement verifies implementation, not biology or continuous-field accuracy.','Gaussian volumetric current sources do not model metal contact boundary conditions or well aperture shielding.','All results use a finite grounded cylindrical boundary; infinite-domain convergence is not established by the analytic-Dirichlet benchmark.','Perineurium is purely resistive; capacitive dispersion, inhomogeneous subject anatomy and electrode impedance are absent.','Only one synthetic straight fascicle is represented.']};
fs.writeFileSync(path.join(docs,'field-validation.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:output.status,passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length}));
if(output.status!=='pass')process.exitCode=1;
