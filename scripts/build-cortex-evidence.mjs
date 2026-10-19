import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=async p=>JSON.parse(await readFile(p));
const neural=await read('docs/cortex/finite-neural-rigor.json'),native=await read('docs/cortex/finite-native-comparison.json'),fields=await read('docs/cortex/gallery-independent-comparison.json');
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
for(const report of [neural,native,fields])for(const [path,expected]of Object.entries(report.sourceHashes??{})){
  if(await hash(path)!==expected)throw Error(`Study source changed: ${path}. Regenerate the affected study; do not relabel stale results.`);
}
const sourcePaths=['src/lib/cortex/finite-experiment.js','src/lib/cortex/finite-contact.js','src/lib/cortex/active-cable.js','src/lib/cortex/active-channels.js','src/lib/cortex/extra-channels.js','src/lib/cortex/active-morphology.js','src/lib/cortex/config.js','src/lib/cortex/model-library.js','scripts/cortex-finite-rigor.mjs','scripts/cortex-finite-focus.mjs','scripts/cortex-finite-native.py','scripts/cortex-gallery-independent.py'];
const payload={schema:'cortex-evidence/1',fieldSha256:neural.fieldSha256,model:neural.model,gates:native.gates,scope:neural.scope,
 cases:native.cases.map(({id,config,status,maxSomaErrorMv,maxMembraneErrorMv,crossingClassificationMatch,maxSharedCrossingTimeErrorMs})=>({id,config,status,maxSomaErrorMv,maxMembraneErrorMv,crossingClassificationMatch,maxSharedCrossingTimeErrorMs})),
 refinement:neural.comparisons.map(({a,b,thresholds,maxSomaWaveformDifferenceAtSeventyUaMv,localClassificationAtSeventyUaMatches})=>({a,b,thresholds,maxSomaWaveformDifferenceAtSeventyUaMv,localClassificationAtSeventyUaMatches})),
 gallery:{status:fields.status,shapes:Object.fromEntries(Object.entries(fields.shapes).map(([shape,r])=>[shape,{status:r.status,bemDifference:r.bemDifference,meshChange:r.meshChange,domainChange:r.domainChange}]))},sourceHashes:{},reportHashes:{}};
for(const path of sourcePaths)payload.sourceHashes[path]=await hash(path);
for(const path of ['docs/cortex/finite-neural-rigor.json','docs/cortex/finite-native-comparison.json','docs/cortex/gallery-independent-comparison.json'])payload.reportHashes[path]=await hash(path);
await writeFile('src/lib/cortex/models/finite-evidence.json',JSON.stringify(payload,null,2)+'\n');
