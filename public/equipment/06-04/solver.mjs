const freeze=Object.freeze;
export const windowMm=freeze([128,96,120]);
export const objectMm=freeze([106,72,88]);
export const positions=freeze({centered:freeze([0,0,0]),tangent:freeze([11,0,0]),offset:freeze([14,0,0])});
export const modes=freeze(Object.keys(positions));
export function clearance(mode){
 if(!modes.includes(mode))throw new RangeError('Choose a preauthored detached display position.');
 const c=positions[mode],faces=windowMm.map((w,i)=>{const g=(w-objectMm[i])/2;return {axis:['X','Y','Z'][i],minusMm:g+c[i],plusMm:g-c[i]};});
 const minimumMm=Math.min(...faces.flatMap(f=>[f.minusMm,f.plusMm]));
 return {centerMm:c,faces,minimumMm,status:minimumMm<0?'outside':minimumMm===0?'touching':'inside'};
}
export const blank=()=>({mode:'centered',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;clearance(mode);
  return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive inspection of the separate display is available.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-clearance-demo.v1',revision,mode:s.mode,windowId:'DEMO-WINDOW-01',objectId:'DEMO-BLOCK-01',
  sourceRevision:'PASSIVE-BOX-DISPLAY-A',windowMm,objectMm,units:'mm',axes:['X width','Y depth','Z height'],
  ...clearance(s.mode),provenance:'Authored generic inert display; not fitted to any Form 4 interior, workflow, build volume, material or machine coordinate frame.'}};
}
