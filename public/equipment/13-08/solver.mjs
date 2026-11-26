const corners=(ar)=>Object.freeze(ar.map(x=>Object.freeze(x)));
export const ids=Object.freeze(['TILE-A','TILE-B']);
export const labels=Object.freeze({'TILE-A':'A · 60 × 80 mm tile','TILE-B':'B · 120 × 50 mm tile'});
export const tiles=Object.freeze({
 'TILE-A':Object.freeze({id:'TILE-A',cornersMm:corners([[10,20],[70,20],[70,100],[10,100]]),authoredRevision:'A-geometric-1',interior:null}),
 'TILE-B':Object.freeze({id:'TILE-B',cornersMm:corners([[-60,-25],[60,-25],[60,25],[-60,25]]),authoredRevision:'B-geometric-1',interior:null})
});
export function tile(id){if(!ids.includes(id))throw new RangeError('Choose one of the two detached exhibit tiles.');return tiles[id]}
function distance(a,b){return Math.hypot(b[0]-a[0],b[1]-a[1]);}
export const blank=()=>({id:'TILE-A',sequence:0,report:null,perTile:Object.freeze({})});
export function readings(id){
 const t=tile(id),[a,b,c,d]=t.cornersMm;
 return {edgesMm:[distance(a,b),distance(b,c),distance(c,d),distance(d,a)],diagonalMm:distance(a,c)};
}
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const id=a.type==='cycle'?ids[(ids.indexOf(s.id)+1)%ids.length]:a.payload;tile(id);
  return {...s,id,report:null};
 }
 if(a.type!=='annotate')throw new RangeError('This station only adds documentary annotations to the detached tiles.');
 const t=tile(s.id),sequence=s.sequence+1,revision=`${t.id}-annotation-${sequence}`;
 const report={schema:'bts.detached-outline-annotation.v1',artifactId:t.id,sourceRevision:t.authoredRevision,
  revision,parentAnnotation:s.perTile[s.id]??null,scope:'Inert synthetic exhibit outline only. No equipment use, processing, compatibility, biology or measured material property.',
  provenance:'BuildTheSimulation authored geometry; coordinate differences and their Euclidean length.',annotation:'Outline dimensions recorded only.',
  coordinateFrame:{axes:['X right','Y up'],units:'mm',cells:'None; continuous authored corners per tile'},cornersMm:t.cornersMm,
  ...readings(t.id),unobservedInterior:t.interior};
 return {...s,sequence,report,perTile:Object.freeze({...s.perTile,[s.id]:revision})};
}
