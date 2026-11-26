import {readFileSync,writeFileSync} from 'node:fs';
import {createStation,measureRows,exportRuler,targets,graphic} from './ruler.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('vevo3100-console.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,plan=n.find(x=>x.name==='Documented_footprint'),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
for(const id of plan.children){const q=n[id],a=g.accessors[g.meshes[q.mesh].primitives[0].attributes.POSITION];let s=q.scale;if(q.rotation)s=[s[1],s[0],s[2]];for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],q.translation[i]+a.min[i]*s[i]);hi[i]=Math.max(hi[i],q.translation[i]+a.max[i]*s[i]);}}
const checks=[];function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
const ext=hi.map((x,i)=>x-lo[i]);ck('Manual p. 717 console width',.540,ext[0],'m',1e-7);ck('Manual p. 717 console depth',.680,ext[2],'m',1e-7);
const upper=n.find(x=>x.name==='Upper_display_silver_halo'),a=g.accessors[g.meshes[upper.mesh].primitives[0].attributes.POSITION];
ck('Authored upright top estimate (not folded height)',1.580,upper.translation[1]+upper.scale[1]*a.max[1],'m',1e-7);
ck('Ancillary and movable equipment omitted',true,!g.extras.includesAccessoryCart&&!g.animations);
const s=createStation(),base=s.read(),source=exportRuler(base);
ck('Graphic axial pitch',.125,graphic.rowPitchMm,'mm');ck('Known separation (within one row)',4.5,base.measurement.separationMm,'mm',.125);
ck('Known exact integer row difference',36,base.measurement.deltaRows,'rows');
const r=s.hit('Reverse_ruler_endpoints');
ck('Reversed signed ruler reading',-4.5,r.measurement.signedMm,'mm');ck('Reversal preserves distance',base.measurement.separationMm,r.measurement.separationMm,'mm');
ck('Coincident ruler endpoints',0,s.hit('Cycle_marker_pair').measurement.separationMm,'mm');
try{measureRows(0,80);ck('Out-of-bounds rows rejected',true,false);}catch(e){ck('Out-of-bounds rows rejected',true,e instanceof RangeError);}
ck('Detached progression ray targets present',2,m.hitTargets.filter(x=>n.some(y=>y.name===x.node)&&targets[x.node]===x.action).length);
const w=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
w('verification.json',{schema:'bts.vevo3100.documentary-geometry.verification.v1',scope:'Documented cart footprint and fixed drawing ruler only, not device metrology',checks});w('example-ruler.json',source);
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
