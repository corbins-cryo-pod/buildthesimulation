import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import os from 'node:os';import {fileURLToPath} from 'node:url';
import {createStage1FieldModel,solveStage1Channel,sampleMembraneTransfer,FIELD_STAGE1_VERSION,STAGE1_FIELD_LIMITS} from '../../src/lib/axon-interface/field-stage1.mjs';
import {stage1FieldFixture} from './field-stage1-fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),docs=path.join(root,'docs/axon-interface'),count=Number(process.argv[2]??128),radius=Number(process.argv[3]??250);
const paths=['src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/bipolar.mjs','src/lib/axon-interface/mrg.mjs','src/lib/axon-interface/vendor/cdt2d.mjs','scripts/axon-interface/field-stage1-fixtures.mjs','scripts/axon-interface/field-stage1-resources.mjs'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),hashes=Object.fromEntries(paths.map(f=>[f,hash(f)])),started=performance.now();
const report={schema:'explicit-well-field-resource/1',modelVersion:FIELD_STAGE1_VERSION,startedAt:new Date().toISOString(),requestedCells:count,requestedWells:count,requestedChannels:1,sourceHashes:hashes,hardLimits:STAGE1_FIELD_LIMITS,runtime:{node:process.version,platform:process.platform,cpu:os.cpus()[0]?.model,memoryBytes:os.totalmem()},status:'incomplete'};
try{
 const fixture=stage1FieldFixture(count,{fascicleRadiusUm:radius});console.log(`Building all ${count} explicit wells and cells`);
 const model=createStage1FieldModel(fixture.settings,fixture);report.mesh=model.diagnostics;report.afterBuildMemory=process.memoryUsage();console.log(JSON.stringify({stage:'built',...model.diagnostics}));
 const solution=solveStage1Channel(model,fixture.channels[0],{onProgress:p=>{if(p.iterations%1000===0)console.log(JSON.stringify({stage:'solve',...p}));}});report.solve=solution.diagnostics;console.log(JSON.stringify({stage:'solved',iterations:solution.diagnostics.iterations,seconds:solution.diagnostics.solveSeconds}));
 const sampleStart=performance.now();let finite=true,min=Infinity,max=-Infinity,values=0;
 for(const cell of fixture.cells){const transfer=sampleMembraneTransfer(solution,fixture.morphology,cell);for(const v of transfer){finite&&=Number.isFinite(v);min=Math.min(min,v);max=Math.max(max,v);values++;}}
 report.sampling={cells:fixture.cells.length,compartmentsPerCell:fixture.morphology.compartments.length,transferValues:values,finite,minMvPerUa:min,maxMvPerUa:max,seconds:(performance.now()-sampleStart)/1000};
 report.sourceChangedDuringRun=paths.filter(f=>hash(f)!==hashes[f]);report.peakResidentBytes=process.resourceUsage().maxRSS*1024;report.afterSolveMemory=process.memoryUsage();
 report.status=finite&&model.diagnostics.explicitCells===count&&model.diagnostics.explicitWells===count&&report.sourceChangedDuringRun.length===0?'pass':'fail';
}catch(error){report.status='fail';report.error=error.message;report.stack=error.stack;report.peakResidentBytes=process.resourceUsage().maxRSS*1024;}
report.completedAt=new Date().toISOString();report.durationSeconds=(performance.now()-started)/1000;
report.limitations=['One explicitly solved channel; no extrapolation to unexecuted channels or browser hardware.','This is a resource and finite-output study; numerical convergence and independent-reference gates are separate.','All stated wells and cells are included; distal tissue remains an explicit effective-conductivity approximation.'];
fs.writeFileSync(path.join(docs,`field-stage1-resources-${count}.json`),JSON.stringify(report,null,2)+'\n');fs.appendFileSync(path.join(docs,'field-stage1-history.jsonl'),JSON.stringify({event:'resource-study',...report})+'\n');console.log(JSON.stringify(report,null,2));if(report.status!=='pass')process.exitCode=1;
