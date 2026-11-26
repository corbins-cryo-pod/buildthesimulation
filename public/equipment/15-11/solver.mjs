const base='/equipment/15-11/';
const gridId='bts.synthetic-pattern-archive.v1';
export function parse(f){
 if(f?.schema!==gridId||typeof f.archiveId!=='string'||!Number.isInteger(f.revision)||f.revision<1||typeof f.provenance!=='string')throw Error('Invalid fixed archive identity');
 const {cols,rows,pitchMm}=f.grid??{};
 if(![cols,rows].every(n=>Number.isInteger(n)&&n>0&&n<=64)||!Number.isFinite(pitchMm)||pitchMm<=0)throw Error('Invalid drawing grid');
 if(!Array.isArray(f.cards)||!f.cards.length||f.cards.length>32)throw Error('Invalid card index');
 const seen=new Set();
 const cards=f.cards.map(c=>{
  if(!c||typeof c.id!=='string'||!c.id||seen.has(c.id)||typeof c.label!=='string'||!Array.isArray(c.cells)||c.cells.length>cols*rows)throw Error('Invalid card');
  seen.add(c.id);const addresses=new Set();
  const cells=c.cells.map(cell=>{
   if(!Array.isArray(cell)||cell.length!==2||!cell.every(Number.isInteger)||cell[0]<0||cell[0]>=cols||cell[1]<0||cell[1]>=rows)throw Error('Cell outside drawing grid');
   const key=cell.join('/');if(addresses.has(key))throw Error('Duplicate card cell');addresses.add(key);return Object.freeze([...cell]);
  });
  return Object.freeze({id:c.id,label:c.label,cells:Object.freeze(cells)});
 });
 if(!cards.some(x=>x.id===f.referenceId&&x.cells.length))throw Error('Missing or blank reference card');
 return Object.freeze({archiveId:f.archiveId,revision:f.revision,provenance:f.provenance,referenceId:f.referenceId,cols,rows,pitchMm,cards:Object.freeze(cards)});
}
export async function load(){
 const r=await fetch(base+'saved-patterns.json');if(!r.ok)throw Error('Fixed pattern archive unavailable');return parse(await r.json());
}
export const initial=()=>Object.freeze({index:1});
export function act(f,s,a,value){
 if(a==='reset')return {ok:true,state:initial(),message:'Restored translated comparison.'};
 const n=a==='next'?(s.index+1)%f.cards.length:a==='select'?value:-1;
 if(!Number.isInteger(n)||n<0||n>=f.cards.length)return {ok:false,state:s,message:'This archive has no such card.'};
 return {ok:true,state:Object.freeze({index:n}),message:'Selected a fixed card. No animation or device command.'};
}
function normal(c){
 const x=Math.min(...c.map(i=>i[0])),y=Math.min(...c.map(i=>i[1]));
 return new Set(c.map(([a,b])=>(a-x)+'/'+(b-y)));
}
export function info(f,s){
 const reference=f.cards.find(c=>c.id===f.referenceId), card=f.cards[s.index];
 if(!card)throw Error('Unknown card selection');
 const count=card.cells.length;
 let comparison=null;
 if(count){
  const A=normal(reference.cells),B=normal(card.cells);
  const intersectionCells=[...A].filter(x=>B.has(x)).length,unionCells=new Set([...A,...B]).size;
  comparison={intersectionCells,unionCells,iou:intersectionCells/unionCells};
 }
 return {schema:'bts.synthetic-pattern-comparison.v1',archiveId:f.archiveId,revision:f.revision,source:'synthetic-inert-drawing',referenceId:reference.id,cardId:card.id,grid:{cols:f.cols,rows:f.rows,pitchMm:f.pitchMm},algorithm:'Subtract each nonempty card’s independent minimum X and Y; no rotation or mirror; Jaccard intersection divided by union.',card:{occupiedCells:count,areaMm2:count*f.pitchMm**2},coverage:count?'stored-pattern':'stored-blank',comparison};
}
