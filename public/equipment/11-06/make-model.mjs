import {writeFile} from 'node:fs/promises';
import {assets,anchors,surface} from './geometry-source.mjs';
import {build,originalView} from './mesh-writer.mjs';
const m=build(assets,anchors),photo=build([...assets.filter(s=>s.t!=='tile'),{g:'breadboard',m:'steel',p:[0,surface-.002,0],d:[.9,.004,.75],t:'box'}],anchors),write=(n,d)=>writeFile(new URL(n,import.meta.url),d);
await Promise.all([write('sciencedesk-sdpm7590.glb',m.raw),write('interactions.json',JSON.stringify(m.metrics,null,2)+'\n'),...['front','work'].map(v=>write('original-'+v+'.svg',originalView(photo.faces,v)))]);
