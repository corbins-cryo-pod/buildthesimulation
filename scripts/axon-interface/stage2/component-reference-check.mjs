import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {beginStudy,fileHash} from './study-provenance.mjs';

const directory='labs/axon-stage2';
const provenance=beginStudy([
  'scripts/axon-interface/stage2/component-reference-check.mjs',
  `${directory}/scripts/reference-fixtures.mjs`,`${directory}/reference/verify.py`,
  `${directory}/reference/requirements.txt`,`${directory}/docs/acceptance.json`,
]);
for(const [command,args] of [[process.execPath,['scripts/reference-fixtures.mjs']],
  [process.env.MRG_PYTHON??'python3',['reference/verify.py']]]) {
  const result=spawnSync(command,args,{cwd:directory,stdio:'inherit'});
  if(result.status!==0)throw new Error(`Independent component execution failed: ${command}, exit ${result.status}`);
}
const file=`${directory}/reports/independent-reference.json`;
const report=JSON.parse(fs.readFileSync(file));
if(report.requiredPass!==65||report.requiredFail!==0)throw new Error('Independent component acceptance failed.');
Object.assign(report,provenance.finish(),{
  fixtureSha256:fileHash(`${directory}/reports/reference-fixtures.json`),
  evidenceCollectionMode:'Fresh JavaScript fixtures followed by independent Python integrations; source captured before and verified after execution.',
});
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
