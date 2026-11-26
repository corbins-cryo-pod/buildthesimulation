// Two independent authored dot arrays. These numbers do not correspond to a real material or acquired image.
export const width=192,height=112;
const a=Object.freeze([12,35,58,81,104,127,150,173]),b=Object.freeze([12,53,94,135,176]);
const plates=Object.freeze({fine:Object.freeze({id:'grid-a-23',centersPx:a,pixelNm:.01}),coarse:Object.freeze({id:'grid-b-41',centersPx:b,pixelNm:.01})});
export const ys=Object.freeze([28,56,84]);
export const picks=Object.freeze({Offline_lattice_panel:{action:'compare',label:'Switch to the other fixed lattice'}});
export const initial=()=>({plate:'fine',revision:0});
export function reduce(s,action,v){
 if(action==='compare')v=s.plate==='fine'?'coarse':'fine';
 else if(action!=='plate')throw Error('Unknown offline reference action.');
 if(!Object.hasOwn(plates,v))throw Error('Unknown fixed lattice image.');
 return v===s.plate?s:{plate:v,revision:s.revision+1};
}
export function reference(s){
 if(!Object.hasOwn(plates,s.plate))throw Error('Unknown fixed lattice image.');
 return plates[s.plate];
}
export function report(s){
 const {id,centersPx,pixelNm}=reference(s),intervals=4,spanPx=centersPx[intervals]-centersPx[0],spanNm=pixelNm*spanPx;
 return {schema:'bts.13-05.offline-lattice.v1',source:'authored immutable inert dot array; not a physical TEM observation',fixtureId:id,state:s,widthPx:width,heightPx:height,pixelNm,intervals,spanPx,spanNm,pitchNm:spanNm/intervals,pitchAngstrom:10*spanNm/intervals,deviceConnection:false};
}
