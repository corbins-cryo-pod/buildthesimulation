/**
 * Exploratory geometric neurite growth, not a calibrated graft-integration model.
 * Lengths: µm; time: days; branchProbabilityPerDay is a hazard in day⁻¹.
 * Electrical cables and synapses are deliberately not mutated by this module.
 */
export const GROWTH_VERSION = 'biohybrid-exploratory-growth/1.0.0';
export const DEFAULT_GROWTH_SETTINGS = Object.freeze({
  seed: 4281, days: 8, speedUmPerDay: 180, cueStrength: .7,
  branchProbabilityPerDay: .08, synapseProbability: .4,
  lengthUm: 1000, radiusUm: 90, hostCount: 3, graftCount: 2,
  dtDays: .05, angularDiffusionRadPerSqrtDay: .16, cueRatePerDay: 3,
  targetRadiusUm: 18, maturationDelayDays: .75, branchAngleDeg: 28,
  maxPaths: 96, maxVertices: 20000,
});

const RANGES = {
  seed: [0, 4294967295], days: [0, 60], speedUmPerDay: [0, 1500],
  cueStrength: [0, 1], branchProbabilityPerDay: [0, 4], synapseProbability: [0, 1],
  lengthUm: [50, 20000], radiusUm: [10, 500], hostCount: [0, 20], graftCount: [0, 20],
  dtDays: [.005, .5], angularDiffusionRadPerSqrtDay: [0, 2], cueRatePerDay: [0, 10],
  targetRadiusUm: [.1, 100], maturationDelayDays: [0, 30], branchAngleDeg: [0, 90],
  maxPaths: [1, 256], maxVertices: [20, 100000],
};
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const unit = v => { const n=Math.hypot(...v); return n>1e-14?v.map(x=>x/n):[1,0,0]; };

export function normalizeGrowthSettings(input = {}) {
  const s = {};
  for (const key of Object.keys(DEFAULT_GROWTH_SETTINGS)) s[key] = Number(input[key] ?? DEFAULT_GROWTH_SETTINGS[key]);
  if (input.lengthUm === undefined && input.axonLengthUm !== undefined) s.lengthUm = Number(input.axonLengthUm);
  if (input.radiusUm === undefined && input.scaffoldRadiusUm !== undefined) s.radiusUm = Number(input.scaffoldRadiusUm);
  for (const [key,[lo,hi]] of Object.entries(RANGES)) {
    if (!Number.isFinite(s[key]) || s[key]<lo || s[key]>hi) throw new Error(`${key} must be between ${lo} and ${hi}.`);
  }
  for (const key of ['seed','hostCount','graftCount','maxPaths','maxVertices']) {
    if (!Number.isInteger(s[key])) throw new Error(`${key} must be an integer.`);
  }
  if (s.maxPaths<s.graftCount || s.maxVertices<s.graftCount) throw new Error('Growth caps must accommodate the initial graft neurites.');
  return s;
}

