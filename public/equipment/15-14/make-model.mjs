import {writeFile} from 'node:fs/promises';
import {assets,anchors} from './geometry-source.mjs';
import {build,originalView} from './mesh-writer.mjs';
const m=build(assets,anchors),write=(n,d)=>writeFile(new URL(n,import.meta.url),d);
await Promise.all([write('concept-cabinet-dry-gauge.glb',m.raw),write('interactions.json',JSON.stringify(m.metrics,null,2)+'\n'),...['front','work'].map(v=>write('original-'+v+'.svg',originalView(m.faces,v)))]);
