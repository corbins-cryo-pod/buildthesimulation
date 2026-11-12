/** Stage 2 additive extension of pinned Stage 1 mrg.mjs. Original file unchanged.
 * No-driver equivalence is a required test. Only the membrane-mechanism hook differs. */
/**
 * MRG motor-fiber electrical benchmark, reconstructed after executor loss.
 * This source is a new revision, not the byte-identical formerly verified file.
 * The independent NEURON studies must be rerun for this revision.
 * Units: um, ms, mV, nA, nF and uS. No voltage or current clipping is used.
 */
export const MRG_VERSION='mrg-double-cable-2.1.0-bipolar-stage2-transmembrane-1';
export const MRG_SOURCE=Object.freeze({
  repository:'https://github.com/ModelDBRepository/3810',
  commit:'b15daeda6ea368df0198d257f339cf5e840cf31c',
  channelBlob:'d1db4d2276a0e4ecdc8293d0dfe5a0e16e2e633c',
  morphologyBlob:'aea3c2ce9537c007f4bdd47bf284a6d7632b1942',
  doi:'10.1152/jn.00353.2001',
  scope:'Published MRG somatic motor-fiber benchmark; not spiral-ganglion or engineered-cell calibration.'
});
const source=`Published MRG model parameter, ModelDB 3810 at ${MRG_SOURCE.commit}; not measured engineered-cell calibration`;
const parameter=(value,units,evidence='mathematical',provenance=source)=>Object.freeze({value,units,evidence,source:provenance});
export const MRG_PARAMETERS=Object.freeze({
  temperatureC:parameter(37,'degC'),vInitMv:parameter(-80,'mV'),
  gnabar:parameter(3,'S/cm2'),gnapbar:parameter(.01,'S/cm2'),gkbar:parameter(.08,'S/cm2'),gl:parameter(.007,'S/cm2'),
  ena:parameter(50,'mV'),ek:parameter(-90,'mV'),el:parameter(-90,'mV'),
  cm:parameter(2,'uF/cm2'),rhoa:parameter(.7e6,'ohm um'),
  myelinCmPerLamella:parameter(.1,'uF/cm2'),myelinGPerLamella:parameter(.001,'S/cm2'),
  q10:parameter({mp:2.2,m:2.2,h:2.9,s:3,referenceC:{mp:20,m:20,h:20,s:36}},'dimensionless'),
  equilibrationMs:parameter(20,'ms','estimated','Declared numerical equilibration, without changing leak reversal or channel constants'),
  somaActiveScale:parameter(0,'dimensionless','hypothetical','Optional passive central load; not a calibrated soma or demonstrated cell phenotype')
});
export const MRG_DIAMETERS=Object.freeze([5.7,7.3,8.7,10,11.5,12.8,14,15,16]);
const table=[
  [5.7,3.4,1.9,500,35,80],[7.3,4.6,2.4,750,38,100],[8.7,5.8,2.8,1000,40,110],
  [10,6.9,3.3,1150,46,120],[11.5,8.1,3.7,1250,50,130],[12.8,9.2,4.2,1350,54,135],
  [14,10.4,4.7,1400,56,140],[15,11.5,5,1450,58,145],[16,12.7,5.5,1500,60,150]
];
const finite=(x,name)=>{if(!Number.isFinite(x))throw new Error(`${name} must be finite.`);return x;};
const positive=(x,name)=>{finite(x,name);if(x<=0)throw new Error(`${name} must be positive.`);return x;};
const integer=(x,name,min=1)=>{if(!Number.isInteger(x)||x<min)throw new Error(`${name} must be an integer >= ${min}.`);return x;};

