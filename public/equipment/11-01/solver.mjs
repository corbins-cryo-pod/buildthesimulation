const path='/equipment/11-01/',check=(x,m)=>{if(!x)throw Error(m);};
export const initial=()=>({index:0});
export const load=async()=>{const r=await fetch(path+'count-cards.json');check(r.ok,'Archive HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 check(f?.schema==='bts.synthetic-count-card-archive.v1'&&f.archiveId==='DORIC-DETACHED-ARITHMETIC-001'&&f.revision===1&&typeof f.source==='string','Unsupported abstract count archive.');
 check(f.categories?.join()==='Circle,Square,Diamond'&&f.cards?.length===3,'Malformed drawing inventory.');
 for(const [i,c] of f.cards.entries()){
  check(c.id===['REFERENCE','DOUBLE','EMPTY'][i]&&Array.isArray(c.counts)&&c.counts.length===3&&c.counts.every(n=>Number.isInteger(n)&&n>=0&&n<=8),'Invalid static symbol counts or card identifier.');
 }
 check(f.cards[0].counts.some(Boolean)&&f.cards[1].counts.every((n,i)=>n===2*f.cards[0].counts[i])&&f.cards[2].counts.every(n=>n===0),'Fixture must contain a nonempty card, a double, and an empty card.');
 return f;
}
export function info(f,s){
 const c=f.cards[s.index];check(Number.isInteger(s.index)&&c,'Archived drawing index is out of range.');
 const total=c.counts.reduce((a,b)=>a+b,0);
 const marks=c.counts.map((count,i)=>({symbol:f.categories[i],count,share:total?count/total:null}));
 return {schema:'bts.synthetic-count-card-review.v1',kind:'synthetic-abstract-display',archiveId:f.archiveId,revision:f.revision,source:f.source,cardId:c.id,total,shareUnit:'dimensionless',status:total?'defined':'undefined: zero total',marks};
}
export function act(f,s,a,v){
 try{
  const t=a==='reset'?initial():a==='next'?{index:(s.index+1)%f.cards.length}:a==='select'?{index:v}:null;
  check(t,'Unsupported abstract view action.');const q=info(f,t);
  return {ok:true,state:t,message:q.total?'Each fraction is its count divided by the total. This panel does not drive anything.':'No marks are present. Shares are undefined, not zero.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
