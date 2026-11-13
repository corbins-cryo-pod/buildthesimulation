import {markovStep} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/opsin.mjs';
import {interpolateSpectrum} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/spectral.mjs';

// Parameter sets transcribed intact from Cleo commit 595fb7652f1d5c8bd32ac21c66db3f506368fc9b.
// Rates /ms; phim photons/mm²/s; g0 whole-cell nS, NOT a membrane density.
const common={Gd2:.01,Gr0:6.67e-7,Gf0:.001,Gb0:.01,kf:.01,kb:.004,gamma:.05,p:1,q:1,E:0};
const chr2={...common,Gd1:.066,Gr0:.000333,g0:3.2,phim:1e16,k1:.4,k2:.12,Gf0:.018,Gb0:.008,kb:.008};
const chrimson={...common,Gd1:.041,g0:22,phim:2e14,k1:.05,k2:.5};
const vfchrimson={...common,Gd1:.37,Gd2:.175,g0:17.5,phim:1.5e16,k1:3,k2:.2,Gf0:.02,Gb0:.0032,kb:.01};
const chr2Spectrum=[[400,.34],[422,.65],[460,.96],[470,1],[473,1],[500,.57],[520,.22],[540,.06],[560,.01]];
const redSpectrum=[[470,.31],[490,.47],[510,.69],[530,.75],[550,.88],[570,.97],[590,1],[610,.88],[630,.55]];
const vfSpectrum=[[470,.34],[490,.51],[510,.71],[530,.75],[550,.86],[570,1],[590,1],[610,.8],[630,.48]];
export const SPECTRAL_MODELS=Object.freeze([
 {id:'chr2',name:'ChR2',parameters:chr2,spectrum:chr2Spectrum,referenceNm:470,convention:'equal-power-assumed',evidence:'Published kinetic fit; digitized action spectrum. Original normalization uncertain: both conventions are probed.'},
 {id:'chrimson',name:'Chrimson',parameters:chrimson,spectrum:redSpectrum,referenceNm:590,convention:'equal-photon',evidence:'Published kinetic fit; digitized equal-photon action measurements (Mager 2018, supplement 1a).'},
 {id:'vfchrimson',name:'vf-Chrimson',parameters:vfchrimson,spectrum:vfSpectrum,referenceNm:590,convention:'equal-photon',evidence:'Distinct Cleo/Bansal kinetic set; nearly the same spectrum as Chrimson. No extra independent channel is presumed.'},
 {id:'hypothetical-green',name:'Hypothetical green construct',parameters:{...chr2,phim:3e15,g0:8},spectrum:Array.from({length:10},(_,i)=>{const nm=470+10*i;return [nm,.2+.8*Math.exp(-.5*((nm-530)/22)**2)];}),referenceNm:530,convention:'equal-photon',evidence:'Hypothetical action spectrum and expression. ChR2 transition structure with an explicitly hypothetical photon sensitivity and conductance; not a named measured opsin.'}
]);
export const SPECTRAL_SOURCES={parameterImplementation:'https://github.com/siplab-gt/cleo/blob/595fb7652f1d5c8bd32ac21c66db3f506368fc9b/cleo/opto/opsin_library.py',equations:'https://github.com/siplab-gt/cleo/blob/595fb7652f1d5c8bd32ac21c66db3f506368fc9b/cleo/opto/opsins.py',kineticFit:'https://doi.org/10.1016/j.neuroscience.2020.09.022',chr2Action:'https://doi.org/10.1073/pnas.1936192100',redAction:'https://doi.org/10.1038/s41467-018-04146-3',license:'Cleo MIT; numerical tables transcribed with attribution. These whole-cell fits are not measured engineered human ganglion cells.'};
export const PLANCK=6.62607015e-34,LIGHT_SPEED=299792458;
export function spectralModel(id){const model=SPECTRAL_MODELS.find(m=>m.id===id);if(!model)throw new Error('Unknown spectral opsin identity.');return model;}
export function spectralFamilies(count=2){if(!Number.isInteger(count)||count<2||count>4)throw new Error('Use 2–4 explicit spectral families.');return SPECTRAL_MODELS.slice(0,count);}
export function spectralWavelengths(count=2){spectralFamilies(count);return ({2:[470,550],3:[470,510,550],4:[470,510,550,560]})[count];}
export function actionWeight(model,nm,convention='declared'){
 const raw=interpolateSpectrum(model.spectrum,nm),assumedPower=model.convention==='equal-power-assumed'&&convention!=='alternate';
 // S_power is response per watt. Response per photon is S_power * lambda_ref/lambda.
 return raw*(assumedPower?model.referenceNm/nm:1);
}
export function effectivePhotonFlux(model,bins,convention='declared'){
 let total=0;for(const {nm,irradianceMwMm2:I} of bins){if(!Number.isFinite(I)||I<0)throw new Error('Spectral irradiance must be finite and nonnegative.');total+=I*1e-3*nm*1e-9/(PLANCK*LIGHT_SPEED)*actionWeight(model,nm,convention);}return total;
}
export function spectralGenerator(p,flux,rateScale=1){
 if(!Number.isFinite(flux)||flux<0||!Number.isFinite(rateScale)||rateScale<=0||rateScale>4)throw new Error('Invalid spectral rate input.');
 const hill=n=>flux===0?0:1/(1+(p.phim/flux)**n),hp=hill(p.p),hq=hill(p.q),a=p.k1*hp,b=p.k2*hp,f=p.Gf0+p.kf*hq,r=p.Gb0+p.kb*hq;
 return [[-a,p.Gd1,0,p.Gr0],[a,-p.Gd1-f,r,0],[0,f,-p.Gd2-r,b],[0,0,p.Gd2,-b-p.Gr0]].map(row=>row.map(x=>x*rateScale));
}
export function spectralTransition(p,flux,dt,rateScale=1){const Q=spectralGenerator(p,flux,rateScale);return [0,1,2,3].map(j=>markovStep([0,1,2,3].map(i=>Number(i===j)),Q,dt));}
export function applySpectralTransition(P,state){return [0,1,2,3].map(i=>P.reduce((s,column,j)=>s+column[i]*state[j],0));}

