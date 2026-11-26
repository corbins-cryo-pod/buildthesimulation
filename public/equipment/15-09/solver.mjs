const lock=Object.freeze;
export const modes=lock(['stripe','reordered','endpoints','flat']);
export const labels=lock({stripe:'Three gray stripes',reordered:'Same stripes in a different order',endpoints:'Code-range endpoints',flat:'Uniform image'});
export const shape=lock([48,32]);
const gray=lock({stripe:lock([32,96,160]),reordered:lock([160,32,96]),endpoints:lock([0,128,255]),flat:lock([117,117,117])});
export function snapshot(mode){
 if(!modes.includes(mode))throw new RangeError('Select one of the four fixed synthetic images.');
 const [w,h]=shape;
 return Array.from({length:w*h},(_,i)=>gray[mode][Math.floor((i%w)/(w/3))]);
}
export function analyze(mode){
 const pixels=snapshot(mode),histogram=Array(256).fill(0);
 let sum=0,sum2=0;
 for(const v of pixels){histogram[v]++;sum+=v;sum2+=v*v;}
 const meanCode=sum/pixels.length,popStdCode=Math.sqrt(Math.max(0,sum2/pixels.length-meanCode*meanCode));
 return {shape,pixelCount:pixels.length,meanCode,popStdCode,lowEndpointPixels:histogram[0],highEndpointPixels:histogram[255],histogram};
}
export const blank=()=>({mode:'stripe',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;snapshot(mode);return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive viewing of the independent synthetic images is available.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-digital-code-pattern.v1',revision,sourceRevision:'DIGITAL-BANDS-EXAMPLES-A',mode:s.mode,
  units:{pixel:'8-bit grayscale code (dimensionless)',histogram:'pixels per integer code'},
  pixels:snapshot(s.mode),pixelOrder:'row-major, X fastest, Y starts at lower border',...analyze(s.mode),
  provenance:'Synthetic digital codes assigned directly. Endpoint occupancy does not prove physical clipping or report any instrument calibration.'}};
}
