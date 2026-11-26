const freeze=Object.freeze;
export const board=freeze({min:freeze([0,0]),max:freeze([100,75])});
export const modes=freeze(['separate','touching','overlap','outside']);
export const labels=freeze({separate:'Separated poster tiles',touching:'Edges exactly touch',overlap:'One printed overlap',outside:'One tile partly outside'});
const bounds=(id,min,max)=>freeze({id,min:freeze(min),max:freeze(max)});
const a=bounds('ART-A',[10,10],[40,30]),c=bounds('ART-C',[15,40],[35,65]);
const bs=freeze({separate:bounds('ART-B',[50,15],[75,35]),touching:bounds('ART-B',[40,15],[65,35]),overlap:bounds('ART-B',[32,15],[57,35]),outside:bounds('ART-B',[82,15],[107,35])});
export function tilesFor(mode){
 if(!modes.includes(mode))throw new RangeError('Choose one of the four fixed artwork layouts.');
 return [a,bs[mode],c];
}
const area=t=>(t.max[0]-t.min[0])*(t.max[1]-t.min[1]);
function unionArea(tiles){
 const edges=[...new Set(tiles.flatMap(t=>[t.min[0],t.max[0]]))].sort((a,b)=>a-b);
 return edges.slice(0,-1).reduce((acc,x,k)=>{
  const end=edges[k+1],ys=tiles.filter(t=>t.min[0]<end&&t.max[0]>x).map(t=>[t.min[1],t.max[1]]).sort((a,b)=>a[0]-b[0]);
  let hi=-Infinity,total=0;
  for(const [start,stop] of ys){if(stop>hi){total+=stop-Math.max(start,hi);hi=stop}}
  return acc+total*(end-x);
 },0);
}
export function evaluate(mode){
 const tiles=tilesFor(mode),pairs=[];
 for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++){
  const a=tiles[i],b=tiles[j],o=a.min.map((_,k)=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k]));
  pairs.push({ids:[a.id,b.id],overlapDepthMm:o,overlapAreaMm2:Math.max(0,o[0])*Math.max(0,o[1]),
   relation:o.some(v=>v<0)?'separated':o.some(v=>v===0)?'touching':'overlap'});
 }
 const clearances=tiles.map(t=>({id:t.id,signedMinMm:Math.min(...t.min.map((v,i)=>v-board.min[i]),...t.max.map((v,i)=>board.max[i]-v))}));
 const occupiedMm2=unionArea(tiles);
 return {tiles,pairs,clearances,sumTileAreasMm2:tiles.reduce((s,t)=>s+area(t),0),occupiedMm2,
  label:clearances.some(c=>c.signedMinMm<0)?'outside':pairs.some(p=>p.relation==='overlap')?'overlap':pairs.some(p=>p.relation==='touching')?'touching':'separate'};
}
export const blank=()=>({mode:'separate',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;tilesFor(mode);return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive inspection of the fixed abstract poster is available.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-art-layout.v1',revision,mode:s.mode,
  boardId:'ART-POSTER-01',sourceRevision:'AUTHORED-PAPER-LAYOUT-01',coordinateFrame:'Independent poster millimeters, +X right +Y up',board,...evaluate(s.mode),
  provenance:'Imagined artwork positions and ideal rectangle geometry. Not a vessel, contents, storage system, process, or fit suggestion.'}};
}
