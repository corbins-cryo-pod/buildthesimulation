import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createStage1FieldModel,solveStage1Channel,sampleMembraneTransfer,FIELD_STAGE1_VERSION,STAGE1_FIELD_DEFAULTS} from '../../src/lib/axon-interface/field-stage1.mjs';
import {stage1FieldFixture} from './field-stage1-fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),docs=path.join(root,'docs/axon-interface'),history=path.join(docs,'field-stage1-history.jsonl');
const acceptance=JSON.parse(fs.readFileSync(path.join(docs,'field-stage1-domain-acceptance.json'))),results=[],startedAt=new Date().toISOString();
const files=['src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/bipolar.mjs','src/lib/axon-interface/mrg.mjs','scripts/axon-interface/field-stage1-domain-validate.mjs','docs/axon-interface/field-stage1-domain-acceptance.json'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),sourceHashes=Object.fromEntries(files.map(f=>[f,hash(f)]));
function check(name,value,tolerance,details={}){const r={name,value,tolerance,status:Number.isFinite(value)&&value<=tolerance?'pass':'fail',...details};results.push(r);console.log(JSON.stringify(r));if(r.status==='fail')fs.appendFileSync(history,JSON.stringify({timestamp:new Date().toISOString(),event:'failed-domain-study',...r,sourceHashes})+'\n');}
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
const fixture=stage1FieldFixture(),dy=35*Math.sqrt(3)/2,xy=[[-26.25,-dy/2],[8.75,-dy/2],[-8.75,dy/2],[26.25,dy/2]];
for(let i=0;i<4;i++){fixture.cells[i].xUm=xy[i][0];fixture.cells[i].yUm=xy[i][1];fixture.wells[i].center=[...xy[i],0];}
let baseDiagnostics=null,expandedDiagnostics=null;
try{
 const baseSettings={...fixture.settings,outerRadiusUm:STAGE1_FIELD_DEFAULTS.outerRadiusUm,halfLengthUm:STAGE1_FIELD_DEFAULTS.halfLengthUm};
 const expandedSettings={...baseSettings,outerRadiusUm:baseSettings.outerRadiusUm*acceptance.outerRadiusExpansion,halfLengthUm:baseSettings.halfLengthUm*acceptance.halfLengthExpansion};
 const base=solveStage1Channel(createStage1FieldModel(baseSettings,fixture),fixture.channels[0]);baseDiagnostics=base.diagnostics;
 const expanded=solveStage1Channel(createStage1FieldModel(expandedSettings,fixture),fixture.channels[0]);expandedDiagnostics=expanded.diagnostics;
 const byCell=fixture.cells.map(cell=>{const a=Array.from(sampleMembraneTransfer(base,fixture.morphology,cell)),b=Array.from(sampleMembraneTransfer(expanded,fixture.morphology,cell)),difference=a.map((v,i)=>v-b[i]);return {cellId:cell.id,relativeRms:rms(difference)/rms(b),absoluteRmsUv:1000*rms(difference),maximumAbsoluteUv:1000*Math.max(...difference.map(Math.abs))};});
 check('Grounded-domain expansion: maximum per-cell membrane transfer change',Math.max(...byCell.map(v=>v.relativeRms)),acceptance.maximumPerCellMembraneTransferRelativeRms,{byCell,baseDomain:{outerRadiusUm:baseSettings.outerRadiusUm,halfLengthUm:baseSettings.halfLengthUm},expandedDomain:{outerRadiusUm:expandedSettings.outerRadiusUm,halfLengthUm:expandedSettings.halfLengthUm}});
 const pair=(s,id)=>{const source=s.model.contacts.find(q=>q.id===`${id}:source`),ret=s.model.contacts.find(q=>q.id===`${id}:return`);return source.load.reduce((v,[i,w])=>v+w*s.potentialMvPerUa[i],0)-ret.load.reduce((v,[i,w])=>v+w*s.potentialMvPerUa[i],0);};
 const byWell=fixture.wells.map(w=>{const a=pair(base,w.id),b=pair(expanded,w.id);return {wellId:w.id,baseMvPerUa:a,expandedMvPerUa:b,relativeChange:Math.abs(a-b)/Math.max(Math.abs(b),1e-12)};});
 check('Grounded-domain expansion: maximum differential-contact coupling change',Math.max(...byWell.map(v=>v.relativeChange)),acceptance.maximumPerWellDifferentialContactCouplingRelative,{byWell});
}catch(error){check('Domain validation execution failure',1,0,{error:error.message,stack:error.stack});}
const changed=files.filter(f=>hash(f)!==sourceHashes[f]);if(changed.length)check('Source stability',changed.length,0,{changed});
const report={schema:'explicit-well-domain-validation/1',modelVersion:FIELD_STAGE1_VERSION,startedAt,completedAt:new Date().toISOString(),status:results.length&&results.every(r=>r.status==='pass')?'pass':'fail',acceptance,results,baseDiagnostics,expandedDiagnostics,sourceHashes,sourceChangedDuringRun:changed,
 limitations:['This measured expansion sensitivity concerns the declared dense fixture and actual grounded boundary. It does not prove infinite-domain convergence for all geometries or parameter settings.','The two domains share the local explicit wells and effective outer-tissue assumptions. No field alignment, baseline subtraction, or amplitude adjustment is performed.']};
fs.writeFileSync(path.join(docs,'field-stage1-domain-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length}));if(report.status!=='pass')process.exitCode=1;
