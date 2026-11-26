// Detached documentary review of two immutable drawing records. This is not sample preparation.
export const AUTHOR_ID='bts-synthetic-catalogue';
export const labels=Object.freeze({'outline-reviewed':'Outline reviewed','label-reviewed':'Caption reviewed','scale-reviewed':'Scale reviewed'});
const constants=Object.freeze({dimensionsMm:Object.freeze([42,28]),verticesMm:Object.freeze([Object.freeze([-21,-14]),Object.freeze([21,-14]),Object.freeze([21,14]),Object.freeze([-21,14])]),triangles:Object.freeze([0,1,2,0,2,3])});
export const cards=Object.freeze({A:Object.freeze({sourceId:'inert-card-A',geometry:constants,caption:'Notched outline drafting reference'}),B:Object.freeze({sourceId:'inert-card-B',geometry:constants,caption:'Crosshair drafting reference'})});
export const initial=()=>({card:'A',label:'outline-reviewed',revision:0,notes:[],error:''});
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='card')return Object.hasOwn(cards,p)?{...s,card:p,error:''}:{...s,error:'Choose one of the two drawing cards.'};
 if(id==='label')return Object.hasOwn(labels,p)?{...s,label:p,error:''}:{...s,error:'Choose one of the fixed review labels.'};
 if(id==='example')return act(initial(),'add',['A','outline-reviewed']);
 if(id==='add'){
  const [card,label]=p??[s.card,s.label];
  if(!Object.hasOwn(cards,card))return {...s,error:'Choose one of the two drawing cards.'};
  if(!Object.hasOwn(labels,label))return {...s,error:'Choose one of the fixed review labels.'};
  if(s.notes.some(n=>n.card===card&&n.label===label))return {...s,error:'This drawing already has that review tag.'};
  return {...s,card,label,revision:s.revision+1,error:'',notes:[...s.notes,{card,label,sourceId:cards[card].sourceId,authorId:AUTHOR_ID,revision:s.revision+1,parentRevision:s.revision}]};
 }
 throw Error('Unknown detached drawing action.');
}
export function output(s){return {schema:'bts.inert-drawing-card-review.v1',deviceId:'13-12',kind:'original inert documentation',authorId:AUTHOR_ID,revision:s.revision,records:Object.fromEntries(Object.entries(cards).map(([key,c])=>[key,{...c,geometry:{dimensionsMm:[...c.geometry.dimensionsMm],verticesMm:c.geometry.verticesMm.map(v=>[...v]),triangles:[...c.geometry.triangles]},notes:s.notes.filter(n=>n.card===key).map(n=>({...n}))}])),limitations:'No physical object state, hardware operation, specimens, or process events.'};}
