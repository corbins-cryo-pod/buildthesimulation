const path='/equipment/06-06/',check=(ok,msg)=>{if(!ok)throw new Error(msg);};
export const initial=()=>({view:0,pair:'AB'});
export const load=async()=>{const r=await fetch(path+'drawing.json');check(r.ok,'Drawing HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 check(f?.schema==='bts.synthetic-drawing-ruler.v1'&&f.drawingId==='NSL-GEOMETRIC-PLATE-001'&&f.revision===1&&typeof f.provenance==='string','Unsupported fixed drawing.');
 check(f.frame?.widthPx===81&&f.frame.heightPx===81&&f.frame.pixelSizeMm===.25,'Invalid drawing scale or frame.');
 check(f.views?.map(v=>v.id+':'+v.orientation).join()==='BASE:native,R90:clockwise-90'&&f.pairs?.join()==='AB,AC,BC','Invalid preauthored view or mark inventory.');
 const points=Object.keys(f.points??{}).sort();check(points.join()==='A,B,C','Invalid drawing points.');
 for(const q of Object.values(f.points))check(q?.length===2&&q.every(p=>Number.isInteger(p)&&p>=0&&p<=80),'Point outside fixed drawing.');
 check(new Set(Object.values(f.points).map(q=>q.join())).size===3,'Drawing marks must be distinct.');
 return f;
}
export function info(f,s){
 const view=f.views[s.view];check(Number.isInteger(s.view)&&view&&f.pairs.includes(s.pair),'Unknown view or mark pair.');
 const scale=f.frame.pixelSizeMm,tr=([x,y])=>s.view?[f.frame.widthPx-1-y,x]:[x,y];
 const points=Object.fromEntries(Object.entries(f.points).map(([name,q])=>[name,tr(q)]));
 const [a,b]=[...s.pair].map(k=>points[k]),delta=b.map((v,i)=>v-a[i]);
 return {schema:'bts.synthetic-drawing-review.v1',kind:'synthetic-digital-drawing-exhibit',drawingId:f.drawingId,revision:f.revision,provenance:f.provenance,viewId:view.id,frame:f.frame,pointsPx:points,pair:s.pair,deltaPx:delta,distanceMm:scale*Math.hypot(...delta)};
}
export function act(f,s,a,v){
 try{
  const next=a==='reset'?initial():a==='next'?{...s,view:1-s.view}:a==='pair'?{...s,pair:v}:null;
  check(next,'Unknown exhibit action.');info(f,next);
  return {ok:true,state:next,message:'The fixed drawing is unchanged; the ruler measures the selected marks.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
