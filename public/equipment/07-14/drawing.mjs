export const reference=Object.freeze({id:'BTS-FIXED-RECTANGLES-01',revision:'1',shapes:Object.freeze({strip:Object.freeze([80,20]),rectangle:Object.freeze([50,30]),square:Object.freeze([40,40])})});
export const targets=Object.freeze({Choose_fixed_shape:'cycle',Rotate_fixed_drawing:'rotate'});
const order=['strip','rectangle','square'];
export function compare(shape,degrees=0){
 if(!Object.hasOwn(reference.shapes,shape)||![0,90].includes(degrees))throw new RangeError('Choose a listed shape and drawing rotation.');
 const sourceMm=reference.shapes[shape],displays=degrees===0?[...sourceMm]:[sourceMm[1],sourceMm[0]];
 const [w,h]=displays,[rw,rh]=reference.shapes.square;
 const areaMm2=w*h,perimeterMm=2*(w+h),differenceAreaMm2=areaMm2-rw*rh,differencePerimeterMm=perimeterMm-2*(rw+rh);
 return {shape,degrees,originalDimensionsMm:[...sourceMm],displayDimensionsMm:displays,areaMm2,perimeterMm,differenceAreaMm2,differencePerimeterMm,equalArea:differenceAreaMm2===0};
}
export function createStation(){
 let shape='strip',degrees=0,error=null;
 const read=()=>({...compare(shape,degrees),error});
 function dispatch(k,p){error=null;if(k==='cycle')shape=order[(order.indexOf(shape)+1)%order.length];
 if(k==='rotate')degrees=degrees===0?90:0;
 if(k==='select'){if(order.includes(p))shape=p;else error='Choose a listed fixed shape.';}
 if(k==='reset'){shape='strip';degrees=0;}return read();}
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportDrawing(s){return {schema:'bts.tsx60086a.detached-drawing.v1',equipment:'07-14',reference,units:{length:'mm',area:'mm²'},provenance:'unrelated original fixed-shape drawing; no cabinet or inventory data',comparison:Object.fromEntries(Object.entries(s).filter(([k])=>k!=='error'))};}
