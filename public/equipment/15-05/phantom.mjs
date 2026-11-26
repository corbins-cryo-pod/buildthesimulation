const immutable=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(immutable);Object.freeze(x)}return x};
export const PHANTOM=immutable({id:'BTS-ORTHO-CARD-01505',revision:1,source:'Authored inert geometric illustration; no acquisition or empirical data',shapeIJK:[24,16,12],stepMm:[.5,1.25,2],originCenterMm:[10,-20,6],pictures:{A:{index:[16,4,7],mark:'A'},B:{index:[9,8,5],mark:'B'},U:{index:[23,15,11],mark:null}}});
export const PLANES=immutable([{id:'XY',pair:[0,1],normal:2},{id:'XZ',pair:[0,2],normal:1},{id:'YZ',pair:[1,2],normal:0}]);
export function station(){return Object.freeze({picture:'A'})}
export function act(s,kind,key){if(kind!=='picture'||!Object.hasOwn(PHANTOM.pictures,key))throw RangeError('Choose A, B, or U on the detached chart');return Object.freeze({picture:key})}
export function indexToMm(p){
 if(!Array.isArray(p)||p.length!==3||p.some((v,i)=>!Number.isInteger(v)||v<0||v>=PHANTOM.shapeIJK[i]))throw RangeError('Outside the authored array');
 return p.map((v,i)=>PHANTOM.originCenterMm[i]+v*PHANTOM.stepMm[i]);
}
export function read(s){
 if(!s||!Object.hasOwn(PHANTOM.pictures,s.picture))throw RangeError('No authored picture selected');
 const {index,mark}=PHANTOM.pictures[s.picture],p=indexToMm(index);
 const projections=PLANES.map(({id,pair,normal})=>({id,axisOrder:pair.map(i=>'XYZ'[i]).join(''),fixedSliceIndex:index[normal],fixedSliceMm:p[normal],fiducialIndex:mark?pair.map(i=>index[i]):null,fiducialMm:mark?pair.map(i=>p[i]):null}));
 const distanceFromAMm=mark?Math.hypot(...p.map((a,i)=>a-indexToMm(PHANTOM.pictures.A.index)[i])):null;
 return immutable({schema:'bts.inert-orthographic-card.v1',cardId:PHANTOM.id,revision:PHANTOM.revision,source:PHANTOM.source,picture:s.picture,indexOrigin:'zero-based cell centers',coordinateUnit:'mm',stepMm:[...PHANTOM.stepMm],originCenterMm:[...PHANTOM.originCenterMm],shapeIJK:[...PHANTOM.shapeIJK],sliceIntersectionIJK:[...index],sliceIntersectionMm:p,fiducial:mark?{id:mark,ijk:[...index],xyzMm:p}:null,distanceFromAMm,projections});
}
