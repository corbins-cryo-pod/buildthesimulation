/** Additional opsins are deliberately labelled reduced exploratory models.
 * Only the imported Williams H134R module is a full source-equation port.
 * C -> O -> D -> C, with O -> C closing. Units: ms, mW/mm², mV.
 */
import { createChR2State, stepChR2, effectiveConductance, chr2CurrentFactor, chr2SlopeFactor } from '../opsin.js';
const OPSINS = Object.freeze({
  chr2:{id:'chr2',name:'ChR2(H134R)',ion:'cation',peakNm:470,sigmaNm:35,reference:'Williams et al. 2013 · full kinetic port at 470 nm',evidence:'Source-equation port; off-peak Gaussian action spectrum is an assumption.'},
  chronos:{id:'chronos',name:'Chronos-like · reduced',ion:'cation',peakNm:500,sigmaNm:40,tauOnMs:2.3,tauOffMs:3.6,halfMwMm2:.3,tauDesMs:100,tauRecMs:500,reference:'Klapoetke et al. 2014; kinetics context: 10.1117/1.NPh.5.2.025009',evidence:'Exploratory 3-state model, not a fitted reproduction. On/off time scales use published values; sensitivity, desensitization, recovery and spectrum are assumptions. No temperature extrapolation.'},
  chrimsonr:{id:'chrimsonr',name:'ChrimsonR-like · reduced',ion:'cation',peakNm:590,sigmaNm:45,tauOnMs:4,tauOffMs:16,halfMwMm2:.5,tauDesMs:200,tauRecMs:1000,blueShoulder:.22,reference:'Klapoetke et al. 2014 · 10.1038/nmeth.2836',evidence:'Exploratory red-sensitive 3-state model. All quantitative parameters, including blue cross-activation, are design assumptions, not a calibrated ChrimsonR fit.'},
  gtacr2:{id:'gtacr2',name:'GtACR2-like chloride · reduced',ion:'chloride',peakNm:470,sigmaNm:32,tauOnMs:1,tauOffMs:40,halfMwMm2:.1,tauDesMs:500,tauRecMs:1500,reference:'Mahn et al. 2018; Messier et al. 2018; Govorunova et al. 2018',evidence:'Exploratory 3-state anion-channel model. Approximate 40 ms off-scale from ACR literature; other rates and spectrum are assumed. Soma targeting is a separate expression control, not a different ionic mechanism.'}
});
function spectralWeight(id,wavelengthNm){
 const m=OPSINS[id]; if(!m)throw Error('Unknown opsin: '+id);
 const g=(x,mu,s)=>Math.exp(-.5*((x-mu)/s)**2);
 const denom=1+(m.blueShoulder??0)*g(m.peakNm,470,35);
 return (g(wavelengthNm,m.peakNm,m.sigmaNm)+(m.blueShoulder??0)*g(wavelengthNm,470,35))/denom;
}
function createOpsin(id,n,overrides={}){
 const meta=OPSINS[id];if(!meta)throw Error('Unknown opsin');
 const parameters={...meta,...overrides};
 return {id,parameters,state:id==='chr2'?createChR2State(n):new Float64Array(n*3).map((_,i)=>i%3===0?1:0)};
}
function opening(o,i){return o.id==='chr2'?effectiveConductance(o.state,i):o.state[3*i+1];}
function currentFactor(o,v,eCl){return o.id==='chr2'?chr2CurrentFactor(v):v-(o.parameters.ion==='chloride'?eCl:0);}
function slopeFactor(o,v){return o.id==='chr2'?chr2SlopeFactor(v):1;}
/** Positive, mass-conserving uniformization of the frozen 3-state generator. */
function stepReduced(s,j,E,dt,m){
 const a=E/(E+m.halfMwMm2)/m.tauOnMs,b=1/m.tauOffMs,d=E/(E+m.halfMwMm2)/m.tauDesMs,r=1/m.tauRecMs;
 const q=Math.max(a,b+d,r); const count=Math.max(1,Math.ceil(q*dt/8)),h=dt/count;
 for(let split=0;split<count;split++){
  let c=s[j],o=s[j+1],x=s[j+2],w=Math.exp(-q*h),cSum=w*c,oSum=w*o,xSum=w*x,mu=q*h;
  for(let k=1;k<80;k++){
   const nc=c*(1-a/q)+o*b/q+x*r/q,no=c*a/q+o*(1-(b+d)/q),nx=o*d/q+x*(1-r/q);
   c=nc;o=no;x=nx;w*=mu/k;cSum+=w*c;oSum+=w*o;xSum+=w*x;
   if(k>mu&&w<1e-15)break;
  }
  s[j]=cSum;s[j+1]=oSum;s[j+2]=xSum;
 }
 return s[j+1];
}
function advanceOpsin(o,i,v,E,dt){return o.id==='chr2'?stepChR2(o.state,i,v,E,dt,34):stepReduced(o.state,i*3,E,dt,o.parameters);}
export {OPSINS,spectralWeight,createOpsin,opening,currentFactor,slopeFactor,stepReduced,advanceOpsin};
