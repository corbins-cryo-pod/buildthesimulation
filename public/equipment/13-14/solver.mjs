const lock=a=>Object.freeze(a);
const points=p=>lock(p.map(a=>lock(a)));
export const ids=lock(['draft-a','draft-b']);
export const titles=lock({'draft-a':'Draft A · original frame','draft-b':'Draft B · displaced drawing'});
const drawings=lock({
 'draft-a':lock({id:'draft-a',version:'draft-a-authored-1',verticesMm:points([[10,8],[90,8],[90,68]]),pointIds:lock(['P','Q','R'])}),
 'draft-b':lock({id:'draft-b',version:'draft-b-authored-1',verticesMm:points([[-22,34],[58,34],[58,94]]),pointIds:lock(['P','Q','R'])})
});
export function drawing(id){if(!ids.includes(id))throw new RangeError('Only the two fixed detached diagrams are supported.');return drawings[id];}
export function inspect(id){
 const f=drawing(id),a=f.verticesMm,b=drawing('draft-a').verticesMm;
 const edgesMm=a.map((p,i)=>{const q=a[(i+1)%a.length];return Math.hypot(q[0]-p[0],q[1]-p[1]);});
 const areaMm2=Math.abs(a.reduce((p,q,i)=>{const next=a[(i+1)%a.length];return p+q[0]*next[1]-q[1]*next[0];},0))/2;
 const shiftMm=a[0].map((p,i)=>p-b[0][i]),rigidTranslation=a.every((p,i)=>p.every((v,j)=>v-b[i][j]===shiftMm[j]));
 return {edgesMm,perimeterMm:edgesMm.reduce((p,q)=>p+q,0),diagonalPrMm:edgesMm[2],areaMm2,rigidTranslation,shiftMm};
}
export const blank=()=>({id:'draft-a',seq:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const id=a.type==='cycle'?ids[(ids.indexOf(s.id)+1)%ids.length]:a.payload;drawing(id);return {...s,id,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive inspection of detached immutable drawings is available.');
 const f=drawing(s.id),revision=s.seq+1;
 return {...s,seq:revision,report:{schema:'bts.detached-drafting-inspection.v1',revision,
  diagramId:f.id,sourceVersion:f.version,pointIds:f.pointIds,verticesMm:f.verticesMm,...inspect(f.id),
  frame:'Independent diagram: +X right, +Y up, coordinate units mm.',
  provenance:'Original mathematical demonstration geometry, not acquired data. No relation to the HM 325 or to any physical part.'}};
}
