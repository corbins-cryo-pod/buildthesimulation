import fs from 'node:fs';import {bragg,scan} from './diffraction.mjs';import {createStation} from './station.mjs';
const base=new URL('./',import.meta.url),p=JSON.parse(fs.readFileSync(new URL('verification-plan.json',base)));
const simple={source:'single',wavelengthA:2,dA:2};const one=o=>scan({...simple,...o}).result.peaks[0];
const a=createStation();a.dispatch('toggleDoor');
const res={BRAGG:bragg(2,2),SINGLE_CENTER:one().centerDeg,QUADRATURE:one({instrumentFwhmDeg:.3,sampleFwhmDeg:.4}).fwhmDeg,NO_SHIFT:one({instrumentFwhmDeg:1}).centroidDeg-one().centroidDeg,SILICON_TABLE:scan({wavelengthA:1.5405929}).result.peaks.slice(0,3).map(k=>k.centerDeg),FORBIDDEN:scan({...simple,dA:.5}).code,UNDERSAMPLED:scan({...simple,stepDeg:.1,instrumentFwhmDeg:.1}).code,OPEN_CABINET:a.dispatch('scan').error.code};
const b=fs.readFileSync(new URL('dmax-b.glb',base)),j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
p.cases.push({id:'RADIUS',expected:185,unit:'mm',tol:.001,class:'GLB geometry',basis:'Documented virtual pivot-to-receiving position' });
res.RADIUS=j.nodes.find(n=>n.name==='Detector_radius_185mm').translation[0]*1000;
const norm=v=>Array.isArray(v)?v:[v];
for(const r of p.cases){r.actual=res[r.id];r.pass=norm(r.actual).every((v,i)=>typeof v==='number'?Math.abs(v-norm(r.expected)[i])<r.tol:v===norm(r.expected)[i]);}
if(p.cases.some(r=>!r.pass))throw Error(JSON.stringify(p.cases.filter(x=>!x.pass)));fs.writeFileSync(new URL('verification.json',base),JSON.stringify(p,null,2)+'\n');console.log('PASS',p.cases.map(x=>x.id));