/** Independent reproducible streams keep synapse probability from moving paths. */
function rngFor(seed, label) {
  let state = (2166136261 ^ seed) >>> 0;
  for (const ch of label) { state ^= ch.charCodeAt(0); state = Math.imul(state,16777619) >>> 0; }
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = rng => Math.sqrt(-2*Math.log(Math.max(1e-15,rng())))*Math.cos(2*Math.PI*rng());

/** Exact probability of at least one event for a constant Poisson hazard. */
export function hazardProbability(ratePerDay, dtDays) {
  if (!Number.isFinite(ratePerDay) || !Number.isFinite(dtDays) || ratePerDay<0 || dtDays<0) throw new Error('Hazard and time interval must be finite and nonnegative.');
  return -Math.expm1(-ratePerDay*dtDays);
}

/** Earliest intersection of a complete growth segment with a target sphere. */
export function segmentSphereEncounter(start, end, center, radius) {
  const delta=end.map((x,i)=>x-start[i]), q=start.map((x,i)=>x-center[i]);
  const c=dot(q,q)-radius*radius;
  if (c<=0) return {fraction:0,positionUm:[...start]};
  const a=dot(delta,delta);
  if (a<1e-24) return null;
  const b=2*dot(q,delta), discriminant=b*b-4*a*c;
  if (discriminant<0) return null;
  const fraction=(-b-Math.sqrt(Math.max(0,discriminant)))/(2*a);
  if (fraction < -1e-12 || fraction > 1+1e-12) return null;
  const t=Math.max(0,Math.min(1,fraction));
  return {fraction:t,positionUm:start.map((x,i)=>x+t*delta[i])};
}

/**
 * Reflect at the cylindrical wall and entry plane; stop at the outlet.
 * Returns actual straight subsegments, including boundary crossings, so path
 * length, encounters and event time use the traveled route, not a projected chord.
 */
function advance(point, direction, length, s) {
  let p=[...point], d=[...direction], remaining=length, traveled=0, stopped=false;
  const segments=[];
  for (let bounce=0; bounce<24 && remaining>1e-10; bounce++) {
    let travel=remaining, boundary=null;
    if (d[0]>1e-12) {
      const t=Math.max(0,(s.lengthUm-p[0])/d[0]);
      if(t<=travel) { travel=t; boundary='outlet'; }
    } else if(d[0]<-1e-12) {
      const t=Math.max(0,-p[0]/d[0]);
      if(t<=travel) { travel=t; boundary='entry'; }
    }
    const a=d[1]*d[1]+d[2]*d[2];
    if(a>1e-18) {
      const b=2*(p[1]*d[1]+p[2]*d[2]);
      const c=p[1]*p[1]+p[2]*p[2]-s.radiusUm*s.radiusUm;
      const t=(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a);
      if(t>=-1e-9 && t<travel-1e-10) { travel=Math.max(0,t); boundary='wall'; }
    }
    const end=p.map((x,i)=>x+travel*d[i]);
    end[0]=Math.max(0,Math.min(s.lengthUm,end[0]));
    const radial=Math.hypot(end[1],end[2]);
    if(radial>s.radiusUm) { end[1]*=s.radiusUm/radial; end[2]*=s.radiusUm/radial; }
    if(travel>1e-10) segments.push({start:[...p],end:[...end],startDistance:traveled,lengthUm:distance(p,end)});
    traveled+=travel; remaining-=travel; p=end;
    if(boundary==='outlet') { stopped=true; break; }
    if(boundary==='entry') d[0]=-d[0];
    else if(boundary==='wall') {
      const n=[0,p[1]/s.radiusUm,p[2]/s.radiusUm], projection=dot(d,n);
      d=unit(d.map((x,i)=>x-2*projection*n[i]));
    } else break;
  }
  return {segments,direction:d,stopped,untraveledUm:remaining};
}

function makeTargets(input, s) {
  const targets = input.targets ?? Array.from({length:s.hostCount},(_,i)=>({
    id:`host-${i+1}`,positionUm:[s.lengthUm,s.hostCount>1?(i/(s.hostCount-1)-.5)*1.25*s.radiusUm:0,0],
  }));
  if(!Array.isArray(targets) || targets.length>20) throw new Error('Growth targets must be an array of at most 20 objects.');
  const ids=new Set();
  return targets.map(target=>{
    const p=target.positionUm;
    if(!target.id || ids.has(String(target.id)) || !Array.isArray(p) || p.length!==3 || p.some(v=>!Number.isFinite(v)) ||
      p[0]<0 || p[0]>s.lengthUm || Math.hypot(p[1],p[2])>s.radiusUm) throw new Error('Each growth target needs a unique ID and a finite position inside the scaffold.');
    ids.add(String(target.id));
    return {id:String(target.id),positionUm:[...p],radiusUm:s.targetRadiusUm};
  });
}

export function simulateGrowth(input = {}) {
  const s=normalizeGrowthSettings(input), targets=makeTargets(input,s), paths=[], states=[], encounters=[];
  let vertexCount=0, branchCount=0, blockedBranches=0, boundaryRemainderUm=0, truncated=false, simulatedUntilDay=0;
  const addPath=(sourceGraftId,parentId,point,day,direction,targetId)=>{
    const id=`growth-${paths.length+1}`;
    const path={id,sourceGraftId,parentId,birthDay:day,points:[{day,positionUm:[...point]}],lengthUm:0};
    paths.push(path);vertexCount++;
    states.push({path,direction:unit(direction),targetId,active:true,seen:new Set(),
      steer:rngFor(s.seed,`${id}:steer`),branch:rngFor(s.seed,`${id}:branch`),formation:rngFor(s.seed,`${id}:formation`)});
  };
  for(let i=0;i<s.graftCount;i++) {
    const y=s.graftCount>1?(i/(s.graftCount-1)-.5)*.7*s.radiusUm:0;
    addPath(`graft-${i+1}`,null,[0,y,0],0,[1,0,0],targets[i%Math.max(1,targets.length)]?.id??null);
  }
  const detect=(state,start,end,startDay,duration)=>{
    for(const target of targets) {
      if(state.seen.has(target.id)) continue;
      const crossing=segmentSphereEncounter(start,end,target.positionUm,target.radiusUm);
      if(!crossing) continue;
      state.seen.add(target.id);
      const day=startDay+crossing.fraction*duration;
      // Always draw, even at p=0/1. Formation is independent from steering.
      const accepted=state.formation()<s.synapseProbability;
      encounters.push({id:`encounter-${encounters.length+1}`,pathId:state.path.id,sourceGraftId:state.path.sourceGraftId,
        targetId:target.id,day,positionUm:crossing.positionUm,formationAccepted:accepted,
        candidateDay:day+s.maturationDelayDays});
    }
  };
  // Initial contact is an encounter even if speed is zero; it is not a synapse.
  for(const state of states) detect(state,state.path.points[0].positionUm,state.path.points[0].positionUm,0,0);
  outer: for(let step=0;step<Math.ceil(s.days/s.dtDays-1e-12);step++) {
    const day=step*s.dtDays, dt=Math.min(s.dtDays,s.days-day), endDay=day+dt;
    let stepRemainderUm=0;
    const snapshot=[...states];
    for(const state of snapshot) {
      if(!state.active || s.speedUmPerDay===0) continue;
      const point=state.path.points.at(-1).positionUm;
      const target=targets.find(t=>t.id===state.targetId);
      const attraction=target?unit(target.positionUm.map((v,k)=>v-point[k])):state.direction;
      const blend=hazardProbability(s.cueStrength*s.cueRatePerDay,dt);
      const drift=unit(state.direction.map((v,k)=>(1-blend)*v+blend*attraction[k]));
      const noise=[normal(state.steer),normal(state.steer),normal(state.steer)];
      const projection=dot(noise,drift), scale=s.angularDiffusionRadPerSqrtDay*Math.sqrt(dt);
      const direction=unit(drift.map((v,k)=>v+scale*(noise[k]-projection*v)));
      const move=advance(point,direction,s.speedUmPerDay*dt,s);
      // Atomic step storage prevents partial paths or unrecorded encounters at a cap.
      if(vertexCount+move.segments.length>s.maxVertices) {truncated=true;break outer;}
      for(const part of move.segments) {
        const startDay=day+part.startDistance/s.speedUmPerDay, duration=part.lengthUm/s.speedUmPerDay;
        detect(state,part.start,part.end,startDay,duration);
        state.path.points.push({day:Math.min(endDay,startDay+duration),positionUm:part.end});
        state.path.lengthUm+=part.lengthUm;vertexCount++;
      }
      state.direction=move.direction;state.active=!move.stopped;
      stepRemainderUm+=move.untraveledUm;
      if(state.active && state.branch()<hazardProbability(s.branchProbabilityPerDay,dt)) {
        if(paths.length>=s.maxPaths || vertexCount+1>s.maxVertices) blockedBranches++;
        else {
          const r=[normal(state.branch),normal(state.branch),normal(state.branch)], projection=dot(r,state.direction);
          const tangent=unit(r.map((v,k)=>v-projection*state.direction[k]));
          const angle=s.branchAngleDeg*Math.PI/180;
          const branchDirection=state.direction.map((v,k)=>v*Math.cos(angle)+tangent[k]*Math.sin(angle));
          const branchTarget=targets.length?targets[Math.floor(state.branch()*targets.length)].id:null;
          addPath(state.path.sourceGraftId,state.path.id,state.path.points.at(-1).positionUm,endDay,branchDirection,branchTarget);
          branchCount++;
        }
      }
    }
    boundaryRemainderUm+=stepRemainderUm;
    simulatedUntilDay=endDay;
  }
  if(!truncated) simulatedUntilDay=s.days;
  else {
    // Discard the incomplete global time step, including births and encounters,
    // so every surviving path is represented on the same completed time horizon.
    for(let i=paths.length-1;i>=0;i--) {
      const path=paths[i];
      path.points=path.points.filter(p=>p.day<=simulatedUntilDay+1e-12);
      if(!path.points.length) {paths.splice(i,1);continue;}
      path.lengthUm=path.points.slice(1).reduce((sum,p,j)=>sum+distance(path.points[j].positionUm,p.positionUm),0);
    }
    const kept=new Set(paths.map(p=>p.id));
    for(let i=encounters.length-1;i>=0;i--) if(encounters[i].day>simulatedUntilDay+1e-12 || !kept.has(encounters[i].pathId)) encounters.splice(i,1);
    vertexCount=paths.reduce((sum,p)=>sum+p.points.length,0);
    branchCount=paths.filter(p=>p.parentId!==null).length;
  }
  const candidateSynapses=encounters.filter(e=>e.formationAccepted && e.candidateDay<=simulatedUntilDay+1e-12).map((e,i)=>({
    id:`candidate-${i+1}`,encounterId:e.id,pathId:e.pathId,sourceGraftId:e.sourceGraftId,targetId:e.targetId,
    day:e.candidateDay,encounterDay:e.day,positionUm:[...e.positionUm],functionalValidation:false,
  }));
  encounters.sort((a,b)=>a.day-b.day || a.id.localeCompare(b.id));
  candidateSynapses.sort((a,b)=>a.day-b.day || a.id.localeCompare(b.id));
  const totalLengthUm=paths.reduce((sum,p)=>sum+p.lengthUm,0);
  const metrics={pathCount:paths.length,rootCount:s.graftCount,branchCount,totalLengthUm,
    longestPathUm:Math.max(0,...paths.map(p=>p.lengthUm)),vertexCount,
    encounters:encounters.length,encounteredTargets:new Set(encounters.map(e=>e.targetId)).size,
    candidateSynapses:candidateSynapses.length,candidateTargets:new Set(candidateSynapses.map(e=>e.targetId)).size,
    pendingCandidates:encounters.filter(e=>e.formationAccepted && e.candidateDay>simulatedUntilDay+1e-12).length,
    simulatedUntilDay,truncated,blockedBranches,boundaryRemainderUm,
    functionalSynapsesValidated:0,
  };
  return {modelVersion:GROWTH_VERSION,settings:s,lengthUm:s.lengthUm,radiusUm:s.radiusUm,paths,encounters,candidateSynapses,targets,metrics,
    limitations:'Exploratory geometric growth. Rates and probabilities are not fitted to graft integration. Encounters and matured candidates are not evidence of functional synapses. Electrical recruitment must be calculated separately.'};
}
