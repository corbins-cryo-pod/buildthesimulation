/**
 * Peripheral nerve regeneration laboratory — transparent reduced-order model.
 * Physical coordinates: mm. Time: days since injury. Q/D/M/S/V/F are bounded,
 * dimensionless state variables, not measured cell counts or concentrations.
 * Original exploratory synthesis; not a clinically calibrated prediction.
 */
export const MODEL_VERSION = '1.0.1';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const finite = (x, fallback) => Number.isFinite(Number(x)) ? Number(x) : fallback;
const mix = (a, b, u) => a + (b - a) * u;
const smooth = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
const mean = xs => xs.length ? xs.reduce((s,x)=>s+x,0)/xs.length : 0;
const quantile = (xs,p) => {if(!xs.length)return 0;const q=clamp(p)*(xs.length-1),i=Math.floor(q);return mix(xs[i],xs[Math.min(i+1,xs.length-1)],q-i);};

export const DEFAULT_CONFIG = Object.freeze({
  injury:'transection',repair:'conduit',species:'human-exploratory',
  gapMm:8,distalMm:70,radiusMm:1,delayDays:0,durationDays:180,
  dtDays:0.25,axonCount:128,seed:2048,elongationMmDay:1,
  growthLagDays:4,alignment:0.8,schwannSupport:0.85,
  vascularSupport:0.85,scar:0.2,supportHalfLifeDays:120,
  intrinsicHalfLifeDays:180,targetHalfLifeDays:240,
  remyelinationDays:35,remyelinationLagDays:7,motorFraction:0.5,
  fieldNodes:49,referenceMode:false,
});
const parameter=(label,unit,min,max,step,sourceClass,note)=>({label,unit,min,max,step,sourceClass,note});
export const PARAMETER_META=Object.freeze({
  gapMm:parameter('Injury gap','mm',0,50,1,'geometry','Distance between cut ends; crush and apposed direct repair use zero gap.'),
  distalMm:parameter('Distal stump to target','mm',5,500,5,'geometry','Distance beyond the distal end of the bridge; total regeneration distance is gap + distal distance.'),
  radiusMm:parameter('Nerve radius','mm',0.3,3,0.1,'geometry','Idealized nerve envelope; displayed fiber diameters are enlarged.'),
  delayDays:parameter('Repair delay','days',0,365,1,'scenario','Measured from injury; recipient support deterioration begins at injury, not at repair.'),
  durationDays:parameter('Observation period','days',30,730,1,'scenario','Elapsed days since injury, including repair delay.'),
  elongationMmDay:parameter('Unimpeded elongation','mm/day',0,5,0.1,'evidence-context','User-selected potential speed. Local environment and path tortuosity reduce axial advance; no universal human speed is assumed.'),
  growthLagDays:parameter('Post-repair initiation lag','days',0,30,0.5,'assumption','Median-scale onset parameter with fixed per-axon heterogeneity; not a clinical estimate.'),
  alignment:parameter('Track alignment','index',0,1,0.05,'assumption','Controls geometric guidance and rotational mismatch; dimensionless exploratory parameter.'),
  schwannSupport:parameter('Repair Schwann support','index',0,1,0.05,'assumption','Supportive repair state, distinct from Schwann-cell number and remyelination capacity.'),
  vascularSupport:parameter('Vascular support','index',0,1,0.05,'assumption','Relative vascular support; no oxygen transport or blood-flow solver is implied.'),
  scar:parameter('Fibrosis burden','index',0,1,0.05,'assumption','Local inhibitory fibrosis proxy, not a CNS glial scar or a measured collagen concentration.'),
  supportHalfLifeDays:parameter('Repair-support half-life','days',15,730,5,'assumption','Exploratory decay after a 28-day plateau; not fitted to human or rat outcomes.'),
  intrinsicHalfLifeDays:parameter('Axotomy competence half-life','days',30,1000,10,'assumption','Separate exploratory chronic-axotomy effect on initiation, not modeled neuronal death.'),
  targetHalfLifeDays:parameter('Target receptivity half-life','days',30,1000,10,'assumption','Separate denervation-age proxy; not strength, sensation or inevitable irreversible loss.'),
  remyelinationDays:parameter('Myelin maturation time constant','days',5,180,1,'assumption','Local exponential maturation after axon arrival, not a fitted human recovery law.'),
  remyelinationLagDays:parameter('Local myelination lag','days',0,30,1,'assumption','Local clock starts when an axon reaches each position, not at injury.'),
  axonCount:parameter('Representative parent axons','axons',16,512,16,'numerical','Representative cohort; never an anatomical nerve axon count. Sprouts are not counted as new neurons.'),
  dtDays:parameter('Solver time step','days',0.05,1,0.05,'numerical','Second-order predictor-corrector; internal maximum step 0.25 day.'),
  seed:parameter('Random seed','',1,4294967295,1,'numerical','All random traits are sampled once; no new random values are drawn during integration.'),
});
const preset=(id,label,description,values)=>({id,label,description,config:{...DEFAULT_CONFIG,...values}});
export const PRESETS=Object.freeze([
  preset('crush','Crush · preserved tracks','An idealized crush preserves endoneurial routing. Axons still degenerate distally and must regrow.',{injury:'crush',repair:'none',gapMm:0,distalMm:70,alignment:1,scar:0.05,schwannSupport:0.95,vascularSupport:0.95}),
  preset('direct','Direct · apposed repair','Apposed cut ends with a controllable track mismatch. Tension and surgical technique are not resolved.',{repair:'direct',gapMm:0,alignment:0.85}),
  preset('short-conduit','Conduit · 5 mm','A hollow bridge populated from the stumps. Guidance and support are editable assumptions.',{repair:'conduit',gapMm:5,alignment:0.8}),
  preset('long-conduit','Conduit · 20 mm','A longer gap exposes a central region to delayed support. No universal clinical gap threshold is imposed.',{repair:'conduit',gapMm:20,alignment:0.8}),
  preset('graft','Structured bridge · 20 mm','A continuous internal support architecture. An illustrative scaffold scenario, not a graft efficacy estimate.',{repair:'graft',gapMm:20,alignment:0.9,schwannSupport:0.9}),
  preset('delayed','Delayed bridge · 90 days','The same structured bridge after prolonged axotomy and distal denervation.',{repair:'graft',gapMm:20,delayDays:90,durationDays:365,alignment:0.9,schwannSupport:0.9}),
  preset('unrepaired','Unrepaired transection','No path reconnects the cut ends. Local sprouting is shown, with zero credited distal entry.',{repair:'none',gapMm:8,alignment:0.2}),
]);
export function normalizeConfig(input={}){
  if(!input||typeof input!=='object')input={};
  const out={...DEFAULT_CONFIG};
  for(const [key,values] of Object.entries({injury:['crush','transection'],repair:['none','direct','conduit','graft'],species:['human-exploratory','rat']}))if(values.includes(input[key]))out[key]=input[key];
  const bounds={gapMm:[0,50],distalMm:[5,500],radiusMm:[.3,3],delayDays:[0,365],durationDays:[1,730],dtDays:[.025,1],axonCount:[1,512],seed:[0,4294967295],elongationMmDay:[0,5],growthLagDays:[0,30],alignment:[0,1],schwannSupport:[0,1],vascularSupport:[0,1],scar:[0,1],supportHalfLifeDays:[1,2000],intrinsicHalfLifeDays:[1,2000],targetHalfLifeDays:[1,2000],remyelinationDays:[.5,500],remyelinationLagDays:[0,60],motorFraction:[0,1],fieldNodes:[17,129]};
  for(const [key,[lo,hi]] of Object.entries(bounds))out[key]=clamp(finite(input[key],out[key]),lo,hi);
  for(const key of ['axonCount','seed','fieldNodes'])out[key]=Math.round(out[key]);
  out.referenceMode=input.referenceMode===true;
  if(out.injury==='crush'){out.gapMm=0;out.repair='none';out.delayDays=0;out.alignment=1;}
  if(out.repair==='direct')out.gapMm=0;
  if(out.repair==='none')out.delayDays=0;
  return out;
}
/** Mulberry32: deterministic across conforming JavaScript engines. */
export function createRng(seed){let a=seed>>>0;return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const normal=rng=>Math.sqrt(-2*Math.log(Math.max(1e-12,rng())))*Math.cos(2*Math.PI*rng());
const centers=r=>[[-.36*r,.23*r],[.36*r,.23*r],[0,-.39*r]];
const rotate=([y,z],a)=>[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
function boundedPoint(y,z,r){const norm=Math.hypot(y,z);return norm>r?[y*r/norm,z*r/norm]:[y,z];}
function nearestFascicle(point,cs){let best=0,d=Infinity;cs.forEach((c,i)=>{const dd=(point[0]-c[0])**2+(point[1]-c[1])**2;if(dd<d){d=dd;best=i;}});return best;}
function makeAxons(c){
  const rng=createRng(c.seed),cs=centers(c.radiusMm),distalCenters=cs.map(p=>rotate(p,(1-c.alignment)*2.1));
  const competence=c.referenceMode?1:2**(-c.delayDays/c.intrinsicHalfLifeDays);
  return Array.from({length:c.axonCount},(_,id)=>{
    const fascicle=id%3,theta=2*Math.PI*rng(),radius=.20*c.radiusMm*Math.sqrt(rng());
    const origin=[cs[fascicle][0]+radius*Math.cos(theta),cs[fascicle][1]+radius*Math.sin(theta)];
    const speedFactor=c.referenceMode?1:clamp(Math.exp(.18*normal(rng)-.5*.18**2),.55,1.65);
    const lagFactor=c.referenceMode?1:.55+.9*rng(),kind=rng()<c.motorFraction?'motor':'sensory';
    const canInitiate=c.referenceMode||rng()<competence;
    const phase=2*Math.PI*rng(),phase2=2*Math.PI*rng();
    const effectiveAlignment=c.injury==='crush'?1:c.alignment*(.55+.45*c.schwannSupport),wander=(1-effectiveAlignment)*c.radiusMm;
    const raw=[origin[0]+normal(rng)*wander*.9,origin[1]+normal(rng)*wander*.9];
    const exit=c.gapMm===0?[...origin]:boundedPoint(raw[0],raw[1],c.radiusMm*.94);
    const targetFascicle=c.injury==='crush'?fascicle:nearestFascicle(exit,distalCenters);
    const target=[distalCenters[targetFascicle][0]+(exit[0]-distalCenters[targetFascicle][0])*.30,distalCenters[targetFascicle][1]+(exit[1]-distalCenters[targetFascicle][1])*.30];
    const lagDays=c.delayDays+c.growthLagDays*lagFactor;
    return {id,kind,fascicle,targetFascicle,origin,target,exit,phase,phase2,wander,speedMmDay:c.elongationMmDay*speedFactor,lagDays,canInitiate,entryDay:null,arrivalDay:null,correctTarget:targetFascicle===fascicle,lossDay:null,stallDay:canInitiate?null:lagDays,finalStatus:'waiting',failureReason:canInitiate?null:'chronic-axotomy-initiation',caliberFactor:c.referenceMode?1:.65+.3*rng(),path:[{t:0,x:0,y:origin[0],z:origin[1]}],x:0};
  });
}
function positionAtX(a,x,c){
  const g=c.gapMm;
  if(g>1e-9&&x<g){const u=clamp(x/g),b=smooth(u),wave=Math.sin(Math.PI*u);return boundedPoint(mix(a.origin[0],a.exit[0],b)+a.wander*.23*wave*Math.sin(4*Math.PI*u+a.phase),mix(a.origin[1],a.exit[1],b)+a.wander*.23*wave*Math.sin(3*Math.PI*u+a.phase2),c.radiusMm*.96);}
  const u=smooth((x-g)/Math.min(8,c.distalMm));return[mix(a.exit[0],a.target[0],u),mix(a.exit[1],a.target[1],u)];
}
function tortuosity(a,x,c){if(c.referenceMode)return 1;const eps=.005,p=positionAtX(a,Math.max(0,x-eps),c),q=positionAtX(a,x+eps,c),span=x<eps?eps+x:2*eps;return Math.sqrt(1+((q[0]-p[0])/span)**2+((q[1]-p[1])/span)**2);}
const stateNames=['intact','debris','macrophage','schwann','vascular','scar'];
function initializeField(c){
  const length=c.gapMm+c.distalMm,bridgeIntervals=c.gapMm>0?Math.max(7,Math.round((c.fieldNodes-1)*.45)):0,distalIntervals=c.fieldNodes-1-bridgeIntervals;
  const xMm=bridgeIntervals?Array.from({length:bridgeIntervals+1},(_,i)=>i*c.gapMm/bridgeIntervals):[0];
  for(let i=1;i<=distalIntervals;i++)xMm.push(c.gapMm+Math.expm1(i/distalIntervals*Math.log1p(c.distalMm)));
  xMm[xMm.length-1]=length;
  const states=Object.fromEntries(stateNames.map(name=>[name,new Float64Array(c.fieldNodes)]));
  xMm.forEach((x,i)=>{const bridge=c.gapMm>0&&x<c.gapMm;states.intact[i]=bridge?0:1;states.schwann[i]=bridge?0:.04*c.schwannSupport;states.vascular[i]=bridge?.04*c.vascularSupport:c.vascularSupport;});
  return{xMm,...states};
}
function fieldTargets(x,t,c){
  const bridge=c.gapMm>0&&x<c.gapMm,age=bridge&&c.repair==='graft'?Math.max(0,t-c.delayDays):t;
  const activation=1-Math.exp(-Math.max(0,age-.5)/2),competence=2**(-Math.max(0,age-28)/c.supportHalfLifeDays);
  if(!bridge)return{schwann:c.schwannSupport*activation*competence,vascular:c.vascularSupport,scar:c.scar*.12*Math.exp(-Math.max(0,x-c.gapMm)/3)};
  if(t<c.delayDays||c.repair==='none')return{schwann:0,vascular:.04*c.vascularSupport,scar:c.scar};
  const tr=Math.max(0,t-c.delayDays),d=Math.min(x,c.gapMm-x),logistic=z=>1/(1+Math.exp(-z));
  const bv=logistic((.75*Math.max(0,tr-1)-d)/.8),bs=logistic((.45*Math.max(0,tr-2)-d)/.65),architecture=c.repair==='graft'?.72:0;
  return{schwann:c.schwannSupport*activation*competence*(architecture+(1-architecture)*bs),vascular:c.vascularSupport*(.06+.94*bv),scar:c.scar};
}
function fieldDerivative(field,t,c,bridgeTargetTime=t){
  const out=Object.fromEntries(stateNames.map(name=>[name,new Float64Array(c.fieldNodes)]));
  const k=.7*smooth(t-1);
  field.xMm.forEach((x,i)=>{
    const Q=field.intact[i],D=field.debris[i],M=field.macrophage[i],S=field.schwann[i],V=field.vascular[i],F=field.scar[i],target=fieldTargets(x,c.gapMm>0&&x<c.gapMm?bridgeTargetTime:t,c);
    const wound=Math.exp(-t/6)*Math.exp(-Math.abs(x-c.gapMm/2)/Math.max(2,c.gapMm/2));
    out.intact[i]=-k*Q;out.debris[i]=k*Q-(.035+.34*M+.075*S)*D;
    out.macrophage[i]=.65*(D+.35*wound)*(1-M)-.11*(1-D)*M;
    out.schwann[i]=(target.schwann-S)/2.3;out.vascular[i]=(target.vascular-V)/(c.gapMm>0&&x<c.gapMm?3.5:1.5);
    out.scar[i]=(target.scar*(1-Math.exp(-t/9))-F)/7;
  });
  return out;
}
function advanceField(field,t,h,c){
  const k1=fieldDerivative(field,t,c),predict={xMm:field.xMm};
  for(const name of stateNames)predict[name]=Float64Array.from(field[name],(x,i)=>clamp(x+h*k1[name][i]));
  // Integrate up to scheduled repair using the left-hand bridge state. The next
  // step begins with the right-hand target; no endpoint contribution leaks a
  // newly connected pathway backward into the pre-repair interval.
  const targetTime=t<c.delayDays&&Math.abs(t+h-c.delayDays)<1e-9?c.delayDays-1e-9:t+h;
  const k2=fieldDerivative(predict,t+h,c,targetTime),out={xMm:field.xMm};
  for(const name of stateNames)out[name]=Float64Array.from(field[name],(x,i)=>clamp(x+.5*h*(k1[name][i]+k2[name][i])));
  for(let i=0;i<c.fieldNodes;i++){const total=c.gapMm>0&&field.xMm[i]<c.gapMm?0:1;out.intact[i]=Math.min(total,out.intact[i]);out.debris[i]=Math.min(total-out.intact[i],out.debris[i]);}
  return out;
}
function spatialBracket(xs,x){if(x<=xs[0])return[0,0,0];if(x>=xs.at(-1))return[xs.length-1,xs.length-1,0];let lo=0,hi=xs.length-1;while(hi-lo>1){const mid=(hi+lo)>>1;if(xs[mid]<=x)lo=mid;else hi=mid;}return[lo,hi,(x-xs[lo])/(xs[hi]-xs[lo])];}
function growthRate(axon,x,field,c){
  if(c.referenceMode)return axon.speedMmDay;
  const[a,b,u]=spatialBracket(field.xMm,x),S=mix(field.schwann[a],field.schwann[b],u),V=mix(field.vascular[a],field.vascular[b],u),D=mix(field.debris[a],field.debris[b],u),F=mix(field.scar[a],field.scar[b],u);
  return Math.max(0,axon.speedMmDay*S*(.25+.75*V)*(1-.65*D)*(1-.75*F)/tortuosity(axon,x,c));
}
function spatialMean(field,key){let s=0;for(let i=1;i<field.xMm.length;i++)s+=(field.xMm[i]-field.xMm[i-1])*.5*(field[key][i]+field[key][i-1]);return s/(field.xMm.at(-1)-field.xMm[0]);}
function myelinSince(day,arrival,c){return arrival===null||day<=arrival+c.remyelinationLagDays?0:1-Math.exp(-(day-arrival-c.remyelinationLagDays)/c.remyelinationDays);}
function snapshotField(field,day,c){const out={day};for(const name of stateNames)out[name]=Array.from(field[name]);out.cleared=field.xMm.map((x,i)=>Math.max(0,(c.gapMm>0&&x<c.gapMm?0:1)-field.intact[i]-field.debris[i]));return out;}
function summarize(axons,field,day,c){
  const entered=axons.filter(a=>a.entryDay!==null&&a.entryDay<=day),arrived=axons.filter(a=>a.arrivalDay!==null&&a.arrivalDay<=day),fronts=axons.map(a=>a.x).sort((a,b)=>a-b);
  const status=a=>day<a.lagDays?'waiting':a.arrivalDay!==null&&a.arrivalDay<=day?'arrived':a.lossDay!==null&&a.lossDay<=day?'lost':!a.canInitiate||a.stallDay!==null&&a.stallDay<=day?'stalled':'growing';
  const counts={active:0,stalled:0,lost:0,waiting:0};for(const a of axons){const s=status(a);if(s==='growing')counts.active++;else if(s in counts)counts[s]++;}
  const supportField={xMm:field.xMm,support:field.xMm.map((_,i)=>field.schwann[i]*(.25+.75*field.vascular[i])*(1-.65*field.debris[i])*(1-.75*field.scar[i]))};
  return{day,distalEntry:entered.length,arrived:arrived.length,correctlyRouted:arrived.filter(a=>a.correctTarget).length,correctlyEntered:entered.filter(a=>a.correctTarget).length,maturing:arrived.filter(a=>myelinSince(day,a.arrivalDay,c)<.9).length,meanFrontMm:mean(fronts),p90FrontMm:quantile(fronts,.9),meanMyelin:mean(entered.map(a=>myelinSince(day,a.entryDay,c))),conductionProxy:mean(axons.map(a=>a.arrivalDay===null||a.arrivalDay>day?0:myelinSince(day,a.arrivalDay,c)*a.caliberFactor)),debris:spatialMean(field,'debris'),macrophage:spatialMean(field,'macrophage'),schwann:spatialMean(field,'schwann'),vascular:spatialMean(field,'vascular'),scar:spatialMean(field,'scar'),targetViability:2**(-Math.max(0,day-30)/c.targetHalfLifeDays),support:spatialMean(supportField,'support'),...counts};
}
function appendPoint(a,t,x,c,force=false){
  const [y,z]=positionAtX(a,x,c),p={t,x,y,z};if(force)p.event=true;const prev=a.path.at(-1);
  if(Math.abs(prev.t-t)<1e-10){if(prev.event)p.event=true;a.path[a.path.length-1]=p;return;}
  if(a._compress&&a.path.length>=2&&!prev.event){
    const anchor=a.path[a.path.length-2],u=(prev.t-anchor.t)/(p.t-anchor.t),moving=p.x>anchor.x+1e-12;
    const error=Math.hypot(prev.x-mix(anchor.x,p.x,u),prev.y-mix(anchor.y,p.y,u),prev.z-mix(anchor.z,p.z,u));
    if(error<=.002&&(!moving||p.t-anchor.t<=1+1e-10)){a.path[a.path.length-1]=p;return;}
  }
  a.path.push(p);
}
export function simulate(input={},options={}){
  const config=normalizeConfig(input),c=config,axons=makeAxons(c),total=c.gapMm+c.distalMm;
  let field=initializeField(c),t=0,steps=0;const step=Math.min(.25,c.dtDays),recordPaths=options.recordPaths!==false,recordFields=options.recordFields!==false;
  for(const a of axons)a._compress=recordPaths&&options.compressPaths!==false;
  const samples=[summarize(axons,field,0,c)],fields={xMm:field.xMm,samples:recordFields?[snapshotField(field,0,c)]:[]};
  const disconnected=c.injury==='transection'&&c.repair==='none',sproutLimit=Math.min(2,Math.max(.05,c.gapMm*.45));
  while(t<c.durationDays-1e-10){
    const nextOutput=Math.min(c.durationDays,Math.floor(t+1e-9)+1),nextRepair=c.delayDays>t+1e-10?c.delayDays:Infinity,h=Math.min(step,nextOutput-t,c.durationDays-t,nextRepair-t),end=t+h,nextField=advanceField(field,t,h,c);
    for(const a of axons){
      if(!a.canInitiate||end<=a.lagDays||a.arrivalDay!==null||a.stallDay!==null&&a.stallDay<=t)continue;
      const start=Math.max(t,a.lagDays),ah=end-start,oldX=a.x;
      if(start===a.lagDays&&recordPaths)appendPoint(a,start,oldX,c,true);
      let proposedX;
      if(disconnected)proposedX=oldX+ah*a.speedMmDay*.15;
      else{
        const u=(start-t)/h,startField=u===0?field:{xMm:field.xMm,...Object.fromEntries(stateNames.map(k=>[k,Float64Array.from(field[k],(v,i)=>mix(v,nextField[k][i],u))]))};
        const v1=growthRate(a,oldX,startField,c),predict=Math.min(total,oldX+ah*v1),v2=growthRate(a,predict,nextField,c);
        proposedX=oldX+.5*ah*(v1+v2);
      }
      const newX=Math.min(disconnected?sproutLimit:total,proposedX);
      if(!disconnected&&newX>oldX){
        if(a.entryDay===null&&newX>=c.gapMm){a.entryDay=c.gapMm===0?start:mix(start,end,(c.gapMm-oldX)/(proposedX-oldX));if(recordPaths)appendPoint(a,a.entryDay,c.gapMm,c,true);}
        if(a.arrivalDay===null&&newX>=total){a.arrivalDay=mix(start,end,(total-oldX)/(proposedX-oldX));if(recordPaths)appendPoint(a,a.arrivalDay,total,c,true);}
      }
      if(disconnected&&newX>=sproutLimit-1e-12){a.stallDay=oldX<sproutLimit&&proposedX>oldX?mix(start,end,(sproutLimit-oldX)/(proposedX-oldX)):start;a.failureReason='no-continuous-bridge';if(recordPaths)appendPoint(a,a.stallDay,sproutLimit,c,true);}
      if(newX===oldX&&(a.speedMmDay===0||c.schwannSupport===0)){a.stallDay=start;a.failureReason=a.speedMmDay===0?'zero-elongation':'no-permissive-support';}
      a.x=newX;if(recordPaths&&newX>oldX&&a.arrivalDay===null)appendPoint(a,end,newX,c);
    }
    field=nextField;t=end;steps++;
    if(Math.abs(t-nextOutput)<1e-8||t>=c.durationDays-1e-10){samples.push(summarize(axons,field,t,c));if(recordFields)fields.samples.push(snapshotField(field,t,c));}
    else if(recordFields&&Math.abs(t-c.delayDays)<1e-8)fields.samples.push(snapshotField(field,t,c));
  }
  for(const a of axons){
    if(a.canInitiate&&a.arrivalDay===null&&a.stallDay===null&&c.durationDays>=a.lagDays&&a.x===0){a.stallDay=a.lagDays;a.failureReason='no-permissive-support';}
    a.finalStatus=c.durationDays<a.lagDays?'waiting':a.arrivalDay!==null?'arrived':a.stallDay!==null?'stalled':'growing';
    if(recordPaths){if(a.path.at(-1).t<c.durationDays)appendPoint(a,c.durationDays,a.x,c);a.path=a.path.map(({event,...p})=>p);}else a.path=[];
  }
  samples[samples.length-1]=summarize(axons,field,c.durationDays,c);
  const warnings=['Exploratory reduced-order model; numerical verification is not biological or clinical validation.','A representative parent-axon cohort is not an anatomical axon census. Fascicle matching does not establish useful function.'];
  if(c.species==='human-exploratory')warnings.push('Human exploratory context: assumed support, fibrosis and maturation coefficients are not fitted to patient data.');
  if(c.delayDays>=c.durationDays)warnings.push('The repair is at or beyond the observation horizon.');
  if(disconnected)warnings.push('Unrepaired transection: local sprouts never receive distal-entry credit.');
  const result={modelVersion:MODEL_VERSION,config,geometry:{gapMm:c.gapMm,distalMm:c.distalMm,totalMm:total,radiusMm:c.radiusMm,proximalMm:4,fascicleCenters:centers(c.radiusMm),distalFascicleCenters:centers(c.radiusMm).map(p=>rotate(p,(1-c.alignment)*2.1)),fascicleRadiusMm:.3*c.radiusMm},axons,samples,fields,summary:samples.at(-1),warnings,assumptions:['Local normalized reaction fields; no spatial diffusion or oxygen transport.','Geometry and cohort traits are seeded once; there are no random draws during integration.','Unique parent axons follow fixed synthetic curves; collateral sprouting, pruning and organ-specific recognition are absent.','Repair support remains a one-way denervated-pathway field; local arrival does not reset it.','Fresh structured bridges use a post-repair support clock; the recipient distal stump ages from injury.','Target condition is an independent hypothetical denervation clock and does not alter arrival counts.','Local myelin is a time-since-arrival surrogate, not sheath thickness or conduction velocity.'],diagnostics:{steps,internalStepDays:step,integrator:'Heun / explicit trapezoid',fieldNodes:c.fieldNodes,displayPathToleranceMm:.002,maxDisplayPathIntervalDays:1,recordsDisplayPaths:recordPaths,randomDrawsDuringIntegration:0,calibrated:false,units:{time:'days since injury',distance:'mm',fields:'normalized 0–1'},referenceMode:c.referenceMode}};
  Object.assign(result.diagnostics,{coordinateUnits:'mm',timeUnits:'days since injury',populationUnit:'unique representative parent axons',supportModel:'normalized local reaction system; bridge-front closure',seed:c.seed});
  for(const a of axons){delete a.x;delete a._compress;}
  return result;
}
function bracket(items,day,key='day'){
  if(!items?.length)return[null,null,0];if(day<=items[0][key])return[items[0],items[0],0];if(day>=items.at(-1)[key])return[items.at(-1),items.at(-1),0];
  let lo=0,hi=items.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(items[mid][key]<=day)lo=mid;else hi=mid;}return[items[lo],items[hi],(day-items[lo][key])/(items[hi][key]-items[lo][key])];
}
const countKeys=new Set(['distalEntry','arrived','correctlyRouted','correctlyEntered','maturing','active','stalled','lost','waiting']);
export function sampleAt(result,day){
  const clamped=clamp(finite(day,0),0,result.config.durationDays),[a,b,u]=bracket(result.samples,clamped);if(!a)return null;const sample={};
  for(const key of Object.keys(a))sample[key]=countKeys.has(key)?a[key]:mix(a[key],b[key],u);
  if(result.axons?.length){
    const entered=result.axons.filter(x=>x.entryDay!==null&&x.entryDay<=clamped),arrived=result.axons.filter(x=>x.arrivalDay!==null&&x.arrivalDay<=clamped);
    sample.distalEntry=entered.length;sample.arrived=arrived.length;sample.correctlyEntered=entered.filter(x=>x.correctTarget).length;sample.correctlyRouted=arrived.filter(x=>x.correctTarget).length;
    sample.maturing=arrived.filter(x=>myelinSince(clamped,x.arrivalDay,result.config)<.9).length;sample.waiting=result.axons.filter(x=>clamped<x.lagDays).length;sample.lost=result.axons.filter(x=>x.lossDay!==null&&x.lossDay<=clamped).length;
    const states=result.axons.map(x=>axonAt(x,clamped,result.config));sample.active=states.filter(s=>s.status==='growing').length;sample.stalled=states.filter(s=>s.status==='stalled').length;
    sample.meanMyelin=mean(entered.map(x=>myelinSince(clamped,x.entryDay,result.config)));sample.conductionProxy=mean(result.axons.map(x=>x.arrivalDay===null||x.arrivalDay>clamped?0:myelinSince(clamped,x.arrivalDay,result.config)*x.caliberFactor));
    if(result.diagnostics?.recordsDisplayPaths!==false){sample.meanFrontMm=mean(states.map(x=>x.x));sample.p90FrontMm=quantile(states.map(x=>x.x).sort((x,y)=>x-y),.9);}
  }
  if(result.fields?.samples?.length){
    const f=sampleFieldsAt(result,clamped);
    for(const name of ['debris','macrophage','schwann','vascular','scar'])sample[name]=spatialMean(f,name);
    const support=f.xMm.map((_,i)=>f.schwann[i]*(.25+.75*f.vascular[i])*(1-.65*f.debris[i])*(1-.75*f.scar[i]));
    sample.support=spatialMean({xMm:f.xMm,support},'support');
  }
  sample.day=clamped;return sample;
}
export function sampleFieldsAt(result,day){
  const [a,b,u]=bracket(result.fields.samples,clamp(day,0,result.config.durationDays));if(!a)return{day,xMm:result.fields.xMm,intact:[],debris:[],cleared:[],schwann:[],vascular:[],scar:[],macrophage:[]};
  const out={day:clamp(day,0,result.config.durationDays),xMm:result.fields.xMm};for(const name of ['intact','debris','cleared','schwann','vascular','scar','macrophage'])out[name]=a[name].map((x,i)=>mix(x,b[name][i],u));return out;
}
export function axonAt(axon,day,config=DEFAULT_CONFIG){
  const [a,b,u]=bracket(axon.path,day,'t'),arrived=axon.arrivalDay!==null&&day>=axon.arrivalDay,entered=axon.entryDay!==null&&day>=axon.entryDay;
  let status=day<axon.lagDays?'waiting':arrived?'arrived':axon.lossDay!==null&&day>=axon.lossDay?'lost':!axon.canInitiate?'stalled':'growing';if(status==='growing'&&axon.stallDay!==null&&day>=axon.stallDay)status='stalled';
  return{x:mix(a?.x||0,b?.x||0,u),y:mix(a?.y||0,b?.y||0,u),z:mix(a?.z||0,b?.z||0,u),status,entered,arrived,myelin:myelinSince(day,axon.entryDay,config),correctTarget:axon.correctTarget};
}
export function localMyelin(axon,xMm,day,config=DEFAULT_CONFIG){
  if(xMm<0)return 1;if(!axon.canInitiate||day<axon.lagDays||!axon.path.length||axon.path.at(-1).x<=0)return 0;let arrival=null;
  if(xMm===0)arrival=axon.lagDays;else{const path=axon.path;if(xMm>path.at(-1).x)return 0;let lo=0,hi=path.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(path[mid].x>=xMm)hi=mid;else lo=mid;}const a=path[lo],b=path[hi];if(b.x>a.x)arrival=mix(a.t,b.t,(xMm-a.x)/(b.x-a.x));}
  return myelinSince(day,arrival,config);
}
export function runEnsemble(input={},n=12){
  const c=normalizeConfig(input),count=Math.round(clamp(finite(n,12),2,64)),results=[];for(let i=0;i<count;i++)results.push(simulate({...c,seed:(c.seed+Math.imul(i,2654435761))>>>0},{recordPaths:false,recordFields:false}));
  const keys=['distalEntry','arrived','correctlyRouted','meanFrontMm','meanMyelin','conductionProxy'];
  const samples=results[0].samples.map((s,index)=>{const row={day:s.day};for(const key of keys){const values=results.map(r=>r.samples[index][key]).sort((a,b)=>a-b);row[key]={low:quantile(values,.1),median:quantile(values,.5),high:quantile(values,.9),mean:mean(values)};}return row;});
  return{modelVersion:MODEL_VERSION,config:c,n:count,samples,summary:samples.at(-1),endpoints:results.map(r=>({seed:r.config.seed,...r.summary})),interpretation:'10th–90th percentiles across random seeds at fixed parameters. Stochastic cohort variation, not a clinical confidence interval or parameter-uncertainty interval.'};
}
export function runSensitivity(input={},parameter='elongationMmDay',values){
  const c=normalizeConfig(input),meta=PARAMETER_META[parameter];if(!meta)throw new Error('Unknown sensitivity parameter');
  const points=Array.isArray(values)&&values.length?values.slice(0,15):[.7,.85,1,1.15,1.3].map(f=>clamp(c[parameter]*f,meta.min,meta.max));
  return{parameter,config:c,interpretation:parameter==='seed'?'Changing seeds explores cohort variation, not treatment effects.':'One parameter at a time with a common random seed; local model sensitivity is not evidence of treatment efficacy.',points:points.map(value=>{const r=simulate({...c,[parameter]:value},{recordPaths:false,recordFields:false});return{value:r.config[parameter],...r.summary};})};
}
