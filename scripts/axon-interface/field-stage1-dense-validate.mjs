import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createStage1FieldModel,solveStage1Channel,sampleMembraneTransfer,locateStage1Point,FIELD_STAGE1_VERSION} from '../../src/lib/axon-interface/field-stage1.mjs';
import {stage1FieldFixture} from './field-stage1-fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),docs=path.join(root,'docs/axon-interface'),history=path.join(docs,'field-stage1-history.jsonl');
const acceptance=JSON.parse(fs.readFileSync(path.join(docs,'field-stage1-dense-acceptance.json'))),results=[],startedAt=new Date().toISOString();
const files=['src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/bipolar.mjs','src/lib/axon-interface/mrg.mjs','scripts/axon-interface/field-stage1-dense-validate.mjs','docs/axon-interface/field-stage1-dense-acceptance.json'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),sourceHashes=Object.fromEntries(files.map(f=>[f,hash(f)]));
function check(name,value,tolerance,details={}){const r={name,value,tolerance,status:Number.isFinite(value)&&value<=tolerance?'pass':'fail',...details};results.push(r);console.log(JSON.stringify(r));if(r.status==='fail')fs.appendFileSync(history,JSON.stringify({timestamp:new Date().toISOString(),event:'failed-dense-study',...r,sourceHashes})+'\n');}
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length),relative=(a,b)=>rms(a.map((v,i)=>v-b[i]))/rms(b);
const fixture=stage1FieldFixture(),dy=35*Math.sqrt(3)/2,xy=[[-26.25,-dy/2],[8.75,-dy/2],[-8.75,dy/2],[26.25,dy/2]];
for(let i=0;i<4;i++){fixture.cells[i].xUm=xy[i][0];fixture.cells[i].yUm=xy[i][1];fixture.wells[i].center=[...xy[i],0];}
let baseline=null,transferSummary=null;
try{
 const model=createStage1FieldModel(fixture.settings,fixture),base=solveStage1Channel(model,fixture.channels[0]);baseline=base.diagnostics;
 const transfers=fixture.cells.map(c=>Array.from(sampleMembraneTransfer(base,fixture.morphology,c)));
 transferSummary=transfers.map((v,i)=>({cellId:fixture.cells[i].id,rmsMvPerUa:rms(v),minimumMvPerUa:Math.min(...v),maximumMvPerUa:Math.max(...v)}));
 for(const [name,settings]of [['radial',{radialRefinement:2}],['angular',{wellAngularSegments:24,angularSegments:64}],['axial',{axialRefinement:2}],['local-domain-extension',{resolvedCellExtensionUm:40}]]){
  console.log(`Dense refinement ${name}`);const ref=solveStage1Channel(createStage1FieldModel({...fixture.settings,...settings},fixture),fixture.channels[0]);
  const byCell=fixture.cells.map((c,i)=>{const b=Array.from(sampleMembraneTransfer(ref,fixture.morphology,c));return {cellId:c.id,relativeRmsChange:relative(transfers[i],b),absoluteRmsChangeUv:1000*rms(transfers[i].map((v,j)=>v-b[j]))};});
  check(`Dense ${name} maximum per-cell field change`,Math.max(...byCell.map(v=>v.relativeRmsChange)),acceptance.maximumPerCellRelativeRmsChange,{byCell});
  const flux=base.diagnostics.apertures.map((a,i)=>({wellId:a.wellId,direction:a.direction,relativeChange:Math.abs(a.outwardCurrentUaPerUa-ref.diagnostics.apertures[i].outwardCurrentUaPerUa)/Math.max(Math.abs(ref.diagnostics.apertures[i].outwardCurrentUaPerUa),1e-12)}));
  check(`Dense ${name} maximum aperture-flux change`,Math.max(...flux.map(v=>v.relativeChange)),acceptance.maximumPerApertureFluxRelativeChange,{byAperture:flux});
 }
 const split={...fixture.morphology,compartments:fixture.morphology.compartments.flatMap(c=>{if(c.kind!=='SOMA')return [c];const s=c.samplingSurface;return Array.from({length:3},(_,k)=>({...c,samplingSurface:{...s,zMinUm:k===0?s.zMinUm:s.zMinUm+(s.zMaxUm-s.zMinUm)*k/3,zMaxUm:k===2?s.zMaxUm:s.zMinUm+(s.zMaxUm-s.zMinUm)*(k+1)/3}}));})};
 const splitModel=createStage1FieldModel(fixture.settings,{...fixture,morphology:split});
 let changes=model.points.length===splitModel.points.length?0:1;
 if(!changes)for(let i=0;i<model.points.length;i++)for(let k=0;k<3;k++)if(model.points[i][k]!==splitModel.points[i][k])changes++;
 check('Soma subdivision preserves the exact physical field mesh',changes,acceptance.geometricDomainChangedBySomaSegmentation);
 let illegal=0,apertureFailure=0;for(const w of fixture.wells){for(const p of [[w.center[0],w.center[1],0],[w.center[0]+w.innerRadiusUm+w.wallThicknessUm/2,w.center[1],0]]){try{locateStage1Point(model,p);illegal++;}catch{}}
  for(const direction of [-1,1])try{locateStage1Point(model,[w.center[0]+(2.85+w.apertureRadiusUm)/2,w.center[1],direction*(w.halfLengthUm-w.wallThicknessUm/2)]);}catch{apertureFailure++;}}
 check('Cell and insulating-wall interiors reject field samples',illegal,acceptance.wallOrCellInteriorPointAccepted);
 check('Explicit annular aperture fluid accepts field samples',apertureFailure,acceptance.apertureFluidPointRejected);
}catch(error){check('Dense validation execution failure',1,0,{error:error.message,stack:error.stack});}
const changed=files.filter(f=>hash(f)!==sourceHashes[f]);if(changed.length)check('Source stability',changed.length,0,{changed});
const report={schema:'explicit-well-dense-validation/1',modelVersion:FIELD_STAGE1_VERSION,startedAt,completedAt:new Date().toISOString(),status:results.length&&results.every(r=>r.status==='pass')?'pass':'fail',acceptance,fixture:{pitchUm:35,cells:fixture.cells,wells:fixture.wells},results,baseline,transferSummary,sourceHashes,sourceChangedDuringRun:changed,
 limitations:['Four adjacent wells test local dense coupling; no assertion of full128/256 continuous convergence is substituted for this fixture.','Every neighbor receives its own relative field-error gate; tiny neighbor signals are not hidden by pooling with the driven cell.']};
fs.writeFileSync(path.join(docs,'field-stage1-dense-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length}));if(report.status!=='pass')process.exitCode=1;
