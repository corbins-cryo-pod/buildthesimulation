export const panel=Object.freeze({id:'BTS-DRAFT-DOTS-04',revision:'1',widthMm:150,heightMm:75,datumXMm:75,yMm:37.5,marks:Object.freeze({A:30,B:60,C:90,D:120})});
export const targets=Object.freeze({Panel_pair_key:'cycle',Panel_mirror_key:'mirror'});
const pairs=['AB','BC','CD','AD','AA'];
export function inspect(pair,mirrored=false){
 if(!pairs.includes(pair))throw new RangeError('Choose a listed pair.');
 const marker=(name)=>({name,sourceXMm:panel.marks[name],displayXMm:mirrored?panel.widthMm-panel.marks[name]:panel.marks[name],yMm:panel.yMm});
 const a=marker(pair[0]),b=marker(pair[1]),deltaMm=b.displayXMm-a.displayXMm;
 return {pair,mirrored,markers:Object.keys(panel.marks).map(marker),from:a,to:b,deltaMm,distanceMm:Math.abs(deltaMm),midpointXMm:(a.displayXMm+b.displayXMm)/2,datumXMm:panel.datumXMm};
}
export function createStation(){
 let pair='AB',mirrored=false,error=null;
 const read=()=>({...inspect(pair,mirrored),error});
 function dispatch(k,p){error=null;if(k==='cycle')pair=pairs[(pairs.indexOf(pair)+1)%pairs.length];
 if(k==='mirror')mirrored=!mirrored;
 if(k==='pair'){if(pairs.includes(p))pair=p;else error='Choose a listed pair.';}
 if(k==='reset'){pair='AB';mirrored=false;}return read();}
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportDrawing(s){return {schema:'bts.mfcs-ez.detached-drafting-view.v1',equipment:'06-07',units:'mm',provenance:'invented drawing coordinates; not hardware centers, routing or instrument output',panel,inspection:Object.fromEntries(Object.entries(s).filter(([k])=>k!=='error'))};}
