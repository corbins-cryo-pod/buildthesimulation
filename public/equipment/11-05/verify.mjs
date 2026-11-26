import {readFileSync,writeFileSync} from 'node:fs';
import {convert,createStation,exportReading,targets} from './units.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('pm100d-console.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,span=name=>{const q=n.find(x=>x.name===name),a=g.accessors[g.meshes[q.mesh].primitives[0].attributes.POSITION];return a.max.map((x,i)=>(x-a.min[i])*q.scale[i]);};
const checks=[];function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
const [w,h,d]=span('Boot_outer_authoritative'),[lcdw,lcdh]=span('LCD_81_4_by_61_0_exact');
ck('Boot long side',.183,w,'m',1e-7);ck('Boot short side',.109,h,'m',1e-7);ck('Boot thickness',.040,d,'m',1e-7);
ck('LCD width',.0814,lcdw,'m',1e-7);ck('LCD height',.061,lcdh,'m',1e-7);
// The nominal boot is a real rim, not a solid block concealing the recessed display.
const boot=n.find(x=>x.name==='Boot_outer_authoritative'), primitive=g.meshes[boot.mesh].primitives[0];
const positions=g.accessors[primitive.attributes.POSITION], indices=g.accessors[primitive.indices], bin=28+b.readUInt32LE(12);
const at=i=>{const o=bin+g.bufferViews[positions.bufferView].byteOffset+i*12;return [b.readFloatLE(o),b.readFloatLE(o+4)]};
const ix=i=>b.readUInt16LE(bin+g.bufferViews[indices.bufferView].byteOffset+i*2);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const sight=[-20,-.5];let blocksCenter=false;
for(let i=0;i<indices.count;i+=3){const z=[at(ix(i)),at(ix(i+1)),at(ix(i+2))];if(Math.abs(cross(...z))<1e-8)continue;const s=z.map((p,i)=>cross(p,z[(i+1)%3],sight));if(s.every(x=>x>0)||s.every(x=>x<0))blocksCenter=true;}
ck('Boot ring leaves clear sightline to display center',false,blocksCenter);
ck('1 mW as 1000 µW',1000,convert(.001,'µW').value,'µW');ck('1 mW logarithmic reference',0,convert(.001,'dBm').value,'dBm',1e-9);
ck('Tenfold reduction from reference',-10,convert(.0001,'dBm').value,'dBm',1e-9);
ck('Quarter reference',-6.02059991328,convert(.00025,'dBm').value,'dBm',1e-9);
ck('Zero linear',0,convert(0,'mW').value,'mW');
ck('Zero dBm is undefined as finite quantity',null,convert(0,'dBm').value);
ck('Detached ray targets present',2,m.hitTargets.filter(x=>n.some(y=>y.name===x.node)&&targets[x.node]===x.action).length);
const s=createStation(),a=s.read();const changed=s.hit('Cycle_display_units');ck('Changing unit cannot alter original W',a.reading.inputW,changed.reading.inputW,'W');
const error=s.dispatch('value','fake');ck('Invalid selection preserves previous ID',true,Boolean(error.error)&&error.id===a.id);
const wr=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
wr('verification.json',{schema:'bts.pm100d.passive-arithmetic.verification.v1',scope:'Boot and LCD dimensions, mathematical conversions only; no sensor or metrology verified',checks});wr('example-reading.json',exportReading(s.dispatch('unit','dBm')));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