export function createMorphology({fiberDiameterUm=10,nodes=11,passiveSegments=3,temperatureC=37,originUm=[0,0,0],somaDiameterUm=0,somaActiveScale=0}={}){
  const row=table.find(r=>r[0]===fiberDiameterUm);
  if(!row)throw new Error(`Fiber diameter must be a published MRG table entry: ${MRG_DIAMETERS.join(', ')} um.`);
  integer(nodes,'nodes',5);if(nodes%2!==1)throw new Error('nodes must be odd to define a central initiation region.');
  integer(passiveSegments,'passiveSegments');if(passiveSegments%2!==1)throw new Error('passiveSegments must be odd.');
  if(temperatureC!==37)throw new Error('This model supports the declared 37 degC benchmark.');
  if(!Array.isArray(originUm)||originUm.length!==3||!originUm.every(Number.isFinite))throw new Error('originUm must contain three finite coordinates.');
  finite(somaDiameterUm,'somaDiameterUm');if(somaDiameterUm<0)throw new Error('somaDiameterUm cannot be negative.');
  finite(somaActiveScale,'somaActiveScale');if(somaActiveScale<0||somaActiveScale>1)throw new Error('somaActiveScale must lie in [0,1].');
  const [,axonD,nodeD,deltax,paralength2,nl]=row,interlength=(deltax-1-6-2*paralength2)/6;
  const compartments=[],nodeIndices=[],sections=[];let z=0;
  function add(kind,length,inner,outer,space,nodeOrdinal=null){
    const sectionIndex=sections.length,segments=kind==='NODE'?1:passiveSegments;
    const section={index:sectionIndex,kind,lengthUm:length,diameterUm:outer,axonDiameterUm:inner,spaceUm:space,nseg:segments,nodeOrdinal};
    section.startIndex=compartments.length;sections.push(section);
    for(let s=0;s<segments;s++){
      const L=length/segments,areaCm2=Math.PI*outer*L*1e-8,isNode=kind==='NODE';
      const centralSoma=isNode&&nodeOrdinal===(nodes-1)/2&&somaDiameterUm>0;
      const densityScale=isNode?1:inner/outer;
      const c={index:compartments.length,kind,sectionIndex,segment:s,nodeOrdinal,lengthUm:L,diameterUm:outer,axonDiameterUm:inner,spaceUm:space,
        areaCm2,zUm:z+L/2,positionUm:null,cmNf:2*densityScale*areaCm2*1000,
        leakUs:(isNode?.007:kind==='MYSA'?.001*densityScale:.0001*densityScale)*areaCm2*1e6,
        leakReversalMv:isNode?-90:-80,activeScale:centralSoma?somaActiveScale:isNode?1:0,
        myelinCapNf:(isNode?0:.1/(2*nl))*areaCm2*1000,
        myelinGUs:(isNode?1e10:.001/(2*nl))*areaCm2*1e6,
        axialResistanceOhm:.7e6*L/(Math.PI*inner*inner/4),
        periaxonalResistanceOhm:.7e6*L/(Math.PI*((inner/2+space)**2-(inner/2)**2)),
        hypotheticalSoma:centralSoma};
      compartments.push(c);if(isNode)nodeIndices.push(c.index);z+=L;
    }
  }
  for(let n=0;n<nodes;n++){
    const soma=n===(nodes-1)/2&&somaDiameterUm>0;
    add('NODE',soma?somaDiameterUm:1,soma?somaDiameterUm:nodeD,soma?somaDiameterUm:nodeD,.002,n);
    if(n<nodes-1){add('MYSA',3,nodeD,fiberDiameterUm,.002);add('FLUT',paralength2,axonD,fiberDiameterUm,.004);
      for(let k=0;k<6;k++)add('STIN',interlength,axonD,fiberDiameterUm,.004);
      add('FLUT',paralength2,axonD,fiberDiameterUm,.004);add('MYSA',3,nodeD,fiberDiameterUm,.002);}
  }
  const center=compartments[nodeIndices[(nodes-1)/2]].zUm;
  for(const c of compartments){c.zUm+=originUm[2]-center;c.positionUm=[originUm[0],originUm[1],c.zUm];}
  const axialUs=new Float64Array(compartments.length-1),periaxonalUs=new Float64Array(axialUs.length);
  for(let i=0;i<axialUs.length;i++){
    axialUs[i]=2e6/(compartments[i].axialResistanceOhm+compartments[i+1].axialResistanceOhm);
    periaxonalUs[i]=2e6/(compartments[i].periaxonalResistanceOhm+compartments[i+1].periaxonalResistanceOhm);
  }
  return {modelVersion:MRG_VERSION,fiberDiameterUm,nodes,passiveSegments,temperatureC,originUm:[...originUm],somaDiameterUm,somaActiveScale,
    lengthUm:z,compartments,sections,nodeIndices,centralNodeIndex:nodeIndices[(nodes-1)/2],axialUs,periaxonalUs,
    nodePositionsUm:nodeIndices.map(i=>compartments[i].zUm),
    modelBoundary:somaDiameterUm>0?'MRG motor-fiber cable with hypothetical central cylindrical load; no calibrated ganglion morphology.':MRG_SOURCE.scope};
}

