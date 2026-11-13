/** Stage 3 exploratory growth engine. No clinical or electrophysiological prediction.
 * Pure deterministic biology in micrometres / days. Rendering never enters this module. */
export const VERSION = 'axon-growth/0.1.0-dev.1';
export const SCHEMA = 'buildthesimulation.axon-growth.v1';
export const LIMITS = Object.freeze({maxSteps:3600,maxTips:4096,maxPoints:240000,maxFrames:181,maxWork:2400000,maxReflections:16});
export const SOURCES = Object.freeze([
 {id:'schwann',title:'Arthur-Farraj et al. (2012), c-Jun reprograms Schwann cells of injured nerves',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3657176/',evidence:'experimental',scope:'Mouse nerve injury establishes a repair-cell role in guidance, trophic support and debris clearance. It does not calibrate the proxy rates below.'},
 {id:'trophic',title:'Szobota et al. (2019), BDNF, NT-3 and Trk agonists in rat cochlea ex vivo',url:'https://doi.org/10.1371/journal.pone.0224022',evidence:'experimental',scope:'Rat dissociated / explant cultures support trophic effects on survival and outgrowth. No numerical rate or human implant outcome is fitted from this paper.'},
 {id:'fate',title:'Matsuoka et al. (2017), directed differentiation toward SG-like sensory neurons',url:'https://doi.org/10.1002/sctm.16-0032',evidence:'experimental',scope:'Human embryonic stem-cell differentiation motivates an SG-like marker panel, not this invented morphogen-to-marker response network.'},
 {id:'fronts',title:'De Schutter (2023), Efficient simulation of neural development',url:'https://doi.org/10.3389/fninf.2023.1212384',evidence:'mathematical',scope:'Agent-front growth, branching and retraction provide a modeling precedent. This is a separate implementation, not NeuroDevSim or a reproduction of its results.'}
]);
const P=(key,value,unit,min,max,evidence,meaning,group='Growth')=>({key,default:value,unit,min,max,evidence,meaning,group});
export const PARAMETERS=Object.freeze([
 P('seed',2048,'integer',0,4294967295,'estimated','Reproducibility seed; separate streams by cell, branch and mechanism.','Experiment'),
 P('wellCount',24,'wells',1,64,'estimated','Resolved synthetic wells / original census. No full-nerve extrapolation.','Experiment'),
 P('days',28,'days',.5,90,'estimated','Exploratory biological clock, not a clinical forecast.','Experiment'),
 P('dtDays',.1,'days',.025,.25,'estimated','Declared biological integration step; output every 0.5 day.','Experiment'),
 P('lengthUm',1800,'µm',400,6000,'hypothetical','Total distance between growth-domain end walls.','Geometry'),
 P('thicknessUm',160,'µm',80,1000,'hypothetical','Diffusion distance is along thickness, not automatically along the nerve.','Geometry'),
 P('widthUm',240,'µm',80,1000,'hypothetical','Third physical dimension of the finite construct.','Geometry'),
 P('pitchUm',40,'µm',32,100,'hypothetical','One layer of cylindrical wells; count is limited by actual fit.','Geometry'),
 P('wellRadiusUm',13,'µm',11,24,'hypothetical','Fluid cavity radius; soma radius is fixed at 10 µm.','Geometry'),
 P('wallUm',2.5,'µm',1,10,'hypothetical','Perfectly impermeable steric sidewall / endcap thickness.','Geometry'),
 P('wellHalfLengthUm',70,'µm',30,120,'hypothetical','Two finite caps enclose the soma pocket.','Geometry'),
 P('apertureUm',3.5,'µm',1,10,'hypothetical','Radius of both axial openings; affects exchange and geometric escape.','Geometry'),
 P('targetRadiusUm',15,'µm',5,18,'hypothetical','Spherical contact zones, not real organ targets.','Geometry'),
 P('targetJitterUm',3,'µm',0,20,'hypothetical','Offsets target zones from the scaffold lanes. No inherited target identity is inferred.','Geometry'),
 P('supplyNgMl',20,'ng/mL',0,100,'estimated','Generic effective trophic factor bath; not a BDNF/NT-3 dosing prescription.','Survival'),
 P('diffusionUm2S',5,'µm²/s',.05,100,'estimated','Effective diffusivity; no scaffold-specific fit.','Survival'),
 P('uptakePerDay',80,'day⁻¹',0,500,'estimated','Uniform first-order tissue sink; no cell-density feedback.','Survival'),
 P('wellUptakePerDay',8,'day⁻¹',0,50,'estimated','Lumped cavity first-order sink, not cellular metabolic measurement.','Survival'),
 P('basalDeathPerDay',.002,'day⁻¹',0,.1,'hypothetical','Background death hazard.','Survival'),
 P('starvationDeathPerDay',.08,'day⁻¹',0,.5,'hypothetical','Additional hazard K/(K+C); K=5 ng/mL.','Survival'),
 P('fieldNodes',81,'nodes',21,161,'estimated','Odd uniform grid for the 1D steady diffusion / loss field.','Survival'),
 P('FGF',.8,'normalized',0,1,'hypothetical','Invented input to an illustrative competence network, not a differentiation recipe.','Specification'),
 P('WNT',.55,'normalized',0,1,'hypothetical','Invented competence input.','Specification'),
 P('BMP',.15,'normalized',0,1,'hypothetical','Invented competence modulation.','Specification'),
 P('SHH',.1,'normalized',0,1,'hypothetical','Invented marker-response modulation.','Specification'),
 P('RA',.4,'normalized',0,1,'hypothetical','Invented neurogenic-response modulation.','Specification'),
 P('patternGradient',0,'relative / thickness',-.8,.8,'hypothetical','Opposed FGF/BMP gradients; all local values are explicitly bounded by construction.','Specification'),
 P('fateThreshold',.15,'score',.05,.7,'hypothetical','Minimum of NEUROD1/GATA3/POU4F1 proxy activities; not probability or cell-type proof.','Specification'),
 P('growthUmDay',220,'µm/day',0,600,'estimated','Maximum front extension speed before state / environment factors.','Growth'),
 P('retractUmDay',80,'µm/day',0,300,'estimated','Retraction speed; parent branchpoints anchor retained paths.','Growth'),
 P('branchPerDay',.06,'day⁻¹ / tip',0,.3,'hypothetical','Homogeneous Poisson branch attempt process after pocket exit.','Growth'),
 P('maxBranches',5,'tips / cell',2,8,'estimated','Explicit biological branching ceiling; not a silent work-budget truncation.','Growth'),
 P('pausePerDay',.8,'day⁻¹',0,3,'hypothetical','Exit rate from extension into a pause.','Growth'),
 P('resumePerDay',2,'day⁻¹',.1,6,'hypothetical','Exit rate from pause; next state drawn from its own motion stream.','Growth'),
 P('retractionChance',.22,'fraction',0,1,'hypothetical','At pause exit, probability of retracting before another extension.','Growth'),
 P('lagDays',2,'days',0,10,'hypothetical','Mean initial process delay with independent ±50% variation.','Growth'),
 P('guidance',1,'relative',0,3,'hypothetical','Orientation alignment to a fixed scaffold axis, not assigned-target attraction.','Guidance'),
 P('haptotaxis',.6,'relative',0,3,'hypothetical','Attraction toward the nearest prepatterned laminin-like lane.','Guidance'),
 P('chemotaxis',.5,'relative',0,3,'hypothetical','Attraction up a sum of Gaussian target cue fields; no target identity oracle.','Guidance'),
 P('angularNoise',.35,'day⁻½',0,1.5,'estimated','Rotational diffusion amplitude. Neurites may cross; no self-avoidance claim.','Guidance'),
 P('repairSupport',.8,'normalized',0,1,'hypothetical','c-Jun-like repair support proxy, not a gene-expression fit.','Environment'),
 P('scarBurden',.15,'normalized',0,1,'hypothetical','Prescribed spatial slowing field; fibrosis is not predicted.','Environment'),
 P('contactDays',1,'days',.1,10,'hypothetical','Continuous retained contact before a candidate is counted.','Integration'),
 P('matureDays',3,'days',0,20,'hypothetical','Additional dwell before a transmission assumption can be applied.','Integration'),
 P('transmissionProbability',.6,'fraction',0,1,'hypothetical','Only used under explicit assumed-transmission mode; never an observed function.','Integration'),
 P('detachPerDay',.02,'day⁻¹',0,1,'hypothetical','Contact detachment hazard; independent of the transmission stream.','Integration'),
 P('lambda',1,'cells / well',0,4,'estimated','Poisson-loading mean; crowded and empty wells are retained as failures.','Loading')
]);
export const CONSTANTS=Object.freeze({somaRadiusUm:10,fateTauDays:[2,2,3,3],hillK:.35,hillPower:2,trophicKNgMl:5,repairRiseDays:2,clearancePerDay:.18,myelinLagDays:4,myelinRatePerDay:.12,snapshotDays:.5,targetCueSigmaUm:90,steeringPerDay:3,retractExitPerDay:2,initialMarker:[.05,0,0,0],survivalRule:'cumulative hazard compared with one exponential(1) draw per cell'});
export const LIMITATIONS=Object.freeze([
 'Exploratory B3 complete-replacement topology; no original host neuron is anatomically retained. The original-host structural count is zero by assumption, not a calculated repair outcome.',
 'All developmental rates, marker equations, target identities and transmission probabilities are estimated or hypothetical. No animal, human or organoid calibration is claimed.',
 'Trophic supply is a steady one-dimensional diffusion/loss slab plus dynamic well exchange, not oxygen, vascularization or 3D ligand transport.',
 'Soma locations are fixed; bipolar neurite fronts are branching polylines, not cytoskeletal, membrane-mechanics or measured culture-neuron morphologies. Neurites can cross without a contact-resolution model.',
 'Target-zone contact, candidate maturation and assumed transmission are distinct. Assumed transmission is not an action potential, functional synapse, useful reinnervation or selective stimulation.',
 'Growth trajectories are not imported as cable geometry. The identity handoff is a pending review manifest; an explicit geometry/electrophysiology adapter remains required.',
 'Stage 2 modal physics is not finished. Stage 3 development does not validate it or complete the original staged release gates.',
 'No oxygen limit, fabrication yield, interconnect limit, chronic response, injury prediction or clinical timeline is calculated.'
]);
const integerKeys=new Set(['seed','wellCount','fieldNodes','maxBranches']);
export function normalize(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Settings must be an object.');
 const allowed=new Set([...PARAMETERS.map(p=>p.key),'loading','assumeTransmission','trophicIndependent']);
 for(const k of Object.keys(input))if(!allowed.has(k))throw Error(`Unknown setting: ${k}`);
 const s={};for(const p of PARAMETERS){const v=input[p.key]??p.default;if(typeof v!=='number'||!Number.isFinite(v)||v<p.min||v>p.max||integerKeys.has(p.key)&&!Number.isInteger(v))throw Error(`${p.key} must be ${integerKeys.has(p.key)?'an integer':'finite'} in [${p.min}, ${p.max}].`);s[p.key]=v;}
 s.loading=input.loading??'placed';if(!['placed','poisson-reject-multiplets'].includes(s.loading))throw Error('Unknown loading condition.');
 for(const k of ['assumeTransmission','trophicIndependent']){s[k]=input[k]??false;if(typeof s[k]!=='boolean')throw Error(`${k} must be boolean.`);}
 if(s.fieldNodes%2!==1)throw Error('Diffusion grid must have an odd number of nodes.');
 if(Math.abs(.5/s.dtDays-Math.round(.5/s.dtDays))>1e-8||Math.abs(s.days/s.dtDays-Math.round(s.days/s.dtDays))>1e-8)throw Error('dtDays must divide both the 0.5-day save interval and the duration.');
 if(s.apertureUm>=s.wellRadiusUm||s.pitchUm<2*(s.wellRadiusUm+s.wallUm)+1)throw Error('Aperture / well / pitch geometry overlaps. No repair was made.');
 if(2*s.targetRadiusUm>=s.pitchUm)throw Error('Target zones must be smaller than the lane pitch.');
 if(s.lengthUm/2< s.wellHalfLengthUm+s.wallUm+2*s.targetRadiusUm+30)throw Error('Target domain does not clear the well caps.');
 const steps=Math.round(s.days/s.dtDays),work=steps*s.wellCount*s.maxBranches;
 if(steps>LIMITS.maxSteps||work>LIMITS.maxWork||Math.ceil(s.days/.5)+1>LIMITS.maxFrames)throw Error('Requested biology exceeds the declared work / snapshot budget; reduce the settings explicitly.');
 return s;
}
export const DEFAULT=Object.freeze(normalize());
// Stable counter-based streams. Changing junction probability never rerolls motion.
export function uniform(seed,...keys){let h=(2166136261^seed)>>>0;for(const c of keys.join('|')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return ((h>>>0)+.5)/4294967296;}
export function exponential(seed,keys,rate=1){return rate===0?Infinity:-Math.log(uniform(seed,...keys))/rate;}
export function normalRandom(seed,...keys){return Math.sqrt(-2*Math.log(uniform(seed,...keys,'a')))*Math.cos(2*Math.PI*uniform(seed,...keys,'b'));}
export function poisson(seed,key,lambda){if(lambda===0)return 0;let p=1,n=0;do{p*=uniform(seed,'loading',key,n++);if(n>100)throw Error('Poisson draw exceeded explicit numerical guard.');}while(p>Math.exp(-lambda));return n-1;}
export const vec={add:(a,b)=>a.map((x,i)=>x+b[i]),scale:(a,s)=>a.map(x=>x*s),dot:(a,b)=>a.reduce((t,x,i)=>t+x*b[i],0),norm:a=>Math.hypot(...a),unit:a=>{const n=Math.hypot(...a);if(!n||!Number.isFinite(n))throw Error('Direction is not finite and nonzero.');return a.map(x=>x/n);}};
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
export function solveTrophic(s){
 const n=s.fieldNodes,dx=s.thicknessUm/(n-1),D=s.diffusionUm2S*86400,a=D/dx**2,k=s.uptakePerDay,N=n-2;
 const cp=new Float64Array(N),dp=new Float64Array(N),c=new Float64Array(n);c[0]=c[n-1]=s.supplyNgMl;
 for(let i=0;i<N;i++){const den=2*a+k-(i?a*cp[i-1]:0),rhs=(i===0?a*c[0]:0)+(i===N-1?a*c[n-1]:0);cp[i]=a/den;dp[i]=(rhs+(i?a*dp[i-1]:0))/den;}
 for(let i=N-1;i>=0;i--)c[i+1]=dp[i]+(i<N-1?cp[i]*c[i+2]:0);
 if(!Array.from(c).every(x=>Number.isFinite(x)&&x>=0&&x<=s.supplyNgMl*(1+1e-10)+1e-12))throw Error('Trophic field violated its discrete maximum principle.');
 const y=Array.from({length:n},(_,i)=>-s.thicknessUm/2+dx*i);
 let residual=0;for(let i=1;i<n-1;i++)residual=Math.max(residual,Math.abs(a*(c[i-1]-2*c[i]+c[i+1])-k*c[i]));
 return {yUm:y,concentrationNgMl:Array.from(c),diffusivityUm2Day:D,residualNgMlDay:residual,model:'1D steady slab; prescribed uniform first-order sink; equal bath values on both faces'};
}
export function sampleField(field,y){const x=(y-field.yUm[0])/(field.yUm[1]-field.yUm[0]);if(x< -1e-8||x>field.yUm.length-1+1e-8)throw Error('Trophic sample outside physical slab.');const i=Math.min(field.yUm.length-2,Math.max(0,Math.floor(x)));return field.concentrationNgMl[i]+(x-i)*(field.concentrationNgMl[i+1]-field.concentrationNgMl[i]);}
export function wellExchange(s){const D=s.diffusionUm2S*86400,V=Math.PI*s.wellRadiusUm**2*(2*s.wellHalfLengthUm),G=2*D/(s.wallUm/(Math.PI*s.apertureUm**2)+1/(2*s.apertureUm));return {volumeUm3:V,conductanceUm3Day:G,ratePerDay:G/V,model:'Two cylindrical apertures plus two-sided access resistance; effective molecular-diffusion analogy, not fitted transport.'};}
export function relax(value,target,rate,dt){return target+(value-target)*Math.exp(-rate*dt);}
const hill=x=>x*x/(CONSTANTS.hillK**2+x*x);
export function fateStep(state,s,y,dt){
 const gradient=s.patternGradient*y/(s.thicknessUm/2),scale=(v,g)=>g>=0?v+(1-v)*g:v*(1+g);
 const fg=scale(s.FGF,gradient),bmp=scale(s.BMP,-gradient);
 const target=[hill(fg)*hill(s.WNT)*(1-.7*hill(bmp)),state[0]*(.35+.65*hill(s.RA))*(1-.6*hill(s.SHH)),state[0]*(1-.7*hill(s.SHH)),state[1]*state[2]];
 const next=state.map((v,i)=>relax(v,target[i],1/CONSTANTS.fateTauDays[i],dt));
 if(!next.every(v=>Number.isFinite(v)&&v>=0&&v<=1+1e-12))throw Error('Fate state left its declared [0,1] domain.');return next;
}
export function environment(s,t,x){const repair=s.repairSupport*(1-Math.exp(-t/CONSTANTS.repairRiseDays));const integrated=s.repairSupport*(t-CONSTANTS.repairRiseDays*(1-Math.exp(-t/CONSTANTS.repairRiseDays)));const debris=Math.exp(-CONSTANTS.clearancePerDay*integrated);const scar=s.scarBurden*Math.exp(-(((Math.abs(x)-s.lengthUm*.22)/60)**2));return {repair,debris,scar,speedFactor:(.3+.7*repair)*(1-.65*debris)*(1-scar)};}
export function createGeometry(s){
 const r=Math.max(s.wellRadiusUm+s.wallUm,s.targetRadiusUm+s.targetJitterUm),ny=Math.floor((s.thicknessUm-2*r)/s.pitchUm)+1,nz=Math.floor((s.widthUm-2*r)/s.pitchUm)+1,candidates=[];
 for(let i=0;i<ny;i++)for(let j=0;j<nz;j++)candidates.push({y:(i-(ny-1)/2)*s.pitchUm,z:(j-(nz-1)/2)*s.pitchUm,order:uniform(s.seed,'well-order',i,j)});
 if(candidates.length<s.wellCount)throw Error(`Only ${candidates.length} nonoverlapping wells fit; ${s.wellCount} requested.`);
 candidates.sort((a,b)=>a.order-b.order);const wells=candidates.slice(0,s.wellCount).map((p,i)=>({id:`W${String(i+1).padStart(4,'0')}`,index:i,center:[0,p.y,p.z],occupancy:s.loading==='placed'?1:poisson(s.seed,i,s.lambda)}));
 const targets=wells.flatMap(w=>[-1,1].map(sign=>({id:`${sign===1?'C':'P'}-${w.id}`,wellId:w.id,arm:sign,position:[sign*(s.lengthUm/2-s.targetRadiusUm-5),w.center[1]+(uniform(s.seed,'target',w.id,sign,'y')-.5)*2*s.targetJitterUm,w.center[2]+(uniform(s.seed,'target',w.id,sign,'z')-.5)*2*s.targetJitterUm],radiusUm:s.targetRadiusUm})));
 for(const t of targets)if(Math.abs(t.position[1])+t.radiusUm>s.thicknessUm/2||Math.abs(t.position[2])+t.radiusUm>s.widthUm/2)throw Error('Jittered target extends beyond the domain; reduce jitter or target radius explicitly.');
 for(let i=0;i<targets.length;i++)for(let j=0;j<i;j++)if(targets[i].arm===targets[j].arm&&dist(targets[i].position,targets[j].position)<2*s.targetRadiusUm)throw Error('Jitter makes target zones overlap; no target was moved.');
 return {wells,targets,capacity:candidates.length,bounds:[[-s.lengthUm/2,s.lengthUm/2],[-s.thicknessUm/2,s.thicknessUm/2],[-s.widthUm/2,s.widthUm/2]],originalHostIds:wells.map((_,i)=>`H${String(i+1).padStart(4,'0')}`),topology:'B3 complete replacement; engineered identity never becomes a host identity'};
}
export function inSolid(p,w,s){const a=Math.abs(p[0]),r=Math.hypot(p[1]-w.center[1],p[2]-w.center[2]);return r<s.wellRadiusUm+s.wallUm&&((a<s.wellHalfLengthUm&&r>s.wellRadiusUm)||(a>=s.wellHalfLengthUm&&a<s.wellHalfLengthUm+s.wallUm&&r>s.apertureUm));}
// Exact swept intersections with cylindrical sidewalls, annular caps and domain planes.
export function reflectStep(start,displacement,s,g){
 let p=[...start],d=[...displacement],path=[],bounces=0;
 for(let iter=0;iter<=LIMITS.maxReflections;iter++){
  let best=2,normal=null;const consider=(u,n)=>{if(u>1e-9&&u<=1&&u<best){best=u;normal=n;}};
  for(let axis=0;axis<3;axis++)if(d[axis]!==0){const edge=g.bounds[axis][d[axis]>0?1:0],u=(edge-p[axis])/d[axis],n=[0,0,0];n[axis]=1;consider(u,n);}
  for(const w of g.wells){if(Math.min(p[0],p[0]+d[0])>s.wellHalfLengthUm+s.wallUm||Math.max(p[0],p[0]+d[0])< -s.wellHalfLengthUm-s.wallUm)continue;
   const trial=(u,n)=>{if(!(u>1e-9&&u<=1&&u<best))return;const q=vec.add(p,vec.scale(d,Math.min(1,u+1e-7)));if(inSolid(q,w,s))consider(u,n);};
   if(d[0]!==0)for(const x of [-s.wellHalfLengthUm-s.wallUm,-s.wellHalfLengthUm,s.wellHalfLengthUm,s.wellHalfLengthUm+s.wallUm])trial((x-p[0])/d[0],[1,0,0]);
   const y=p[1]-w.center[1],z=p[2]-w.center[2],A=d[1]**2+d[2]**2,B=2*(y*d[1]+z*d[2]);
   if(A>1e-20)for(const r of [s.apertureUm,s.wellRadiusUm,s.wellRadiusUm+s.wallUm]){const disc=B*B-4*A*(y*y+z*z-r*r);if(disc<0)continue;for(const u of [(-B-Math.sqrt(disc))/(2*A),(-B+Math.sqrt(disc))/(2*A)]){const q=vec.add(p,vec.scale(d,u));trial(u,vec.unit([0,q[1]-w.center[1],q[2]-w.center[2]]));}}
  }
  if(!normal){p=vec.add(p,d);path.push(p);if(g.wells.some(w=>inSolid(p,w,s)))throw Error('Steric solver ended inside a solid wall.');return {point:p,path,direction:vec.norm(d)>1e-14?vec.unit(d):vec.unit(displacement),bounces};}
  if(iter===LIMITS.maxReflections)throw Error('Reflection budget exceeded; trajectory was not clipped or repaired.');
  const hit=vec.add(p,vec.scale(d,best));path.push(hit);const remaining=vec.scale(d,1-best);d=vec.add(remaining,vec.scale(normal,-2*vec.dot(remaining,normal)));p=vec.add(hit,vec.scale(vec.unit(d.length&&vec.norm(d)>1e-14?d:vec.scale(displacement,-1)),1e-7));bounces++;
  if(vec.norm(d)<1e-10)return {point:p,path:[...path,p],direction:vec.unit(vec.scale(displacement,-1)),bounces};
 }
 throw Error('Unreachable reflection state.');
}
export function segmentSphere(a,b,target){const d=vec.add(b,vec.scale(a,-1)),v=vec.add(a,vec.scale(target.position,-1)),A=vec.dot(d,d),B=2*vec.dot(v,d),C=vec.dot(v,v)-target.radiusUm**2;if(C<=0)return 0;if(A===0)return null;const disc=B*B-4*A*C;if(disc<0)return null;const u=(-B-Math.sqrt(disc))/(2*A);return u>=0&&u<=1?u:null;}
export function hazardIntegral(c0,ceq,rate,dt,s){const A=CONSTANTS.trophicKNgMl+ceq,B=c0-ceq;const deprivation=CONSTANTS.trophicKNgMl/A*(dt+Math.log((A+B*Math.exp(-rate*dt))/(A+B))/rate);return s.basalDeathPerDay*dt+(s.trophicIndependent?0:s.starvationDeathPerDay*deprivation);}
export function connectionState(age,s,draw){if(age<0)return 'none';if(age+1e-10<s.contactDays)return 'contact';if(s.assumeTransmission&&age+1e-10>=s.contactDays+s.matureDays&&draw<s.transmissionProbability)return 'assumed-functional';return 'candidate';}
function nearestLane(p,g){return g.wells.reduce((best,w)=>Math.hypot(p[1]-w.center[1],p[2]-w.center[2])<Math.hypot(p[1]-best.center[1],p[2]-best.center[2])?w:best,g.wells[0]);}
function steer(b,p,cell,s,g,dt,step){
 const lane=nearestLane(p,g),sigma=CONSTANTS.targetCueSigmaUm;let cue=[0,0,0],sum=0;
 for(const target of g.targets.filter(t=>t.arm===b.arm)){const v=vec.add(target.position,vec.scale(p,-1)),w=Math.exp(-vec.dot(v,v)/(2*sigma*sigma));cue=vec.add(cue,vec.scale(v,w/sigma));sum+=w;}
 if(sum>1e-12)cue=vec.scale(cue,1/sum);else cue=[b.arm,0,0];
 const lanePull=[0,(lane.center[1]-p[1])/s.pitchUm,(lane.center[2]-p[2])/s.pitchUm];
 const desired=vec.add(vec.scale([b.arm,0,0],s.guidance),vec.add(vec.scale(cue,s.chemotaxis),vec.scale(lanePull,s.haptotaxis)));
 const tangent=vec.add(desired,vec.scale(b.direction,-vec.dot(desired,b.direction)));
 const noise=[0,1,2].map(axis=>normalRandom(s.seed,'steering',cell.id,b.id,step,axis));const projected=vec.add(noise,vec.scale(b.direction,-vec.dot(noise,b.direction)));
 return vec.unit(vec.add(b.direction,vec.add(vec.scale(tangent,CONSTANTS.steeringPerDay*dt),vec.scale(projected,s.angularNoise*Math.sqrt(dt)))));
}
export function runGrowth(input={},options={}){
 const s=normalize(input),g=createGeometry(s),field=solveTrophic(s),exchange=wellExchange(s),nodes=[],branches=[],cells=[],frames=[],events=[];
 let totalSavedIndices=0;const diagnostics={reflections:0,branchAttempts:0,branchCeilingSuppressions:0,extensions:0,pauses:0,retractions:0,contacts:0,detachments:0,pointBudget:LIMITS.maxPoints,savedIndexBudget:2000000};
 const addNode=(position,day,cellId,branchId)=>{if(nodes.length>=LIMITS.maxPoints)throw Error('Point budget exceeded; no path was truncated.');if(!position.every(Number.isFinite))throw Error('Nonfinite growth position.');const id=nodes.length;nodes.push({position:[...position],day,cellId,branchId});return id;};
 function addBranch(cell,arm,start,t,parent=null,anchorIndex=null,direction=[arm,0,0]){
  if(branches.length>=LIMITS.maxTips)throw Error('Global branch budget exceeded.');const id=`${cell.id}/B${cell.branches.length+1}`;
  const b={id,cellId:cell.id,arm,parentId:parent?.id??null,anchorIndex,direction:[...direction],birthDay:t,phase:'extend',phaseCounter:0,branchCounter:0,contactCounter:0,contact:null,cooldown:null,
   phaseUntil:t+exponential(s.seed,['motion',id,0],s.pausePerDay),nextBranch:t+exponential(s.seed,['branching',id,0],s.branchPerDay),path:[]};
  b.path=[parent?parent.path[anchorIndex]:addNode(start,t,cell.id,id)];branches.push(b);cell.branches.push(branches.length-1);return b;
 }
 for(const w of g.wells){if(w.occupancy!==1)continue;const c={id:`E${String(w.index+1).padStart(4,'0')}`,wellId:w.id,wellIndex:w.index,soma:[...w.center],originalHostId:null,alive:true,deathDay:null,markers:[...CONSTANTS.initialMarker],wellNgMl:0,hazard:0,deathThreshold:exponential(s.seed,['survival',w.id]),branches:[],lagDay:s.lagDays*(.5+uniform(s.seed,'lag',w.id)),started:false};cells.push(c);}
 const deathForStep=(cell,t,dt)=>{
  const bath=sampleField(field,cell.soma[1]),rate=exchange.ratePerDay+s.wellUptakePerDay,ceq=exchange.ratePerDay*bath/rate;
  const dh=hazardIntegral(cell.wellNgMl,ceq,rate,dt,s);let activeDt=dt;
  if(cell.hazard+dh>=cell.deathThreshold){let lo=0,hi=dt;for(let k=0;k<40;k++){const m=(lo+hi)/2;if(cell.hazard+hazardIntegral(cell.wellNgMl,ceq,rate,m,s)<cell.deathThreshold)lo=m;else hi=m;}activeDt=(lo+hi)/2;cell.deathDay=t+activeDt;}
  cell.hazard+=hazardIntegral(cell.wellNgMl,ceq,rate,activeDt,s);cell.wellNgMl=relax(cell.wellNgMl,ceq,rate,activeDt);return activeDt;
 };
 function contactUpdate(b,c,t){if(!b.contact)return;const q=b.contact;const age=t-q.sinceDay;
  if(t>=q.detachDay){events.push({day:t,cellId:c.id,branchId:b.id,type:'detached',targetId:q.targetId});b.cooldown=q.targetId;b.contact=null;diagnostics.detachments++;b.phase='extend';b.phaseUntil=t+exponential(s.seed,['motion',b.id,++b.phaseCounter],s.pausePerDay);return;}
  q.state=connectionState(age,s,q.transmissionDraw);
 }
 function retract(b,c,t,amount){let remaining=amount;const anchors=branches.filter(child=>child.parentId===b.id).map(child=>child.anchorIndex);const minLength=Math.max(1,...anchors.map(i=>i+1));
  while(remaining>1e-10&&b.path.length>minLength){const last=nodes[b.path.at(-1)].position,prev=nodes[b.path.at(-2)].position,len=dist(last,prev);if(len<=remaining+1e-10){b.path.pop();remaining-=len;}else{const point=vec.add(last,vec.scale(vec.add(prev,vec.scale(last,-1)),remaining/len));b.path[b.path.length-1]=addNode(point,t,c.id,b.id);remaining=0;}}
 }
 function advance(b,c,t,dt,step){
  let cursor=t,remaining=dt,transitions=0;
  while(remaining>1e-10){if(++transitions>100)throw Error('Motion transition budget exceeded.');
   if(cursor+1e-10>=b.phaseUntil){b.phaseCounter++;b.phase=b.phase==='extend'?'pause':b.phase==='pause'?(uniform(s.seed,'motion-choice',b.id,b.phaseCounter)<s.retractionChance?'retract':'extend'):'extend';const rate=b.phase==='extend'?s.pausePerDay:b.phase==='pause'?s.resumePerDay:CONSTANTS.retractExitPerDay;b.phaseUntil=cursor+exponential(s.seed,['motion',b.id,b.phaseCounter],rate);}
   const h=Math.min(remaining,b.phaseUntil-cursor);if(h<=1e-10)continue;const p=nodes[b.path.at(-1)].position,env=environment(s,cursor+h/2,p[0]);
   if(b.phase==='extend'&&s.growthUmDay>0){diagnostics.extensions++;b.direction=steer(b,p,c,s,g,h,`${step}:${transitions}`);const speed=s.growthUmDay*env.speedFactor*(.25+.75*c.markers[1])*(.3+.7*c.wellNgMl/(CONSTANTS.trophicKNgMl+c.wellNgMl));
    if(speed>0){const move=reflectStep(p,vec.scale(b.direction,speed*h),s,g);diagnostics.reflections+=move.bounces;b.direction=move.direction;let from=p,contactMade=false;
     for(const to of move.path){let picked=null,uBest=2;for(const target of g.targets){if(target.arm!==b.arm||target.id===b.cooldown)continue;const u=segmentSphere(from,to,target);if(u!==null&&u<uBest){picked=target;uBest=u;}}
      if(picked){const point=vec.add(from,vec.scale(vec.add(to,vec.scale(from,-1)),uBest));b.path.push(addNode(point,cursor+h,c.id,b.id));const count=b.contactCounter++;b.contact={targetId:picked.id,correct:picked.wellId===c.wellId,sinceDay:cursor+h,state:'contact',detachDay:cursor+h+exponential(s.seed,['detachment',b.id,count],s.detachPerDay),transmissionDraw:uniform(s.seed,'transmission',b.id,count)};events.push({day:cursor+h,cellId:c.id,branchId:b.id,type:'contact',targetId:picked.id,correct:b.contact.correct});diagnostics.contacts++;contactMade=true;break;}
      if(dist(from,to)>1e-8)b.path.push(addNode(to,cursor+h,c.id,b.id));from=to;
     }
     if(contactMade)return;
    }
   }else if(b.phase==='retract'){diagnostics.retractions++;retract(b,c,cursor+h,s.retractUmDay*h);}else diagnostics.pauses++;
   if(b.cooldown){const target=g.targets.find(q=>q.id===b.cooldown);if(dist(nodes[b.path.at(-1)].position,target.position)>target.radiusUm+1)b.cooldown=null;}
   cursor+=h;remaining-=h;
  }
 }
 function snapshot(day){
  const cs=cells.map(c=>{const score=Math.min(...c.markers.slice(1)),paths=c.branches.map(i=>branches[i]);let connections=paths.filter(b=>b.contact&&c.alive).map(b=>({branchId:b.id,arm:b.arm,...b.contact,detachDay:Number.isFinite(b.contact.detachDay)?b.contact.detachDay:null}));
   const both=state=>[-1,1].every(arm=>connections.some(q=>q.arm===arm&&q.correct&&(state==='contact'||state==='candidate'&&q.state!=='contact'||state==='assumed-functional'&&q.state==='assumed-functional')));
   return {id:c.id,wellId:c.wellId,soma:c.soma,originalHostId:null,alive:c.alive,deathDay:c.deathDay,markers:[...c.markers],signatureScore:score,specified:c.alive&&score>=s.fateThreshold,wellNgMl:c.wellNgMl,survivalProbability:Math.exp(-c.hazard),connections,bothCorrectContact:both('contact'),bothCorrectCandidate:both('candidate'),bothAssumedFunctional:both('assumed-functional'),branches:paths.map(b=>({id:b.id,arm:b.arm,parentId:b.parentId,anchorIndex:b.anchorIndex,birthDay:b.birthDay,phase:c.alive?b.contact?'contact-bound':b.phase:'dead',path:[...b.path]}))};});
  for(const c of cs)for(const b of c.branches)totalSavedIndices+=b.path.length;if(totalSavedIndices>2000000)throw Error('Replay-index budget exceeded; no saved frames were discarded.');
  const alive=cs.filter(c=>c.alive),specified=alive.filter(c=>c.specified),contact=specified.filter(c=>c.bothCorrectContact),candidate=contact.filter(c=>c.bothCorrectCandidate),functional=candidate.filter(c=>c.bothAssumedFunctional);
  const countByState={contact:0,candidate:0,'assumed-functional':0};for(const c of alive)for(const q of c.connections)countByState[q.state]++;
  const casc=[{stage:'Declared original census',count:s.wellCount},{stage:'One-cell wells admitted',count:cells.length},{stage:'Surviving engineered cells',count:alive.length},{stage:'SG-like signature proxy',count:specified.length},{stage:'Both intended target zones contacted',count:contact.length},{stage:'Both contacts became candidates',count:candidate.length},{stage:'Assumed transmission at both ends',count:s.assumeTransmission?functional.length:null},{stage:'Electrically selective outputs',count:null}];
  const losses=casc.slice(1).filter(x=>x.count!==null).map((row,i)=>({stage:row.stage,lost:casc[i].count-row.count}));const worst=losses.sort((a,b)=>b.lost-a.lost)[0];
  const frame={day,cells:cs,summary:{admitted:cells.length,alive:alive.length,specified:specified.length,dualContact:contact.length,dualCandidate:candidate.length,assumedFunctional:s.assumeTransmission?functional.length:null,wrongTargetContacts:alive.flatMap(c=>c.connections).filter(q=>!q.correct).length,contactStates:countByState,originalHostPreserved:0,originalHostElectricalY:null,electricalSelectivity:null,bindingObservedStage:worst?.lost>0?worst.stage:'No observed loss; unmodeled stages remain unknown'},cascade:casc,environment:environment(s,day,0)};
  frames.push(frame);return frame;
 }
 snapshot(0);const steps=Math.round(s.days/s.dtDays),saveEvery=Math.round(.5/s.dtDays);
 for(let step=0;step<steps;step++){
  if(options.shouldCancel?.())throw Error('Growth calculation cancelled; no partial result published.');const t=step*s.dtDays,end=(step+1)*s.dtDays;
  for(const c of cells){if(!c.alive)continue;const activeDt=deathForStep(c,t,s.dtDays);c.markers=fateStep(c.markers,s,c.soma[1],activeDt);
   if(!c.started&&end>=c.lagDay&&c.markers[1]>=.12){c.started=true;for(const arm of [-1,1])addBranch(c,arm,vec.add(c.soma,[arm*CONSTANTS.somaRadiusUm,0,0]),end);}
   const current=[...c.branches];for(const i of current){const b=branches[i];if(b.birthDay>=t+activeDt)continue;contactUpdate(b,c,t);const start=Math.max(t,b.birthDay),h=t+activeDt-start;if(b.contact){contactUpdate(b,c,t+activeDt);continue;}advance(b,c,start,h,step);
    if(t+activeDt>=b.nextBranch){diagnostics.branchAttempts++;b.nextBranch=t+activeDt+exponential(s.seed,['branching',b.id,++b.branchCounter],s.branchPerDay);const p=nodes[b.path.at(-1)].position;if(c.branches.length>=s.maxBranches){diagnostics.branchCeilingSuppressions++;}else if(!b.contact&&Math.abs(p[0])>s.wellHalfLengthUm+s.wallUm+5&&b.path.length>1){const perturb=[0,.5*normalRandom(s.seed,'branch-angle',b.id,b.branchCounter,1),.5*normalRandom(s.seed,'branch-angle',b.id,b.branchCounter,2)];addBranch(c,b.arm,p,t+activeDt,b,b.path.length-1,vec.unit(vec.add(b.direction,perturb)));}}
   }
   if(c.deathDay!==null){c.alive=false;for(const i of c.branches)branches[i].contact=null;events.push({day:c.deathDay,cellId:c.id,type:'death'});}
  }
  if((step+1)%saveEvery===0||step===steps-1){snapshot(end);options.onProgress?.({fraction:(step+1)/steps,day:end,summary:frames.at(-1).summary});}
 }
 const loading={mode:s.loading,occupied:g.wells.filter(w=>w.occupancy>0).length,empty:g.wells.filter(w=>w.occupancy===0).length,multiplets:g.wells.filter(w=>w.occupancy>1).length,single:cells.length,seededSomata:g.wells.reduce((n,w)=>n+w.occupancy,0),poissonSingleFraction:s.lambda*Math.exp(-s.lambda),meaning:s.loading==='placed'?'Exactly one cell is assumed placed per well; this is not a manufacturing yield.':'All zero / multiple occupancy wells explicitly fail admission. Overcrowded somata are not modeled as overlapping viable cells.'};
 return {schema:SCHEMA,modelVersion:VERSION,settings:s,constants:CONSTANTS,units:{distance:'µm',biologicalTime:'days',trophic:'ng/mL',markerActivity:'normalized proxy'},geometry:g,loading,field,exchange,nodes,frames,events,summary:frames.at(-1).summary,cascade:frames.at(-1).cascade,diagnostics:{...diagnostics,totalSavedIndices,steps,computedCells:cells.length,storedPoints:nodes.length},noDevice:{topology:g.topology,originalHostIds:g.originalHostIds,preservedOriginal:0,introducedCells:0,meaning:'Matched structural B3 no-device ledger: originals absent in both. No donor cells to grow; not a hollow-conduit repair or survival calculation.'},evidence:{developmentalBiology:'hypothetical',numericalVerification:'See separate report; not biological validation',transmission:s.assumeTransmission?'explicitly hypothetical':'not assumed',electrophysiology:'not calculated'},limitations:[...LIMITATIONS]};
}
export function fingerprint(value){const text=JSON.stringify(value);let a=2166136261,b=0x9e3779b9;for(const ch of text){a=Math.imul(a^ch.charCodeAt(0),16777619);b=Math.imul(b^ch.charCodeAt(0),2246822519);}return `${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;}
export function makeHandoff(result,frameIndex,confirmed=false){
 if(confirmed!==true)throw Error('Explicit confirmation is required before preparing an identity handoff.');
 if(result?.schema!==SCHEMA||result.modelVersion!==VERSION)throw Error('Unsupported biological result schema / version.');
 if(!Number.isInteger(frameIndex)||!result.frames[frameIndex])throw Error('Select an existing saved biological frame.');
 const f=result.frames[frameIndex],eligible=f.cells.filter(c=>c.alive&&c.specified&&c.bothCorrectCandidate),ids=new Set(eligible.map(c=>c.id));if(ids.size!==eligible.length)throw Error('Duplicate engineered identities.');
 const payload={schema:'buildthesimulation.axon-growth-handoff.v1',modelVersion:VERSION,sourceSettings:result.settings,sourceFingerprint:fingerprint({settings:result.settings,frame:f}),biologicalDay:f.day,originalHostIds:[...result.geometry.originalHostIds],originalHostPreserved:0,engineeredCandidates:eligible.map(c=>({id:c.id,wellId:c.wellId,originalHostId:null,assumedTransmission:c.bothAssumedFunctional,offTargetContactCount:c.connections.filter(q=>!q.correct).length,targets:c.connections.map(q=>({id:q.targetId,arm:q.arm,state:q.state,correct:q.correct}))})),candidateCount:eligible.length,confirmed:true,executable:false,electricalStatus:'Pending an explicit geometry-aware adapter and separate matched electrical calculation.',grownGeometryImported:false,electricalGeometry:null,electricalTimeMs:null,electricalRecruitment:null,biologicalValidation:false,limitations:[...result.limitations]};return payload;
}
export function csvRows(result){const columns=['day','admitted','alive','specified','dualContact','dualCandidate','assumedFunctional','wrongTargetContacts'];return [columns.join(','),...result.frames.map(f=>columns.map(k=>k==='day'?f.day:f.summary[k]??'').join(','))].join('\n');}
export const PRESETS=Object.freeze({
 baseline:{name:'Patterned bipolar growth',description:'24 synthetic wells; pulsed growth; transmission is not assumed.',settings:{}},
 poisson:{name:'Stochastic loading',description:'Poisson mean 1; empty and crowded wells explicitly fail admission.',settings:{loading:'poisson-reject-multiplets'}},
 starvation:{name:'Trophic withdrawal',description:'No supplied effective trophic factor; same identities and random streams.',settings:{supplyNgMl:0}},
 unguided:{name:'Unpatterned scaffold',description:'Remove scaffold alignment and haptotaxis; retain target cue field.',settings:{guidance:0,haptotaxis:0,angularNoise:.7}},
 wrongfate:{name:'Specification failure',description:'Weak hypothetical competence input, not a laboratory differentiation protocol.',settings:{FGF:.05}},
 transmission:{name:'Transmission hypothesis',description:'Explicitly assume some matured contacts transmit. No action potentials are calculated.',settings:{assumeTransmission:true}},
 short:{name:'Four-cell inspection',description:'Small cohort to inspect trajectories and identity handoff.',settings:{wellCount:4}},
 repair:{name:'No repair support',description:'Remove the repair proxy; debris clearance and growth support decrease.',settings:{repairSupport:0}}
});
