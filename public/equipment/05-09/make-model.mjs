import {writeFileSync} from 'node:fs';
import {anchors,assets} from './geometry-source.mjs';import {build,originalView} from './mesh-writer.mjs';
const m=build(assets,anchors),put=(f,b)=>writeFileSync(new URL(f,import.meta.url),b);put('versaprobe-ii.glb',m.raw);put('interactions.json',JSON.stringify(m.metrics,null,2)+'\n');for(const v of ['front','side','rear','work'])put(v+'.svg',originalView(m.faces,v));
