// Detached synthetic engineering drawing annotations. No sample or instrument state.
export const SOURCE_ID='inert-drawing-01';
export const landmarks=Object.freeze({
 'upper-notch':{label:'Upper notch',xyMm:[-10,11]},
 'center-cross':{label:'Center reference',xyMm:[0,0]},
 'right-arrow':{label:'Right arrow',xyMm:[13,-5]}
});
export const tags=Object.freeze({'outline-mark':'Outline tagged','locator-mark':'Locator tagged','orientation-mark':'Orientation tagged'});
export const initial=()=>({feature:'upper-notch',tag:'outline-mark',notes:[],revision:0,error:''});
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='feature')return Object.hasOwn(landmarks,p)?{...s,feature:p,error:''}:{...s,error:'Choose a documented landmark.'};
 if(id==='tag')return Object.hasOwn(tags,p)?{...s,tag:p,error:''}:{...s,error:'Choose one of the drawing tags.'};
 if(id==='example'){let q=initial();q=act(q,'add');q=act(q,'feature','center-cross');q=act(q,'tag','locator-mark');return act(q,'add');}
 if(id==='add'){
  const [feature,tag]=p??[s.feature,s.tag];
  if(!Object.hasOwn(landmarks,feature))return {...s,error:'Choose a documented landmark.'};
  if(!Object.hasOwn(tags,tag))return {...s,error:'Choose one of the drawing tags.'};
  if(s.notes.some(n=>n.feature===feature&&n.tag===tag))return {...s,error:'That drawing tag already exists.'};
  const n=s.revision+1;
  return {...s,feature,tag,revision:n,error:'',notes:[...s.notes,{ordinal:n,parentRevision:s.revision,sourceId:SOURCE_ID,feature,tag,xyMm:[...landmarks[feature].xyMm]}]};
 }
 throw Error('Unknown inert drawing action');
}
export function output(s){return {schema:'bts.synthetic-drawing-notes.v1',deviceId:'13-09',kind:'original inert drawing and annotation ledger',sourceId:SOURCE_ID,sourceRevision:0,documentRevision:s.revision,drawing:{dimensionsMm:[40,28],frame:'origin at center, positive X right and Y up',landmarks},notes:s.notes.map(n=>({...n,xyMm:[...n.xyMm]})),documentScope:'Documentation only. No record of a specimen, material change, process, or physical instrument.'};}
