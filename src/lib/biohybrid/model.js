import {createGeometry} from './geometry.js';
import {pointTransferUvPerNa,lineTransferUvPerNa,segmentDistance} from '../cortex/volume-conductor.js';
export {createGeometry};
export const MODEL_VERSION='biohybrid-hh-cable/1.0.0';
export const DEFAULT_SETTINGS=Object.freeze({
  graftCount:2,hostCount:3,connectedHosts:3,axonLengthUm:1000,axonDiameterUm:2,segmentLengthUm:25,scaffoldRadiusUm:90,
  axialResistivityOhmCm:100,temperatureC:6.3,sodiumScale:1,potassiumScale:1,conductivitySPerM:.3,
  stimAmplitudeUa:-24,stimStartMs:5,pulseWidthMs:.4,pulseGapMs:.1,pulseCount:2,pulseIntervalMs:15,
  stimXUm:0,stimYUm:0,stimDistanceUm:70,contactRadiusUm:15,recordDistanceUm:100,recordXOffsetUm:0,recordRadiusUm:12,
  synapticWeightUs:.025,synapticDelayMs:.7,synapticRiseMs:.3,synapticDecayMs:3,
  durationMs:40,dtMs:.005,sampleDtMs:.05,growthEnabled:false,seed:4281,
});
const ranges={graftCount:[1,4],hostCount:[1,5],connectedHosts:[0,5],axonLengthUm:[300,2500],axonDiameterUm:[.6,5],segmentLengthUm:[6.25,50],scaffoldRadiusUm:[55,200],
  axialResistivityOhmCm:[50,200],temperatureC:[6.3,23],sodiumScale:[.1,2],potassiumScale:[.5,2],conductivitySPerM:[.1,.6],
  stimAmplitudeUa:[-100,100],stimStartMs:[1,15],pulseWidthMs:[.05,2],pulseGapMs:[0,1],pulseCount:[1,4],pulseIntervalMs:[5,30],
  stimXUm:[-250,300],stimYUm:[-200,200],stimDistanceUm:[30,400],contactRadiusUm:[2,50],recordDistanceUm:[45,400],recordXOffsetUm:[-200,200],recordRadiusUm:[2,40],
  synapticWeightUs:[0,.1],synapticDelayMs:[.1,5],synapticRiseMs:[.1,1],synapticDecayMs:[2,8],durationMs:[15,100],dtMs:[.00125,.025],sampleDtMs:[.0125,.2],seed:[0,4294967295]};
