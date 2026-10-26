/** Reproduce V4 mechanics and natural-culture transmission evidence. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MODEL_VERSION,createSimulation,stepSimulation,getMetrics,serializeSimulation,restoreSimulation} from '../src/lib/cell-growth/engine.js';
import {runTransmissionAssay,connectivityMetrics} from '../src/lib/cell-growth/connectivity.js';
import {distance} from '../src/lib/cell-growth/geometry.js';
const files=['engine','geometry','mechanics','behavior','exploration','morphogenesis','neurite-mechanics','connectivity'].map(n=>`src/lib/cell-growth/${n}.js`).concat('tests/cell-growth-connectivity.mjs','scripts/validate-cell-growth-connectivity.mjs');
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const sourceSha256=await hashes(),started=performance.now(),checks=[],rootArms=[];
for(const [label,neuriteCoupling,somaSettlement] of [['uncoupled',0,0],['coupled-without-settlement',1,0],['coupled-and-settling',1,1]]){
 const sim=createSimulation({cellCount:1,source:'immature',seed:101,motility:2,branching:0,growthPulses:0,noise:0,neuriteCoupling,somaSettlement});
 stepSimulation(sim,24);const c=sim.cells[0],m=c.membrane,roots=sim.segments.filter(s=>s.alive&&s.parentId<0);
 rootArms.push({label,config:sim.config,timeHours:sim.timeHours,rootLengthsUm:roots.map(s=>distance(s.start,s.end)),maximumRootLengthUm:Math.max(...roots.map(s=>distance(s.start,s.end))),displacementUm:c.mechanics.displacement,maximumStrain:c.mechanics.maxNeuriteStrain,materialLedgerResidualUm2:Math.abs(m.reserve*m.reserveCapacity-(m.reserveCapacity+m.suppliedArea+m.recycledArea-m.usedArea))});
 console.log(JSON.stringify(rootArms.at(-1)));
}
checks.push({id:'unrestrained-soma-exposes-root-streak',passed:rootArms[0].maximumRootLengthUm>20});
checks.push({id:'reciprocal-coupling-prevents-streak-without-settlement',passed:rootArms[1].maximumRootLengthUm<6&&rootArms[1].displacementUm>1});
checks.push({id:'settlement-is-gradual-not-a-freeze',passed:rootArms[2].maximumRootLengthUm<6&&rootArms[2].displacementUm>1&&rootArms[2].displacementUm<rootArms[1].displacementUm});
checks.push({id:'three-arm-material-ledger',passed:rootArms.every(r=>r.materialLedgerResidualUm2<1e-6)});
const culture=createSimulation({mode:'culture',source:'immature',cellCount:8,density:2.4,seed:714,motility:.25,adhesion:.7}),checkpoints=[];
for(let h=6;h<=48;h+=6){stepSimulation(culture,h-culture.timeHours);checkpoints.push({timeHours:culture.timeHours,...connectivityMetrics(culture),segments:culture.segments.length});console.log(JSON.stringify(checkpoints.at(-1)));}
const ready=culture.contacts.filter(c=>c.status==='functional'),sources=[...new Set(ready.map(c=>c.sourceCellId))];
const assays=sources.map(sourceCellId=>{const reference=runTransmissionAssay(culture,{sourceCellId}),blocked=runTransmissionAssay(culture,{sourceCellId,transmission:false});return {sourceCellId,deliveries:reference.deliveries.length,edges:reference.edges.length,targetResponses:reference.cells.filter(c=>c.cellId!==sourceCellId).map(c=>({cellId:c.cellId,depolarizationMV:c.peakDepolarizationMV,hyperpolarizationMV:c.peakHyperpolarizationMV,blockedDepolarizationMV:blocked.cells[c.cellId].peakDepolarizationMV,blockedHyperpolarizationMV:blocked.cells[c.cellId].peakHyperpolarizationMV}))};});
checks.push({id:'natural-culture-forms-transmission-ready-contacts',passed:ready.length>0});
checks.push({id:'grown-graph-transmits-and-block-control-is-silent',passed:assays.some(a=>a.deliveries>0&&a.targetResponses.some(c=>Math.max(c.depolarizationMV,-c.hyperpolarizationMV)>.05))&&assays.every(a=>a.targetResponses.every(c=>Math.abs(c.blockedDepolarizationMV)<1e-9&&Math.abs(c.blockedHyperpolarizationMV)<1e-9))});
const saved=serializeSimulation(culture);checks.push({id:'grown-contact-graph-roundtrips-exactly',passed:JSON.stringify(restoreSimulation(saved))===JSON.stringify(culture)});
if(JSON.stringify(await hashes())!==JSON.stringify(sourceSha256))throw new Error('Source changed during verification; rerun.');
const report={schema:'cell-growth-mechanics-connectivity/1',modelVersion:MODEL_VERSION,empiricalCalibration:false,runtime:process.version,wallSeconds:(performance.now()-started)/1000,sourceSha256,checks,allAcceptancePassed:checks.every(c=>c.passed),rootArms,culture:{config:culture.config,checkpoints,metrics:getMetrics(culture),assays},scope:'Seeded numerical tests of declared exploratory mechanics and synapse kinetics. Natural culture starts from random cell placement; no contact or electrical edge is inserted. Not empirical validation.'};
await writeFile('src/data/cell-growth-connectivity-validation.json',JSON.stringify(report,null,2)+'\n');
await writeFile('/tmp/cell-growth-v4-grown-culture.json',JSON.stringify(saved));
console.log(JSON.stringify({checks,passed:report.allAcceptancePassed,wallSeconds:report.wallSeconds}));
if(!report.allAcceptancePassed)process.exitCode=1;