// Singular limits and the below -100 exponential convention match AXNODE.mod.
const Exp=x=>x< -100?0:Math.exp(x);
function forward(v,b,c,a){const x=(v+b)/c;return Math.abs(x)<1e-6?a*c:a*(v+b)/(1-Exp(-x));}
function backward(v,b,c,a){const x=(v+b)/c;return Math.abs(x)<1e-6?a*c:a*-(v+b)/(1-Exp(x));}
const q1=2.2**1.7,q2=2.9**1.7,q3=3**.1;
function rates(v){
  const a=[q1*forward(v,27,10.2,.01),q1*forward(v,21.4,10.3,1.86),q2*backward(v,114,11,.062),q3*.3/(Exp((v+53)/-5)+1)];
  const b=[q1*backward(v,34,10,.00025),q1*backward(v,25.7,9.16,.086),q2*2.3/(1+Exp(-(v+31.8)/13.4)),q3*.03/(Exp((v+90)/-1)+1)];
  return a.map((x,k)=>[x/(x+b[k]),x+b[k]]);
}
function freshState(morphology){
  const n=morphology.compartments.length,v=new Float64Array(n).fill(-80),w=new Float64Array(n),gates=Array.from({length:4},()=>new Float64Array(n));
  const r=rates(-80);for(const i of morphology.activeSiteIndices??morphology.nodeIndices)for(let k=0;k<4;k++)gates[k][i]=r[k][0];
  return {v,w,gates};
}
function publicState(s){return {v:Array.from(s.v),periaxonal:Array.from(s.w),gates:{mp:Array.from(s.gates[0]),m:Array.from(s.gates[1]),h:Array.from(s.gates[2]),s:Array.from(s.gates[3])}};}
function copyState(s,morphology){
  const n=morphology.compartments.length,gg=Array.isArray(s.gates)?s.gates:[s.gates?.mp,s.gates?.m,s.gates?.h,s.gates?.s];
  const result={v:Float64Array.from(s.v||[]),w:Float64Array.from(s.periaxonal||s.w||[]),gates:gg.map(a=>Float64Array.from(a||[]))};
  if(result.v.length!==n||result.w.length!==n||result.gates.length!==4||result.gates.some(a=>a.length!==n)||[result.v,result.w,...result.gates].some(a=>!a.every(Number.isFinite)))throw new Error('initialState shape or values do not match this morphology.');
  return result;
}
const equilibriumCache=new Map();
export function clearEquilibriumCache(){equilibriumCache.clear();}

