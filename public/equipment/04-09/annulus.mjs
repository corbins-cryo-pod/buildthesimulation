export const gauge=Object.freeze({sampleId:'POLI-DETACHED-RADIAL-01',revision:1,innerMm:10,outerMm:18,marks:Object.freeze({M1:Object.freeze([9,12]),M2:Object.freeze([6,8]),M3:Object.freeze([12,16])})});
export const station=()=>({mark:'M1'});
export function act(s,key,arg){if(key==='reset')return station();if(key!=='mark'||!Object.hasOwn(gauge.marks,arg))throw RangeError('Read only one of the three fixed printed marks.');return{mark:arg}}
export function inspect(s){const mark=act(station(),'mark',s.mark).mark,point=[...gauge.marks[mark]],radiusMm=Math.hypot(...point),signedClearanceMm=Math.min(radiusMm-gauge.innerMm,gauge.outerMm-radiusMm);
 return {schema:'bts.synthetic-annulus-inspection.v1',sampleId:gauge.sampleId,revision:gauge.revision,source:'Immutable author-designed printed test circle; no machining or material response.',coordinateFrame:'Card-local XY centered on the circle; millimeters',innerMm:gauge.innerMm,outerMm:gauge.outerMm,selected:mark,pointMm:point,radiusMm,signedClearanceMm,class:signedClearanceMm>0?'inside band':signedClearanceMm===0?'on boundary':'outside band'};
}
