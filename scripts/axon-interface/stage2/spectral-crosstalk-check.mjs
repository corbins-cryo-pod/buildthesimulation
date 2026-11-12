import fs from 'node:fs';import {runProtocol} from '../../../src/lib/axon-interface/stage2/protocol.mjs';
// Two physical sources, each at both wavelengths; this explicitly illuminates
// the red-expressing cell with blue as well as green light.
const settings={modality:'spectral',spectralFamilyCount:2,axonCount:4,channelCount:2,amplitudes:[0,.002],photons:32000,spectralExpression:20};
const r=await runProtocol(settings),p=r.points[1],rows=[];const add=(name,pass)=>rows.push({name,pass});
add('Four distinct physical-source/wavelength rows',r.geometry.channels.length===4&&new Set(r.geometry.channels.map(c=>c.id)).size===4);
add('Both wavelengths reuse each declared source location',r.geometry.channels.map(c=>c.sourceIndex).join(',')==='0,0,1,1'&&r.fieldReports.map(c=>c.sourceIndex).join(',')==='0,0,1,1');
add('Red-family target actually receives blue and green trials',p.pairs.filter(q=>q.sourceIndex===1&&q.cellIndex===1).length===2);
add('Blue crosstalk is present in the nonlinear output',p.matrices.assigned[2][1]===1&&p.matrices.assigned[3][1]===1);
add('Shared red output is not counted as two unique outputs',p.metrics.nominalHeadline.sharedOnlyCount>=1&&p.metrics.nominalHeadline.exclusiveCount<=1);
add('All 16 channel-cell pairs audited at both amplitudes',r.points.every(p=>p.pairs.length===16&&p.auditValid));
add('Opsin removal retains light but abolishes output',p.pairs.every(q=>!q.interventions.opsinBlocked.central.recruited&&JSON.stringify(q.interventions.assigned.photocurrent.occupancy)===JSON.stringify(q.interventions.opsinBlocked.photocurrent.occupancy)));
add('Original host census has no fabricated recovery',r.originalHost.y===0);
fs.writeFileSync('/tmp/spectral-crosstalk-full-result.json',JSON.stringify(r));const report={schema:'axon-stage2-spectral-crosstalk-validation/1',complete:true,passed:rows.every(x=>x.pass),rows,settings:r.settings,matrices:r.points.map(p=>({amplitude:p.amplitude,matrices:p.matrices,metrics:p.metrics})),elapsedSeconds:r.elapsedSeconds};fs.writeFileSync('docs/axon-interface/stage2/spectral-crosstalk-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,rows,assigned:p.matrices.assigned}));if(!report.passed)process.exitCode=1;
