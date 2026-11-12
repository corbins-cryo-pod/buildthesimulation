import {finite,range,integer,VERSION} from './common.mjs';
export const OPSIN_SOURCE=Object.freeze({doi:'10.1371/journal.pcbi.1003220',implementation:'https://modeldb.science/244414',mechanism:'WilliamsEtAl2013NEURON/ChR2H134R.mod',scope:'Williams H134R rate equations, cross-checked against Giugliano ModelDB port. Not engineered SGN calibration.'});
export const OPSIN_DEFAULTS=Object.freeze({temperatureC:37,voltageMv:-80,irradianceMwMm2:1,gmaxMsCm2:.4,areaUm2:Math.PI*20**2,onsetMs:5,pulseMs:20,gapMs:20,pulses:2,durationMs:100,dtMs:.01,lossDivisor:1.3});
export function opsinRates(v,I,T=37,lossDivisor=1.3) {
 range(v,'opsin voltage',-150,100);range(I,'irradiance',0,1000);range(T,'temperature',15,40);range(lossDivisor,'photon loss divisor',.1,10);
 const q=(T-22)/10,log=Math.log1p(I/.024),F=12e-20*I*470e-9/(1.986446e-25*lossDivisor);
 return {gd1:(.075+.043*Math.tanh(-(v+20)/20))*1.97**q,gd2:.05*1.77**q,gr:.0000434587*Math.exp(-.0211539274*v)*2.56**q,
  e12:.011*1.1**q+.005*log,e21:.008*1.95**q+.004*log,epsilon1:.8535*1.46**q,epsilon2:.14*2.77**q,F,
  activation:.5*(1+Math.tanh(120*(100*I-.1))),tauMs:1.3};
}
export function opsinGenerator(r,p) {
 const k1=r.epsilon1*r.F*p,k2=r.epsilon2*r.F*p;
 // Column-vector state ordering: C1, O1, O2, C2.
 return [[-k1,r.gd1,0,r.gr],[k1,-r.gd1-r.e12,r.e21,0],[0,r.e12,-r.gd2-r.e21,k2],[0,0,r.gd2,-k2-r.gr]];
}
/** Markov uniformization; no renormalization or clipping of probabilities. */
export function markovStep(state,Q,dt) {
 range(dt,'Markov time step',0,10); if(state.length!==4||Q.length!==4||Q.some(r=>r.length!==4))throw new Error('Four-state model required.');
 if(!state.every(Number.isFinite)||Math.abs(state.reduce((s,x)=>s+x,0)-1)>1e-8||state.some(x=>x< -1e-12))throw new Error('Invalid opsin occupancy.');
 for(let j=0;j<4;j++) {if(Math.abs(Q.reduce((s,r)=>s+r[j],0))>1e-10||Q.some((r,i)=>!Number.isFinite(r[j])||(i!==j&&r[j]<0)))throw new Error('Invalid Markov generator.');}
 const rate=Math.max(...Q.map((r,i)=>-r[i]));if(rate===0||dt===0)return [...state];
 const splits=Math.max(1,Math.ceil(rate*dt/8));if(splits>512)throw new Error('Markov work budget exceeded.');
 const h=dt/splits,mu=rate*h;let s=[...state];
 for(let split=0;split<splits;split++) {
  let term=[...s],weight=Math.exp(-mu),out=term.map(v=>v*weight),weightSum=weight;
  for(let k=1;k<160;k++) {
   term=Q.map((row,i)=>term[i]+row.reduce((sum,x,j)=>sum+x*term[j],0)/rate);weight*=mu/k;weightSum+=weight;
   for(let i=0;i<4;i++)out[i]+=weight*term[i];
   if(k>mu&&weight<1e-17)break;
  }
  if(Math.abs(weightSum-1)>1e-13)throw new Error('Poisson tail did not converge.'); s=out;
 }
 if(Math.abs(s.reduce((a,b)=>a+b,0)-1)>1e-8||s.some(v=>v< -1e-12))throw new Error('Opsin state failed mass/positivity checks.');
 return s;
}
export function advanceOpsin(previous,{voltageMv,irradianceMwMm2,temperatureC=37,lossDivisor=1.3,dtMs}) {
 range(previous.p,'activation state',0,1);const r=opsinRates(voltageMv,irradianceMwMm2,temperatureC,lossDivisor);
 const mid=r.activation+(previous.p-r.activation)*Math.exp(-dtMs/(2*r.tauMs));
 return {occupancy:markovStep(previous.occupancy,opsinGenerator(r,mid),dtMs),p:r.activation+(previous.p-r.activation)*Math.exp(-dtMs/r.tauMs)};
}
export function opsinCurrentNa(state,v,gmaxMsCm2,areaUm2) {
 range(v,'voltage',-150,100);range(gmaxMsCm2,'expression density',0,100);range(areaUm2,'membrane area',0,1e8);
 // Evaluate the literal published I-V product with E=0, avoiding division by V.
 // This empirical fit has a small reversal offset; never silently force I(0)=0.
 return gmaxMsCm2*areaUm2*1e-5*(10.6408-14.6408*Math.exp(-v/42.7671))*(state.occupancy[1]+.1*state.occupancy[2]);
}
export function clampAssay(input={}) {
 for(const key of Object.keys(input))if(!(key in OPSIN_DEFAULTS))throw new Error(`Unsupported opsin setting ${key}.`);
 const s={...OPSIN_DEFAULTS,...input};range(s.dtMs,'time step',.001,.1);range(s.durationMs,'duration',1,1000);integer(s.pulses,'pulses',1,20);range(s.onsetMs,'onset',0,1000);range(s.pulseMs,'pulse width',.01,500);range(s.gapMs,'gap',0,1000);
 range(s.voltageMv,'clamp voltage',-100,-10);opsinRates(s.voltageMv,s.irradianceMwMm2,s.temperatureC,s.lossDivisor);opsinCurrentNa({occupancy:[1,0,0,0]},s.voltageMv,s.gmaxMsCm2,s.areaUm2);
 const steps=s.durationMs/s.dtMs;if(Math.abs(steps-Math.round(steps))>1e-7||steps>200000)throw new Error('Assay duration must be an integer number of steps, at most 200000.');
 const endpoints=[s.onsetMs,s.pulseMs,s.gapMs];if(endpoints.some(t=>Math.abs(t/s.dtMs-Math.round(t/s.dtMs))>1e-7))throw new Error('Pulse edges must align to the declared time step.');
 const illum=t=>{const q=t-s.onsetMs;if(q<0)return 0;const k=Math.floor(q/(s.pulseMs+s.gapMs));return k<s.pulses&&q-k*(s.pulseMs+s.gapMs)<s.pulseMs?s.irradianceMwMm2:0;};
 let state={occupancy:[1,0,0,0],p:0},massError=0,minOccupancy=1;
 const timeMs=[0],currentNa=[0],lightMwMm2=[illum(0)],occupancy=[[1,0,0,0]],activation=[0];
 const stride=Math.max(1,Math.round(.05/s.dtMs));
 for(let k=0;k<steps;k++){state=advanceOpsin(state,{...s,irradianceMwMm2:illum((k+.5)*s.dtMs)});
  massError=Math.max(massError,Math.abs(state.occupancy.reduce((a,b)=>a+b,0)-1));minOccupancy=Math.min(minOccupancy,...state.occupancy);
  if((k+1)%stride===0||k+1===steps){timeMs.push((k+1)*s.dtMs);currentNa.push(opsinCurrentNa(state,s.voltageMv,s.gmaxMsCm2,s.areaUm2));lightMwMm2.push(illum((k+1)*s.dtMs));occupancy.push([...state.occupancy]);activation.push(state.p);}}
 return {schema:'axon-stage2.opsin-clamp.v1',modelVersion:VERSION,settings:s,source:OPSIN_SOURCE,timeMs,currentNa,lightMwMm2,occupancy,activation,diagnostics:{massError,minOccupancy},
  recruitment:null,limits:['Voltage clamp, not a neuron firing experiment.','Membrane expression density is hypothetical for engineered bipolar cells.','Current uses the literal empirical I-V fit; its algebraic reversal is not forced to the nominal 0 mV.','The HTML paper table prints a recovery-rate exponent inconsistently; implementation uses 4.34587e-5 from the ModelDB mechanism.','Loss divisor 1.3 follows the source assay; a separately modeled transport attenuation must not be counted again without an explicit coupling convention.']};
}
