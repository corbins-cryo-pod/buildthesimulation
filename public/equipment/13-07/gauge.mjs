export const marks=Object.freeze({A:Object.freeze([Object.freeze([10,12]),Object.freeze([70,57])]),B:Object.freeze([Object.freeze([19,27]),Object.freeze([59,57])])});
export const station=()=>({pair:'A',zoom:1});
export function act(s,key,v){
 if(key==='reset')return station();
 if(key==='zoom')return{...s,zoom:s.zoom===1?1.5:1};
 if(key!=='pair'||!Object.hasOwn(marks,v))throw RangeError('Choose a fixed published fiducial pair A or B.');
 return{...s,pair:v};
}
export function measure(s){
 if(!Object.hasOwn(marks,s.pair)||![1,1.5].includes(s.zoom))throw RangeError('Unknown landmark pair or display scale.');
 const pts=marks[s.pair],basePx=4,barUm=30,barPx=barUm*basePx*s.zoom;
 const dx=pts[1][0]-pts[0][0],dy=pts[1][1]-pts[0][1],distPx=Math.hypot(dx*basePx*s.zoom,dy*basePx*s.zoom),umPerDisplayPx=barUm/barPx;
 return{schema:'bts.synthetic-fiducial-inspection.v1',sampleId:'FIDUCIAL-CARD-UC7-01',revision:1,kind:'Frozen inert 2D author-designed reference, no measured data',units:'µm',axes:'Synthetic chart XY, +X right and +Y up, origin lower left',pair:s.pair,displayZoom:s.zoom,referenceBarUm:barUm,referenceBarDisplayPx:barPx,umPerDisplayPx,pointsUm:pts.map(q=>[...q]),distanceDisplayPx:distPx,distanceUm:distPx*umPerDisplayPx};
}
