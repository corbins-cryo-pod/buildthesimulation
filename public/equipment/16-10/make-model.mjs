import {writeFileSync} from 'node:fs';
import {build,originalView} from './mesh-writer.mjs';
import {assets,anchors} from './geometry-source.mjs';
const m=build(assets,anchors),put=(p,x)=>writeFileSync(new URL(p,import.meta.url),x);
put('bransonic-1800.glb',m.raw);put('interactions.json',JSON.stringify({...m.metrics,motion:{lidParkTranslationM:[-.236,-.179,0],basketLiftM:.125}},null,2)+'\n');for(const v of ['front','work'])put('original-'+v+'.svg',originalView(m.faces,v));