export function normalizeSettings(input={}){
  const s={...DEFAULT_SETTINGS,...input};
  for(const [key,[lo,hi]] of Object.entries(ranges)){
    s[key]=Number(s[key]);if(!Number.isFinite(s[key])||s[key]<lo||s[key]>hi)throw new Error(`${key} must be between ${lo} and ${hi}.`);
  }
  for(const k of ['graftCount','hostCount','connectedHosts','pulseCount','seed'])if(!Number.isInteger(s[k]))throw new Error(`${k} must be an integer.`);
  s.connectedHosts=Math.min(s.connectedHosts,s.hostCount);s.growthEnabled=!!s.growthEnabled;
  if(s.synapticRiseMs>=s.synapticDecayMs)throw new Error('Synaptic rise must be shorter than decay.');
  if(s.pulseIntervalMs<=2*s.pulseWidthMs+s.pulseGapMs)throw new Error('Pulse phases may not overlap the next pulse.');
  if(Math.abs(s.sampleDtMs/s.dtMs-Math.round(s.sampleDtMs/s.dtMs))>1e-7)throw new Error('Sampling interval must be an integer multiple of timestep.');
  if(Math.abs(s.durationMs/s.sampleDtMs-Math.round(s.durationMs/s.sampleDtMs))>1e-7)throw new Error('Duration must be an integer multiple of sampling interval.');
  if(s.stimStartMs+(s.pulseCount-1)*s.pulseIntervalMs+2*s.pulseWidthMs+s.pulseGapMs>=s.durationMs)throw new Error('Duration must include every complete stimulus pulse.');
  return s;
}
const trap=(x,y)=>Math.abs(x/y)<1e-7?y*(1-x/y/2):x/Math.expm1(x/y);
// Hodgkin–Huxley rates matching NEURON hh.mod without rate-table interpolation.
// Q10=3 from canonical 6.3°C. This is NOT a mammalian/human-cell fit.
export function hhRates(v,temperatureC=6.3){
  const q=3**((temperatureC-6.3)/10);
  const am=.1*trap(-(v+40),10),bm=4*Math.exp(-(v+65)/18);
  const ah=.07*Math.exp(-(v+65)/20),bh=1/(1+Math.exp(-(v+35)/10));
  const an=.01*trap(-(v+55),10),bn=.125*Math.exp(-(v+65)/80);
  return [am/(am+bm),1/(q*(am+bm)),ah/(ah+bh),1/(q*(ah+bh)),an/(an+bn),1/(q*(an+bn))];
}
export function equilibriumMv(settings=DEFAULT_SETTINGS){
  const current=v=>{const [m,,h,,n]=hhRates(v,settings.temperatureC);return .12*settings.sodiumScale*m**3*h*(v-50)+.036*settings.potassiumScale*n**4*(v+77)+.0003*(v+54.3);};
  let lo=-90,hi=-45;
  for(let k=0;k<80;k++){const mid=(lo+hi)/2;if(current(mid)>0)hi=mid;else lo=mid;}
  return (lo+hi)/2;
}
export function createCable(nodes,settings){
  const n=nodes.length,f=()=>new Float64Array(n),rest=equilibriumMv(settings),r=hhRates(rest,settings.temperatureC);
  const c={nodes,settings,n,restMv:rest,voltageMv:f().fill(rest),previous:f(),capacitanceNf:f(),leakUs:f(),sodiumUs:f(),potassiumUs:f(),
    edgeUs:f(),sumEdgeUs:f(),diagonal:f(),rhs:f(),m:f().fill(r[0]),h:f().fill(r[2]),gateN:f().fill(r[4]),membraneCurrentNa:f(),capacitiveNa:f(),ionicNa:f(),synapticNa:f(),gNa:f(),gK:f()};
  nodes.forEach((node,i)=>{
    c.capacitanceNf[i]=node.areaUm2*1e-5;
    c.leakUs[i]=node.areaUm2*.01*.0003;
    c.sodiumUs[i]=node.areaUm2*.01*.12*settings.sodiumScale;
    c.potassiumUs[i]=node.areaUm2*.01*.036*settings.potassiumScale;
    c.edgeUs[i]=node.edgeUs;
    if(node.parent>=0){c.sumEdgeUs[i]+=node.edgeUs;c.sumEdgeUs[node.parent]+=node.edgeUs;}
  });return c;
}
export function stepCable(c,dt,{extracellularMv,synapticUs,injectionNa}={}){
  if(!(dt>0&&Number.isFinite(dt)))throw new Error('Timestep must be finite and positive.');
  const {n,nodes,voltageMv:v,diagonal:d,rhs:b,edgeUs:edge}=c;c.previous.set(v);
  for(let i=0;i<n;i++){
    const cap=c.capacitanceNf[i]/dt,syn=synapticUs?.[i]??0;
    const gna=c.sodiumUs[i]*c.m[i]**3*c.h[i],gk=c.potassiumUs[i]*c.gateN[i]**4;
    c.gNa[i]=gna;c.gK[i]=gk;
    d[i]=cap+c.leakUs[i]+gna+gk+c.sumEdgeUs[i]+syn;
    b[i]=cap*v[i]-c.leakUs[i]*54.3+gna*50-gk*77+(injectionNa?.[i]??0);
  }
  if(extracellularMv)for(let i=0;i<n;i++)if(nodes[i].parent>=0){
    const p=nodes[i].parent,force=edge[i]*(extracellularMv[p]-extracellularMv[i]);b[i]+=force;b[p]-=force;
  }
  for(let i=n-1;i>=0;i--)if(nodes[i].parent>=0){const p=nodes[i].parent,f=edge[i]/d[i];d[p]-=f*edge[i];b[p]+=f*b[i];}
  for(let i=0;i<n;i++){
    const p=nodes[i].parent;v[i]=(b[i]+(p>=0?edge[i]*v[p]:0))/d[i];
    if(!Number.isFinite(v[i])||v[i]<-250||v[i]>150)throw new Error('Cable voltage left the supported range; reduce stimulus or timestep.');
    if(nodes[i].areaUm2===0){c.membraneCurrentNa[i]=0;continue;}
    c.capacitiveNa[i]=c.capacitanceNf[i]*(v[i]-c.previous[i])/dt;
    c.ionicNa[i]=c.gNa[i]*(v[i]-50)+c.gK[i]*(v[i]+77)+c.leakUs[i]*(v[i]+54.3);
    c.synapticNa[i]=(synapticUs?.[i]??0)*v[i];
    c.membraneCurrentNa[i]=c.capacitiveNa[i]+c.ionicNa[i]+c.synapticNa[i];
    const r=hhRates(v[i],c.settings.temperatureC);
    c.m[i]=r[0]+(c.m[i]-r[0])*Math.exp(-dt/r[1]);
    c.h[i]=r[2]+(c.h[i]-r[2])*Math.exp(-dt/r[3]);
    c.gateN[i]=r[4]+(c.gateN[i]-r[4])*Math.exp(-dt/r[5]);
  }return c;
}
// Uniform current disk in an infinite real isotropic conductor; passive disk
// averaging for recording. No insulating substrate or polarization is solved.
export function diskSamples(contact,rings=4,angles=12){
  const normal=contact.normal??[0,0,1];
  if(Math.abs(normal[0])+Math.abs(normal[1])>1e-9||Math.abs(normal[2]-1)>1e-9)throw new Error('Only XY disk contacts are supported.');
  const samples=[];
  for(let r=0;r<rings;r++)for(let a=0;a<angles;a++){
    const radius=contact.radiusUm*Math.sqrt((r+.5)/rings),theta=2*Math.PI*(a+.5*(r%2))/angles;
    samples.push([contact.positionUm[0]+radius*Math.cos(theta),contact.positionUm[1]+radius*Math.sin(theta),contact.positionUm[2]]);
  }return samples;
}
// Full filled-disk clearance; segment distance is a convex 1D minimization.
export function diskMembraneClearanceUm(contact,node){
  const distanceSquared=p=>{const dz=p[2]-contact.positionUm[2],r=Math.max(0,Math.hypot(p[0]-contact.positionUm[0],p[1]-contact.positionUm[1])-contact.radiusUm);return dz*dz+r*r;};
  if(node.kind==='soma')return Math.sqrt(distanceSquared(node.centerUm))-node.diameterUm/2;
  const at=t=>node.startUm.map((v,k)=>v+(node.endUm[k]-v)*t);
  let lo=0,hi=1;
  for(let k=0;k<48;k++){const a=(2*lo+hi)/3,b=(lo+2*hi)/3;if(distanceSquared(at(a))<distanceSquared(at(b)))hi=b;else lo=a;}
  return Math.sqrt(Math.min(distanceSquared(at(0)),distanceSquared(at(1)),distanceSquared(at((lo+hi)/2))))-node.diameterUm/2;
}
export function prepareFields(geometry,s){
  const {nodes,contacts}=geometry,source=contacts.find(c=>c.kind==='stim'),ret=contacts.find(c=>c.kind==='return');
  const srcPoints=diskSamples(source),retPoints=diskSamples(ret),records=contacts.filter(c=>c.kind==='record');
  const guard=(contact,name)=>{for(const n of nodes){if(!n.areaUm2)continue;
    if(diskMembraneClearanceUm(contact,n)<3)throw new Error(`${name} intersects the modeled membrane or its 3 µm clearance. Increase electrode separation.`);
  }};
  for(let i=0;i<contacts.length;i++)for(let j=i+1;j<contacts.length;j++){
    const a=contacts[i],b=contacts[j];
    const axial=Math.abs(a.positionUm[2]-b.positionUm[2]);
    const radial=Math.max(0,Math.hypot(a.positionUm[0]-b.positionUm[0],a.positionUm[1]-b.positionUm[1])-a.radiusUm-b.radiusUm);
    if(Math.hypot(axial,radial)<3)throw new Error('Electrode disks overlap or violate 3 µm clearance.');
  }
  guard(source,'Stimulation disk');guard(ret,'Return disk');
  const transfer=(p,points)=>points.reduce((sum,q)=>sum+pointTransferUvPerNa(p,q,s.conductivitySPerM),0)/points.length;
  // µV/nA numerically equals mV/µA; stimulus current is µA.
  const stimulusMvPerUa=Float64Array.from(nodes,n=>transfer(n.centerUm,srcPoints)-transfer(n.centerUm,retPoints));
  const lead=records.map(contact=>{
    const samples=diskSamples(contact);guard(contact,contact.id);
    const coefficients=Float64Array.from(nodes,n=>!n.areaUm2?0:samples.reduce((sum,p)=>sum+(n.kind==='soma'?pointTransferUvPerNa(p,n.centerUm,s.conductivitySPerM):lineTransferUvPerNa(p,n.startUm,n.endUm,s.conductivitySPerM)),0)/samples.length);
    const artifactUvPerUa=1000*samples.reduce((sum,p)=>sum+transfer(p,srcPoints)-transfer(p,retPoints),0)/samples.length;
    return {id:contact.id,coefficients,artifactUvPerUa};
  });return {stimulusMvPerUa,lead,quadrature:{rings:4,angles:12,samples:48}};
}
export function stimulusAt(t,s){
  for(let j=0;j<s.pulseCount;j++){const u=t-s.stimStartMs-j*s.pulseIntervalMs;
    if(u>=0&&u<s.pulseWidthMs)return s.stimAmplitudeUa;
    if(u>=s.pulseWidthMs+s.pulseGapMs&&u<2*s.pulseWidthMs+s.pulseGapMs)return -s.stimAmplitudeUa;
  }return 0;
}
// Exact mean stimulus over a step, preserving charge at fractional phase edges.
export function stimulusMean(a,b,s){
  let charge=0;
  for(let j=0;j<s.pulseCount;j++){
    const t=s.stimStartMs+j*s.pulseIntervalMs;
    charge+=s.stimAmplitudeUa*Math.max(0,Math.min(b,t+s.pulseWidthMs)-Math.max(a,t));
    const q=t+s.pulseWidthMs+s.pulseGapMs;
    charge-=s.stimAmplitudeUa*Math.max(0,Math.min(b,q+s.pulseWidthMs)-Math.max(a,q));
  }return charge/(b-a);
}
const peakToPeak=values=>{let lo=Infinity,hi=-Infinity;for(const v of values){lo=Math.min(lo,v);hi=Math.max(hi,v);}return hi-lo;};
export function runSimulation(input={}, {onProgress}={}){
  const started=typeof performance!=='undefined'?performance.now():Date.now();
  const s=normalizeSettings(input),geometry=createGeometry(s),c=createCable(geometry.nodes,s),fields=prepareFields(geometry,s);
  const n=c.n,steps=Math.round(s.durationMs/s.dtMs),stride=Math.round(s.sampleDtMs/s.dtMs),frameCount=Math.floor(steps/stride)+1;
  const timeMs=new Float64Array(frameCount),voltageMv=new Float32Array(frameCount*n),stimulusUa=new Float64Array(frameCount);
  const traces=geometry.neurons.map(neuron=>({id:neuron.id,label:`${neuron.label} soma`,unit:'mV',nodeIndex:neuron.somaIndex,values:new Float64Array(frameCount)}));
  for(const neuron of geometry.neurons.filter(n=>n.role==='graft'))traces.push({id:`${neuron.id}:terminal`,label:`${neuron.label} tract tip`,unit:'mV',nodeIndex:neuron.terminalIndex,values:new Float64Array(frameCount)});
  const recordings=fields.lead.map(l=>({id:l.id,label:l.id.replace('rec-','Recording '),neuralUv:new Float64Array(frameCount),artifactUv:new Float64Array(frameCount),totalUv:new Float64Array(frameCount)}));
  const gSyn=new Float64Array(n),ve=new Float64Array(n),spikes=[],synapticEvents=[];
  const syn=geometry.synapses.map(x=>({...x,a:0,b:0,pending:[]}));
  const peakTime=s.synapticRiseMs*s.synapticDecayMs/(s.synapticDecayMs-s.synapticRiseMs)*Math.log(s.synapticDecayMs/s.synapticRiseMs);
  const norm=1/(Math.exp(-peakTime/s.synapticDecayMs)-Math.exp(-peakTime/s.synapticRiseMs));
  const decayA=Math.exp(-s.dtMs/s.synapticRiseMs),decayB=Math.exp(-s.dtMs/s.synapticDecayMs);
  let maxCurrentBalanceNa=0,maxAbsVoltageMv=Math.abs(c.restMv),frame=0;
  const monitors=geometry.neurons.flatMap(neuron=>[{neuronId:neuron.id,kind:'soma',index:neuron.somaIndex},{neuronId:neuron.id,kind:'terminal',index:neuron.terminalIndex}]);
  const save=(t,current)=>{
    timeMs[frame]=t;voltageMv.set(c.voltageMv,frame*n);stimulusUa[frame]=current;
    for(const tr of traces)tr.values[frame]=c.voltageMv[tr.nodeIndex];
    for(let k=0;k<recordings.length;k++){
      const tr=recordings[k],lead=fields.lead[k];let neural=0;
      for(let i=0;i<n;i++)neural+=lead.coefficients[i]*c.membraneCurrentNa[i];
      tr.neuralUv[frame]=neural;tr.artifactUv[frame]=lead.artifactUvPerUa*current;tr.totalUv[frame]=tr.neuralUv[frame]+tr.artifactUv[frame];
    }frame++;
  };
  save(0,0);
  for(let step=0;step<steps;step++){
    const t=step*s.dtMs,now=(step+1)*s.dtMs,current=stimulusMean(t,now,s);
    gSyn.fill(0);
    for(const x of syn){
      while(x.pending.length&&x.pending[0]<=t+1e-10){const eventTime=x.pending.shift();x.a+=x.weightUs*norm;x.b+=x.weightUs*norm;synapticEvents.push({id:x.id,timeMs:eventTime,appliedTimeMs:t,postNeuronId:x.postNeuronId});}
      gSyn[x.postIndex]+=x.b-x.a;
    }
    for(let i=0;i<n;i++)ve[i]=fields.stimulusMvPerUa[i]*current;
    stepCable(c,s.dtMs,{extracellularMv:ve,synapticUs:gSyn});
    for(const x of syn){
      if(x.weightUs>0&&c.previous[x.preIndex]<0&&c.voltageMv[x.preIndex]>=0){const fraction=-c.previous[x.preIndex]/(c.voltageMv[x.preIndex]-c.previous[x.preIndex]);x.pending.push(t+fraction*s.dtMs+x.delayMs);}
      x.a*=decayA;x.b*=decayB;
    }
    for(const mon of monitors)if(c.previous[mon.index]<0&&c.voltageMv[mon.index]>=0){
      const fraction=-c.previous[mon.index]/(c.voltageMv[mon.index]-c.previous[mon.index]);spikes.push({neuronId:mon.neuronId,kind:mon.kind,timeMs:t+fraction*s.dtMs});
    }
    if((step+1)%stride===0){
      save(now,current);
      let balance=0;for(let i=0;i<n;i++){balance+=c.membraneCurrentNa[i];maxAbsVoltageMv=Math.max(maxAbsVoltageMv,Math.abs(c.voltageMv[i]));}
      maxCurrentBalanceNa=Math.max(maxCurrentBalanceNa,Math.abs(balance));
    }
    if(onProgress&&step%Math.max(1,Math.floor(steps/10))===0)onProgress(step/steps);
  }
  const first=(neuronId,kind)=>spikes.find(p=>p.neuronId===neuronId&&p.kind===kind)?.timeMs??null;
  const graft=geometry.neurons.find(n=>n.role==='graft'),firstSoma=first(graft.id,'soma'),firstTerminal=first(graft.id,'terminal');
  const hostSpikes=spikes.filter(p=>p.kind==='soma'&&p.neuronId.startsWith('host'));
  const relayHosts=new Set(hostSpikes.filter(p=>synapticEvents.some(e=>e.postNeuronId===p.neuronId&&e.appliedTimeMs<p.timeMs)).map(p=>p.neuronId));
  const earlyHostSpikes=hostSpikes.filter(p=>!synapticEvents.some(e=>e.postNeuronId===p.neuronId&&e.appliedTimeMs<p.timeMs));
  const somaSpikeCount=spikes.filter(p=>p.kind==='soma').length;
  const recruitedHosts=new Set(hostSpikes.map(p=>p.neuronId)).size;
  const conductionDelayMs=firstSoma!==null&&firstTerminal!==null?firstTerminal-firstSoma:null;
  const firstHost=hostSpikes[0]?.timeMs??null;
  let trunkPathLengthUm=0,pathIndex=graft.terminalIndex;
  while(pathIndex!==graft.somaIndex&&pathIndex>=0){const node=geometry.nodes[pathIndex],p=node.parent;if(p<0)break;trunkPathLengthUm+=Math.hypot(...node.centerUm.map((v,k)=>v-geometry.nodes[p].centerUm[k]));pathIndex=p;}
  const metrics={compartments:n,membraneCompartments:geometry.nodes.filter(n=>n.areaUm2>0).length,graftCount:s.graftCount,hostCount:s.hostCount,recruitedHosts,somaSpikeCount,
    conductionDelayMs,trunkPathLengthUm,conductionVelocityMPerS:conductionDelayMs>0?trunkPathLengthUm/1000/conductionDelayMs:null,
    relayDelayMs:firstHost!==null&&firstSoma!==null?firstHost-firstSoma:null,firstGraftSpikeMs:firstSoma,firstHostSpikeMs:firstHost,
    recordingPeakToPeakUv:recordings.map(r=>peakToPeak(r.neuralUv)),successfulTransmission:relayHosts.size>0,relayConsistentHosts:relayHosts.size,earlyHostSpikes:earlyHostSpikes.length,
    synapticEvents:synapticEvents.length,activeConnections:geometry.synapses.filter(x=>x.weightUs>0).length};
  const finished=typeof performance!=='undefined'?performance.now():Date.now();
  const diagnostics={modelVersion:MODEL_VERSION,restMv:c.restMv,temperatureC:s.temperatureC,dtMs:s.dtMs,sampleDtMs:s.sampleDtMs,segmentLengthUm:s.segmentLengthUm,
    steps,frames:frameCount,maxCurrentBalanceNa,maxAbsVoltageMv,elapsedMs:finished-started,quadrature:fields.quadrature,
    solver:'Backward Euler tree solve; voltage first, Rush–Larsen HH gates second; exact sampled pulse charge; double-exponential event synapses',
    calibration:'Generic canonical HH benchmark; synthetic geometry; not calibrated to mammalian cells, graft integration, or clinical outcomes'};
  onProgress?.(1);
  return {modelVersion:MODEL_VERSION,settings:s,geometry,timeMs,voltageMv,traces,recordings,stimulusUa,spikes,synapticEvents,metrics,diagnostics};
}
