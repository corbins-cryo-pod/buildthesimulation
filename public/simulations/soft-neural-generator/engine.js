/* Soft Neural Generator · v0.1.0 · independent mechanochemical research prototype.
 * DOM-free deterministic core. Nominal units: µm, min; forces are reduced units.
 * Mechanics: 2.5-D volume-constrained soma + extensible/bending neurite graph.
 * This is NOT a calibrated molecular, full 3-D, or electrophysiological model.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SoftNeural=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TAU=2*Math.PI, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const DEFAULTS=Object.freeze({adhesion:1,softness:1,contractility:1,polymerization:1,microtubules:1,waves:1,branching:1,seeking:.45,noise:1,release:1,motility:1,maxProcesses:8});
const LIMITS={adhesion:[0,2],softness:[.1,2],contractility:[0,2],polymerization:[0,2],microtubules:[0,2],waves:[0,3],branching:[0,2],seeking:[0,1.5],noise:[0,1.5],release:[0,3],motility:[0,2],maxProcesses:[1,12]};
const PRESETS={
 single:{name:'01 · One soft cell / one arm',count:1,params:{maxProcesses:1,branching:0,motility:1.3},desc:'Start as a round cell. Spread, form one process, and compare extension with traction-driven soma movement.'},
 spread:{name:'02 · Spreading only',count:1,params:{polymerization:0,branching:0,waves:0,maxProcesses:1},desc:'Passive reduced spreading experiment. The nucleus and cortex prevent an infinitely thin pancake.'},
 branching:{name:'03 · Exploratory branching',count:1,params:{branching:1.4,maxProcesses:8,motility:.35},desc:'Start from a sphere. Competing cortical sites and retained shaft protrusions can become new processes.'},
 pair:{name:'04 · Two cells / adhesive objects',count:2,params:{branching:1.2,seeking:.85,maxProcesses:6,motility:.35},desc:'Local exploration, optional synthetic neighbor cue, adhesive objects, and reversible cell contact. Contacts are not synapses.'},
 culture:{name:'05 · 25-cell culture',count:25,params:{branching:.8,maxProcesses:5,motility:.35},desc:'The same reduced mechanics for every cell. Spatially local contact queries; no scripted network geometry.'},
 hundred:{name:'06 · 100-cell stress test',count:100,params:{branching:.6,maxProcesses:4,motility:.35},desc:'Computational stress experiment, not a claim of calibrated population biology.'}
};
class RNG{
 constructor(seed=2646){this.state=seed>>>0;}
 next(){let t=this.state+=0x6D2B79F5;this.state>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
 signed(){return 2*this.next()-1;}
 normal(){return Math.sqrt(-2*Math.log(Math.max(1e-12,this.next())))*Math.cos(TAU*this.next());}
}
class Grid{
 constructor(size=20){this.size=size;this.bins=new Map();}
 insert(x,y,item){let k=Math.floor(x/this.size)+','+Math.floor(y/this.size),b=this.bins.get(k);if(!b)this.bins.set(k,b=[]);b.push(item);}
 near(x,y,r){let out=[];for(let i=Math.floor((x-r)/this.size);i<=Math.floor((x+r)/this.size);i++)for(let j=Math.floor((y-r)/this.size);j<=Math.floor((y+r)/this.size);j++){let b=this.bins.get(i+','+j);if(b)out.push(...b);}return out;}
}
function polygonArea(points){let a=0;for(let i=0;i<points.length;i++){let p=points[i],q=points[(i+1)%points.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a)/2;}
function pathLength(nodes){let L=0;for(let i=1;i<nodes.length;i++)L+=dist(nodes[i-1],nodes[i]);return L;}
function pointOn(nodes,s){if(!nodes.length)return{x:0,y:0,angle:0};for(let i=1;i<nodes.length;i++){let a=nodes[i-1],b=nodes[i],d=dist(a,b);if(s<=d||i===nodes.length-1){let f=clamp(s/Math.max(d,1e-9),0,1);return{x:mix(a.x,b.x,f),y:mix(a.y,b.y,f),angle:Math.atan2(b.y-a.y,b.x-a.x),i,f};}s-=d;}return{...nodes[0],angle:0,i:0,f:0};}
/* An excitable field, not a kinematic traveling packet. Activator a has local
 * cubic feedback, finite neighbor coupling and slow recovery h. Directed
 * coupling represents anterograde bias. Its coefficients are exploratory. */
