// An abstract classroom diagram disconnected from the instrument.
export const allowed=Object.freeze([.5,1,1.5]);
export const picks=Object.freeze({Offline_comparison_cube:{action:'next',label:'Cycle the detached geometry diagram'}});
export const initial=()=>({ratio:1,revision:0});
export function reduce(s,a,v){
 if(a==='next')v=allowed[(allowed.indexOf(s.ratio)+1)%allowed.length];else if(a!=='ratio')throw Error('Unknown offline diagram action.');
 if(!allowed.includes(v))throw Error('Choose a fixed diagram ratio.');
 return v===s.ratio?s:{ratio:v,revision:s.revision+1};
}
export function report(s){
 if(!allowed.includes(s.ratio))throw Error('Unknown diagram ratio.');
 return {schema:'bts.13-11.abstract-cube.v1',source:'unconnected mathematical teaching diagram',revision:s.revision,edgeRatio:s.ratio,surfaceAreaRatio:s.ratio**2,volumeRatio:s.ratio**3,deviceConnection:false};
}
