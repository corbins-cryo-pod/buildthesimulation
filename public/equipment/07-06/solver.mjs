const freeze=Object.freeze;
export const modes=freeze(['zero','nonzero']);
export const coordinatesM=freeze([-.4,.3]);
export const cases=freeze({zero:freeze([6,8]),nonzero:freeze([6,7])});
export const labels=freeze({zero:'Equal opposing moments',nonzero:'Unequal opposing moments'});
export function evaluate(mode){
 if(!modes.includes(mode))throw new RangeError('Choose one of the two immutable statics cards.');
 const forces=cases[mode];
 const points=coordinatesM.map((xM,i)=>({id:['L','R'][i],xM,forceDownN:forces[i],signedMomentNm:-xM*forces[i]}));
 const sum=points.reduce((p,q)=>p+q.signedMomentNm,0),netMomentNm=Math.abs(sum)<1e-12?0:sum;
 return {points,netMomentNm,classification:netMomentNm===0?'zero-net':netMomentNm>0?'counterclockwise-net':'clockwise-net'};
}
export const blank=()=>({mode:'zero',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;evaluate(mode);return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive reading of detached statics drawings is supported.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-static-moment-inspection.v1',revision,drawingId:'STATICS-CARD-01',
  sourceRevision:'STATIC-STATICS-A',mode:s.mode,axis:'X right; force downward; positive moment counterclockwise',positionsM:coordinatesM,
  units:{length:'m',force:'N',moment:'N·m'},...evaluate(s.mode),
  provenance:'Authored planar static diagram only, unrelated to centrifuge hardware, loads, rotation, specimens or process result.'}};
}
