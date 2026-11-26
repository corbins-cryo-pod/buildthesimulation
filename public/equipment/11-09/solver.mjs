const src='/equipment/11-09/',ok=(c,m)=>{if(!c)throw Error(m);};
export const initial=()=>({view:0});
export const load=async()=>{const r=await fetch(src+'rectangles.json');ok(r.ok,'Archive HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 ok(f?.schema==='bts.synthetic-rectangle-comparison.v1'&&f.exhibitId==='MONACO-GEOMETRY-CARDS-001'&&f.revision===1&&typeof f.provenance==='string','Unsupported fixed drawing archive.');
 ok(f.frame?.unit==='mm'&&f.frame.width===56&&f.frame.height===32&&f.cases?.length===2,'Invalid geometric frame.');
 for(const [i,c] of f.cases.entries()){
  ok(c.id===['OVERLAP','EDGE-TOUCH'][i]&&c.rectangles?.map(t=>t.id).join()==='A,B','Unknown drawing or marks.');
  for(const {boundsMm:b} of c.rectangles){
   ok(Array.isArray(b)&&b.length===4&&b.every(Number.isFinite),'Missing rectangle edges.');
   const [x,y,X,Y]=b;ok(0<=x&&X<=56&&x<X&&0<=y&&Y<=32&&y<Y,'Rectangle edges out of bounds or degenerate.');
  }
 }
 return f;
}
export function info(f,s){
 const q=f.cases[s.view];ok(Number.isInteger(s.view)&&q,'Unknown stored drawing index.');
 const [a,b]=q.rectangles.map(t=>t.boundsMm),lo=a.slice(0,2).map((v,i)=>Math.max(v,b[i])),hi=a.slice(2).map((v,i)=>Math.min(v,b[i+2]));
 const lengths=hi.map((v,i)=>v-lo[i]),degenerate=lengths.some(v=>v<=0);
 const commonArea=degenerate?0:lengths[0]*lengths[1];
 const segments=q.rectangles.map(t=>{const [x,y,X,Y]=t.boundsMm;return {...t,areaMm2:(X-x)*(Y-y)};});
 const union=segments.reduce((s,t)=>s+t.areaMm2,0)-commonArea;
 return {schema:'bts.synthetic-rectangle-review.v1',kind:'synthetic-detached-drawing',exhibitId:f.exhibitId,revision:f.revision,source:f.provenance,viewId:q.id,frame:f.frame,rectangles:segments,overlap:{classification:!degenerate?'area overlap':lengths.every(v=>v>=0)?'boundary contact only':'disjoint',boundsMm:degenerate?null:[...lo,...hi],areaMm2:commonArea},unionAreaMm2:union,overlapFractionOfUnion:commonArea/union};
}
export function act(f,s,a){
 try{
  const t=a==='next'?{view:1-s.view}:a==='reset'?initial():null;ok(t,'Unsupported review action.');const q=info(f,t);
  return {ok:true,state:t,message:q.overlap.areaMm2?'The colored overlap has positive area.':'The edges touch, but no region has positive overlap area.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
