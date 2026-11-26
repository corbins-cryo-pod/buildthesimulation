// Synthetic normalized readings. Nothing actuates a gas, pump or real instrument.
export const PA_PER_MBAR_L=.1,GAIN=4e12,BACKGROUND=1100,TAU_S=1.25,DT_S=.125;
export const fixtures={low:{id:'VIRTUAL-STD-LOW',revision:1,q:4e-10,u:2e-11},high:{id:'VIRTUAL-STD-HIGH',revision:1,q:1.6e-9,u:5e-11},near:{id:'VIRTUAL-STD-NEAR',revision:2,q:9.8e-10,u:5e-11}};
export const interactions={Test_port_target:{action:'load',label:'Mount or remove the inert virtual fixture'},Port_inner_shadow:{action:'load',label:'Mount or remove the inert virtual fixture'},Fixture_cap:{action:'load',label:'Remove the virtual fixture'},Key_Cal:{action:'blank',label:'Capture synthetic blank'},Key_Replay:{action:'replay',label:'Replay synthetic detector trace'}};
export const initial=()=>({fixture:'low',mounted:true,blank:null,durationS:16,limit:1e-9,revision:1});
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
export function blank(){const counts=Array.from({length:16},(_,i)=>BACKGROUND+2*Math.sin(Math.PI*i/2));return {source:'synthetic-blank',meanCount:mean(counts),counts};
}
export function reduce(s,a,value){if(a==='load')return {...s,mounted:!s.mounted};if(a==='blank')return {...s,blank:blank()};if(a==='fixture'){if(!fixtures[value])throw Error('Unknown virtual fixture.');return {...s,fixture:value}}if(a==='replay')return {...s,revision:s.revision+1};throw Error('Unknown instrument action.')}
export function replay(s){if(!s.mounted)throw Error('Mount an inert virtual fixture before replay.');if(!s.blank||!Number.isFinite(s.blank.meanCount))throw Error('Capture a synthetic blank before replay.');if(!Number.isFinite(s.durationS)||s.durationS<3||s.durationS>20)throw Error('Replay window must be between 3 and 20 s.');if(!Number.isFinite(s.limit)||s.limit<1e-10||s.limit>5e-9)throw Error('Acceptance limit must be 1e-10 to 5e-9 Pa·m³/s.');const f=fixtures[s.fixture];if(!f)throw Error('Unknown virtual fixture.');
 const t=Array.from({length:Math.floor(s.durationS/DT_S)+1},(_,i)=>{const timeS=i*DT_S,count=BACKGROUND+GAIN*f.q*(-Math.expm1(-timeS/TAU_S))+2*Math.sin(Math.PI*i/2);return {timeS,rawCount:count,correctedPaM3S:(count-s.blank.meanCount)/GAIN}});
 const settled=t.slice(-16).map(n=>n.correctedPaM3S),q=mean(settled),slope=(mean(settled.slice(8))-mean(settled.slice(0,8)))/(8*DT_S),stable=Math.abs(slope)<=5e-12;
 const decision=!stable?'unstable':q+f.u<=s.limit?'pass':q-f.u>s.limit?'fail':'indeterminate';
 return {schema:'bts.helium-leak-replay.v1',source:'simulated',instrumentId:'08-09',packageId:f.id,packageRevision:f.revision,measurementRevision:s.revision,units:{time:'s',rate:'Pa*m^3/s',signal:'normalized count'},fixture:{nominalPaM3S:f.q,uncertaintyPaM3S:f.u},calibration:{blank:s.blank,gainCountsPerPaM3S:GAIN,tauS:TAU_S},estimatedPaM3S:stable?q:null,tailRatePaM3S:q,estimatedMbarLS:stable?q/PA_PER_MBAR_L:null,tailSlopePaM3S2:slope,limitPaM3S:s.limit,decision,samples:t};
}
export function csv(j){return [`# simulated; package=${j.packageId}; revision=${j.packageRevision}; measurement=${j.measurementRevision}; decision=${j.decision}`,'time_s,raw_count,corrected_Pa_m3_per_s',...j.samples.map(p=>[p.timeS,p.rawCount,p.correctedPaM3S].join(','))].join('\n')+'\n'}
