/** Reproducible V2 mechanical measurements, separate from biological validation. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createSimulation,stepSimulation,getMetrics,serializeSimulation,restoreSimulation,MODEL_VERSION} from '../src/lib/cell-growth/engine.js';
import {advanceCellMechanics,passiveMembrane,surfaceGeometry,MECHANICS} from '../src/lib/cell-growth/mechanics.js';
import {distance,sub,dot,cross,unit,length} from '../src/lib/cell-growth/geometry.js';
const sourceFiles=['src/lib/cell-growth/neurite-mechanics.js','src/lib/cell-growth/connectivity.js','tests/cell-growth-connectivity.mjs','src/lib/cell-growth/morphogenesis.js','src/lib/cell-growth/shaft-mechanics.js','src/lib/cell-growth/microscopy-render.js','src/lib/cell-growth/presentation.js','tests/cell-growth-morphogenesis.mjs','src/lib/cell-growth/engine.js', 'src/lib/cell-growth/behavior.js', 'tests/cell-growth-behavior.mjs','src/lib/cell-growth/mechanics.js', 'src/lib/cell-growth/exploration.js','src/lib/cell-growth/geometry.js','src/lib/cell-growth/render-geometry.js','tests/cell-growth-mechanics.mjs','scripts/validate-cell-growth-mechanics.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const startHashes=await hashes(),checks=[],measurements=[];
const run=(id,config,hours)=>{const s=createSimulation({source:'stem',cellCount:1,guidance:0,noise:0,branching:0,...config});s.world.obstacles=[];if(s.cells.length===1)s.cells[0].mechanics.polarity=[1,0,0];const start=performance.now();stepSimulation(s,hours);const row={id,config:s.config,hours:s.timeHours,wallMs:performance.now()-start,displacementUm:s.cells.map(c=>c.mechanics.displacement),speedUmPerHour:s.cells.map(c=>length(c.mechanics.velocity)),areaStrain:s.cells.map(c=>c.membrane.areaStrain),volumeStrain:s.cells.map(c=>c.membrane.volumeStrain),minimumTriangleQuality:Math.min(...s.cells.map(c=>c.membrane.minQuality)),rejectedSteps:s.cells.reduce((a,c)=>a+c.mechanics.rejectedSteps,0)};measurements.push(row);return {s,row};};
const fixture=createSimulation({cellCount:1}),m=fixture.cells[0].membrane;m.vertices[27][0]+=.3;let gradientErrorPn=0;
const f=passiveMembrane(m,fixture.config).forces;
for(let i=0;i<162;i+=13)for(let k=0;k<3;k++){const x=m.vertices[i][k],h=1e-5;m.vertices[i][k]=x+h;const plus=passiveMembrane(m,fixture.config).energy;m.vertices[i][k]=x-h;const minus=passiveMembrane(m,fixture.config).energy;m.vertices[i][k]=x;gradientErrorPn=Math.max(gradientErrorPn,Math.abs(f[i][k]+(plus-minus)/(2*h)));}
checks.push({id:'analytic-energy-gradient',passed:gradientErrorPn<2e-5,value:gradientErrorPn,limit:2e-5,unit:'pN'});
const reference=run('polarized-cell',{},8),passive=run('no-active-cortex',{actin:0,motility:0,microtubules:0,adhesion:0},8),unbound=run('no-substrate-adhesion',{adhesion:0},8);
checks.push({id:'polarized-locomotion',passed:reference.row.displacementUm[0]>5,value:reference.row.displacementUm[0],unit:'µm over 8 h'});
checks.push({id:'zero-active-no-propulsion',passed:passive.row.displacementUm[0]<.001,value:passive.row.displacementUm[0],unit:'µm'});
checks.push({id:'zero-adhesion-no-motor-traction',passed:length(unbound.s.cells[0].mechanics.traction)===0&&unbound.row.displacementUm[0]<.1,value:unbound.row.displacementUm[0],unit:'µm'});
checks.push({id:'default-volume-and-area-constraints',passed:Math.abs(reference.row.volumeStrain[0])<.025&&Math.abs(reference.row.areaStrain[0])<.05,value:{volume:reference.row.volumeStrain[0],area:reference.row.areaStrain[0]}});
const refined=[.05,.025,.0125].map(dtHours=>run(`locomotion-dt-${dtHours}`,{dtHours},4));
const maximumCentroidDifferenceUm=Math.max(...refined.slice(0,2).map(r=>distance(r.s.cells[0].position,refined[2].s.cells[0].position)));
checks.push({id:'outer-timestep-subcycling-invariance',passed:maximumCentroidDifferenceUm<.01,value:maximumCentroidDifferenceUm,limit:.01,unit:'µm'});
let nuclearPenetrationUm=0;for(const c of reference.s.cells){const v=c.membrane.vertices;for(const [a,b,d]of c.membrane.triangles){const n=unit(cross(sub(v[b],v[a]),sub(v[d],v[a])));nuclearPenetrationUm=Math.max(nuclearPenetrationUm,dot(sub(c.nucleus.position,v[a]),n)+c.nucleus.radius);}}
checks.push({id:'nucleus-contained',passed:nuclearPenetrationUm<.002,value:nuclearPenetrationUm,unit:'µm'});
const saved=restoreSimulation(JSON.stringify(serializeSimulation(reference.s)));stepSimulation(saved,1);stepSimulation(reference.s,1);checks.push({id:'mechanical-save-resume',passed:JSON.stringify(saved)===JSON.stringify(reference.s)});
for(const cellCount of [1,6,12,24])run(`scaling-${cellCount}`,{cellCount,density:1.8},2);
for(const c of [{motility:3,actin:3,cortexStiffness:.2,bending:0},{motility:3,actin:2,cortexStiffness:3,bending:3},{motility:0,tension:4,adhesion:1}]){
 const {row,s}=run('stress-case',c,4);checks.push({id:`stress-mesh-${measurements.length}`,passed:row.minimumTriangleQuality>=.1&&s.cells.every(c=>surfaceGeometry(c.membrane.vertices).volume>0),value:{quality:row.minimumTriangleQuality,rejectedSteps:row.rejectedSteps,areaStrain:row.areaStrain,volumeStrain:row.volumeStrain}});
}
const mechanicalRefinement=[.0125,.00625,.003125].map(maxStepHours=>{
 const s=createSimulation({source:'stem',cellCount:1,guidance:0,noise:0,branching:0});s.world.obstacles=[];s.cells[0].mechanics.polarity=[1,0,0];
 for(let k=0;k<80;k++){advanceCellMechanics(s,s.cells[0],.05,[],[],maxStepHours);s.timeHours=Number(((k+1)*.05).toFixed(12));}
 return {maxStepHours,cell:s.cells[0]};
});
const fine=mechanicalRefinement[2].cell;
const mechanicalStepResults=mechanicalRefinement.map(({maxStepHours,cell})=>({maxStepHours,centroidDifferenceUm:distance(cell.position,fine.position),vertexRmsDifferenceUm:Math.sqrt(cell.membrane.vertices.reduce((sum,v,i)=>sum+distance(v,fine.membrane.vertices[i])**2,0)/162)}));
checks.push({id:'actual-mechanics-step-refinement',passed:mechanicalStepResults[0].centroidDifferenceUm<.05&&mechanicalStepResults[0].vertexRmsDifferenceUm<.05&&mechanicalStepResults[1].centroidDifferenceUm<mechanicalStepResults[0].centroidDifferenceUm&&mechanicalStepResults[1].vertexRmsDifferenceUm<mechanicalStepResults[0].vertexRmsDifferenceUm,value:mechanicalStepResults});
const endHashes=await hashes();checks.push({id:'source-unchanged',passed:JSON.stringify(startHashes)===JSON.stringify(endHashes)});
const report={schema:'cell-growth-mechanics-verification/2',modelVersion:MODEL_VERSION,runtime:process.version,empiricalCalibration:false,sourceSha256:endHashes,checks,allAcceptancePassed:checks.every(c=>c.passed),mechanicsConstants:MECHANICS,mechanicalStepResults,measurements,
 scope:'Numerical controls of a reduced membrane–cortex model. The fixed 162-node topology is not a spatial convergence study; no population-specific biological calibration is claimed.',
 comparisonContext:{growthConeFlow:{modelUnloadedUmPerMinute:1.1,NG108_15MeasuredUmPerMinute:1.46,NG108_15SEM:.6,source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3158236/',interpretation:'Unlike preparations and a model unloaded parameter versus measured flow; scale context only, not a validation score.'}},
 limitations:['Fixed triangulation and umbrella curvature regularizer, not molecular membrane or continuum mesh convergence.','Conservative enclosing soma contacts may prevent passage through gaps that a deforming real cell could traverse.','Spherical constrained nucleus; no nuclear envelope/chromatin model.','Phenomenological motility, polarity and differentiation kinetics; 3D coupling is not calibrated organoid morphogenesis.','Young shaft joints relax locally; older distal neurites remain anchored. No complete elastic beam network.','Whole-cell lipid conservation is not claimed; the extension reserve ledger includes moving root length.','Microscopy-inspired rendering, not optical image-formation physics.']};
await writeFile('src/data/cell-growth-mechanics-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks,allAcceptancePassed:report.allAcceptancePassed,measurements},null,2));if(!report.allAcceptancePassed)process.exitCode=1;
