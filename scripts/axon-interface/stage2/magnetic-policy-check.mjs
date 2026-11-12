/** Verify the production magnetic export and its explicit interpretation limits. */
import fs from 'node:fs';import crypto from 'node:crypto';
import {runProtocol} from '../../../src/lib/axon-interface/stage2/protocol.mjs';
import {VERSION} from '../../../src/lib/axon-interface/stage2/settings.mjs';
const paths=['src/lib/axon-interface/stage2/settings.mjs','src/lib/axon-interface/stage2/protocol.mjs','src/lib/axon-interface/stage2/magnetic-coupling.mjs','src/lib/axon-interface/stage2/induction-precision-solve.mjs','scripts/axon-interface/stage2/magnetic-policy-check.mjs'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),before=hashes(),started=performance.now();
// The full protocol study can supply its actual complete export; otherwise
// execute the same public production fixture here.
const file=process.env.STAGE2_MAGNETIC_EXPORT;
const result=file?JSON.parse(fs.readFileSync(file)):await runProtocol({modality:'magnetic',axonCount:4,channelCount:1,amplitudes:[0,10,100]});
const round=JSON.parse(JSON.stringify(result));
const rows=[
 {name:'Current complete production fixture',pass:round.modelVersion===VERSION&&round.settings.modality==='magnetic'&&round.settings.axonCount===4&&round.settings.channelCount===1&&JSON.stringify(round.settings.amplitudes)==='[0,10,100]'},
 {name:'Finer production mesh and fixed original residual',pass:round.fieldReports.every(f=>f.fieldMethod.radialRefinement===3&&f.fieldMethod.axialRefinement===3&&f.diagnostics.relativeResidual<=1e-10&&f.diagnostics.recurrenceResidual<=2e-12)},
 {name:'All tested amplitudes resolve every cell without fabricated recruitment',pass:round.points.every(p=>p.matrices.assigned.length===1&&p.matrices.assigned[0].length===4&&p.matrices.assigned[0].every(x=>x===0))},
 {name:'Magnetic metrics remain conditional on the declared model',pass:round.points.every(p=>/Conditional/.test(p.metrics.headlineMeaning)&&/not an error certificate/.test(p.metrics.headlineMeaning))},
 {name:'Missing measurement loop cannot yield an artifact or total recording',pass:round.points.every(p=>p.recordings.every(r=>r.totalUv===null&&r.imposedFieldArtifactUv===null))},
 {name:'Original-host win condition remains zero',pass:round.originalHost.y===0&&round.originalHost.preserved===0},
 {name:'No scientific source change during audit',pass:JSON.stringify(before)===JSON.stringify(hashes())}
];
const report={schema:'axon-stage2-magnetic-policy-validation/2',modelVersion:round.modelVersion,complete:true,passed:rows.every(r=>r.pass),rows,sourceHashes:before,seconds:(performance.now()-started)/1000,settings:round.settings,evidenceCollectionMode:file?'Audit complete export produced by current protocol study.':'Execute production protocol.',scope:'Export and interpretation checks. Physical refinement is a separate required study.'};
fs.writeFileSync('docs/axon-interface/stage2/magnetic-policy-validation.json',JSON.stringify(report,null,2)+'\n');
if(process.env.STAGE2_RAW)fs.writeFileSync(process.env.STAGE2_RAW+'/magnetic-protocol.json',JSON.stringify(result));
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