function fieldStep(a,h,left,right,ds,dt,mt=1,stim=0){
 const q=clamp(mt,0,1.5),couple=2.4/(Math.max(1.6,ds)**2),rate=3.2*(.22+.78*q);
 const da=rate*a*(1-a)*(a-.13)-1.8*h*a+couple*(1.75*(left-a)+.25*(right-a))+stim;
 return[clamp(a+dt*da,0,1.2),clamp(h+dt*(.055*a-.034*h),0,1.4)];
}
class Simulation{
 constructor({seed=2646,preset='single',params={},count}={}){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Seed must be a 32-bit unsigned integer.');
  if(!PRESETS[preset])throw Error('Unknown preset.');
  this.version='0.1.0';this.seed=seed;this.rng=new RNG(seed);this.preset=preset;this.params={...DEFAULTS,...PRESETS[preset].params};this.setParams(params);
  this.time=0;this.steps=0;this.dt=.04;this.nextId=1;this.cells=[];this.obstacles=[];this.cues=[];this.history=[];this.kymograph=[];this.events=[];this.lastSample=-1;this.lastKy=-1;this.selected=0;
  this.stats={ignitions:0,arrivals:0,branches:0,bondsMade:0,bondsBroken:0,contacts:0,extended:0,retracted:0};
  let n=count===undefined?PRESETS[preset].count:count;if(!Number.isInteger(n)||n<1||n>120)throw Error('Cell count must be 1–120.');
  let cols=Math.ceil(Math.sqrt(n));
  for(let i=0;i<n;i++){let x=0,y=0;if(n===2){x=(i-.5)*77;y=(i-.5)*10;}else if(n>2){x=(i%cols-(cols-1)/2)*76+this.rng.signed()*8;y=(Math.floor(i/cols)-(Math.ceil(n/cols)-1)/2)*76+this.rng.signed()*8;}this.cells.push(this.makeCell(i,x,y));}
  if(preset==='pair'){this.obstacles=[{id:this.nextId++,x:4,y:20,r:9,adhesive:1},{id:this.nextId++,x:-2,y:-30,r:7,adhesive:1}];this.cells[0].heading=.1;this.cells[1].heading=Math.PI+.1;for(const c of this.cells){c.firstIndex=((Math.round(c.heading/TAU*c.r.length)%c.r.length)+c.r.length)%c.r.length;}}
  this.rebuildGrid();this.sample();this.event('start','Independent soft-cell experiment initialized.');
 }
 setParams(p){for(const[k,v]of Object.entries(p)){if(!LIMITS[k]||!Number.isFinite(v)||v<LIMITS[k][0]||v>LIMITS[k][1]||(k==='maxProcesses'&&!Number.isInteger(v)))throw Error('Invalid parameter: '+k);this.params[k]=v;} }
 event(type,text,cell=0){this.events.unshift({t:this.time,type,text,cell});if(this.events.length>200)this.events.length=200;}
 makeCell(id,x,y){
  const R=8,N=48,c={id,x,y,initialX:x,initialY:y,nx:x,ny:y,R,volume:4/3*Math.PI*R**3,materialTotal:620,pool:620,age:0,r:[],a:[],h:[],eta:[],adh:[],anchors:[],protrusion:[],nucleation:[],heading:this.rng.next()*TAU,processes:[],lastRoot:-50,lastIgnition:-50,traction:0,motion:0,origin:{x,y},fx:0,fy:0,height:16,area:Math.PI*R*R,maxStrain:0};
  c.firstIndex=Math.round(c.heading/TAU*N)%N;
  for(let i=0;i<N;i++){c.r.push(R);c.a.push(0);c.h.push(0);c.eta.push(0);c.adh.push(0);c.anchors.push({x:x+R*Math.cos(i*TAU/N),y:y+R*Math.sin(i*TAU/N)});c.protrusion.push(0);c.nucleation.push(0);}
  return c;
 }
 somaPoint(c,i,f=1){i=(i%c.r.length+c.r.length)%c.r.length;let a=i*TAU/c.r.length;return{x:c.x+Math.cos(a)*c.r[i]*f,y:c.y+Math.sin(a)*c.r[i]*f};}
 somaPoints(c){return c.r.map((r,i)=>this.somaPoint(c,i));}
 material(c){let s=c.pool;for(const b of c.processes)for(let i=1;i<b.nodes.length;i++)s+=b.nodes[i].rest+b.nodes[i].q;return s;}
 structural(c){return c.processes.reduce((s,b)=>s+b.nodes.reduce((z,n)=>z+n.rest,0),0);}
 bodyVolume(c){return Math.max(c.volume*.38,c.volume-this.structural(c)*Math.PI*.64*.64);}
 measureSoma(c){c.area=polygonArea(this.somaPoints(c));c.height=1.5*this.bodyVolume(c)/Math.max(1,c.area);}
 makeNode(x,y,rest=0,a=0,h=0,m=.38){return{id:this.nextId++,x,y,rest,a,h,m,width:.65,q:0,adh:0,anchor:{x,y},fx:0,fy:0,stress:0};}
 getProcess(c,id){return c.processes.find(b=>b.id===id);}
 rootPoint(c,b){if(b.parent!==null){const p=this.getProcess(c,b.parent);if(p){const n=p.nodes.find(n=>n.id===b.attachNode);if(n)return n;}}return this.somaPoint(c,b.rootIndex,.92);}
 rootField(c,b){if(b.parent!==null){let p=this.getProcess(c,b.parent),n=p&&p.nodes.find(n=>n.id===b.attachNode);if(n)return n;}return{a:c.a[b.rootIndex],h:c.h[b.rootIndex],m:.38};}
 addProcess(c,rootIndex,angle,length=2.5,parent=null,attachNode=null,fromFilo=null){
  if(c.processes.length>=this.params.maxProcesses||c.pool<length||!Number.isFinite(length)||length<1.6)return null;
  let base=parent?parent.nodes.find(n=>n.id===attachNode):this.somaPoint(c,rootIndex,.92);if(!base)return null;
  let b={id:this.nextId++,rootIndex,parent:parent?parent.id:null,attachNode,age:0,heading:angle,turn:0,nodes:[],filos:[],active:0,lastArrival:-1e6,arrivals:0,lastBranch:-100,extension:0,retraction:0,cone:0,lowAge:0};
  let count=Math.max(2,Math.ceil(length/2.2)+1);
  for(let j=0;j<count;j++){let t=j/(count-1),node=this.makeNode(base.x+Math.cos(angle)*length*t,base.y+Math.sin(angle)*length*t,j?length/(count-1):0,j===0?.9:0,0);b.nodes.push(node);}
  c.pool-=length;
  for(let j=0;j<7;j++)b.filos.push(this.makeFilo(b,null,-1.6+j*3.2/6));
  c.processes.push(b);c.lastRoot=this.time;
  if(!parent){c.a[rootIndex]=1;c.h[rootIndex]=0;}
  this.stats.branches++;this.event(parent?'branch':'root',parent?'A retained protrusion became a branch.':'A cortical protrusion became a primary neurite.',c.id);
  return b;
 }
 makeFilo(b,nodeId=null,angle=0){return{id:this.nextId++,nodeId,angle,length:.5+this.rng.next(),bend:this.rng.signed()*.3,noise:0,growing:true,mt:.15,bound:false,anchor:null,target:null,contactAge:0,age:0,force:0,dead:false};}
 filoBase(b,f){let i=f.nodeId===null?b.nodes.length-1:b.nodes.findIndex(n=>n.id===f.nodeId);if(i<0)return null;let n=b.nodes[i],prev=b.nodes[Math.max(0,i-1)],next=b.nodes[Math.min(b.nodes.length-1,i+1)],theta=i===b.nodes.length-1?b.heading:Math.atan2(next.y-prev.y,next.x-prev.x);return{node:n,index:i,theta,x:n.x,y:n.y};}
 filoGeometry(b,f){let q=this.filoBase(b,f);if(!q)return null;let theta=q.theta+f.angle,fan=f.nodeId===null?(1.2+2.2*b.cone):q.node.width*.9;let start={x:q.x+Math.cos(theta)*fan*.5,y:q.y+Math.sin(theta)*fan*.5},tip={x:q.x+Math.cos(theta)*(fan+f.length),y:q.y+Math.sin(theta)*(fan+f.length)};
  if(f.bound&&f.anchor){tip={x:f.anchor.x,y:f.anchor.y};}
  let normal={x:-Math.sin(theta),y:Math.cos(theta)},control={x:mix(start.x,tip.x,.5)+normal.x*f.bend,y:mix(start.y,tip.y,.5)+normal.y*f.bend};return{start,tip,control,theta,base:q,fan};}
 stimulate(cellId=this.selected,processId=null){let c=this.cells[cellId];if(!c)throw Error('Unknown cell.');let b=this.getProcess(c,processId)||c.processes.find(b=>b.parent===null);if(b){if(b.parent===null){c.a[b.rootIndex]=1;c.h[b.rootIndex]=0;}b.nodes[0].a=1;b.nodes[0].h=0;if(b.nodes[1]){b.nodes[1].a=.7;b.nodes[1].h=0;}}else{c.a[c.firstIndex]=1;c.h[c.firstIndex]=0;c.nucleation[c.firstIndex]=2;}this.stats.ignitions++;this.event('stimulus','Local cortical activation applied.',c.id);}
 addObstacle(x,y,r=8){if(![x,y,r].every(Number.isFinite)||Math.abs(x)>10000||Math.abs(y)>10000||r<2||r>30||this.obstacles.length>=60)throw Error('Invalid obstacle.');this.obstacles.push({id:this.nextId++,x,y,r,adhesive:1});}
 addCue(x,y){if(![x,y].every(Number.isFinite)||Math.abs(x)>10000||Math.abs(y)>10000||this.cues.length>=16)throw Error('Invalid cue.');this.cues.push({x,y,strength:1});}
 rebuildGrid(){this.grid=new Grid(20);for(const c of this.cells){this.grid.insert(c.x,c.y,{c,kind:'soma',x:c.x,y:c.y,r:Math.sqrt(c.area/Math.PI)});for(const b of c.processes)for(let i=1;i<b.nodes.length;i+=2){let n=b.nodes[i];this.grid.insert(n.x,n.y,{c,b,n,kind:'shaft',x:n.x,y:n.y,r:n.width});}}}
 findContact(c,point){let best=null,dmin=2.2;for(const hit of this.grid.near(point.x,point.y,24)){if(hit.c.id===c.id)continue;let d=dist(point,hit)-hit.r;if(d<dmin){dmin=d;best={kind:hit.kind,cell:hit.c.id,process:hit.b?hit.b.id:null,node:hit.n?hit.n.id:null,x:hit.x,y:hit.y,r:hit.r};}}
  for(const o of this.obstacles){let d=dist(point,o)-o.r;if(d<dmin){dmin=d;let th=Math.atan2(point.y-o.y,point.x-o.x);best={kind:'object',id:o.id,x:o.x+Math.cos(th)*o.r,y:o.y+Math.sin(th)*o.r,r:0};}}
  return best;
 }
 targetPoint(t,old){if(!t)return old;if(t.kind==='object'){let o=this.obstacles.find(o=>o.id===t.id);return o?{x:t.x,y:t.y}:null;}let c=this.cells[t.cell];if(!c)return null;if(t.kind==='soma'){let th=Math.atan2(old.y-c.y,old.x-c.x),r=Math.sqrt(c.area/Math.PI);return{x:c.x+Math.cos(th)*r,y:c.y+Math.sin(th)*r};}let b=this.getProcess(c,t.process),n=b&&b.nodes.find(n=>n.id===t.node);return n?{x:n.x,y:n.y}:null;}
 applyReaction(target,fx,fy){if(!target||target.kind==='object')return;let c=this.cells[target.cell];if(!c)return;if(target.kind==='soma'){c.fx+=fx;c.fy+=fy;}else{let b=this.getProcess(c,target.process),n=b&&b.nodes.find(n=>n.id===target.node);if(n){n.fx+=fx;n.fy+=fy;}}}
 growField(c,b,dt){let ns=b.nodes,aa=ns.map(n=>n.a),hh=ns.map(n=>n.h);let rf=this.rootField(c,b);ns[0].a=rf.a;ns[0].h=rf.h;ns[0].m=rf.m||.38;
  for(let i=1;i<ns.length;i++){let n=ns[i],left=i===1?rf.a:aa[i-1],right=aa[Math.min(ns.length-1,i+1)],result=fieldStep(aa[i],hh[i],left,right,n.rest,dt,.35+.65*n.m*this.params.microtubules);n.a=result[0]*Math.exp(-dt*1.5*Math.max(0,1-this.params.microtubules));n.h=result[1];
   // Coarse polymerization/stabilization density. Not a count of individual MTs.
   n.m=clamp(n.m+dt*(this.params.microtubules*(.012+.19*n.a)*(1-n.m)-.024*n.m-.018*n.h*n.m),0,1);
   let target=.55+.20*n.m+1.35*n.a+.45*n.h;n.width+=dt*.8*(target-n.width);
  }
  const tip=ns[ns.length-1];b.active=tip.a;b.cone+=dt*(.26*tip.a-.045*b.cone);b.cone=clamp(b.cone,0,1.2);
  if(tip.a>.32&&this.time-b.lastArrival>18){b.lastArrival=this.time;b.arrivals++;this.stats.arrivals++;if(c.id===this.selected)this.event('arrival','An excitable actin front reached a growth cone.',c.id);}
 }
 transport(c,b,dt){const ns=b.nodes,p=this.params;if(ns.length<2)return;let first=ns[1],source=null;
  if(b.parent!==null){let parent=this.getProcess(c,b.parent);source=parent&&parent.nodes.find(n=>n.id===b.attachNode);}
  // A lateral branch draws from its actual junction, never a distant soma shortcut.
  let available=source?source.q:c.pool,load=Math.min(available,dt*(.13+.7*first.a+.35*first.m)*p.microtubules);if(source)source.q-=load;else c.pool-=load;first.q+=load;
  let delta=new Float64Array(ns.length);for(let i=1;i<ns.length-1;i++){let n=ns[i],next=ns[i+1],rate=(.35+4*n.m+.7*n.a)*p.microtubules/Math.max(1.2,n.rest);let move=n.q*(1-Math.exp(-rate*dt));delta[i]-=move;delta[i+1]+=move;}
  for(let i=1;i<ns.length;i++)ns[i].q+=delta[i];
  const tip=ns[ns.length-1];if(b.cone<.06&&tip.q>3){let returned=Math.min(tip.q-3,dt*.05*tip.q);tip.q-=returned;c.pool+=returned;}
 }
 updateFilopodia(c,b,dt){let p=this.params,remaining=[];
  for(const f of b.filos){let g=this.filoGeometry(b,f);if(!g)continue;f.age+=dt;let node=g.base.node,activity=Math.max(node.a,b.cone*(f.nodeId===null?1:.25));
   f.noise+=-dt*.7*f.noise+Math.sqrt(dt)*.23*p.noise*this.rng.normal();
   if(!f.bound){f.angle=clamp(f.angle+dt*(.12*f.noise),-2.4,2.4);f.bend+=dt*(f.noise-f.bend*.18);}
   // Stochastic elongation/catastrophe and MT invasion remain internal to membrane.
   if(this.rng.next()<dt*(f.growing?.17+.18*(1-activity):.12+.28*activity))f.growing=!f.growing;
   let elong=p.polymerization*(.05+.65*activity)*(f.growing?1:-.5);f.length=clamp(f.length+dt*(elong-.035*f.force),.25,7);
   f.mt=clamp(f.mt+dt*(p.microtubules*(.025+.16*node.a)*(1-f.mt)-.04*(f.growing?.25:1)*f.mt),0,1);
   if(f.bound){let target=this.targetPoint(f.target,f.anchor);if(!target){f.bound=false;f.target=null;}else{f.anchor=target;let predicted={x:g.base.x+Math.cos(g.theta)*(g.fan+f.length),y:g.base.y+Math.sin(g.theta)*(g.fan+f.length)},dx=f.anchor.x-predicted.x,dy=f.anchor.y-predicted.y,load=Math.hypot(dx,dy);f.force=load;f.contactAge+=dt;
     // Slip bonds. Turnover is essential: permanently gluing all points arrests crawling.
     let off=p.release*(.14+.065*Math.expm1(Math.min(load/3,4)));
     if(p.adhesion===0||load>14||this.rng.next()<1-Math.exp(-off*dt)){f.bound=false;f.anchor=null;f.target=null;f.contactAge=0;this.stats.bondsBroken++;}
     else {let contraction=.10*p.contractility*(.3+node.h),fx=.18*dx+contraction*(f.anchor.x-g.base.x),fy=.18*dy+contraction*(f.anchor.y-g.base.y);node.fx+=fx;node.fy+=fy;this.applyReaction(f.target,-fx,-fy);c.traction+=Math.hypot(fx,fy);}
    }}
   if(!f.bound){g=this.filoGeometry(b,f);let contact=this.findContact(c,g.tip),on=p.adhesion*(contact?.7:.12)*(.3+activity);if(this.rng.next()<1-Math.exp(-on*dt)){f.bound=true;f.anchor={...g.tip};f.target=contact;f.contactAge=0;this.stats.bondsMade++;if(contact&&contact.kind!=='object'){this.stats.contacts++;if(c.id===this.selected)this.event('contact','Reversible membrane contact with another cell; no synapse implied.',c.id);}}}
   // A branch must survive adhesion and gain scaffold support, not just be drawn.
   if(f.nodeId!==null&&p.branching>0&&f.bound&&f.contactAge>5&&f.mt>.42&&node.m>.36&&c.processes.length<p.maxProcesses&&this.time-b.lastBranch>15&&this.rng.next()<dt*.08*p.branching*(.2+node.a)){
    let base=g.base,angle=Math.atan2(g.tip.y-base.y,g.tip.x-base.x),child=this.addProcess(c,b.rootIndex,angle,Math.max(2,Math.min(5,f.length)),b,node.id,f);if(child){f.dead=true;b.lastBranch=this.time;}
   }
   if(!f.dead&&(f.nodeId===null||f.age<45||f.bound))remaining.push(f);
  }b.filos=remaining;
  // Active waves and bends provide local sites for lateral exploration.
  if(p.polymerization>0&&b.nodes.length>5&&b.filos.filter(f=>f.nodeId!==null).length<5){
   for(let i=2;i<b.nodes.length-2;i++){let n=b.nodes[i],prev=b.nodes[i-1],next=b.nodes[i+1],bend=Math.abs(wrap(Math.atan2(next.y-n.y,next.x-n.x)-Math.atan2(n.y-prev.y,n.x-prev.x)));if(n.a>.25&&!b.filos.some(f=>f.nodeId===n.id)&&this.rng.next()<dt*.2*(1+bend*2)){b.filos.push(this.makeFilo(b,n.id,(this.rng.next()<.5?-1:1)*(1+.4*this.rng.next())));break;}}
  }
 }
 steer(c,b,dt){let p=this.params,tip=b.nodes[b.nodes.length-1],prior=b.nodes[Math.max(0,b.nodes.length-2)],baseAngle=Math.atan2(tip.y-prior.y,tip.x-prior.x);let gx=0,gy=0;
  // Explicit exploratory guidance assumption: exponentially screened local cues.
  if(p.seeking>0){for(const hit of this.grid.near(tip.x,tip.y,100)){if(hit.c.id===c.id||hit.kind!=='soma')continue;let d=dist(tip,hit);if(d>1){let w=Math.exp(-d/40);gx+=(hit.x-tip.x)/d*w;gy+=(hit.y-tip.y)/d*w;}}for(const q of this.cues){let d=dist(tip,q);if(d>1){let w=3*Math.exp(-d/65);gx+=(q.x-tip.x)/d*w;gy+=(q.y-tip.y)/d*w;}}}
  for(const f of b.filos){if(f.bound&&f.anchor){let d=dist(f.anchor,tip);if(d>1){let alignment=Math.max(0,Math.cos(Math.atan2(f.anchor.y-tip.y,f.anchor.x-tip.x)-b.heading));let w=(.22+(f.target?.6:0))*alignment;gx+=(f.anchor.x-tip.x)/d*w;gy+=(f.anchor.y-tip.y)/d*w;}}}
  b.turn+=-dt*.18*b.turn+Math.sqrt(dt)*.085*p.noise*this.rng.normal();
  let align=.5*wrap(baseAngle-b.heading),guidance=Math.hypot(gx,gy)>.01?.32*p.seeking*wrap(Math.atan2(gy,gx)-b.heading):0;
  b.heading=wrap(b.heading+dt*(align+guidance+b.turn*.12));
 }
 remodel(c,b,dt){let ns=b.nodes,tip=ns[ns.length-1],p=this.params;let resource=tip.q/(1+tip.q),engaged=b.filos.filter(f=>f.nodeId===null&&f.bound).length/7;
  let growth=p.polymerization*(.055+.92*b.cone+1.15*tip.a)*(.18+.82*tip.m)*(.45+.55*engaged)*resource;
  let retract=p.contractility*.22*(1-clamp(b.cone,0,1))*(1-tip.m)*(.65+.35*(1-engaged));
  let compression=clamp(1+3*Math.min(0,tip.stress+.18),0,1);growth*=compression;let dl=dt*(growth-retract);b.extension=0;b.retraction=0;
  if(dl>0){dl=Math.min(dl,tip.q);tip.q-=dl;tip.rest+=dl;b.extension=dl/dt;this.stats.extended+=dl;}
  else if(dl<0&&ns.reduce((a,n)=>a+n.rest,0)>2.2){let take=Math.min(-dl,Math.max(0,tip.rest-.25));tip.rest-=take;c.pool+=take;b.retraction=take/dt;this.stats.retracted+=take;}
  // Resolve newly deposited rest length by extending the terminal material axis.
  if(dl>0){let v=dl*.9;tip.x+=Math.cos(b.heading)*v;tip.y+=Math.sin(b.heading)*v;}
  if(tip.rest>3.2&&ns.length<180){let prev=ns[ns.length-2],rest=tip.rest,mid=this.makeNode(mix(prev.x,tip.x,.5),mix(prev.y,tip.y,.5),rest*.5,mix(prev.a,tip.a,.5),mix(prev.h,tip.h,.5),mix(prev.m,tip.m,.5));mid.width=(prev.width+tip.width)/2;mid.q=tip.q*.5;tip.q*=.5;tip.rest=rest*.5;ns.splice(ns.length-1,0,mid);}
  // Collapse only a terminal material interval. Shared branch junctions survive.
  if(tip.rest<.5&&ns.length>3){let prev=ns[ns.length-2],used=c.processes.some(q=>q.parent===b.id&&q.attachNode===prev.id);if(!used){tip.rest+=prev.rest;tip.q+=prev.q;ns.splice(ns.length-2,1);for(const f of b.filos)if(f.nodeId===prev.id)f.nodeId=tip.id;}}
 }
 updateSoma(c,dt){let p=this.params,N=c.r.length;c.age+=dt;c.traction=0;c.maxStrain=0;this.measureSoma(c);let oldA=c.a.slice(),oldH=c.h.slice(),oldR=c.r.slice();
  // Seed a single symmetry-breaking site only after physical substrate contact.
  if(c.processes.length===0&&p.polymerization>0&&c.age>.5){let i=c.firstIndex;c.a[i]=Math.max(c.a[i],.8);c.h[i]=0;c.nucleation[i]+=dt;}
  // Independently stochastic ignition at existing roots; no global visual clock.
  for(const b of c.processes){if(b.parent!==null)continue;let i=b.rootIndex;if(c.h[i]<.28&&this.rng.next()<1-Math.exp(-dt*(1.5/60)*p.waves)){c.a[i]=1;c.h[i]=0;this.stats.ignitions++;c.lastIgnition=this.time;}}
  // Explore new somatic sites only when they can compete for finite material.
  if(c.processes.length>0&&c.processes.length<p.maxProcesses&&p.branching>0&&this.time-c.lastRoot>12&&this.rng.next()<dt*.035*p.branching){let i=Math.floor(this.rng.next()*N);let clear=c.processes.every(b=>b.parent!==null||Math.abs(wrap((b.rootIndex-i)*TAU/N))>.62);if(clear){c.a[i]=.95;c.h[i]=0;c.nucleation[i]=1.5;}}
  const A0=Math.PI*c.R*c.R,stiff=.18/p.softness,sigma=.22/p.softness,W=.90*p.adhesion*(1-Math.exp(-c.age/2)),h=c.height;
  const nucleusPenalty=80*Math.max(0,5.2-h)*h/Math.max(1,c.area);
  const pressure=stiff*(c.area/A0-1)+sigma*Math.max(0,c.area/A0-1)-W+nucleusPenalty;
  for(let i=0;i<N;i++){
   // Each cortex site is locally excitable; weak lateral coupling avoids all arms pulsing together.
   let ai=Math.max(oldA[i],c.a[i]),hi=Math.min(oldH[i],c.h[i]),res=fieldStep(ai,hi,oldA[(i+N-1)%N],oldA[(i+1)%N],5.5,dt,.7);c.a[i]=res[0];c.h[i]=res[1];
   c.eta[i]+=-dt*.6*c.eta[i]+Math.sqrt(dt)*.12*p.noise*this.rng.normal();
   let localForce=p.polymerization*1.8*c.a[i]-.10*p.contractility*c.h[i],lap=oldR[(i+N-1)%N]+oldR[(i+1)%N]-2*oldR[i];
   const pt=this.somaPoint(c,i),ang=i*TAU/N,anchor=c.anchors[i];let dr=-.22*oldR[i]*pressure+1.5*lap+localForce+.08*c.eta[i];
   const ext=-(pt.x-anchor.x)*Math.cos(ang)-(pt.y-anchor.y)*Math.sin(ang);dr+=.14*c.adh[i]*ext;
   c.r[i]=clamp(oldR[i]+dt*dr,4.7,24);
   // A continuous mean clutch field on the soma; individual tip bonds are discrete.
   const activation=p.adhesion*.12*(1-.55*c.a[i]),off=p.release*(.045+.18*c.h[i]+.15*p.motility*(.2+c.h[i]));c.adh[i]=clamp(c.adh[i]+dt*(activation*(1-c.adh[i])-off*c.adh[i]),0,1);
   if(p.adhesion===0)c.adh[i]=0;
   if(c.adh[i]<.08){anchor.x=pt.x;anchor.y=pt.y;}else{let slip=off+.012*p.release;anchor.x+=dt*slip*(pt.x-anchor.x);anchor.y+=dt*slip*(pt.y-anchor.y);}
   c.fx+=.045*c.adh[i]*(anchor.x-pt.x);c.fy+=.045*c.adh[i]*(anchor.y-pt.y);
   if(c.a[i]>.45)c.nucleation[i]+=dt*.3;else c.nucleation[i]*=Math.exp(-dt*.07);
   if(p.polymerization>0&&(c.processes.length===0||p.branching>0)&&c.nucleation[i]>1.6&&c.area>A0*1.12&&c.processes.length<p.maxProcesses&&this.time-c.lastRoot>8){let clear=c.processes.every(b=>b.parent!==null||Math.abs(wrap((b.rootIndex-i)*TAU/N))>.62);if(clear){let angle=i*TAU/N;this.addProcess(c,i,angle,2.5);c.nucleation[i]=0;}}
  }
  this.measureSoma(c);
 }
 forces(c,b,dt){let ns=b.nodes,p=this.params,root=this.rootPoint(c,b);ns[0].x=root.x;ns[0].y=root.y;
  const k=9.0, bendK=2.3;let arc=0;
  for(let i=1;i<ns.length;i++){let a=ns[i-1],n=ns[i],d=Math.max(.01,dist(a,n)),ex=(n.x-a.x)/d,ey=(n.y-a.y)/d;let activeShortening=.38*p.contractility*Math.min(1,n.h*2),target=n.rest*(1-activeShortening),force=clamp(k*(d-target),-25,25);n.fx-=force*ex;n.fy-=force*ey;a.fx+=force*ex;a.fy+=force*ey;n.stress=(d-n.rest)/Math.max(.1,n.rest);c.maxStrain=Math.max(c.maxStrain,Math.abs(n.stress));
   arc+=n.rest;let proximal=Math.exp(-arc/45)*Math.min(1,p.motility);let on=p.adhesion*.12*(.35+n.m)*(1-.65*n.a)*(1-.85*proximal),off=p.release*(.035+.12*n.a+.04*Math.abs(n.stress)+.4*proximal+(i===ns.length-1?.45+.35*b.cone:0));n.adh=clamp(n.adh+dt*(on*(1-n.adh)-off*n.adh),0,1);if(p.adhesion===0)n.adh=0;
   if(n.adh<.06){n.anchor.x=n.x;n.anchor.y=n.y;}else{n.anchor.x+=dt*(off+.02*p.release)*(n.x-n.anchor.x);n.anchor.y+=dt*(off+.02*p.release)*(n.y-n.anchor.y);}
   n.fx+=.45*n.adh*(n.anchor.x-n.x);n.fy+=.45*n.adh*(n.anchor.y-n.y);
  }
  for(let i=1;i<ns.length-1;i++){let a=ns[i-1],n=ns[i],z=ns[i+1],fx=bendK*(a.x+z.x-2*n.x),fy=bendK*(a.y+z.y-2*n.y);n.fx+=fx;n.fy+=fy;a.fx-=fx*.5;a.fy-=fy*.5;z.fx-=fx*.5;z.fy-=fy*.5;}
  // Transfer the neurite root reaction into the shared soma or parent junction.
  let n=ns[0];if(b.parent===null){c.fx+=n.fx;c.fy+=n.fy;let theta=b.rootIndex*TAU/c.r.length;c.r[b.rootIndex]=clamp(c.r[b.rootIndex]+dt*.22*(n.fx*Math.cos(theta)+n.fy*Math.sin(theta)),4.7,24);}else{let parent=this.getProcess(c,b.parent),at=parent&&parent.nodes.find(q=>q.id===b.attachNode);if(at){at.fx+=n.fx;at.fy+=n.fy;}}
 }
 integrate(c,dt){let oldx=c.x,oldy=c.y,meanAdh=c.adh.reduce((a,b)=>a+b,0)/c.adh.length;
  c.x+=dt*.4*(.5+this.params.motility*2)*clamp(c.fx,-30,30)/(1+2*meanAdh);c.y+=dt*.4*(.5+this.params.motility*2)*clamp(c.fy,-30,30)/(1+2*meanAdh);c.motion=Math.hypot(c.x-oldx,c.y-oldy)/dt;
  c.nx+=dt*.8*(c.x-c.nx);c.ny+=dt*.8*(c.y-c.ny);
  for(const b of c.processes){for(let i=1;i<b.nodes.length;i++){let n=b.nodes[i],mob=.65/(1+2.5*n.adh);n.x+=dt*mob*clamp(n.fx,-35,35);n.y+=dt*mob*clamp(n.fy,-35,35);
    // Obstacles are impenetrable in the culture plane. Crossing neurites are not fused.
    for(const o of this.obstacles){let d=dist(n,o),min=o.r+Math.min(1,n.width);if(d<min){let a=Math.atan2(n.y-o.y,n.x-o.x);n.x=o.x+Math.cos(a)*min;n.y=o.y+Math.sin(a)*min;}}
   }
   // Strain limiter is a numerical guard, not the source of growth.
   for(let pass=0;pass<2;pass++){let root=this.rootPoint(c,b);b.nodes[0].x=root.x;b.nodes[0].y=root.y;for(let i=1;i<b.nodes.length;i++){let a=b.nodes[i-1],n=b.nodes[i],d=dist(a,n),max=n.rest*1.25;if(d>max&&d>0){let corr=(d-max)/d*.7;if(i>1){a.x+=(n.x-a.x)*corr*.5;a.y+=(n.y-a.y)*corr*.5;n.x-=(n.x-a.x)*corr*.5;n.y-=(n.y-a.y)*corr*.5;}else{n.x=a.x+(n.x-a.x)*max/d;n.y=a.y+(n.y-a.y)*max/d;}}}}
  }
  this.projectNucleus(c);this.obstacleProjection(c);this.measureSoma(c);
 }
 obstacleProjection(c){
  for(const o of this.obstacles){let d=dist(c,o),minimum=o.r+4.8;if(d<minimum){let th=Math.atan2(c.y-o.y,c.x-o.x);c.x=o.x+Math.cos(th)*minimum;c.y=o.y+Math.sin(th)*minimum;}
   for(let i=0;i<c.r.length;i++){let th=i*TAU/c.r.length,dx=o.x-c.x,dy=o.y-c.y,pr=dx*Math.cos(th)+dy*Math.sin(th),perp=dx*dx+dy*dy-pr*pr;if(pr>0&&perp<o.r*o.r){let near=pr-Math.sqrt(o.r*o.r-perp);if(near>4.7&&c.r[i]>near)c.r[i]=near-.04;}}
   for(const b of c.processes)for(let i=1;i<b.nodes.length;i++){let n=b.nodes[i],d=dist(n,o),r=o.r+Math.min(1,n.width);if(d<r){let a=Math.atan2(n.y-o.y,n.x-o.x);n.x=o.x+Math.cos(a)*r;n.y=o.y+Math.sin(a)*r;}}
  }
  for(const b of c.processes){let root=this.rootPoint(c,b);b.nodes[0].x=root.x;b.nodes[0].y=root.y;}
 }
 projectNucleus(c){const A=polygonArea(this.somaPoints(c)),maxA=1.5*this.bodyVolume(c)/4.6;if(A>maxA){const k=Math.sqrt(maxA/A);for(let i=0;i<c.r.length;i++)c.r[i]*=k;}}
 step(dt=this.dt){if(!Number.isFinite(dt)||dt<=0||dt>.04)throw Error('Timestep must be in (0, 0.04] minutes.');this.time+=dt;this.steps++;
  // Global force reset comes before contacts so equal-opposite cell forces survive.
  for(const c of this.cells){c.fx=0;c.fy=0;for(const b of c.processes)for(const n of b.nodes){n.fx=0;n.fy=0;}}
  this.rebuildGrid();
  for(const c of this.cells)this.updateSoma(c,dt);
  for(const c of this.cells){for(const b of [...c.processes]){b.age+=dt;this.growField(c,b,dt);this.transport(c,b,dt);this.steer(c,b,dt);this.updateFilopodia(c,b,dt);this.remodel(c,b,dt);}}
  for(const c of this.cells)for(const b of [...c.processes].reverse())this.forces(c,b,dt);
  // Finite-range soma exclusion; no all-to-all interaction pass.
  for(const c of this.cells){for(const hit of this.grid.near(c.x,c.y,45)){if(hit.kind!=='soma'||hit.c.id<=c.id)continue;let d=dist(c,hit.c),min=(Math.sqrt(c.area/Math.PI)+Math.sqrt(hit.c.area/Math.PI))*.75;if(d<min&&d>.01){let f=(min-d)*1.6,ex=(c.x-hit.c.x)/d,ey=(c.y-hit.c.y)/d;c.fx+=f*ex;c.fy+=f*ey;hit.c.fx-=f*ex;hit.c.fy-=f*ey;}}}
  for(const c of this.cells)this.integrate(c,dt);
  if(this.time-this.lastSample>=.99)this.sample();
 }
 advance(minutes){if(!Number.isFinite(minutes)||minutes<0||minutes>1440)throw Error('Advance must be 0–1440 minutes.');let n=Math.round(minutes/this.dt);for(let i=0;i<n;i++)this.step();return this;}
 metrics(){let c=this.cells[this.selected]||this.cells[0],nodes=0,length=0,bonds=0;for(const b of c.processes){nodes+=b.nodes.length;length+=b.nodes.reduce((s,n)=>s+n.rest,0);bonds+=b.filos.filter(f=>f.bound).length;}
  return{time:this.time,cells:this.cells.length,processes:c.processes.length,nodes,length,height:c.height,area:c.area,spread:c.area/(Math.PI*c.R*c.R),displacement:Math.hypot(c.x-c.initialX,c.y-c.initialY),traction:c.traction,bonds,pool:c.pool,budgetError:this.material(c)-c.materialTotal,arrivals:this.stats.arrivals,totalNodes:this.cells.reduce((s,c)=>s+c.processes.reduce((s,b)=>s+b.nodes.length,0),0)};
 }
 sample(){this.lastSample=this.time;this.history.push(this.metrics());if(this.history.length>1200)this.history.shift();let c=this.cells[this.selected]||this.cells[0],b=c.processes[0];if(b){let L=pathLength(b.nodes),data=[];for(let i=0;i<64;i++){let pt=pointOn(b.nodes,i/63*Math.max(.1,L)),j=Math.max(1,pt.i);data.push(mix(b.nodes[j-1].a,b.nodes[j].a,pt.f));}this.kymograph.push({t:this.time,length:L,a:data});if(this.kymograph.length>360)this.kymograph.shift();}}
 snapshot(){return JSON.parse(JSON.stringify({version:this.version,seed:this.seed,preset:this.preset,params:this.params,time:this.time,steps:this.steps,dt:this.dt,nextId:this.nextId,cells:this.cells,obstacles:this.obstacles,cues:this.cues,history:this.history,kymograph:this.kymograph,events:this.events,lastSample:this.lastSample,lastKy:this.lastKy,selected:this.selected,stats:this.stats,rng:this.rng.state}));}
 static restore(data){
  const s=typeof data==='string'?JSON.parse(data):JSON.parse(JSON.stringify(data));if(!s||s.version!=='0.1.0'||!Array.isArray(s.cells)||s.cells.length<1||s.cells.length>120)throw Error('Unsupported or malformed state.');
  const allowed=['version','seed','preset','params','time','steps','dt','nextId','cells','obstacles','cues','history','kymograph','events','lastSample','lastKy','selected','stats','rng'];
  if(Object.keys(s).some(k=>!allowed.includes(k))||allowed.some(k=>s[k]===undefined))throw Error('Unknown or missing state fields.');
  if(Object.keys(s.params).length!==Object.keys(DEFAULTS).length)throw Error('Incomplete parameter set.');
  if(!Array.isArray(s.obstacles)||s.obstacles.length>60||!Array.isArray(s.cues)||s.cues.length>16||!Array.isArray(s.history)||s.history.length>1200||!Array.isArray(s.kymograph)||s.kymograph.length>360||!Array.isArray(s.events)||s.events.length>200)throw Error('Invalid collections.');
  const check=(v,depth=0)=>{if(depth>24)throw Error('State nesting too deep.');if(typeof v==='number'&&!Number.isFinite(v))throw Error('Nonfinite state.');if(Array.isArray(v)&&v.length>4000)throw Error('Oversize state.');if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe key.');check(x,depth+1);}};check(s);
  if(s.time<0||s.dt!==.04||!Number.isInteger(s.rng)||!Number.isInteger(s.steps)||!Number.isInteger(s.nextId)||s.nextId<1||!Number.isInteger(s.selected)||s.selected<0||s.selected>=s.cells.length)throw Error('Invalid clock or selection.');
  let sim=new Simulation({seed:s.seed,preset:'single',count:1,params:s.params});
  for(const c of s.cells){if(![c.x,c.y,c.nx,c.ny,c.R,c.volume,c.pool,c.height,c.area,c.age].every(Number.isFinite)||c.id!==s.cells.indexOf(c)||!Array.isArray(c.processes))throw Error('Missing or invalid cell fields.');if(!Array.isArray(c.r)||c.r.length!==48||c.processes.length>12||c.pool<0||c.volume<=0||c.materialTotal!==620)throw Error('Invalid cell.');for(const name of ['a','h','eta','adh','anchors','protrusion','nucleation'])if(!Array.isArray(c[name])||c[name].length!==48)throw Error('Invalid cortex.');for(const name of ['r','a','h','eta','adh','protrusion','nucleation'])if(!c[name].every(Number.isFinite))throw Error('Nonfinite cortex.');if(c.anchors.some(a=>!a||!Number.isFinite(a.x)||!Number.isFinite(a.y)))throw Error('Invalid cortex anchors.');if(c.r.some(v=>v<4||v>25))throw Error('Invalid cortex radii.');let ids=new Set();for(const b of c.processes){if(ids.has(b.id)||!Array.isArray(b.nodes)||b.nodes.length<2||b.nodes.length>180||!Array.isArray(b.filos)||b.filos.length>20)throw Error('Invalid process.');ids.add(b.id);if(!Number.isInteger(b.rootIndex)||b.rootIndex<0||b.rootIndex>=48||![b.heading,b.cone,b.age,b.active].every(Number.isFinite))throw Error('Invalid process state.');for(let i=0;i<b.nodes.length;i++){let n=b.nodes[i];if(![n.x,n.y,n.rest,n.q,n.a,n.h,n.m,n.width,n.adh,n.anchor?.x,n.anchor?.y].every(Number.isFinite)||n.rest<0||n.q<0||n.a<0||n.a>1.3||n.h<0||n.m<0||n.m>1.01||Math.abs(n.x)>1e5||Math.abs(n.y)>1e5||(i>0&&n.rest<=0))throw Error('Invalid node.');}}if(Math.abs(sim.material(c)-c.materialTotal)>1e-6)throw Error('Material budget mismatch.');for(const b of c.processes)if(b.parent!==null){let p=c.processes.find(p=>p.id===b.parent);if(!p||c.processes.indexOf(p)>=c.processes.indexOf(b)||!p.nodes.some(n=>n.id===b.attachNode))throw Error('Broken branch junction.');}}
  const rng=s.rng;delete s.rng;Object.assign(sim,s);sim.rng=new RNG(rng);sim.rebuildGrid();return sim;
 }
}
return{Simulation,RNG,Grid,DEFAULTS,LIMITS,PRESETS,clamp,mix,wrap,dist,polygonArea,pathLength,pointOn,fieldStep};
});
