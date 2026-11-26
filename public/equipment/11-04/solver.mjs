const freeze=Object.freeze;
export const modes=freeze(['original','ccw','cw']);
export const labels=freeze({original:'Original orientation',ccw:'Quarter-turn counterclockwise',cw:'Quarter-turn clockwise'});
export const points=freeze([
 freeze({id:'A',xyMm:freeze([-12,5])}),freeze({id:'B',xyMm:freeze([6,14])}),freeze({id:'C',xyMm:freeze([0,-8])})]);
export function view(mode){
 if(!modes.includes(mode))throw new RangeError('Choose a fixed orientation of the independent card.');
 const orient=([x,y])=>mode==='ccw'?[-y,x]:mode==='cw'?[y,-x]:[x,y];
 const plot=points.map(p=>({...p,viewMm:orient(p.xyMm)})),[a,b]=plot,vectorMm=b.viewMm.map((v,i)=>v-a.viewMm[i]);
 return {plot,vectorMm,pairLengthMm:Math.hypot(...vectorMm)};
}
export const blank=()=>({mode:'original',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;view(mode);return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive viewing of the detached coordinate card is available.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-coordinate-card.v1',revision,cardId:'ABSTRACT-AXIS-CARD-01',
  sourceRevision:'AXES-ORIENTATION-DEMO-001',mode:s.mode,axes:'X right and Y up; right-handed positive rotation counterclockwise',
  units:'mm',...view(s.mode),provenance:'Fictitious 2D teaching coordinates. No apparatus connection, operation, acquisition or output.'}};
}
