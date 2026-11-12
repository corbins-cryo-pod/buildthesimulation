/** Emit a full physical fixture in a child process, releasing its mesh before Python. */
import fs from 'node:fs';import crypto from 'node:crypto';import v8 from 'node:v8';
import {normalizeStage1Settings} from '../../../src/lib/axon-interface/stage1-settings.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {stage1FieldSettings} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel} from '../../../src/lib/axon-interface/field-stage1.mjs';
import {embeddedCoil,MAGNETIC_FIELD_METHOD} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {conservativeInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-conservative-load.mjs';
import {solveInductionReference} from '../../../src/lib/axon-interface/stage2/induction-precision-solve.mjs';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),s=normalizeStage1Settings({axonCount:4,channelCount:1}),g=createStage1Cohort(s),m=createBipolarMorphology(s),coil=embeddedCoil(g.wells[0]),method=MAGNETIC_FIELD_METHOD;
const model=createStage1FieldModel({...stage1FieldSettings(s,m),radialRefinement:method.radialRefinement,axialRefinement:method.axialRefinement},{...g,morphology:m,constructPresent:true});
let load,assemblyReuse=false;
if(process.argv.includes('--reuse-verified-assembly')){
 const cache=v8.deserialize(fs.readFileSync('/tmp/induction-conservative-assembled-4.v8'));
 for(const p of ['src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/stage2/induction-conservative-load.mjs'])if(cache.sourceHashes[p]!==hash(p))throw new Error('Stale physical assembly '+p);
 for(const k of ['rowPtr','col','values'])if(model[k].length!==cache.model[k].length||model[k].some((v,i)=>v!==cache.model[k][i]))throw new Error('Rebuilt physical matrix differs: '+k);
 load=cache.load;assemblyReuse=true;
}else load=conservativeInductionLoad(model,coil,{faceOrder:8,volumeRule:'tetra11'});
console.log('Production fixture physical assembly',method,assemblyReuse?'reused after exact matrix/source check':'fresh');
const solution=solveInductionReference(model,load.rhsMicroampPerSlew,{onProgress:p=>{if(p.iterations%1000===0)console.log(p);}});
const output='/tmp/axon-conservative-fixture-4.json';
fs.writeFileSync(output,JSON.stringify({points:model.points,tetrahedra:Array.from(model.tetrahedra),regions:Array.from(model.regions),conductivityByRegion:load.conductivityByRegion,boundary:model.boundary,segments:coil.segments,potentialMvPerAperS:Array.from(solution.potentialMvPerUa,(v,i)=>v+solution.potentialLowMvPerUa[i]),loadMicroampPerSlew:Array.from(load.rhsMicroampPerSlew)}));
const paths=['src/lib/axon-interface/field.mjs','src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/stage2/magnetic-coupling.mjs','src/lib/axon-interface/stage2/induction-conservative-load.mjs','src/lib/axon-interface/stage2/induction-precision-solve.mjs','scripts/axon-interface/stage2/induction-production-fixture.mjs'];
const metadata={productionMethod:method,fixtureSha256:hash(output),sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(p)])),assemblyReuse,solve:solution.diagnostics};fs.writeFileSync('/tmp/axon-conservative-fixture-4-provenance.json',JSON.stringify(metadata,null,2)+'\n');console.log('Completed production fixture',metadata.solve.relativeResidual);
