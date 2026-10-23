/** Reproducible quantitative Stage 2 evidence; does not change solver settings. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runSimulation,prepareFields,MODEL_VERSION,OBSERVATION_VERSION} from '../src/lib/biohybrid/model.js';
import {runProtocol,PROTOCOL_AXES,PROTOCOL_VERSION} from '../src/lib/biohybrid/protocols.js';

const output=process.argv[2]??new URL('../docs/biohybrid/stage2-validation.json',import.meta.url);
const acceptance={sourceIdentityMaximumUv:1e-10,savedStateFloatingPointAllowanceUv:1e-8,
  defaultRecruitedHosts:3,blockedRecruitedHosts:0,mixedLostHosts:2,mixedPersistentHosts:1,directPersistentHosts:1,
  provisionalStoredStateAbsoluteDiagnosticUv:.001};
const timings=[];
const measure=(id,calculate)=>{const start=performance.now(),result=calculate();timings.push({id,elapsedMs:performance.now()-start});return result;};
const defaultAudit=measure('default-audit',()=>runProtocol());
const mixedAudit=measure('mixed-activation-audit',()=>runProtocol({axonLengthUm:300,stimXUm:300,stimAmplitudeUa:-30,pulseCount:1,durationMs:25}));
const directAudit=measure('direct-activation-audit',()=>runProtocol({graftCount:1,hostCount:1,connectedHosts:1,axonLengthUm:300,stimXUm:300,
  stimDistanceUm:70,stimAmplitudeUa:-40,pulseCount:1,durationMs:25}));
const sweeps=[];
for(const axis of PROTOCOL_AXES){
  const result=measure(`sweep-${axis.id}`,()=>runProtocol({}, {kind:'sweep',axis:axis.id,values:axis.values,paired:false}));
  sweeps.push(result);
  console.log(`${axis.id}: ${result.cases.map(item=>`${item.value} => ${item.baseline.status==='ok'?item.baseline.metrics.recruitedHosts+' hosts':item.baseline.error}`).join('; ')}`);
}
const errorRetention=measure('unsupported-placement',()=>runProtocol({pulseCount:1,durationMs:25,recordXOffsetUm:-100},
  {kind:'sweep',axis:'recordDistanceUm',values:[45,60,150],paired:false}));
const baseline=measure('source-reconstruction',()=>runSimulation());

// Independent Kirchhoff reconstruction: I_mem = A_axial * (Vm + Ve).
// The cable solver instead records C*dVm/dt + ionic current + synaptic current.
// Exported Vm is Float32; waveforms are Float64. For each projection B=L*A,
// sum_j |B_j| halfULP(V_j) bounds the effect of stored-voltage quantization.
const fields=prepareFields(baseline.geometry,baseline.settings),nodes=baseline.geometry.nodes,n=nodes.length;
const halfUlp=value=>value===0?2**-150:Math.max(2**-150,2**(Math.floor(Math.log2(Math.abs(value)))-24));
const projection=fields.lead.map(lead=>Object.fromEntries(['graft','host'].map(role=>{
  const coefficients=new Float64Array(n);
  for(let i=0;i<n;i++){
    const parent=nodes[i].parent;if(parent<0)continue;
    const here=nodes[i].areaUm2>0&&nodes[i].role===role?lead.coefficients[i]:0;
    const there=nodes[parent].areaUm2>0&&nodes[parent].role===role?lead.coefficients[parent]:0;
    const contribution=nodes[i].edgeUs*(there-here);
    coefficients[i]+=contribution;coefficients[parent]-=contribution;
  }
  return [role,coefficients];
})));
const sourceIdentity={maximumResidualUv:0,checkedSamples:0};
const storagePrecision={method:'Independent axial-flux reconstruction from stored Float32 Vm; projection from total membrane-current sources is Float64.',
  provisionalAbsoluteCriterionUv:acceptance.provisionalStoredStateAbsoluteDiagnosticUv,
  analyticalBound:'For each contact and population, B = L_source A_axial. Bound = sum_j abs(B_j) * halfULP(Float32 Vm_j) + 1e-8 µV. Junction lead rows are zero.',
  checkedPopulationContactSamples:0,analyticalBoundPassed:true,maximumErrorToBoundRatio:0,
  populations:{graft:{maximumErrorUv:0,location:null},host:{maximumErrorUv:0,location:null}}};
for(let frame=0;frame<baseline.timeMs.length;frame++){
  const v=baseline.voltageMv.subarray(frame*n,(frame+1)*n),current=new Float64Array(n),stimulus=baseline.stimulusUa[frame];
  for(let i=0;i<n;i++){
    const parent=nodes[i].parent;if(parent<0)continue;
    const axial=nodes[i].edgeUs*((v[parent]+fields.stimulusMvPerUa[parent]*stimulus)-(v[i]+fields.stimulusMvPerUa[i]*stimulus));
    current[i]+=axial;current[parent]-=axial;
  }
  for(let contact=0;contact<baseline.recordings.length;contact++){
    const record=baseline.recordings[contact],lead=fields.lead[contact];
    const residual=Math.abs(record.neuralUv[frame]-record.graftUv[frame]-record.hostUv[frame]);
    sourceIdentity.maximumResidualUv=Math.max(sourceIdentity.maximumResidualUv,residual);sourceIdentity.checkedSamples++;
    for(const role of ['graft','host']){
      let reconstructed=0,bound=0;
      for(let i=0;i<n;i++){
        if(nodes[i].areaUm2>0&&nodes[i].role===role)reconstructed+=lead.coefficients[i]*current[i];
        bound+=Math.abs(projection[contact][role][i])*halfUlp(v[i]);
      }
      const error=Math.abs(reconstructed-record[`${role}Uv`][frame]),allowed=bound+acceptance.savedStateFloatingPointAllowanceUv;
      const population=storagePrecision.populations[role];
      if(error>population.maximumErrorUv){population.maximumErrorUv=error;population.location={contact:record.id,timeMs:baseline.timeMs[frame],analyticalBoundUv:allowed};}
      storagePrecision.maximumErrorToBoundRatio=Math.max(storagePrecision.maximumErrorToBoundRatio,error/allowed);
      if(error>allowed)storagePrecision.analyticalBoundPassed=false;
      storagePrecision.checkedPopulationContactSamples++;
    }
  }
}
for(const population of Object.values(storagePrecision.populations))population.provisionalAbsoluteDiagnosticPassed=population.maximumErrorUv<=storagePrecision.provisionalAbsoluteCriterionUv;
storagePrecision.provisionalAbsoluteDiagnosticPassed=Object.values(storagePrecision.populations).every(population=>population.provisionalAbsoluteDiagnosticPassed);
storagePrecision.interpretation='The failed fixed absolute reconstruction diagnostic is retained. The analytical storage-precision consistency bound is a separate check; it does not turn that failure into a pass. Quantitative source exports use the original Float64 waveforms.';
const intact=defaultAudit.cases[0],mixed=mixedAudit.cases[0],direct=directAudit.cases[0];
const checks=[
  {id:'default-synaptic-dependence',passed:intact.baseline.metrics.recruitedHosts===3&&intact.synapsesOff.metrics.recruitedHosts===0&&intact.comparison.lostHosts===3},
  {id:'zero-stimulus-monitored-events',passed:defaultAudit.summary.allControlsQuiet===true},
  {id:'mixed-cell-specific-attribution',passed:mixed.comparison.lostHosts===2&&mixed.comparison.persistentHosts===1},
  {id:'direct-activation-positive-control',passed:direct.comparison.persistentHosts===1&&direct.comparison.lostHosts===0},
  {id:'source-partition-identity',passed:sourceIdentity.maximumResidualUv<=acceptance.sourceIdentityMaximumUv},
  {id:'analytical-storage-precision-consistency',passed:storagePrecision.analyticalBoundPassed},
  {id:'all-five-default-sweep-grids-complete',passed:sweeps.every(result=>result.summary.failedRuns===0&&result.cases.length===5)},
  {id:'unsupported-placement-error-retention',passed:errorRetention.cases.map(item=>item.status).join(',')==='ok,error,ok'&&errorRetention.cases[1].baseline.metrics===undefined&&errorRetention.summary.transitions.length===0},
];
const sourcePaths=['src/lib/biohybrid/model.js','src/lib/biohybrid/geometry.js','src/lib/biohybrid/protocols.js','src/lib/biohybrid/protocol-worker.js',
  'tests/biohybrid-sources.mjs','tests/biohybrid-protocols.mjs','scripts/validate-biohybrid-stage2.mjs'];
const sourceSha256=Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,createHash('sha256').update(await readFile(new URL(`../${path}`,import.meta.url))).digest('hex')])));
const report={schema:'biohybrid-stage2-validation/1',modelVersion:MODEL_VERSION,observationVersion:OBSERVATION_VERSION,protocolVersion:PROTOCOL_VERSION,
  generator:'node scripts/validate-biohybrid-stage2.mjs',runtime:process.version,sourceSha256,acceptance,checks,
  allAcceptancePassed:checks.every(check=>check.passed),retainedFailedDiagnostics:storagePrecision.provisionalAbsoluteDiagnosticPassed?[]:[{
    id:'stored-float32-current-reconstruction-absolute-error',criterionUv:storagePrecision.provisionalAbsoluteCriterionUv,
    measuredHostMaximumErrorUv:storagePrecision.populations.host.maximumErrorUv,passed:false,
    disposition:'Retained failed supplemental diagnostic. Original Float64 source recordings remain authoritative; the separate analytical quantization bound is reported independently.'}],
  defaultAudit,mixedAudit,directAudit,sweeps,errorRetention,sourceIdentity,storagePrecision,
  timing:{scope:'Node execution wall time for actual calculations, excluding UI rendering and network; not a device-independent performance guarantee.',measurements:timings}};
await mkdir(new URL('../docs/biohybrid/',import.meta.url),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({allAcceptancePassed:report.allAcceptancePassed,retainedFailedDiagnostics:report.retainedFailedDiagnostics,sourceIdentity,storagePrecision},null,2));
if(!report.allAcceptancePassed)process.exitCode=1;
