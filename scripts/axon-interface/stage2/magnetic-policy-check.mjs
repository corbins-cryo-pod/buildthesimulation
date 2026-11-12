/** Verify the complete exported result cannot promote an unconverged field. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {runProtocol} from '../../../src/lib/axon-interface/stage2/protocol.mjs';
const paths=['src/lib/axon-interface/stage2/settings.mjs','src/lib/axon-interface/stage2/protocol.mjs','src/lib/axon-interface/stage2/induction-solve.mjs','scripts/axon-interface/stage2/magnetic-policy-check.mjs'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before=hashes(),started=performance.now();
const result=await runProtocol({modality:'magnetic',axonCount:4,channelCount:1,amplitudes:[0,10,100]});
const round=JSON.parse(JSON.stringify(result));
const rows=[
 {name:'No qualified magnetic headline at any amplitude',pass:round.points.every(p=>p.metrics.headline===null&&/5% mesh-refinement/.test(p.metrics.headlineMeaning))},
 {name:'No selected magnetic operating amplitude',pass:round.operatingPoint.amplitude===null},
 {name:'No qualified magnetic threshold brackets',pass:round.sweep.brackets===null&&round.sweep.allPointsValid===false},
 {name:'Nominal matrices and transition diagnostics remain available',pass:round.points.every(p=>p.matrices.assigned.length===1&&p.matrices.assigned[0].length===4)&&Array.isArray(round.sweep.nominalBrackets)},
 {name:'No scientific source change during run',pass:JSON.stringify(before)===JSON.stringify(hashes())}
];
const report={schema:'axon-stage2-magnetic-policy-validation/1',modelVersion:round.modelVersion,complete:true,passed:rows.every(r=>r.pass),rows,sourceHashes:before,seconds:(performance.now()-started)/1000,settings:round.settings,scope:'Export and user-facing qualification guards, not a physical field qualification.'};
fs.writeFileSync('docs/axon-interface/stage2/magnetic-policy-validation.json',JSON.stringify(report,null,2)+'\n');
if(process.env.STAGE2_RAW)fs.writeFileSync(process.env.STAGE2_RAW+'/magnetic-protocol.json',JSON.stringify(result));
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