function makeStepper(morphology,dtMs,state,silenced){
  const cs=morphology.compartments,n=cs.length,gi=morphology.axialUs,gp=morphology.periaxonalUs;
  const activeSites=morphology.activeSiteIndices??morphology.nodeIndices,activeMask=new Uint8Array(n);for(const i of activeSites)activeMask[i]=1;
  const invA=new Float64Array(n),invB=new Float64Array(n),invC=new Float64Array(n),uv=new Float64Array(n),uw=new Float64Array(n);
  const phi=new Float64Array(n),injected=new Float64Array(n),dvphi=new Float64Array(n),dwphi=new Float64Array(n),oldV=new Float64Array(n),oldW=new Float64Array(n);
  const membraneCurrent=new Float64Array(n),membraneSlope=new Float64Array(n);
  let maxResidual=0;
  function step(){
    const {v,w,gates}=state;oldV.set(v);oldW.set(w);dvphi.fill(0);dwphi.fill(0);
    for(let i=0;i<n-1;i++){const d=phi[i]-phi[i+1],a=gi[i]*d,b=(gi[i]+gp[i])*d;dvphi[i]+=a;dvphi[i+1]-=a;dwphi[i]+=b;dwphi[i+1]-=b;}
    for(let i=0;i<n;i++){
      const c=cs[i],dl=i?gi[i-1]:0,dr=i<n-1?gi[i]:0,pl=i?gp[i-1]:0,pr=i<n-1?gp[i]:0;
      let g=c.leakUs,ge=g*c.leakReversalMv;
      if(activeMask[i]&&!silenced.has(i)&&c.activeScale>0){
        const scale=c.areaCm2*1e6*c.activeScale;
        const gn=scale*(3*gates[1][i]**3*gates[2][i]+.01*gates[0][i]**3),gk=scale*.08*gates[3][i];
        g+=gn+gk;ge+=gn*50-gk*90;
      }
      // Outward transmembrane current belongs in the inner equation only.
      g+=membraneSlope[i];ge+=membraneSlope[i]*v[i]-membraneCurrent[i];
      let a=c.cmNf/dtMs+g+dl+dr,b=dl+dr,d=c.myelinCapNf/dtMs+c.myelinGUs+dl+dr+pl+pr;
      let rv=c.cmNf/dtMs*v[i]+ge+injected[i]-dvphi[i],rw=c.myelinCapNf/dtMs*w[i]+injected[i]-dwphi[i];
      if(i){const x=gi[i-1],y=x+gp[i-1],ia=invA[i-1],ib=invB[i-1],ic=invC[i-1];
        const t00=x*(ia+ib),t01=x*(ib+ic),t10=x*ia+y*ib,t11=x*ib+y*ic;
        a-=x*(t00+t01);b-=t00*x+t01*y;d-=t10*x+t11*y;
        rv+=x*(uv[i-1]+uw[i-1]);rw+=x*uv[i-1]+y*uw[i-1];}
      const det=a*d-b*b;if(!(det>0)||!Number.isFinite(det))throw new Error('Double-cable matrix lost positive definiteness.');
      invA[i]=d/det;invB[i]=-b/det;invC[i]=a/det;uv[i]=invA[i]*rv+invB[i]*rw;uw[i]=invB[i]*rv+invC[i]*rw;
    }
    for(let i=n-1;i>=0;i--){let rv=0,rw=0;if(i<n-1){rv=gi[i]*(v[i+1]+w[i+1]);rw=gi[i]*v[i+1]+(gi[i]+gp[i])*w[i+1];}
      v[i]=uv[i]+invA[i]*rv+invB[i]*rw;w[i]=uw[i]+invB[i]*rv+invC[i]*rw;
      if(!Number.isFinite(v[i])||!Number.isFinite(w[i])||v[i]<-250||v[i]>150)throw new Error(`Unsupported membrane state at compartment ${i}: ${v[i]} mV; no clipping applied.`);
    }
    for(const i of activeSites){const r=rates(v[i]);for(let k=0;k<4;k++)gates[k][i]=r[k][0]+(gates[k][i]-r[k][0])*Math.exp(-dtMs*r[k][1]);}
  }
  function currents(checkResidual=true){
    const axial=Float64Array.from(injected),outer=Float64Array.from(injected),{v,w}=state;
    for(let i=0;i<n-1;i++){
      const a=gi[i]*(v[i]-v[i+1]+w[i]-w[i+1]+phi[i]-phi[i+1]),p=gp[i]*(w[i]-w[i+1]+phi[i]-phi[i+1]);
      axial[i]-=a;axial[i+1]+=a;outer[i]-=a+p;outer[i+1]+=a+p;
    }
    if(checkResidual)for(let i=0;i<n;i++){const c=cs[i],my=c.myelinCapNf*(w[i]-oldW[i])/dtMs+c.myelinGUs*w[i];maxResidual=Math.max(maxResidual,Math.abs(outer[i]-my));}
    return {outer:Array.from(outer),axolemma:Array.from(axial)};
  }
  return {step,phi,injected,membraneCurrent,membraneSlope,oldV,oldW,currents,get maxResidual(){return maxResidual;}};
}

function propagation(morphology,nodeEventTimes){
  const center=(morphology.nodes-1)/2;
  function arm(direction){
    const declared=morphology.armMonitors?.[direction>0?'central':'peripheral'];
    const ordinals=morphology.armMonitors?(declared?.nodeOrdinals??[]):[1,2,3].map(k=>center+direction*k).filter(k=>k>=0&&k<morphology.nodes),indices=ordinals.map(k=>morphology.nodeIndices[k]);
    const times=ordinals.map(k=>nodeEventTimes[k][0]??null),valid=times.length===3&&times.every(Number.isFinite)&&times.every((t,i)=>!i||t>times[i-1]);
    const velocity=valid?Math.abs(morphology.compartments[indices[2]].zUm-morphology.compartments[indices[0]].zUm)/(times[2]-times[0])*1e-3:null;
    return {nodeOrdinals:ordinals,compartmentIndices:indices,timesMs:times,propagated:valid,velocityMps:velocity};
  }
  let firstCrossingNode=null,first=Infinity;for(let i=0;i<nodeEventTimes.length;i++)if(nodeEventTimes[i][0]<first){first=nodeEventTimes[i][0];firstCrossingNode=i;}
  const leftArm=arm(-1),rightArm=arm(1);
  return {firstCrossingNode,firstCrossingTimeMs:Number.isFinite(first)?first:null,leftArm,rightArm,leftVelocityMps:leftArm.velocityMps,rightVelocityMps:rightArm.velocityMps,propagated:leftArm.propagated||rightArm.propagated};
}

