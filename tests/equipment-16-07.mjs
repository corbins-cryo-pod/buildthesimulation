import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,blank,csv,defaults,run,temperature} from '../public/equipment/16-07/solver.mjs';
const dir=new URL('../public/equipment/16-07/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const example=run(defaults),held=temperature(defaults,60),equal=temperature({...defaults,mode:'relaxing'},60),empty=action(action(action(blank(),{type:'lid'}),{type:'load'}),{type:'lid'});
const b=get('isotemp-gpd05.glb'),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
const box=k=>{
 const a=g.meshes[n(k).mesh].primitives.map(q=>g.accessors[q.attributes.POSITION]);
 return [0,1,2].map(i=>Math.max(...a.map(x=>x.max[i]))-Math.min(...a.map(x=>x.min[i])));
};
const reject=f=>{try{f();return false}catch{return true}};
const actual={
 'one-tau-gap-fraction':(held.dummyC-defaults.dummy0C)/(defaults.setC-defaults.dummy0C),
 'held-dummy-at-60':held.dummyC,'held-bath-at-60':held.bathC,'initial-condition':temperature(defaults,0).dummyC,
 'passive-cooling-at-60':temperature({...defaults,dummy0C:34},60).dummyC,'equal-tau-bath-at-60':equal.bathC,'equal-tau-dummy-at-60':equal.dummyC,
 'unloaded-blocked':reject(()=>action(empty,{type:'run'})),
 'open-lid-blocked':reject(()=>action(action(blank(),{type:'lid'}),{type:'run'})),
 'invalid-tau-blocked':reject(()=>run({...defaults,tauDummyS:0})),
 'body-width':box('enamel_lower_shell')[0],'tank-opening-width':box('tank_bottom')[0]
};
const metrics={bytes:b.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),nominalBodyHeightM:n('upper_rim_side_l').translation[1]+box('upper_rim_side_l')[1]/2,nominalTankXZM:[box('tank_bottom')[0],box('tank_bottom')[2]]};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const proof={schema:'bts.thermal-bath.verification.v1',metrics,cases,scope:'Exact ideal thermal response and geometry scale, not experimental validation, treatment, actual bath performance or headset support.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-history.json',example);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'16-07',asset:'/equipment/16-07/isotemp-gpd05.glb',scale:'glTF meter, +Y up and +Z toward operator',metrics,implementation:'DOM and 3D pointer use action(state, action); no immersive/browser hardware certification',nodes:[
  {node:'lid_handle',label:'Toggle clear hinged lid',action:{type:'lid'},boundsM:[.11,.015,.015]},
  {node:'gable_lid',axis:[1,0,0],pivotM:[0,.235,-.104],travelDeg:[-90,0]},
  {node:'inert_dummy',label:'Virtual inert reference dummy'},
  {node:'display_texture_anchor',label:'Live output temperature and set point',boundsM:[.066,.033]}
 ]});
}
test('Held thermal gap, both equal-time-constant oracles, limits and metric scale',()=>{
 assert.deepEqual(read('verification.json'),proof);
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 assert.equal(Math.round(metrics.nominalBodyHeightM*1000),232);assert.equal(Math.round(metrics.nominalTankXZM[1]*1000),154);
 for(const key of ['lid_handle','gable_lid','inert_dummy','display_texture_anchor'])assert.ok(n(key));
 assert.ok(Math.abs(temperature({...defaults,mode:'relaxing',tauBathS:60.0000000001},60).dummyC-equal.dummyC)<1e-10);
});
test('Timestamped readout, closed-lid action, continuity of relaxing response, exports',()=>{
 let s=action(blank(),{type:'run'}),k=s.result.history.findIndex(x=>x.timeS===60);assert.equal(k,40);s=action(s,{type:'seek',payload:k});assert.equal(s.cursor,40);
 assert.throws(()=>action(s,{type:'run',payload:{...defaults,durationS:0}}),/durationS/);
 assert.deepEqual(s.result,read('example-history.json'));assert.equal(s.result.history.at(-1).timeS,180);
 assert.match(csv(s.result),/BTS-INERT-DUMMY-16-07,dummy-r1,1,60,28,24.321205588285/);
 const p={...defaults,mode:'relaxing',tauBathS:100,tauDummyS:35},dt=.01;let d=18;
 // Independently integrate the relaxation in time via midpoint steps.
 for(let i=0;i<6000;i++){const at=t=>(28-7*Math.exp(-t/100));const slope=(at(i*dt)-d)/35;d+=dt*(at((i+.5)*dt)-(d+.5*dt*slope))/35}
 assert.ok(Math.abs(temperature(p,60).dummyC-d)<1e-6);
});
