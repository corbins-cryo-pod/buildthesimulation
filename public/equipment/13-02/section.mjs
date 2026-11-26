export const witness=Object.freeze({id:'DRY-SECTION-LOCK-01',revision:1,widthUm:120,heightUm:80,voidRadiusUm:12,barUm:24,voidCenterUm:Object.freeze([45,43]),markedStartUm:Object.freeze([20,15]),markedEndUm:Object.freeze([100,75])});
export const station=()=>({selected:'body'});
export function act(s,key,v){
 if(key==='reset')return station();
 if(key!=='inspect'||!['body','void','diagonal'].includes(v))throw RangeError('Select one of the three landmarks in the fixed inert diagram.');
 return {selected:v};
}
export function inspect(s){
 const {selected}=act(station(),'inspect',s.selected),a=witness.widthUm*witness.heightUm,v=Math.PI*witness.voidRadiusUm**2;
 const ox=witness.markedEndUm[0]-witness.markedStartUm[0],oy=witness.markedEndUm[1]-witness.markedStartUm[1];
 return {schema:'bts.synthetic-section-summary.v1',sampleId:witness.id,revision:witness.revision,sourceType:'synthetic 2D geometric diagram; not an image or material prediction',lockedPlane:'XY, fixed published diagram; origin lower left; no acquisition or spatial sampling',selected,units:{length:'µm',area:'µm²',voidFraction:'%'},bboxUm:{width:witness.widthUm,height:witness.heightUm},grossAreaUm2:a,netAreaUm2:a-v,void:{centerUm:[...witness.voidCenterUm],radiusUm:witness.voidRadiusUm,diameterUm:2*witness.voidRadiusUm,areaUm2:v,percent:100*v/a},diagonal:{startUm:[...witness.markedStartUm],endUm:[...witness.markedEndUm],deltaUm:[ox,oy],lengthUm:Math.hypot(ox,oy)},scaleBarUm:witness.barUm};
}