export function simulateCable({morphology=createMorphology(),dtMs,durationMs=6,equilibrationMs,transferMvPerUa=null,waveform=null,extracellularMv=null,injectedCurrentNa=null,silencedCompartments=[],recordIndices=null,traceStride=1,saveCurrents=true,initialState=null,maxNodeSteps=Infinity,maxSavedValues=Infinity,maxEventsPerNode=Infinity,membraneMechanism=null,onSample=null}={}){
  dtMs??=morphology.numericalDefaults?.dtMs??.00125;equilibrationMs??=morphology.numericalDefaults?.equilibrationMs??20;
  positive(dtMs,'dtMs');positive(durationMs,'durationMs');finite(equilibrationMs,'equilibrationMs');if(equilibrationMs<0)throw new Error('equilibrationMs cannot be negative.');integer(traceStride,'traceStride');
  const n=morphology.compartments.length,steps=Math.round(durationMs/dtMs),preSteps=Math.round(equilibrationMs/dtMs);
  if(Math.abs(steps*dtMs-durationMs)>1e-9||Math.abs(preSteps*dtMs-equilibrationMs)>1e-9)throw new Error('Duration and equilibration must be integer multiples of dtMs.');
  const indices=recordIndices===null?[...(morphology.recordingIndices??morphology.nodeIndices)]:Array.from(recordIndices);
  if(new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=n))throw new Error('recordIndices must be unique valid compartment indices.');
  const silenced=new Set(silencedCompartments);if([...silenced].some(i=>!Number.isInteger(i)||i<0||i>=n))throw new Error('Invalid silenced compartment.');
  if(maxEventsPerNode!==Infinity)integer(maxEventsPerNode,'maxEventsPerNode');
  const samples=Math.floor(steps/traceStride)+1+(steps%traceStride?1:0),saved=samples*(indices.length+(saveCurrents?2*n:0)+1);
  if(steps*n>maxNodeSteps)throw new Error(`Cable work budget exceeded: ${steps*n} compartment steps.`);
  if(saved>maxSavedValues)throw new Error(`Saved-value budget exceeded: ${saved} values.`);
  if(transferMvPerUa&&(transferMvPerUa.length!==n||!Array.from(transferMvPerUa).every(Number.isFinite)))throw new Error('Transfer array must contain one finite mV/uA coefficient per compartment.');
  const key=JSON.stringify([morphology.equilibriumKey??[morphology.fiberDiameterUm,morphology.nodes,morphology.passiveSegments,morphology.somaDiameterUm,morphology.somaActiveScale],dtMs,equilibrationMs]);
  let state;
  if(initialState)state=copyState(initialState,morphology);
  else if(equilibriumCache.has(key))state=copyState(equilibriumCache.get(key),morphology);
  else{state=freshState(morphology);const prep=makeStepper(morphology,dtMs,state,new Set());for(let k=0;k<preSteps;k++)prep.step();equilibriumCache.set(key,publicState(state));}
  const started=publicState(state),advance=makeStepper(morphology,dtMs,state,silenced),timesMs=[],membraneMv=indices.map(()=>[]),periaxonalMv=indices.map(()=>[]),outerCurrentsNa=saveCurrents?[]:null,axolemmaCurrentsNa=saveCurrents?[]:null;
  const events=[],nodeEventTimes=morphology.nodeIndices.map(()=>[]),activeSites=morphology.activeSiteIndices??morphology.nodeIndices;
  const nodeOrdinalByIndex=new Map(morphology.nodeIndices.map((index,ordinal)=>[index,ordinal]));
  const activeSiteEventTimes=activeSites.map(i=>nodeOrdinalByIndex.has(i)?nodeEventTimes[nodeOrdinalByIndex.get(i)]:[]);
  let minMv=Infinity,maxMv=-Infinity,maxZeroInputDriftMv=0;
  function save(t,checkResidual){timesMs.push(t);for(let r=0;r<indices.length;r++){membraneMv[r].push(state.v[indices[r]]);periaxonalMv[r].push(state.w[indices[r]]);}if(saveCurrents||onSample){const c=advance.currents(checkResidual);if(saveCurrents){outerCurrentsNa.push(c.outer);axolemmaCurrentsNa.push(c.axolemma);}if(onSample)onSample(t,c);}}
  save(0,false);
  for(let k=0;k<steps;k++){
    const t=k*dtMs,amp=waveform?finite(waveform(t),'waveform current'):0;
    for(let i=0;i<n;i++){
      advance.phi[i]=extracellularMv?finite(extracellularMv(t,i),'extracellular voltage'):transferMvPerUa?transferMvPerUa[i]*amp:0;
      advance.injected[i]=typeof injectedCurrentNa==='function'?finite(injectedCurrentNa(t,i),'injected current'):Array.isArray(injectedCurrentNa)||ArrayBuffer.isView(injectedCurrentNa)?finite(injectedCurrentNa[i]??0,'injected current'):0;
    }
    if(membraneMechanism){
      const extra=membraneMechanism(t,dtMs,state.v);
      if(!extra||extra.currentNa?.length!==n||extra.derivativeUs?.length!==n)throw new Error('Membrane mechanism requires complete current and derivative arrays.');
      for(let i=0;i<n;i++){
        advance.membraneCurrent[i]=finite(extra.currentNa[i],'outward membrane current');
        advance.membraneSlope[i]=finite(extra.derivativeUs[i],'membrane current derivative');
        if(advance.membraneSlope[i]<0)throw new Error('This implicit membrane hook requires nonnegative current derivative.');
      }
    }
    advance.step();
    for(let i=0;i<n;i++){minMv=Math.min(minMv,state.v[i]);maxMv=Math.max(maxMv,state.v[i]);maxZeroInputDriftMv=Math.max(maxZeroInputDriftMv,Math.abs(state.v[i]-started.v[i]));}
    for(let site=0;site<activeSites.length;site++){
      const i=activeSites[site],ordinal=nodeOrdinalByIndex.get(i)??null,a=advance.oldV[i],b=state.v[i];
      if(a<0&&b>=0){if(activeSiteEventTimes[site].length>=maxEventsPerNode)throw new Error(`Event-output budget exceeded at active compartment ${i}; no events were truncated.`);
        const timeMs=t+dtMs*(-a)/(b-a);activeSiteEventTimes[site].push(timeMs);events.push({compartmentIndex:i,nodeOrdinal:ordinal,timeMs,zUm:morphology.compartments[i].zUm,...(morphology.compartments[i].role?{role:morphology.compartments[i].role}:{})});}
    }
    if((k+1)%traceStride===0||k+1===steps)save((k+1)*dtMs,true);
  }
  return {modelVersion:MRG_VERSION,dtMs,durationMs,equilibrationMs,traceStride,recordIndices:indices,timesMs,membraneMv,periaxonalMv,outerCurrentsNa,axolemmaCurrentsNa,events,nodeEventTimes,...(morphology.activeSiteIndices?{activeSiteIndices:[...activeSites],activeSiteEventTimes}:{}),initialState:started,finalState:publicState(state),propagation:propagation(morphology,nodeEventTimes),
    diagnostics:{minMv,maxMv,maxZeroInputDriftMv,maxCurrentResidualNa:(saveCurrents||onSample)?advance.maxResidual:null,compartmentSteps:steps*n,savedValues:saved,equilibratedMs:equilibrationMs,voltageClipping:false}};
}

export function biphasicPulse(t,options={}){
  if(typeof t==='object'){const opts=t;return time=>biphasicPulse(time,opts);}
  const {amplitudeUa=1,onsetMs=.5,phaseMs=.1,gapMs=.05}=options;
  if(t<onsetMs||t>=onsetMs+2*phaseMs+gapMs)return 0;
  if(t<onsetMs+phaseMs)return amplitudeUa;
  if(t<onsetMs+phaseMs+gapMs)return 0;
  return -amplitudeUa;
}
