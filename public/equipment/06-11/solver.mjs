const path='/equipment/06-11/',check=(x,m)=>{if(!x)throw Error(m);};
export const initial=()=>({view:0});
export const load=async()=>{const r=await fetch(path+'exhibit.json');check(r.ok,'Exhibit HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 check(f?.schema==='bts.synthetic-projection-cards.v1'&&f.exhibitId==='OF12G-OPTICAL-ILLUSTRATION-001'&&f.units==='mm'&&f.revision===1&&typeof f.provenance==='string','Unsupported fixed optical exhibit.');
 check(f.cardSizeMm?.join()==='40,30'&&f.perspectivePlaneDistanceMm===80,'Unexpected authored card or view dimensions.');
 check(f.cards?.map(c=>c.id+':'+c.zMm).join()==='CARD-NEAR:200,CARD-FAR:400','Unknown or invalid depth; cards must be in front of the virtual viewpoint.');
 check(f.views?.map(x=>x.id+':'+x.kind).join()==='PARALLEL:orthographic,PERSPECTIVE:pinhole','Unsupported view inventory.');
 return f;
}
export function info(f,s){
 const v=f.views[s.view];check(Number.isInteger(s.view)&&v,'Stored view index is out of range.');
 const cards=f.cards.map(({id,zMm})=>{
  const factor=v.kind==='orthographic'?1:f.perspectivePlaneDistanceMm/zMm;
  return {id,zMm,sourceSizeMm:[...f.cardSizeMm],projectionScale:factor,displaySizeMm:f.cardSizeMm.map(x=>x*factor)};
 });
 return {schema:'bts.synthetic-projection-review.v1',kind:'synthetic-documentary-exhibit',exhibitId:f.exhibitId,revision:f.revision,source:f.provenance,viewId:v.id,projection:v.kind,units:'mm',cards,nearToFarWidthRatio:cards[0].displaySizeMm[0]/cards[1].displaySizeMm[0]};
}
export function act(f,s,a){
 try{
  const t=a==='next'?{view:1-s.view}:a==='reset'?initial():null;check(t,'Unsupported review action.');const q=info(f,t);
  return {ok:true,state:t,message:q.projection==='pinhole'?'Only the projected sizes changed. The source cards are equally sized.':'Parallel projection preserves both card dimensions in this exhibit.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
