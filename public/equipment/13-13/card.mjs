export const card=Object.freeze({sampleId:'SLOPE-CARD-CM3050-01',revision:1,x0Mm:5,y0Mm:0,slopeXPerY:.75,marks:Object.freeze({P:12,Q:36})});
export const station=()=>({label:'P'});
export function act(s,action,value){if(action==='reset')return station();if(action!=='select'||!Object.hasOwn(card.marks,value))throw RangeError('Only fixed printed marks P and Q can be read.');return{label:value}}
export function inspect(s){
 const {label}=act(station(),'select',s.label),at=Object.fromEntries(Object.entries(card.marks).map(([k,y])=>[k,[card.x0Mm+card.slopeXPerY*y,y]])),[x,y]=at[label],dx=at.Q[0]-at.P[0],dy=at.Q[1]-at.P[1];
 return {schema:'bts.synthetic-coordinate-card.v1',sampleId:card.sampleId,revision:card.revision,provenance:'Original immutable inert 2D printed-card illustration; no instrument activity or measured hardware output.',coordinateFrame:'Card-local XY; +X right, +Y up; millimeters',selected:label,selectedPositionMm:[x,y],referenceLine:{xInterceptMm:card.x0Mm,slopeXPerY:card.slopeXPerY},fixedMarksMm:at,pToQ:{deltaXMm:dx,deltaYMm:dy,distanceMm:Math.hypot(dx,dy)}};
}
