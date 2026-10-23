/** Reproducible quantitative Stage 2 evidence; does not change solver settings. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runSimulation,prepareFields,MODEL_VERSION,OBSERVATION_VERSION} from '../src/lib/biohybrid/model.js';
import {runProtocol,PROTOCOL_AXES,PROTOCOL_VERSION} from '../src/lib/biohybrid/protocols.js';
import {runSimulation as runReleasedSimulation} from '../tests/fixtures/biohybrid-v1-model.mjs';
import {verifyReleasedFixture,compareReleasedResult} from '../tests/helpers/biohybrid-legacy-reference.mjs';

const output=process.argv[2]??new URL('../docs/biohybrid/stage2-validation.json',import.meta.url);
const acceptance={sourceIdentityMaximumUv:1e-10,savedStateFloatingPointAllowanceUv:1e-8,
  defaultRecruitedHosts:3,blockedRecruitedHosts:0,mixedLostHosts:2,mixedPersistentHosts:1,directPersistentHosts:1,
  responseBoundary:{stimAmplitudeUa:[-12,-18],coarseDtMs:.005,fineDtMs:.0025,expectedRecruitedHosts:[0,3],requireSamePerHostSpikeCounts:true},
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
// The chosen endpoints and count criterion are fixed above, before calculation.
// Reuse the production-step current sweep; change only dt for the finer solves.
// These two samples do not locate an exact threshold or validate every boundary.
const currentSweep=sweeps.find(result=>result.protocol.axis==='stimAmplitudeUa');
const boundaryFine=measure('current-boundary-finer-step',()=>runProtocol({dtMs:acceptance.responseBoundary.fineDtMs},
  {kind:'sweep',axis:'stimAmplitudeUa',values:acceptance.responseBoundary.stimAmplitudeUa,paired:false}));
const responseBoundaryRefinement={
  definition:'At the fixed signed-current endpoints -12 and -18 µA, retain zero and three recruited host somata, respectively, at dt 0.005 and 0.0025 ms. All other settings, including geometry, duration and saved-time grid, remain identical. Each host soma spike count must also agree.',
  timingInterpretation:'Event-index-matched fine-minus-coarse time differences are reported without a separate timing acceptance threshold. These two endpoint checks neither estimate an exact stimulation threshold nor establish uniform convergence throughout the interval.',
  cases:acceptance.responseBoundary.stimAmplitudeUa.map((value,index)=>{
    const coarse=currentSweep.cases.find(item=>item.value===value).baseline;
    const fine=boundaryFine.cases[index].baseline;
    if(coarse.status!=='ok'||fine.status!=='ok')return {stimAmplitudeUa:value,coarse,fine,passed:false,error:'A requested endpoint solve failed; no zero response was substituted.'};
    const settingsMatchExceptDt=JSON.stringify({...fine.settings,dtMs:coarse.settings.dtMs})===JSON.stringify(coarse.settings);
    const hosts=coarse.hosts.map(host=>{
      const refined=fine.hosts.find(candidate=>candidate.id===host.id);
      const sameSpikeCount=Boolean(refined&&host.somaSpikes===refined.somaSpikes);
      return {id:host.id,coarseSomaSpikes:host.somaSpikes,fineSomaSpikes:refined?.somaSpikes??null,
        coarseSpikeTimesMs:host.spikeTimesMs,fineSpikeTimesMs:refined?.spikeTimesMs??null,
        coarseFirstSpikeMs:host.firstSpikeMs,fineFirstSpikeMs:refined?.firstSpikeMs??null,
        matchedSpikeTimeDifferencesMs:sameSpikeCount?host.spikeTimesMs.map((time,event)=>refined.spikeTimesMs[event]-time):null,
        sameSpikeCount};
    });
    const expected=acceptance.responseBoundary.expectedRecruitedHosts[index];
    const passed=settingsMatchExceptDt&&coarse.settings.dtMs===acceptance.responseBoundary.coarseDtMs&&fine.settings.dtMs===acceptance.responseBoundary.fineDtMs
      &&coarse.metrics.recruitedHosts===expected&&fine.metrics.recruitedHosts===expected
      &&hosts.length===fine.hosts.length&&hosts.every(host=>host.sameSpikeCount);
    return {stimAmplitudeUa:value,expectedRecruitedHosts:expected,settingsMatchExceptDt,
      coarse:{settings:coarse.settings,diagnostics:coarse.diagnostics,recruitedHosts:coarse.metrics.recruitedHosts},
      fine:{settings:fine.settings,diagnostics:fine.diagnostics,recruitedHosts:fine.metrics.recruitedHosts},hosts,passed};
  })};
responseBoundaryRefinement.passed=responseBoundaryRefinement.cases.every(item=>item.passed);
console.log(`Current-boundary endpoint refinement: ${responseBoundaryRefinement.cases.map(item=>`${item.stimAmplitudeUa} µA ${item.passed?'passed':'FAILED'}`).join('; ')}`);
const errorRetention=measure('unsupported-placement',()=>runProtocol({pulseCount:1,durationMs:25,recordXOffsetUm:-100},
  {kind:'sweep',axis:'recordDistanceUm',values:[45,60,150],paired:false}));
const baseline=measure('source-reconstruction',()=>runSimulation());
const releasedModelPreservation={provenance:verifyReleasedFixture(),
  comparison:compareReleasedResult(baseline,measure('released-model-preservation',()=>runReleasedSimulation()))};
releasedModelPreservation.passed=releasedModelPreservation.provenance.passed&&releasedModelPreservation.comparison.passed;

// Retain the actual failed CI assumption, including its original literals.
// The replacement compares full results exactly within one runtime; it does
// not introduce a floating-point allowance or relax any physical criterion.
const runtimeEqualityFailure={id:'cross-runtime-bit-equality-assumption',historical:true,passed:false,
  source:'https://github.com/corbins-cryo-pod/buildthesimulation/actions/runs/39979282565/job/120501984662',
  expectedRuntime:'Node 24.19.0',actualRuntime:'Node 22.23.3',
  failedTests:['tests/biohybrid-sources.mjs: original three-contact peak-to-peak literal comparison','tests/biohybrid-workers.mjs: original recording-2 peak-to-peak literal comparison'],
  originalCriterion:'Exact bit equality to peak-to-peak literals produced by a different Node/V8 runtime.',
  expectedPeakToPeakUv:[9.588411887442467,9.745329941385737,9.134042111447762],
  actualPeakToPeakUv:[9.588411887442454,9.745329941385254,9.134042111447727],
  disposition:'Retained failed cross-runtime assumption. Replaced by exact full-result comparison to a frozen released solver in the same runtime, and exact worker-versus-direct transport comparison in the same runtime. No numerical error allowance, model change, or relaxation of native-reference and convergence criteria.'};
runtimeEqualityFailure.maximumAbsoluteDifferenceUv=Math.max(...runtimeEqualityFailure.expectedPeakToPeakUv.map((value,index)=>Math.abs(value-runtimeEqualityFailure.actualPeakToPeakUv[index])));

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
  {id:'exact-released-model-preservation-within-runtime',passed:releasedModelPreservation.passed},
  {id:'default-synaptic-dependence',passed:intact.baseline.metrics.recruitedHosts===3&&intact.synapsesOff.metrics.recruitedHosts===0&&intact.comparison.lostHosts===3},
  {id:'zero-stimulus-monitored-events',passed:defaultAudit.summary.allControlsQuiet===true},
  {id:'mixed-cell-specific-attribution',passed:mixed.comparison.lostHosts===2&&mixed.comparison.persistentHosts===1},
  {id:'direct-activation-positive-control',passed:direct.comparison.persistentHosts===1&&direct.comparison.lostHosts===0},
  {id:'source-partition-identity',passed:sourceIdentity.maximumResidualUv<=acceptance.sourceIdentityMaximumUv},
  {id:'analytical-storage-precision-consistency',passed:storagePrecision.analyticalBoundPassed},
  {id:'all-five-default-sweep-grids-complete',passed:sweeps.every(result=>result.summary.failedRuns===0&&result.cases.length===5)},
  {id:'sampled-current-boundary-finer-step-counts',passed:responseBoundaryRefinement.passed},
  {id:'unsupported-placement-error-retention',passed:errorRetention.cases.map(item=>item.status).join(',')==='ok,error,ok'&&errorRetention.cases[1].baseline.metrics===undefined&&errorRetention.summary.transitions.length===0},
];
const sourcePaths=['src/lib/biohybrid/model.js','src/lib/biohybrid/geometry.js','src/lib/biohybrid/protocols.js','src/lib/biohybrid/protocol-worker.js',
  'tests/biohybrid-sources.mjs','tests/biohybrid-protocols.mjs','tests/biohybrid-response-boundary.mjs','tests/biohybrid-workers.mjs',
  'tests/helpers/biohybrid-worker-harness.mjs','tests/helpers/biohybrid-legacy-reference.mjs',
  'tests/fixtures/biohybrid-v1-model.mjs','tests/fixtures/biohybrid-v1-provenance.json','scripts/validate-biohybrid-stage2.mjs'];
const sourceSha256=Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,createHash('sha256').update(await readFile(new URL(`../${path}`,import.meta.url))).digest('hex')])));
const report={schema:'biohybrid-stage2-validation/1',modelVersion:MODEL_VERSION,observationVersion:OBSERVATION_VERSION,protocolVersion:PROTOCOL_VERSION,
  generator:'node scripts/validate-biohybrid-stage2.mjs',runtime:process.version,sourceSha256,acceptance,checks,
  allAcceptancePassed:checks.every(check=>check.passed),retainedFailedDiagnostics:[...(storagePrecision.provisionalAbsoluteDiagnosticPassed?[]:[{
    id:'stored-float32-current-reconstruction-absolute-error',criterionUv:storagePrecision.provisionalAbsoluteCriterionUv,
    measuredHostMaximumErrorUv:storagePrecision.populations.host.maximumErrorUv,passed:false,
    disposition:'Retained failed supplemental diagnostic. Original Float64 source recordings remain authoritative; the separate analytical quantization bound is reported independently.'}]),runtimeEqualityFailure],
  defaultAudit,mixedAudit,directAudit,sweeps,responseBoundaryRefinement,errorRetention,sourceIdentity,storagePrecision,releasedModelPreservation,
  timing:{scope:'Node execution wall time for actual calculations, excluding UI rendering and network; not a device-independent performance guarantee.',measurements:timings}};
await mkdir(new URL('../docs/biohybrid/',import.meta.url),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({allAcceptancePassed:report.allAcceptancePassed,retainedFailedDiagnostics:report.retainedFailedDiagnostics,sourceIdentity,storagePrecision},null,2));
if(!report.allAcceptancePassed)process.exitCode=1;
