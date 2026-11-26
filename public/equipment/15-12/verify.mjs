import {readFileSync,writeFileSync} from 'node:fs';
import {createStation,analyze,clip,exportRecord,csvRecord,source,targets} from './offline.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('rz6-ra4pa-exteriors.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,face=n.find(x=>x.name==='Nominal_RZ6_rack_face_19in_3U'),a=g.accessors[g.meshes[face.mesh].primitives[0].attributes.POSITION];
const ext=a.max.map((x,i)=>(x-a.min[i])*face.scale[i]), checks=[];
function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
ck('Rack face width (19 in)',.4826,ext[0],'m',1e-7);ck('Rack face height (3U)',.13335,ext[1],'m',1e-7);
ck('RA4PA exterior indicators',4,n.filter(x=>x.name.startsWith('Medusa_inactive_indicator_')).length);
const s=createStation(),r=s.hit('Recompute_from_fixed_file'),o=exportRecord(r),first=o.result.first;
ck('Default first qualifying record','L3',first.id);ck('Independent peak index',76,first.peakIndex,'sample');
ck('Known offset within one file sample',2.20,first.peakOffsetMs,'ms',.05);
ck('Threshold at exact equality includes L3','L3',analyze(6).first.id);
ck('Higher offline threshold moves first case','L4',analyze(7).first.id);
ck('L4 tied maximum uses earliest known index',76,analyze(7).first.peakIndex,'sample');
ck('9 mV outside the window is ignored',true,clip('L3').dataMv[46]===9&&source.window[0]>46&&analyze(9).first===null);
ck('No-result export records null, not an invented peak',true,analyze(9).clips.every(c=>c.peakIndex===null&&c.peakOffsetMs===null));
ck('All immutable source rows in CSV',512,csvRecord(r).trimEnd().split('\n').length-1,'rows');
const c=clip('L3');c.dataMv[76]=0;ck('Caller cannot mutate fixed source',6,clip('L3').dataMv[76],'mV');
ck('Detached hits present',2,m.hitTargets.filter(t=>targets[t.node]===t.action&&n.some(q=>q.name===t.node)).length);
const w=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
w('verification.json',{schema:'bts.tdt.offline-file.verification.v1',scope:'Named rack envelope and synthetic fixed file analysis only; not device, protocol or biological validation',checks});w('example-result.json',o);writeFileSync(p('example-samples.csv'),csvRecord(r));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
