import fs from 'node:fs';import crypto from 'node:crypto';
import {runProtocol} from '../../../src/lib/axon-interface/stage2/protocol.mjs';
import {exportCsv} from '../../../src/lib/axon-interface/stage2/exports.mjs';
const rows=[],runs=[],dir='docs/axon-interface/stage2',start=performance.now();
for(const spectralFamilyCount of [2,3,4]){
 const settings={modality:'spectral',spectralFamilyCount,axonCount:4,channelCount:1,amplitudes:[0,.002],photons:32000,spectralExpression:20};
 const result=await runProtocol(settings),points=result.points;
 const add=(name,pass,detail={})=>rows.push({name:spectralFamilyCount+' families: '+name,pass,...detail});
 add('Full physical-source × wavelength × cell census',points.every(p=>p.pairs.length===4*spectralFamilyCount&&Object.values(p.matrices).every(a=>a.length===spectralFamilyCount&&a.every(r=>r.length===4))));
 add('Exact cell-to-opsin identities',result.spectral.cells.every((c,i)=>c.modelId===result.spectral.families[i%spectralFamilyCount].id));
 add('All no-drive controls silent',points[0].pairs.every(p=>Object.values(p.interventions).every(r=>r.events.length===0)));
 add('Matched initial states',result.auditComplete&&result.auditValid);
 add('Opsin removal abolishes every output',points.every(p=>p.matrices.opsinBlocked.every(r=>r.every(x=>x===0))));
 add('Original host identity remains absent',result.originalHost.y===0&&result.originalHost.preserved===0&&result.originalHost.uniquelyAddressed===0);
 add('No assumed spectral multiplier',result.spectral.channelGainAssumed===false&&points.every(p=>!p.metrics.headline||p.metrics.headline.exclusiveCount<=4));
 add('Every pair has all five parameter probes',points.every(p=>p.pairs.every(q=>q.parameterSensitivity&&['alternateNormalization','halfRate','doubleRate','halfExpression','doubleExpression'].every(k=>q.parameterSensitivity[k]?.central))));
 add('Photon sampling bounds and energy retained per wavelength',result.fieldReports.every(r=>r.energyResidual<1e-10&&r.bands.every(b=>b.upper>0&&b.lower>=0)));
 add('Wavelength-dependent scattering reaches the transport solver',result.fieldReports[0].settings.muScatterPerMm!==result.fieldReports.at(-1).settings.muScatterPerMm);
 add('All matrix rows exported',exportCsv(result,'matrix').trim().split('\n').length===1+2*4*spectralFamilyCount);
 const summary={settings:result.settings,matrices:points.map(p=>({amplitude:p.amplitude,matrices:p.matrices,metrics:p.metrics,exposureProbeAgreement:p.exposureProbeAgreement,parameterProbeAgreement:p.parameterProbeAgreement})),zeroInput:result.zeroInput,work:result.work,elapsedSeconds:result.elapsedSeconds};runs.push(summary);
 fs.writeFileSync('/tmp/spectral-'+spectralFamilyCount+'-full-result.json',JSON.stringify(result));console.log('Completed spectral families',spectralFamilyCount,result.elapsedSeconds);
 if(spectralFamilyCount===2){const again=await runProtocol(settings);delete again.elapsedSeconds;const first={...result};delete first.elapsedSeconds;add('Same-runtime exact full replay',JSON.stringify(first)===JSON.stringify(again));}
}
const paths=['src/lib/axon-interface/stage2/protocol.mjs','src/lib/axon-interface/stage2/spectral-protocol.mjs','src/lib/axon-interface/stage2/settings.mjs','src/lib/axon-interface/stage2/spectral-opsin.mjs'];const r={schema:'axon-stage2-spectral-protocol-validation/1',complete:true,passed:rows.every(r=>r.pass),rows,runs,runtimeSeconds:(performance.now()-start)/1000,sourceHashes:Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))};fs.writeFileSync(dir+'/spectral-protocol-validation.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({passed:r.passed,checks:rows.length,failed:rows.filter(r=>!r.pass)}));if(!r.passed)process.exitCode=1;
