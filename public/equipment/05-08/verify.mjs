// Regenerate example sensor frame and result, and evaluate independent test constants.
import fs from 'node:fs';import {deflateSync} from 'node:zlib';import {synthetic,measure,cap} from './optics.mjs';
const url=k=>new URL(k,import.meta.url),pl=JSON.parse(fs.readFileSync(url('verification-plan.json')));
const shots=(thetaDeg,imageRollDeg=0)=>synthetic({thetaDeg,imageRollDeg}).image;
const blank={width:100,height:100,pixels:new Uint8Array(10000).fill(225),baseline:{angleDeg:0,yAtCenterPx:75}};
const cut={...blank,pixels:blank.pixels.slice()};for(let y=30;y<68;y++)for(let x=0;x<30;x++)cut.pixels[y*100+x]=30;
const out=measure(shots(90)).result,b=shots(90),u=measure(b,{baseline:{...b.baseline,yAtCenterPx:b.baseline.yAtCenterPx-1}}).result;
const angles=(theta,r=0)=>Object.values(measure(shots(theta,r)).result.angles);
const model=fs.readFileSync(url('dsa100b.glb'));const gltf=JSON.parse(model.toString('utf8',20,20+model.readUInt32LE(12)));
const base=gltf.nodes.find(n=>n.name==='Base_pan_555x375');
const actual={SEMICIRCLE:angles(90),ACUTE:angles(55),OBTUSE:angles(125),ROLLED:angles(107,8),BASELINE:out.angles.leftDeg-u.angles.leftDeg,HEMISPHERE_VOLUME:cap(90,5).radiusMm,BLANK:measure(blank).code,CLIPPED:measure(cut).code};
const norm=v=>Array.isArray(v)?v:[v];
const cases=pl.cases.map(p=>({...p,actual:actual[p.id],pass:norm(actual[p.id]).every((q,i)=>typeof q==='number'?Math.abs(q-norm(p.expected)[i])<=p.tolerance:q===norm(p.expected)[i])}));
const dimensions=[base.scale[0]*1000,base.scale[2]*1000];cases.push({id:'FOOTPRINT',kind:'Dimensional',unit:'mm (W,D)',tolerance:.01,expected:[555,375],actual:dimensions,reason:'Manufacturer technical sheet, p. 4; only the base envelope is checked.',pass:dimensions.every((d,i)=>Math.abs(d-[555,375][i])<=.01)});
if(cases.some(r=>!r.pass))throw Error(JSON.stringify(cases.filter(r=>!r.pass)));
const write=(f,o)=>fs.writeFileSync(url(f),JSON.stringify(o,null,2)+'\n');
write('verification.json',{equipment:'05-08',scope:'Synthetic raster, mathematical checks and documented chassis dimension; no physical comparison data.',cases});
write('example-fit.json',out);
function chunk(type,bytes){const h=Buffer.alloc(8);h.writeUInt32BE(bytes.length);h.write(type,4);let s=0xffffffff;for(const v of Buffer.concat([h.subarray(4),bytes])){s^=v;for(let k=0;k<8;k++)s=(s>>>1)^(s&1?0xedb88320:0);}const tail=Buffer.alloc(4);tail.writeUInt32BE((~s)>>>0);return Buffer.concat([h,bytes,tail]);}
const {width:w,height:h,pixels}=b,head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;
const raw=Buffer.alloc(h*(w+1));for(let y=0;y<h;y++)raw.set(pixels.subarray(y*w,y*w+w),y*(w+1)+1);
fs.writeFileSync(url('example-silhouette.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
console.log('PASS',cases.map(r=>r.id).join(', '));
