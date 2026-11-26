const path='/equipment/07-09/',ok=(x,m)=>{if(!x)throw Error(m);};
export const initial=()=>({view:0});
export const load=async()=>{const r=await fetch(path+'drawing-archive.json');ok(r.ok,'Archive HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 ok(f?.schema==='bts.synthetic-outline-archive.v1'&&f.drawingId==='BTS-STACK-DRAWING-001'&&f.revision===1&&typeof f.provenance==='string'&&f.unit==='mm'&&f.scaleMmPerPx===.5,'Invalid archive metadata or scale.');
 ok(f.views?.length===2,'Two saved outlines are required.');
 for(const [i,v] of f.views.entries()){
  ok(v.id===['STACK-FULL','STACK-CROPPED'][i]&&v.sizePx?.join()===['180,120','180,85'][i],'Unknown saved drawing view.');
  const [w,h]=v.sizePx,{left,right,top,joint,base}=v.edgePx;
  ok([left,right,top,joint].every(Number.isInteger)&&0<=left&&left<right&&right<w&&0<=top&&top<joint&&joint<h,'Saved outline edges are out of bounds.');
  ok(i===0?Number.isInteger(base)&&base>joint&&base<h:base===null,'The full view must show the base; the clipped view must not supply it.');
 }
 const [full,clip]=f.views;
 for(const k of ['left','right','top','joint'])ok(full.edgePx[k]===clip.edgePx[k],'Common observed edges disagree across saved views.');
 return f;
}
export function info(f,s){
 const v=f.views[s.view];ok(Number.isInteger(s.view)&&v,'Unknown archived view index.');
 const p=v.edgePx,k=f.scaleMmPerPx;
 return {schema:'bts.synthetic-outline-review.v1',kind:'synthetic-documentary-drawing',drawingId:f.drawingId,revision:f.revision,source:f.provenance,viewId:v.id,framePx:v.sizePx,scaleMmPerPx:k,observedEdgesPx:p,results:{widthMm:(p.right-p.left)*k,upperHeightMm:(p.joint-p.top)*k,lowerHeightMm:p.base===null?null:(p.base-p.joint)*k,totalHeightMm:p.base===null?null:(p.base-p.top)*k,heightCoverage:p.base===null?'unknown: base clipped':'both exterior edges visible'}};
}
export function act(f,s,a){
 try{
  const t=a==='next'?{view:1-s.view}:a==='reset'?initial():null;ok(t,'Unsupported drawing action.');const q=info(f,t);
  return {ok:true,state:t,message:q.results.totalHeightMm===null?'Base is outside this saved view; height remains unknown.':'Both height edges are visible in the full drawing.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
