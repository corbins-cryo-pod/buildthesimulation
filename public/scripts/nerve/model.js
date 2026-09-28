export const fascicles = [
  {x:-.43,y:-.3,r:.34}, {x:.36,y:-.35,r:.31},
  {x:-.34,y:.42,r:.29}, {x:.39,y:.36,r:.32}
];
export function generateSites(seed=42, count=1200) {
  let s=seed>>>0;
  const rand=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
  return Array.from({length:count},(_,i)=>{
    const f=i%4, a=rand()*Math.PI*2, r=Math.sqrt(rand())*fascicles[f].r*.94;
    return {x:fascicles[f].x+Math.cos(a)*r,y:fascicles[f].y+Math.sin(a)*r,f,threshold:.8+rand()*.4};
  });
}
export function field(site, electrodes, spread) {
  return electrodes.reduce((sum,e)=>sum+Math.exp(-Math.hypot(site.x-e.x,site.y-e.y)/spread),0);
}
export function evaluate(sites, electrodes, amplitude, spread, threshold, target) {
  const totals=[0,0,0,0], active=[0,0,0,0];
  const mask=sites.map(s=>{totals[s.f]++;const on=amplitude*field(s,electrodes,spread)>=threshold*s.threshold;if(on)active[s.f]++;return on;});
  const total=active.reduce((a,b)=>a+b,0), off=total-active[target];
  return {mask,active,totals,total,target:active[target]/totals[target]*100,off:off/(sites.length-totals[target])*100,purity:total?active[target]/total*100:0};
}
export function initialState() { return {version:1,seed:42,amplitude:65,spread:.24,threshold:30,target:0,electrodes:[{x:-.43,y:-.3}]}; }
export function validateState(s) {
 if(!s||s.version!==1||!Number.isInteger(s.seed)||!Number.isInteger(s.target)||s.target<0||s.target>3||!Array.isArray(s.electrodes)||s.electrodes.length<1||s.electrodes.length>6)throw Error('Use a valid nerve experiment JSON with 1–6 contacts.');
 for(const [k,lo,hi] of [['amplitude',0,150],['spread',.08,.65],['threshold',5,80]])if(!Number.isFinite(s[k])||s[k]<lo||s[k]>hi)throw Error(`Invalid ${k}.`);
 if(s.electrodes.some(e=>!Number.isFinite(e.x)||!Number.isFinite(e.y)||Math.hypot(e.x,e.y)>1.051))throw Error('Contact positions must be inside the nerve or on the cuff.');
 return {version:1,seed:s.seed,amplitude:s.amplitude,spread:s.spread,threshold:s.threshold,target:s.target,electrodes:s.electrodes.map(e=>({x:e.x,y:e.y}))};
}