/** Independent occupancy for each membrane band. Whole-cell g0 is partitioned
 * by membrane area, preserving total expression when the soma mesh is refined. */
export function createSpectralPhotocurrent(morphology,{modelId='chr2',bins,emittedMw,pulseStartMs=.5,pulseWidthMs=2,expressionMultiplier=1,rateScale=1,convention='declared',expressionIndices=morphology.somaIndices,blocked=false,traceStride=16}={}){
 const model=spectralModel(modelId),p=model.parameters,sites=[...expressionIndices],n=morphology.compartments.length;
 if(!bins?.length||bins.length>8||bins.some(b=>!b.fluencePerMw||b.fluencePerMw.length!==n||Array.from(b.fluencePerMw).some(x=>!Number.isFinite(x)||x<0)))throw new Error('Spectral light requires explicit nonnegative band fields.');
 if(!Number.isFinite(emittedMw)||emittedMw<0||!Number.isFinite(expressionMultiplier)||expressionMultiplier<0||expressionMultiplier>100||!Number.isFinite(pulseStartMs)||pulseStartMs<0||!Number.isFinite(pulseWidthMs)||pulseWidthMs<=0||!Number.isInteger(traceStride)||traceStride<1||!['declared','alternate'].includes(convention))throw new Error('Invalid spectral stimulation setting.');
 if(new Set(sites).size!==sites.length||!sites.length||sites.some(i=>!Number.isInteger(i)||i<0||i>=n))throw new Error('Invalid expression identities.');
 const area=sites.reduce((s,i)=>s+morphology.compartments[i].areaCm2,0),fractions=sites.map(i=>morphology.compartments[i].areaCm2/area);
 const fluxes=sites.map(i=>effectivePhotonFlux(model,bins.map(b=>({nm:b.nm,irradianceMwMm2:emittedMw*b.fluencePerMw[i]})),convention)),states=sites.map(()=>[1,0,0,0]),cache=new Map();
 const currentNa=new Float64Array(n),derivativeUs=new Float64Array(n),history={timeMs:[],compartmentIndices:sites,occupancy:[],photocurrentNa:[]};let steps=0,massError=0,minOccupancy=1;
 function mechanism(t,dt,v){
  const fraction=Math.max(0,Math.min(t+dt,pulseStartMs+pulseWidthMs)-Math.max(t,pulseStartMs))/dt,key=dt+':'+fraction;
  let transitions=cache.get(key);if(!transitions){transitions=fluxes.map(f=>spectralTransition(p,f*fraction,dt,rateScale));cache.set(key,transitions);if(cache.size>32)throw new Error('Unexpected spectral pulse fragmentation.');}
  for(let j=0;j<sites.length;j++){const i=sites[j];states[j]=applySpectralTransition(transitions[j],states[j]);const conductance=(blocked?0:expressionMultiplier)*p.g0*fractions[j]*(states[j][1]+p.gamma*states[j][2])/1000;derivativeUs[i]=conductance;currentNa[i]=conductance*(v[i]-p.E);massError=Math.max(massError,Math.abs(states[j].reduce((a,b)=>a+b,0)-1));minOccupancy=Math.min(minOccupancy,...states[j]);}
  if(++steps%traceStride===0){history.timeMs.push(t+dt);history.occupancy.push(states.map(s=>[...s]));history.photocurrentNa.push(sites.map(i=>currentNa[i]));}
  if(massError>1e-8||minOccupancy< -1e-12)throw new Error('Spectral occupancy conservation failed.');return {currentNa,derivativeUs};
 }
 return {mechanism,history,source:SPECTRAL_SOURCES,diagnostics:()=>({modelId,parameters:p,expressionMultiplier,totalMaximumConductanceNs:p.g0*expressionMultiplier,rateScale,convention,effectivePhotonFluxPerMm2S:fluxes,blocked,massError,minOccupancy,expressionIndices:sites}),interpretation:'Room-temperature kinetic fit on a 37 °C cable without an assumed Q10. Rate-scale and normalization alternatives are sensitivity probes. Action-weighted photon flux is an estimated coupling convention, not a measured absorption cross section.'};
}
