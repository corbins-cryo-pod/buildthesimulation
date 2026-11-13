import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {simulateCable} from '../../../src/lib/axon-interface/stage2/membrane.mjs';
import {createPhotocurrent} from '../../../src/lib/axon-interface/stage2/photocurrent.mjs';
const m=createBipolarMorphology(),f=m.compartments.map(c=>c.kind==='SOMA'?1:0);
for(const g of [2,5,10,20])for(const I of [1,5,20,100]){const p=createPhotocurrent(m,{fluencePerMw:f,emittedMw:I,gmaxMsCm2:g});const r=simulateCable({morphology:m,durationMs:6,saveCurrents:false,traceStride:16,membraneMechanism:p.mechanism});console.log(JSON.stringify({g,I,max:r.diagnostics.maxMv,events:r.events.length,central:r.propagation.rightArm}));}
