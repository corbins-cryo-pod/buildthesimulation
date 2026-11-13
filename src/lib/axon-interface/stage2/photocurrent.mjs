import {advanceOpsin,opsinCurrentNa,OPSIN_SOURCE} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/opsin.mjs';

/** One independent Markov mechanism per expressing membrane band.
 * Fluence is supplied after transport; lossDivisor=1 avoids duplicate attenuation.
 * Currents are outward-positive nA. The derivative is in nA/mV == uS.
 */
export function createPhotocurrent(morphology,{fluencePerMw,emittedMw,pulseStartMs=.5,pulseWidthMs=2,gmaxMsCm2=2,expressionIndices=morphology.somaIndices,blocked=false,traceStride=16}={}){
  const n=morphology.compartments.length,sites=[...expressionIndices];
  if(!fluencePerMw||fluencePerMw.length!==n||!Array.from(fluencePerMw).every(x=>Number.isFinite(x)&&x>=0))throw new Error('Optical transfer requires a nonnegative finite coefficient for every compartment.');
  if(!Number.isFinite(emittedMw)||emittedMw<0||!Number.isFinite(gmaxMsCm2)||gmaxMsCm2<0||gmaxMsCm2>100)throw new Error('Invalid emitted power or opsin expression.');
  if(!Number.isFinite(pulseStartMs)||pulseStartMs<0||!Number.isFinite(pulseWidthMs)||pulseWidthMs<=0||!Number.isInteger(traceStride)||traceStride<1)throw new Error('Invalid optical pulse or trace stride.');
  if(new Set(sites).size!==sites.length||sites.some(i=>!Number.isInteger(i)||i<0||i>=n))throw new Error('Invalid expression compartment identities.');
  const states=sites.map(()=>({occupancy:[1,0,0,0],p:0})),currentNa=new Float64Array(n),derivativeUs=new Float64Array(n);
  const history={timeMs:[],compartmentIndices:sites,occupancy:[],photocurrentNa:[],activation:[]};
  let steps=0,massError=0,minOccupancy=1,maxIrradiance=0;
  const mechanism=(t,dt,v)=>{
    const fraction=Math.max(0,Math.min(t+dt,pulseStartMs+pulseWidthMs)-Math.max(t,pulseStartMs))/dt;
    for(let k=0;k<sites.length;k++){
      const i=sites[k],I=emittedMw*fluencePerMw[i]*fraction;maxIrradiance=Math.max(maxIrradiance,I);
      states[k]=advanceOpsin(states[k],{voltageMv:v[i],irradianceMwMm2:I,temperatureC:37,lossDivisor:1,dtMs:dt});
      const q=states[k].occupancy[1]+.1*states[k].occupancy[2],density=blocked?0:gmaxMsCm2,area=morphology.compartments[i].areaCm2*1e8;
      currentNa[i]=opsinCurrentNa(states[k],v[i],density,area);
      derivativeUs[i]=density*area*1e-5*14.6408*Math.exp(-v[i]/42.7671)/42.7671*q;
      massError=Math.max(massError,Math.abs(states[k].occupancy.reduce((a,b)=>a+b,0)-1));minOccupancy=Math.min(minOccupancy,...states[k].occupancy);
    }
    if(++steps%traceStride===0){history.timeMs.push(t+dt);history.occupancy.push(states.map(s=>[...s.occupancy]));history.activation.push(states.map(s=>s.p));history.photocurrentNa.push(sites.map(i=>currentNa[i]));}
    return {currentNa,derivativeUs};
  };
  return {mechanism,history,source:OPSIN_SOURCE,diagnostics:()=>({massError,minOccupancy,maxIrradianceMwMm2:maxIrradiance,lossDivisor:1,blocked,expressionIndices:sites,conductanceMsCm2:gmaxMsCm2}),
    interpretation:'Williams H134R equations on the declared soma bands; voltage-dependent membrane current. Expression and 37 C extrapolation are hypotheses for engineered SG-like cells.'};
}
