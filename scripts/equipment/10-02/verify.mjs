// Reproduce downloadable engineering evidence from the actual GLB positions and simulator.
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { state, act, digitize, LSB, scopeReplay } from '../../../public/equipment/10-02/adc.mjs';
const dir=new URL('../../../public/equipment/10-02/',import.meta.url);
export function report(){
 const read=n=>fs.readFileSync(new URL(n,dir)), glb=read('digidata-1550b.glb'), jsonSize=glb.readUInt32LE(12), asset=JSON.parse(glb.subarray(20,20+jsonSize)), start=28+jsonSize;
 const meta=JSON.parse(read('xr-manifest.json')),lo=[Infinity,Infinity,Infinity],hi=lo.map(()=>-Infinity);let triangles=0,draws=0;
 for(const node of asset.nodes){if(node.mesh===undefined)continue;
   for(const prim of asset.meshes[node.mesh].primitives){draws+=1;triangles+=asset.accessors[prim.indices].count/3;
   if(meta.accessories.includes(node.name))continue;const a=asset.accessors[prim.attributes.POSITION],view=asset.bufferViews[a.bufferView];
   if(a.componentType!==5126||a.type!=='VEC3')throw Error('Unsupported geometric verification accessor.');
   for(let i=0;i<a.count;i++)for(let j=0;j<3;j++){const v=glb.readFloatLE(start+(view.byteOffset||0)+(a.byteOffset||0)+i*(view.byteStride||12)+4*j);lo[j]=Math.min(lo[j],v);hi[j]=Math.max(hi[j],v)}
 }}
 const size=hi.map((v,j)=>1000*(v-lo[j])),names=asset.nodes.map(n=>n.name);
 const n=(x)=>x.channels[0].samples.length,r=act(state(),'run'),a=r.channels[0],over=c=>c.overload.reduce((s,b)=>s+(b!==0),0);
 const t=state();t.input.channels=[{id:'positive',unit:'V',samples:[0,1,2,3,4]},{id:'negative',unit:'V',samples:[0,-1,-2,-3,-4]}];t.firstInput=6;t.rateHz=2000;const tr=act(t,'run');
 const s=state(),input=JSON.parse(read('multiclamp-input.json'));act(s,'source',input);const u=act(s,'run'),peakResidual=Math.max(...u.channels[0].samples.map((v,i)=>Math.abs(v-input.channels[0].samples[i])));
 const cases=[],add=(id,expected,actual,unit,tolerance,pass)=>cases.push({id,expected,actual,unit,tolerance,outcome:pass?'PASS':'FAIL'});
 const monotone=a.codes.every((v,i,p)=>i===0||v>=p[i-1]);add('ramp',[13,2,0,true],[n(r),over(a),a.codes[6],monotone],'samples; overloads; signed zero code; monotonic',0,n(r)===13&&over(a)===2&&a.codes[6]===0&&monotone);
 const ref=[-32768,-16384,0,16384,32767],samples=[-10,-5,0,5,10],actual=samples.map(x=>digitize(x).code);
 add('transfer',ref,actual,'signed codes',0,actual.join()===ref.join()&&samples.every(x=>!digitize(x).over));
 add('timing',[9,.0005,.5],[n(tr),tr.dtS,tr.channels[0].samples[1]],'samples; s; V','0 samples; 1e-12 s; 0.5 LSB',n(tr)===9&&Math.abs(tr.dtS-.0005)<=1e-12&&Math.abs(tr.channels[0].samples[1]-.5)<=LSB/2);
 add('simultaneous',['AI6','AI7',9,9],tr.channels.map(c=>c.terminal).concat(tr.channels.map(c=>c.samples.length)),'terminal; shared-grid sample counts',0,tr.channels[0].terminal==='AI6'&&tr.channels[1].terminal==='AI7'&&tr.channels.every(c=>c.samples.length===9));
 const fails=[];for(const cmd of ['usb','power','connected','rate','units','span']){const q=state();act(q,'run');try{if(cmd==='rate')act(q,'rate',500001);else if(cmd==='units'){const src=state().input;src.channels[0].unit='mV';act(q,'source',src)}else if(cmd==='span'){const src=state().input;src.channels.push({id:'short',unit:'V',samples:[0,1]});act(q,'source',src)}else act(q,cmd);act(q,'run');}catch{if(q.result===null)fails.push(cmd)}}
 add('invalid',6,fails.length,'rejected invalid configurations with no stale record',0,fails.length===6);
 add('physical',[483,109,363],size,'mm; W, H, D','1 mm per axis',size.every((v,i)=>Math.abs(v-[483,109,363][i])<=1));
 const ports=['AI','AO','DO','telegraph_'].map(k=>names.filter(n=>new RegExp('^'+k+'[0-7]$').test(n)).length);
 add('connectors',[8,8,8,4],ports,'ports: analog in/out, digital out, telegraph',0,String(ports)==='8,8,8,4');
 const m=meta.geometry,complexity=[asset.nodes.length,triangles,draws,glb.length];
 add('asset-manifest',[m.nodes,m.triangles,m.primitives,m.bytes],complexity,'nodes, triangles, draw primitives, bytes',0,String(complexity)===String([m.nodes,m.triangles,m.primitives,m.bytes]));
 const anchors=Object.entries(meta.interactionNodes).every(([name,obj])=>names.includes(name)&&obj.label&&Array.isArray(obj.boundsM?.min)&&obj.boundsM.min.every((v,i)=>obj.boundsM.max[i]>v));
 add('XR-anchor-metadata',true,Boolean(anchors),'stable named geometry controls and nonzero physical AABBs',0,anchors);
 add('MultiClamp-handoff',[131,0,'≤152.588 µV'],[n(u),over(u.channels[0]),peakResidual*1e6],'samples, overloads, peak absolute residual (µV)','0 counts; 0.5 LSB',n(u)===131&&over(u.channels[0])===0&&peakResidual<=LSB/2+1e-12);
 return {deviceId:'10-02',configuration:'Axon Digidata 1550B base, no ANC',reference:'Predeclared analytical cases and manufacturer envelope (5040237 C, pp. 33–34); empirical validation not performed.',cases};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const r=report();const w=(n,v)=>fs.writeFileSync(new URL(n,dir),JSON.stringify(v,null,2)+'\n');w('verification.json',r);const s=state();act(s,'source',JSON.parse(fs.readFileSync(new URL('multiclamp-input.json',dir))));w('example-output.json',act(s,'run'));fs.writeFileSync(new URL('scope-replay.csv',dir),scopeReplay(s.result));console.table(r.cases.map(c=>({case:c.id,outcome:c.outcome,actual:JSON.stringify(c.actual)})));if(r.cases.some(c=>c.outcome!=='PASS'))process.exitCode=1}
