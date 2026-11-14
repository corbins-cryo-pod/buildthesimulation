/* Whole-cell remodeling laboratory · independent research prototype.
 * Units: nominal micrometres and minutes. Coefficients are exploratory.
 * No rendering, network, DOM, or wall-clock dependency in this module.
 */
(function(root,factory){ const out=factory(); if(typeof module==='object'&&module.exports)module.exports=out; else root.CellEngine=out; })(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TAU=Math.PI*2, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const DEFAULTS=Object.freeze({polymerization:1,contractility:1,adhesion:.72,stabilization:1,coupling:1,branching:1,waveSpeed:2.2,noise:1});
const LIMITS={polymerization:[0,2],contractility:[0,2],adhesion:[0,1.5],stabilization:[0,2],coupling:[0,1],branching:[0,2],waveSpeed:[.5,4],noise:[0,1.5]};
const FAN_DIRECTIONS=Array.from({length:48},(_,i)=>{const theta=i/48*TAU;return(.14+.86*Math.pow(Math.max(0,(Math.cos(theta)+.3)/1.3),.48))*(.68+.62*Math.sin(theta)*Math.sin(theta));});
const FILO_KERNEL=Array.from({length:48},(_,i)=>Array.from({length:13},(_,j)=>.85*Math.exp(-Math.pow(wrap(i/48*TAU-(-2.05+j*4.1/12))/.25,2))));
const PRESETS={
 remodeling:{name:'Whole-cell remodeling',params:{...DEFAULTS}},
 fragile:{name:'Weak structural support',params:{...DEFAULTS,stabilization:.12,contractility:1.15}},
 persistent:{name:'Persistent outgrowth',params:{...DEFAULTS,polymerization:1.3,contractility:.48,stabilization:1.65,adhesion:1.05}},
 uncoupled:{name:'Independent local activity',params:{...DEFAULTS,coupling:0}}
};
class RNG{
 constructor(seed){this.state=seed>>>0;}
 next(){let t=this.state+=0x6D2B79F5;this.state>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
 signed(){return this.next()*2-1;}
}
function pathLength(nodes){let s=0;for(let i=1;i<nodes.length;i++)s+=distance(nodes[i-1],nodes[i]);return s;}
function pathPoint(nodes,s){
 if(!nodes.length)return{x:0,y:0,angle:0};
 for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],d=distance(a,b);if(s<=d||i===nodes.length-1){const f=clamp(s/Math.max(d,1e-9),0,1);return{x:mix(a.x,b.x,f),y:mix(a.y,b.y,f),angle:Math.atan2(b.y-a.y,b.x-a.x),index:i,f};}s-=d;}
 return{...nodes[0],angle:0,index:0,f:0};
}
function polygonArea(points){let a=0;for(let i=0;i<points.length;i++){const b=points[(i+1)%points.length],p=points[i];a+=p.x*b.y-b.x*p.y;}return Math.abs(a)/2;}
class Simulation{
 constructor(seed=2646,params={}){
  this.version='1.0.0';this.seed=seed>>>0;this.rng=new RNG(this.seed);this.params={...DEFAULTS};this.setParams(params,false);
  this.time=0;this.steps=0;this.dt=.04;this.nextId=1;this.nextWaveId=1;this.events=[];this.history=[];this.lastSample=-1;this.maxHistory=2400;
  this.osc={u:-1.05,v:-.62,contraction:0,armed:true};this.soma={x:0,y:0,nx:0,ny:0,r:[],r0:[],a:[],h:[],eta:[]};
  this.neurites=[];this.waves=[];this.pulses=[];this.stats={launched:0,delivered:0,born:0,pruned:0,extended:0,retracted:0};
  const N=96;for(let i=0;i<N;i++){let th=i*TAU/N;let r=7.2+1.4*Math.cos(2*th+.8)+.45*Math.sin(3*th-1);this.soma.r.push(r);this.soma.r0.push(r);this.soma.a.push(.12+.08*this.rng.next());this.soma.h.push(.05);this.soma.eta.push(0);}
  const angles=[-1.72,-.85,.99,2.29,3.22],lengths=[27,9,31,5,28];
  for(let i=0;i<5;i++)this.addNeurite(null,angles[i]+.12*this.rng.signed(),lengths[i],0,true);
  this.addNeurite(this.neurites[2],.85,9,16,true);
  this.somaFilopodia=Array.from({length:22},(_,i)=>this.makeFilo(i/22*TAU,true));
  this.initialMaterial=this.neurites.reduce((s,n)=>s+n.length,0);this.reserveCapacity=110;this.materialBudget=this.initialMaterial+this.reserveCapacity;this.resource=1;
  this.event('start','Experiment initialized; nominal spatial and time scales.');this.sample();
 }
 setParams(p,log=true){for(const [k,v]of Object.entries(p)){if(!LIMITS[k]||!Number.isFinite(v))throw Error('Invalid parameter: '+k);const [a,b]=LIMITS[k];if(v<a||v>b)throw Error('Out-of-range parameter: '+k);this.params[k]=v;}if(log&&this.events)this.event('parameter','Parameters changed.',{params:{...this.params}});}
 makeFilo(theta,soma=false){return{theta,length:this.rng.next()*(soma?.9:2.5),target:0,on:this.rng.next()<.4,age:0,bend:.2*this.rng.signed(),eta:0,base:soma?1:0,phase:this.rng.next()*TAU};}
 somaAt(theta,f=1){const N=this.soma.r.length,a=((theta%TAU)+TAU)%TAU/TAU*N,i=Math.floor(a),r=mix(this.soma.r[i],this.soma.r[(i+1)%N],a-i)*f;return{x:this.soma.x+Math.cos(theta)*r,y:this.soma.y+Math.sin(theta)*r,angle:theta};}
 getNeurite(id){return this.neurites.find(n=>n.id===id);}
 baseOf(n){if(n.parent!==null){let p=this.getNeurite(n.parent);if(p)return pathPoint(p.nodes,Math.min(n.attach,pathLength(p.nodes)));}return this.somaAt(n.theta,.80);}
 addNeurite(parent,theta,length=1,attach=0,initial=false){
  if(this.neurites.length>=14)return null;
  let b=parent?pathPoint(parent.nodes,attach):this.somaAt(theta,.80);let angle=parent?b.angle+theta:theta;
  const n={id:this.nextId++,parent:parent?parent.id:null,attach,theta,heading:angle,turn:0,length,stable:initial?length*.56:0,mt:initial?.25+.15*this.rng.next():.05,actin:.14+.65*this.rng.next(),inhibitor:0,wave:0,burst:this.rng.next()<.4,burstAge:0,age:0,velocity:0,adh:.5,fan:[],fanEta:[],nodes:[],filopodia:[],depth:this.rng.signed()*.65,lastState:'',lastChange:-20,lowAge:0};
  const count=Math.max(2,Math.ceil(length/1.4)+1),curve=this.rng.signed()*2;
  for(let j=0;j<count;j++){const s=j/(count-1)*length,off=curve*Math.sin(s/Math.max(length,1)*Math.PI)*Math.sin(s/Math.max(length,1)*2.4+.5);const x=b.x+Math.cos(angle)*s-Math.sin(angle)*off,y=b.y+Math.sin(angle)*s+Math.cos(angle)*off;n.nodes.push({x,y,ax:x,ay:y,rest:j?length/(count-1):0});}
  // Make material length equal the initial polyline arclength, not endpoint distance.
  n.length=0;for(let j=1;j<n.nodes.length;j++){n.nodes[j].rest=distance(n.nodes[j-1],n.nodes[j]);n.length+=n.nodes[j].rest;}
  n.stable=initial?n.length*.56:0;
  for(let j=0;j<48;j++){n.fan.push(1.1+1.3*n.actin);n.fanEta.push(0);}
  n.filopodia=Array.from({length:13},(_,i)=>this.makeFilo(-2.05+i*4.1/12));
  n.cortexKernel=Array.from({length:96},(_,i)=>Math.exp(-Math.pow(wrap(i/96*TAU-n.theta)/.34,2)));n.waveKernel=Array.from({length:96},(_,i)=>Math.exp(-Math.pow(wrap(i/96*TAU-n.theta)/.45,2)));this.neurites.push(n);if(!initial){this.stats.born++;this.event('branch','A lateral protrusion stabilized into process N'+n.id+'.',{id:n.id,parent:n.parent});}
  return n;
 }
 event(type,text,extra={}){this.events.unshift({t:this.time,type,text,...extra});if(this.events.length>500)this.events.length=500;}
 pulse(x,y,amount=1){if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>10000||Math.abs(y)>10000)return;this.pulses.push({x,y,amount:clamp(amount,0,2),age:0});if(this.pulses.length>32)this.pulses.shift();this.event('pulse','Local protrusive pulse applied.');}
 launchWave(id=null,manual=true){
  if(!this.neurites.length)return;
  let n=this.getNeurite(id);
  if(!n){let pool=this.neurites.filter(v=>v.parent===null);let weights=pool.map(v=>.5+v.actin*.8+v.mt*.3);let target=this.rng.next()*weights.reduce((a,b)=>a+b,0);n=pool[pool.length-1];for(let i=0;i<pool.length;i++){target-=weights[i];if(target<=0){n=pool[i];break;}}}
  this.waves.push({id:this.nextWaveId++,neurite:n.id,s:0,age:0,amplitude:1});this.stats.launched++;
  if(manual)this.osc.contraction=Math.max(this.osc.contraction,.85);
  this.event('wave','Somatic wave entered N'+n.id+'.',{id:n.id,manual});
 }
 step(dt=this.dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.08)throw Error('Timestep must be in (0, 0.08] model minutes.');
  const p=this.params,rng=this.rng,soma=this.soma,N=soma.r.length;
  this.time+=dt;this.steps++;
  // Phenomenological relaxation oscillator, NOT an identified molecular circuit.
  const o=this.osc,oldU=o.u,rate=.86;
  o.u+=dt*rate*(oldU-oldU*oldU*oldU/3-o.v+.64);
  o.v+=dt*rate*.085*(oldU+.7-.8*o.v);
  const globalTarget=p.coupling*clamp((o.u-.1)/1.5,0,1);
  o.contraction+=dt*.65*(globalTarget-o.contraction);
  if(oldU<.6&&o.u>=.6&&p.coupling>0)this.launchWave(null,false);
  const contraction=o.contraction*p.contractility;
  const aliveW=[];for(const w of this.waves){const n=this.getNeurite(w.neurite);if(!n)continue;w.age+=dt;w.s+=dt*p.waveSpeed;
   if(w.s>=n.length){n.wave=Math.min(1.8,n.wave+w.amplitude);this.stats.delivered++;this.event('arrival','Wave reached N'+n.id+'; local contractility relaxed.',{id:n.id});}else aliveW.push(w);
  }this.waves=aliveW;
  this.pulses.forEach(q=>q.age+=dt);this.pulses=this.pulses.filter(q=>q.age<15);
  let prevA=soma.a.slice(),prevH=soma.h.slice(),prevR=soma.r.slice();let area=0;for(let i=0;i<N;i++)area+=prevR[i]*prevR[(i+1)%N]*Math.sin(TAU/N)/2;
  const area0=170;let sx=0,sy=0;
  for(let i=0;i<N;i++){
   let theta=i*TAU/N,drive=.055,neural=0;const pt=this.somaAt(theta);
   for(const n of this.neurites){if(n.parent!==null)continue;let g=n.cortexKernel[i];drive+=g*(.35*n.actin+.5*n.wave);neural+=g*(.6+1.8*n.actin);}
   for(const w of this.waves){let n=this.getNeurite(w.neurite);if(n&&n.parent===null)drive+=n.waveKernel[i]*Math.exp(-w.s/6)*1.1;}
   for(const q of this.pulses)drive+=q.amount*Math.exp(-Math.pow(distance(pt,q)/6,2))*Math.exp(-q.age/5);
   soma.eta[i]+= -dt*.7*soma.eta[i]+Math.sqrt(dt)*.12*p.noise*rng.signed();
   const lap=prevA[(i+1)%N]+prevA[(i+N-1)%N]-2*prevA[i];
   soma.a[i]=clamp(prevA[i]+dt*(.55*p.polymerization*drive*(1-prevA[i])-.17*prevA[i]-.18*prevH[i]*prevA[i]+.65*lap+soma.eta[i]*.12),0,1.5);
   soma.h[i]=clamp(prevH[i]+dt*(.045*prevA[i]-.035*prevH[i]),0,2);
   const radLap=prevR[(i+1)%N]+prevR[(i+N-1)%N]-2*prevR[i];
   const force=1.8*soma.a[i]*p.polymerization*(.4+.6*this.resource)+.28*neural-.72*contraction-.18*p.contractility-.22*(prevR[i]-soma.r0[i])+1.6*radLap+.12*(area0-area)/area0;
   soma.r[i]=clamp(prevR[i]+dt*force/(1+.6*p.adhesion),4.2,15);
   sx+=Math.cos(theta)*(soma.r[i]-soma.r0[i]);sy+=Math.sin(theta)*(soma.r[i]-soma.r0[i]);
  }
  soma.x+=dt*.025*(sx/N*1.1-soma.x);soma.y+=dt*.025*(sy/N*1.1-soma.y);soma.nx+=dt*.08*(soma.x-soma.nx);soma.ny+=dt*.08*(soma.y-soma.ny);
  const candidates=[];let growing=0,releasing=0;
  for(const n of this.neurites){
   n.age+=dt;n.burstAge+=dt;n.wave*=Math.exp(-dt/10);
   const tip=n.nodes[n.nodes.length-1];
   const substrate=.58+.16*Math.sin(tip.x*.14+1)*Math.cos(tip.y*.12-.6);n.adh=clamp(p.adhesion*substrate,0,.97);
   if(p.noise>0){let hazard=n.burst?1/(11+8*n.adh):.035*(.4+.6*this.resource);if(rng.next()<hazard*dt*p.noise){n.burst=!n.burst;n.burstAge=0;}}
   let input=(n.burst?.9:.06)+n.wave*.95;
   for(const q of this.pulses)input+=1.3*q.amount*Math.exp(-Math.pow(distance(tip,q)/9,2))*Math.exp(-q.age/5);
   n.actin=clamp(n.actin+dt*(.3*p.polymerization*input*(1-n.actin)-(.085+.09*n.inhibitor)*n.actin),0,1.2);
   n.inhibitor=clamp(n.inhibitor+dt*(.035*n.actin-.025*n.inhibitor),0,2);
   n.mt=clamp(n.mt+dt*(.07*p.stabilization*n.actin*(.25+.75*n.adh)*(1-n.mt)-(.009+.018*(1-n.actin))*n.mt),0,1);
   const stableRate=.075*p.stabilization*n.mt*n.actin;
   n.stable=clamp(n.stable+dt*(stableRate*Math.max(0,n.length-n.stable)-.0025*(1-n.mt)*n.stable),0,n.length);
   const relief=clamp(n.wave*.9,0,.95);
   const forward=1.28*p.polymerization*n.actin*this.resource*(.35+.65*n.adh)+.14*n.mt*this.resource;
   const backward=(.34*p.contractility*(1-.6*n.adh)+.60*contraction*(1-relief))*(1-.55*n.mt)+.075;
   let velocity=forward-backward;
   if(velocity<0){const protectedFraction=clamp((n.stable+1.2-n.length)/2,0,1);velocity*=1-.85*protectedFraction;}
   if(n.length<1&&velocity<0)velocity*=clamp((n.length-.45)/.55,0,1);
   if(n.length>140&&velocity>0)velocity=0; // Explicit performance / domain cap.
   const delta=velocity*dt;
   if(delta>0)growing+=delta;else releasing-=delta;
   candidates.push({n,delta});
  }
  const used=this.neurites.reduce((s,n)=>s+n.length,0),available=Math.max(0,this.materialBudget-used)+releasing,alloc=growing>0?Math.min(1,available/growing):1;
  const toPrune=[];
  for(const {n,delta}of candidates){
   const change=delta>0?delta*alloc:delta;n.velocity=change/dt;
   if(change>0)this.stats.extended+=change;else this.stats.retracted-=change;
   n.turn+=-dt*.12*n.turn+Math.sqrt(dt)*.07*p.noise*rng.signed();
   const tail=n.nodes[n.nodes.length-1],pre=n.nodes[n.nodes.length-2];
   const tangent=Math.atan2(tail.y-pre.y,tail.x-pre.x);
   n.heading=wrap(n.heading+dt*(.32*wrap(tangent-n.heading)+n.turn*(1-.55*n.adh)));
   this.changeLength(n,change);
   n.stable=Math.min(n.stable,n.length);
   this.relaxMechanics(n,dt);
   this.updateFan(n,dt,contraction);
   for(const f of n.filopodia)this.updateFilo(f,dt,n.actin,n.adh,contraction,false);
   const state=n.velocity>.045?'extending':n.velocity<-.045?'retracting':'holding';
   if(state!==n.lastState&&this.time-n.lastChange>9){n.lastState=state;n.lastChange=this.time;}
   if(n.length<.85)n.lowAge+=dt;else n.lowAge=0;
   if(n.parent!==null){const parent=this.getNeurite(n.parent);if(!parent||parent.length<n.attach+.2||n.lowAge>14)toPrune.push(n.id);}
   // A branch can only appear after local activity AND structural support.
   if(p.noise>0&&n.length>12&&n.mt>.24&&n.actin>.38&&this.neurites.length<14&&this.resource>.15){
    const hazard=.012*p.branching*n.actin*n.adh;
    if(rng.next()<hazard*dt*p.noise){const where=n.length*(.42+.34*rng.next());if(!this.neurites.some(c=>c.parent===n.id&&Math.abs(c.attach-where)<4))this.addNeurite(n,(rng.next()<.5?-1:1)*(.65+.45*rng.next()),.8,where);}
   }
  }
  if(toPrune.length){let dead=new Set(toPrune);for(let k=0;k<15;k++)for(const n of this.neurites)if(dead.has(n.parent))dead.add(n.id);for(const n of this.neurites)if(dead.has(n.id)){this.stats.pruned++;this.event('withdrawal','Unsupported lateral process N'+n.id+' withdrew.',{id:n.id});}this.neurites=this.neurites.filter(n=>!dead.has(n.id));this.waves=this.waves.filter(w=>!dead.has(w.neurite));}
  for(const f of this.somaFilopodia){const j=Math.floor(((f.theta%TAU)+TAU)%TAU/TAU*N);this.updateFilo(f,dt,soma.a[j],.5*p.adhesion,contraction,true);}
  const nowUsed=this.neurites.reduce((s,n)=>s+n.length,0);this.resource=clamp((this.materialBudget-nowUsed)/this.reserveCapacity,0,1);
  if(this.time-this.lastSample>=1-1e-9)this.sample();
 }
 changeLength(n,change){
  if(Math.abs(change)<1e-12)return;
  const nodes=n.nodes;
  if(change>0){let tip=nodes[nodes.length-1];tip.x+=Math.cos(n.heading)*change;tip.y+=Math.sin(n.heading)*change;tip.rest+=change;n.length+=change;
   if(tip.rest>1.8){let prev=nodes[nodes.length-2];const split={x:(prev.x+tip.x)/2,y:(prev.y+tip.y)/2,ax:(prev.x+tip.x)/2,ay:(prev.y+tip.y)/2,rest:tip.rest/2};tip.rest/=2;nodes.splice(nodes.length-1,0,split);}
  }else{
   let remain=Math.min(-change,Math.max(0,n.length-.45));n.length-=remain;
   while(remain>1e-10&&nodes.length>=2){let tip=nodes[nodes.length-1],pre=nodes[nodes.length-2];if(remain>=tip.rest&&nodes.length>2){remain-=tip.rest;nodes.pop();}else{let take=Math.min(remain,Math.max(0,tip.rest)),d=distance(tip,pre),ratio=d>0?Math.max(0,1-take/d):0;tip.x=pre.x+(tip.x-pre.x)*ratio;tip.y=pre.y+(tip.y-pre.y)*ratio;tip.rest-=take;remain-=take;if(take<1e-10)break;}}
  }
 }
 relaxMechanics(n,dt){
  const nodes=n.nodes,b=this.baseOf(n);nodes[0].x=b.x;nodes[0].y=b.y;nodes[0].ax=b.x;nodes[0].ay=b.y;
  const fx=new Float64Array(nodes.length),fy=new Float64Array(nodes.length);
  for(let i=1;i<nodes.length;i++){let a=nodes[i-1],b=nodes[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-9,k=2.4*(d-b.rest)/d;fx[i]-=k*dx;fy[i]-=k*dy;if(i>1){fx[i-1]+=k*dx;fy[i-1]+=k*dy;}}
  for(let i=1;i<nodes.length;i++){let q=nodes[i],ageWeight=1-i/(nodes.length-1),adh=n.adh*(.2+.8*ageWeight);fx[i]+=(q.ax-q.x)*adh*.45;fy[i]+=(q.ay-q.y)*adh*.45;
   if(i<nodes.length-1){fx[i]+=.11*(nodes[i-1].x+nodes[i+1].x-2*q.x);fy[i]+=.11*(nodes[i-1].y+nodes[i+1].y-2*q.y);}
   const cap=Math.max(1,Math.hypot(fx[i],fy[i])/4);q.x+=dt*fx[i]/cap;q.y+=dt*fy[i]/cap;
   const strain=Math.hypot(q.x-q.ax,q.y-q.ay);if(strain>1.1){q.ax+=dt*.18*(q.x-q.ax);q.ay+=dt*.18*(q.y-q.ay);}
  }
 }
 updateFan(n,dt,contraction){
  const old=n.fan.slice(),N=old.length;
  for(let i=0;i<N;i++){const direction=FAN_DIRECTIONS[i];let local=0;
   for(let j=0;j<n.filopodia.length;j++)if(n.filopodia[j].on)local+=FILO_KERNEL[i][j];
   n.fanEta[i]+= -dt*.6*n.fanEta[i]+Math.sqrt(dt)*.16*this.params.noise*this.rng.signed();
   const target=(1.05+4.1*n.actin+1.2*n.wave)*direction+1.65*local-.6*contraction*(1-.75*n.mt);
   const lap=old[(i+1)%N]+old[(i+N-1)%N]-2*old[i];
   n.fan[i]=clamp(old[i]+dt*(.42*(target-old[i])+.8*lap+n.fanEta[i]),.38,8);
  }
 }
 updateFilo(f,dt,actin,adh,contraction,soma){
  const p=this.params;f.age+=dt;
  if(p.noise>0&&this.rng.next()<dt*(f.on?.09:.045+.06*actin)*p.noise){f.on=!f.on;f.age=0;f.target=f.on?(soma?.4:1)+(soma?2.1:4.9)*this.rng.next():0;}
  let target=f.on?f.target*(.25+.75*actin)*p.polymerization/(1+.35*contraction):0;
  f.length=clamp(f.length+dt*.5*(target-f.length),0,8);
  f.eta+=-dt*.5*f.eta+Math.sqrt(dt)*.12*p.noise*this.rng.signed();f.bend+=dt*(.3*(f.eta-f.bend));
 }
 somaPoints(){return this.soma.r.map((r,i)=>({x:this.soma.x+Math.cos(i/this.soma.r.length*TAU)*r,y:this.soma.y+Math.sin(i/this.soma.r.length*TAU)*r}));}
 metrics(){let length=0,geometric=0,stable=0,active=0,withdraw=0;for(const n of this.neurites){length+=n.length;geometric+=pathLength(n.nodes);stable+=n.stable;if(n.velocity>.045)active++;if(n.velocity<-.045)withdraw++;}return{time:this.time,material:length,geometric,stable,somaArea:polygonArea(this.somaPoints()),resource:this.resource,available:this.materialBudget-length,extending:active,retracting:withdraw,processes:this.neurites.length,actin:this.soma.a.reduce((s,v)=>s+v,0)/this.soma.a.length,contraction:this.osc.contraction,strain:100*(geometric-length)/Math.max(length,1e-9)};}
 sample(){this.lastSample=this.time;const m=this.metrics();this.history.push({...m,lengths:this.neurites.map(n=>({id:n.id,length:n.length,stable:n.stable,velocity:n.velocity}))});if(this.history.length>this.maxHistory)this.history.shift();}
 advance(minutes,dt=this.dt){if(!Number.isFinite(minutes)||minutes<0||minutes>10000)throw Error('Invalid duration.');const count=Math.floor((minutes+1e-9)/dt);for(let i=0;i<count;i++)this.step(dt);return this;}
 exportState(){return JSON.parse(JSON.stringify({schema:'whole-cell-remodeling/v1',version:this.version,seed:this.seed,params:this.params,time:this.time,steps:this.steps,dt:this.dt,nextId:this.nextId,nextWaveId:this.nextWaveId,rngState:this.rng.state,events:this.events,history:this.history,lastSample:this.lastSample,maxHistory:this.maxHistory,osc:this.osc,soma:this.soma,somaFilopodia:this.somaFilopodia,neurites:this.neurites,waves:this.waves,pulses:this.pulses,stats:this.stats,initialMaterial:this.initialMaterial,reserveCapacity:this.reserveCapacity,materialBudget:this.materialBudget,resource:this.resource}));}
 static fromState(data){
  if(!data||data.schema!=='whole-cell-remodeling/v1')throw Error('Not a compatible experiment file.');
  if(!Array.isArray(data.neurites)||data.neurites.length<1||data.neurites.length>14||!data.soma||data.soma.r?.length!==96)throw Error('Invalid morphology.');
  const check=(v,depth=0)=>{if(depth>24)throw Error('Invalid state nesting.');if(typeof v==='number'&&(!Number.isFinite(v)||Math.abs(v)>1e12))throw Error('Non-finite or excessive state value.');if(Array.isArray(v)){if(v.length>5000)throw Error('State array too large.');v.forEach(x=>check(x,depth+1));}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(k==='__proto__'||k==='constructor'||k==='prototype')throw Error('Invalid state key.');check(x,depth+1);}}};check(data);
  const s=new Simulation(data.seed,data.params);const state=JSON.parse(JSON.stringify(data));
  const keys=['version','seed','params','time','steps','dt','nextId','nextWaveId','events','history','lastSample','maxHistory','osc','soma','somaFilopodia','neurites','waves','pulses','stats','initialMaterial','reserveCapacity','materialBudget','resource'];
  for(const k of keys){if(state[k]===undefined)throw Error('Missing state field: '+k);s[k]=state[k];}s.rng.state=state.rngState>>>0;
  const errors=s.validate();if(errors.length)throw Error('Invalid experiment: '+errors.slice(0,3).join('; '));return s;
 }
 validate(){const errors=[];
  if(!(this.dt>0&&this.dt<=.08)||this.time<0||!Number.isInteger(this.steps)||this.steps<0)errors.push('Invalid clock');
  if(!(this.reserveCapacity>0)||!(this.materialBudget>0)||this.maxHistory<1||this.maxHistory>2400)errors.push('Invalid resource or history limit');
  if(!Array.isArray(this.events)||!Array.isArray(this.history)||!Array.isArray(this.waves)||!Array.isArray(this.pulses)||!Array.isArray(this.somaFilopodia)||this.somaFilopodia.length!==22)errors.push('Invalid state collection');
  if(!this.neurites.some(n=>n.parent===null))errors.push('No primary process');
  const m=this.metrics();for(const [k,v]of Object.entries(m))if(!Number.isFinite(v))errors.push('Nonfinite '+k);if(m.material>this.materialBudget+1e-6)errors.push('Material budget exceeded');if(this.resource<0||this.resource>1)errors.push('Resource out of bounds');const ids=new Set(this.neurites.map(n=>n.id));if(ids.size!==this.neurites.length)errors.push('Duplicate process ID');for(const n of this.neurites){if(n.length<.449||n.stable<0||n.stable>n.length+1e-6)errors.push('Length/support invalid N'+n.id);if(n.parent!==null&&!ids.has(n.parent))errors.push('Orphan process');if(!Array.isArray(n.nodes)||n.nodes.length<2||n.nodes.length>300)errors.push('Invalid node count');if(n.fan?.length!==48||n.fanEta?.length!==48||n.filopodia?.length!==13||n.cortexKernel?.length!==96||n.waveKernel?.length!==96)errors.push('Invalid fan or cortical kernel');if(!(n.actin>=0&&n.actin<=1.2)||!(n.mt>=0&&n.mt<=1))errors.push('Invalid activity/support');const ancestry=new Set([n.id]);let parent=n.parent;while(parent!==null&&parent!==undefined){if(ancestry.has(parent)){errors.push('Cyclic process graph');break;}ancestry.add(parent);parent=this.getNeurite(parent)?.parent;}for(const q of n.nodes)for(const k of ['x','y','ax','ay','rest'])if(!Number.isFinite(q[k]))errors.push('Invalid node');const rests=n.nodes.reduce((a,q)=>a+q.rest,0);if(Math.abs(rests-n.length)>1e-5)errors.push('Rest-length mismatch '+n.id);}for(const k of ['r','r0','a','h','eta'])if(this.soma[k]?.length!==96||!this.soma[k].every(Number.isFinite))errors.push('Invalid soma field '+k);return errors;}
}
return{Simulation,RNG,DEFAULTS,LIMITS,PRESETS,clamp,mix,distance,wrap,pathPoint,pathLength,polygonArea,TAU};
});
