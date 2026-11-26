const lock=Object.freeze;
const polygon=(id,pts)=>lock({id,verticesMm:lock(pts.map(p=>lock(p)))});
export const modes=lock(['rectangle','diamond','collinear']);
export const labels=lock({rectangle:'Rectangular ink stamp',diamond:'Offset diamond stamp',collinear:'Collinear marks (no filled stamp)'});
export const art=lock({
 rectangle:polygon('INK-RECT-A',[[-12,-8],[12,-8],[12,8],[-12,8]]),
 diamond:polygon('INK-DIAMOND-B',[[6,14],[-9,4],[6,-6],[21,4]]),
 collinear:polygon('INK-LINE-C',[[-12,0],[0,0],[12,0]])
});
export function shape(mode){
 if(!modes.includes(mode))throw new RangeError('Choose a fixed geometric mark from the detached drawing.');
 const a=art[mode],pts=a.verticesMm;
 let k=0,sx=0,sy=0,perimeter=0;
 for(const [i,[x,y]] of pts.entries()){
  const [u,v]=pts[(i+1)%pts.length],c=x*v-u*y;
  k+=c;sx+=(x+u)*c;sy+=(y+v)*c;perimeter+=Math.hypot(u-x,v-y);
 }
 const degenerate=k===0;
 return {markId:a.id,verticesMm:pts,areaMm2:Math.abs(k)/2,perimeterMm:degenerate?null:perimeter,
  centroidMm:degenerate?null:[sx/(3*k),sy/(3*k)],status:degenerate?'no-area':'filled-polygon'};
}
export const blank=()=>({mode:'rectangle',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;shape(mode);return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only the detached immutable drawing is available for inspection.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-geometric-stamp.v1',revision,mode:s.mode,sheetId:'ABSTRACT-INK-SHEET-01',
  sourceRevision:'INK-MARKS-CONCEPT-A',units:{coordinates:'mm',area:'mm²',perimeter:'mm'},axis:'X right; Y up',...shape(s.mode),
  provenance:'Fictitious authored geometric ink marks, not footprints, behavior, measurements, or hardware outputs.'}};
}
