import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,scenario,dispatch,exportRun,evolve,specification,isHot} from '../public/equipment/16-09/solver.mjs';
const p=new URL('../public/equipment/16-09/',import.meta.url),url=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(url(n),'utf8')),rows=[];
function check(id,expected,actual,unit='',tol=0){
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});
 assert.ok(pass,id+' '+JSON.stringify({expected,actual,tol}));
}
const step=(s,a,b)=>{const o=dispatch(s,a,b);assert.ok(o.ok,o.message);return o.state;};
const runData=s=>s.history.at(-1).data,last=s=>runData(s).at(-1);
const switched=(s=initial())=>step(step(step(step(s,'stir'),'run'),'stir'),'run');
test('registered inert isolated equilibrium remains invariant as stir toggles',()=>{
 const s=switched(),a=s.history[0].data,b=s.history[1].data,all=[...a,...b];
 check('Equilibrium maximum deviation',0,Math.max(...all.map(q=>Math.abs(q.plateC-22)+Math.abs(q.phantomC-22))),'°C');
 check('Agitation on',300,a.at(-1).agitationRpm,'rpm');
 check('Agitation off',0,b.at(-1).agitationRpm,'rpm');
 assert.ok(a.every(x=>x.stirring)&&b.every(x=>!x.stirring));
 const i=switched(initial({...scenario,ambientC:27.3}));assert.equal(last(i).probeC,27.3);
 assert.equal(dispatch(i,'heat').ok,false);
});
test('independent terminal fixture closed-form checks (inert cascade)',()=>{
 const s=step(step(initial({...scenario,mode:'transfer'}),'heat'),'run');
 const p=60-38/Math.exp(4),v=60-(38/3)*(4/Math.E-1/Math.exp(4));
 check('Plate at 100 virtual s',p,last(s).plateC,'°C',1e-10);
 check('Probe at 100 virtual s',v,last(s).probeC,'°C',1e-10);
 assert.ok(p>v&&v>22);
});
test('independent integrated coupled two-state differential equation',()=>{
 let u=[24,23],A=71,t=2.53,h=.001;
 const fun=([p,v])=>[(A-p)/25,(p-v)/100],advance=(v,d,dt)=>v.map((x,i)=>x+dt*d[i]);
 for(let i=0;i<Math.round(t/h);i++){
  const k1=fun(u), k2=fun(advance(u,k1,h/2)), k3=fun(advance(u,k2,h/2)), k4=fun(advance(u,k3,h));
  u=u.map((x,j)=>x+h*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6);
 }
 const x=evolve(24,23,71,t);
 assert.ok(Math.abs(u[0]-x.plateC)<4e-11&&Math.abs(u[1]-x.vesselC)<4e-11);
});
test('virtual power removal preserves remaining plate warmth and HOT later clears',()=>{
 let s=step(step(initial({...scenario,mode:'transfer'}),'heat'),'run');s=step(s,'power');
 check('Residual after virtual standby','HOT',isHot(s)?'HOT':'Not above threshold');
 assert.equal(s.heat,false);assert.equal(s.stir,false);
 s=step(s,'run');
 check('Residual after virtual cooldown','Not above threshold',last(s).hotTop?'HOT':'Not above threshold');
 assert.equal(last(s).boundaryC,22);assert.equal(isHot({plateC:50}),false);
});
test('probe and vessel guardrails, invalid setpoint preserves previous state',()=>{
 let s=step(initial(),'probe');s=step(s,'run');assert.equal(last(s).probeC,null);assert.equal(last(s).phantomC,22);
 const off=step(s,'load');assert.equal(dispatch(off,'probe').ok,false);assert.equal(dispatch(off,'stir').ok,false);assert.equal(last(step(off,'run')).phantomC,null);
 const guard=dispatch(s,'settings',{setC:62});assert.equal(guard.ok,false);assert.equal(guard.state,s);
 assert.equal(dispatch(s,'settings',{durationS:0}).ok,false);
 s=step(s,'stir');assert.equal(dispatch(s,'load').ok,false);
});
test('history fixture, versions, times and agitation segment transition are represented',()=>{
 assert.deepEqual(json('example-input.json'),scenario);
 const s=switched(),pack=exportRun(s);
 assert.deepEqual(json('example-history.json'),pack);
 assert.equal(pack.segments[0].data.at(-1).timeS,pack.segments[1].data[0].timeS);
 assert.equal(pack.segments[0].data.at(-1).phantomC,pack.segments[1].data[0].phantomC);
 const sample=step(initial(),'import',{...scenario,vesselId:'replacement-witness',revision:7});
 assert.equal(exportRun(step(sample,'run')).revision,7);
 assert.equal(dispatch(initial(),'import',{...scenario,revision:-1}).ok,false);
});
test('actual metric GLB fits source dimensions and binds exact actions and motion',async()=>{
 const b=readFileSync(url('ika-hs7.glb')),m=json('interaction.json'),size=json('asset-metrics.json');
 const glb=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const scene=glb.scene,seen=new Map();scene.traverse(n=>seen.set(n.name,(seen.get(n.name)??0)+1));
 const g=n=>scene.getObjectByName(n),xyz=n=>g(n).getWorldPosition(new T.Vector3()).toArray(),dim=n=>new T.Box3().setFromObject(g(n)).getSize(new T.Vector3()).toArray().map(x=>x*1000);
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.ports,...m.actions.map(a=>a.node)])assert.equal(seen.get(n),1,n);
 assert.deepEqual(xyz(m.frame.placementAnchor),[0,0,0]);
 const dims=dim(m.parts.device);
 for(let i=0;i<3;i++)check('Metric chassis axis '+'XYZ'[i],specification.enclosureMm[i],dims[i],'mm',2);
 const plate=dim(m.parts.plate);check('Ceramic plate span X',180,plate[0],'mm',.05);check('Ceramic plate span Z',180,plate[2],'mm',.05);
 assert.ok(xyz('heat_knob')[0]<0&&xyz('stir_knob')[0]>0);
 const base=xyz(m.parts.probe);g(m.parts.probe).position.y+=m.motion.probeLiftM;
 check('Generic probe lift',65,1e3*(xyz(m.parts.probe)[1]-base[1]),'mm',.00001);
 assert.equal(size.bytes,b.length);assert.ok(size.bytes<2e6&&size.triangles<5e4&&size.primitives<=40);
});
test('published evidence is linked to reproducible numbers',()=>{
 const scope='Analytical and independent differential-equation checks, finite state and original metric geometry. No measurements of the selected hardware, physical safety certification, material-calibration data or headset testing.';
 if(process.env.BTS_UPDATE_16_09==='1')writeFileSync(url('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
