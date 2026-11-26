const freeze=Object.freeze;
export const markers=freeze([freeze([66,-12]),freeze([16,38]),freeze([-34,-12])]);
export const candidates=freeze({nominal:freeze([16,-62]),offset:freeze([16,-65])});
export const modes=freeze(['nominal','offset']);
export function circle([a,b,c]){
 if(![a,b,c].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))throw new RangeError('Three valid XY drawing points are needed.');
 const dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1],d=2*(dx*ey-dy*ex);
 if(Math.abs(d)<1e-12)throw new RangeError('Collinear drawing points do not define a unique circle.');
 const f=dx*dx+dy*dy,g=ex*ex+ey*ey,ox=(ey*f-dy*g)/d,oy=(dx*g-ex*f)/d;
 return {centerMm:[a[0]+ox,a[1]+oy],radiusMm:Math.hypot(ox,oy)};
}
export function measure(mode){
 if(!modes.includes(mode))throw new RangeError('Choose one of the two authored drawing variants.');
 const f=circle(markers),p=candidates[mode],r=Math.hypot(...p.map((v,i)=>v-f.centerMm[i]));
 return {...f,heldOutPointMm:p,heldOutRadiusMm:r,radialResidualMm:r-f.radiusMm};
}
export const blank=()=>({mode:'nominal',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;measure(mode);
  return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive viewing of authored drawings is available.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-circle-inspection.v1',revision,sourceRevision:'RING-DEMO-001',
  mode:s.mode,drawingId:'UNRELATED-CIRCLE-DRAWING',coordinateFrame:{axis:['X right','Y up'],units:'mm'},
  referencePointIds:['A','B','C'],referencePointsMm:markers,heldOutPointId:'D',...measure(s.mode),
  provenance:'Immutable synthetic mathematical drawing, not a physical fixture, machine workpiece or process output.'}};
}
