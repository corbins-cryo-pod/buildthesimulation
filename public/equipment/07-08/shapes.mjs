export const card=Object.freeze({id:'BTS-OCTO-SHAPES-01',revision:'1',circumradiusMm:24});
export const shapes=Object.freeze(['octagon','square','disk']);
export const targets=Object.freeze({Plaque_Change_Shape:'cycle',Plaque_Overlay_Disk:'overlay'});
export function compare(shape){
 if(!shapes.includes(shape))throw new RangeError('Select a listed static shape.');
 const radius=card.circumradiusMm,diskAreaMm2=Math.PI*radius**2;
 const sides=shape==='octagon'?8:shape==='square'?4:null;
 const vertices=!sides?null:Array.from({length:sides},(_,i)=>{const theta=i*2*Math.PI/sides;return [radius*Math.cos(theta),radius*Math.sin(theta)];});
 let areaMm2=diskAreaMm2,perimeterMm=2*Math.PI*radius;
 if(vertices){
  let a=0;perimeterMm=0;
  for(let i=0;i<sides;i++){const p=vertices[i],q=vertices[(i+1)%sides];a+=p[0]*q[1]-p[1]*q[0];perimeterMm+=Math.hypot(q[0]-p[0],q[1]-p[1]);}
  areaMm2=Math.abs(a)/2;
 }
 return {shape,sides,radiusMm:radius,diameterMm:radius*2,vertices,areaMm2,perimeterMm,diskAreaMm2,uncoveredMm2:diskAreaMm2-areaMm2,coveragePct:100*areaMm2/diskAreaMm2};
}
export function createStation(){
 let shape='octagon',overlay=true,error=null;
 const read=()=>({...compare(shape),overlay,error});
 function dispatch(k,p){error=null;if(k==='cycle')shape=shapes[(shapes.indexOf(shape)+1)%shapes.length];
 if(k==='overlay')overlay=!overlay;
 if(k==='select'){if(shapes.includes(p))shape=p;else error='Choose a listed static shape.';}
 if(k==='reset'){shape='octagon';overlay=true;}return read();}
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportComparison(s){return {schema:'bts.octo.inert-shape-comparison.v1',equipment:'07-08',card,units:{distance:'mm',area:'mm²',ratio:'%'},provenance:'authored static shape illustration; no relation to shell geometry or instrument operation',comparison:Object.fromEntries(Object.entries(s).filter(([k])=>k!=='error'))};}
