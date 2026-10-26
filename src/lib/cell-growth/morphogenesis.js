/** Local, saved morphogenesis state. Distances µm; time h.
 * Wave speed is anchored to Winans et al. (2016), 2–3 µm/min in DIV1 rat
 * hippocampal culture. All other rates below are exploratory model choices.
 * No renderer clock or unseeded randomness can change the biology.
 */
import {add,sub,scale,unit,cross,dot,length,distance,clamp,lerp} from './geometry.js';

export const MORPHOGENESIS = Object.freeze({waveSpeedMin:120,waveSpeedMax:180,
  waveRate:1.4,waveDecayHours:.42,maxWaves:2048,filopodiaCount:9,
  filopodiumSpeed:26,filopodiumMaxLength:7,sectorTauHours:.075,
  shaftRelaxationPerHour:.22,maxShaftMotionPerHour:.6});

export function localRandom(state){state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;return (state.rng+.5)/4294967296;}
export const exponential=(state,rate)=>-Math.log(localRandom(state))/Math.max(rate,1e-12);
function streamSeed(seed,index){
  let x=(seed^Math.imul(index+1,0x9e3779b9))>>>0;
  x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return(x^(x>>>16))>>>0;
}
export function createExploration(seed,id){
  const s={rng:(seed^Math.imul(id+17,2246822519))>>>0,sectors:[],probes:[],pulse:0,arrivals:0};
  for(let i=0;i<12;i++)s.sectors.push({rng:streamSeed(s.rng,256+i),activity:.15+.7*localRandom(s),target:localRandom(s),remaining:.02+.18*localRandom(s)});
  for(let i=0;i<MORPHOGENESIS.filopodiaCount;i++)s.probes.push({rng:streamSeed(s.rng,512+i),angle:-1.6+3.2*(i+.15+.7*localRandom(s))/MORPHOGENESIS.filopodiaCount,
    length:.1+.7*localRandom(s),target:.5+5*localRandom(s),remaining:.04+.22*localRandom(s),bend:(localRandom(s)-.5)*.35,phase:'extending'});
  return s;
}

/** Independent renewal processes replace synchronized sinusoidal spokes. */
export function advanceExploration(tip,dt,config){
  const e=tip.exploration;
  e.pulse*=Math.exp(-dt/MORPHOGENESIS.waveDecayHours);
  for(const sector of e.sectors){
    let left=dt;
    while(left>1e-12){
      if(sector.remaining<=1e-12){sector.target=localRandom(sector)**1.6;sector.remaining=.035+exponential(sector,12);}
      const h=Math.min(left,sector.remaining);
      sector.activity+=(sector.target-sector.activity)*(-Math.expm1(-h/MORPHOGENESIS.sectorTauHours));
      sector.remaining-=h;left-=h;
    }
  }
  const drive=clamp(config.actin,0,2),load=tip.status==='contact'?.55:1;
  for(const probe of e.probes){
    let left=dt;
    while(left>1e-12){
      if(probe.remaining<=1e-12){
        probe.phase=probe.phase==='extending'?'retracting':'extending';
        probe.target=probe.phase==='extending'?(1+6*localRandom(probe))*Math.min(1,drive)*load:.03;
        probe.remaining=.04+exponential(probe,probe.phase==='extending'?7:11);
        // Direction changes when a protrusion renews, never a rotating star.
        if(probe.length<.4){probe.angle=clamp(probe.angle+(localRandom(probe)-.5)*.65,-1.85,1.85);probe.bend=(localRandom(probe)-.5)*.5;}
      }
      const h=Math.min(left,probe.remaining),target=drive>0?probe.target:0;
      const maxChange=MORPHOGENESIS.filopodiumSpeed*h*(target<probe.length?1.3:drive);
      probe.length=clamp(probe.length+clamp(target-probe.length,-maxChange,maxChange),0,MORPHOGENESIS.filopodiumMaxLength);
      probe.remaining-=h;left-=h;
    }
  }
}

/** Travel through the actual retained tree. A packet takes one daughter at a
 * branch; it is not copied into every dendrite and is not an action potential. */
export function advanceActinWaves(sim,dt){
  sim.waves??=[];
  if(sim.config.growthPulses===0||sim.config.actin===0||sim.config.microtubules===0){sim.waves=[];return;}
  const children=new Map(),tips=new Map();
  for(const s of sim.segments)if(s.alive&&s.parentId>=0){if(!children.has(s.parentId))children.set(s.parentId,[]);children.get(s.parentId).push(s);}
  for(const t of sim.tips)if(t.active)tips.set(t.segmentId,t);
  for(const root of sim.segments){
    if(!root.alive||root.parentId!==-1)continue;
    root.waveSource??={rng:(sim.config.seed^Math.imul(root.id+3,3266489917))>>>0,remaining:0};
    const source=root.waveSource,cell=sim.cells[root.cellId];
    // Strongest before polarization; older arbors are less wave-dependent.
    const rate=MORPHOGENESIS.waveRate*(cell.stage==='immature'?1:cell.stage==='polarized'?.55:.25);
    if(source.remaining===0)source.remaining=exponential(source,rate);
    let elapsed=0;
    while(source.remaining<=dt-elapsed){
      elapsed+=source.remaining;
      if(sim.waves.length<MORPHOGENESIS.maxWaves){
        sim.waves.push({id:sim.counters.wavesLaunched++,cellId:root.cellId,segmentId:root.id,offset:0,
          speed:MORPHOGENESIS.waveSpeedMin+60*localRandom(source),amplitude:.65+.35*localRandom(source),
          rng:Math.floor(localRandom(source)*4294967296),bornHours:sim.timeHours+elapsed,travelHours:dt-elapsed});
      }
      source.remaining=exponential(source,rate);
    }
    source.remaining-=dt-elapsed;
  }
  const retained=[];
  for(const w of sim.waves){
    let travel=w.speed*(w.travelHours??dt);delete w.travelHours;
    let alive=true,guard=0;
    while(travel>=0&&alive&&guard++<sim.segments.length+1){
      const s=sim.segments[w.segmentId];if(!s?.alive){alive=false;break;}
      const extent=distance(s.start,s.end),remaining=Math.max(0,extent-w.offset);
      if(travel<remaining){w.offset+=travel;break;}
      travel-=remaining;w.offset=extent;
      const next=children.get(s.id);
      if(next?.length){w.segmentId=next[Math.floor(localRandom(w)*next.length)].id;w.offset=0;continue;}
      const tip=tips.get(s.id);
      if(tip?.exploration){tip.exploration.pulse=Math.min(1.6,tip.exploration.pulse+w.amplitude);tip.exploration.arrivals++;sim.counters.waveArrivals++;}
      alive=false;
    }
    if(alive)retained.push(w);
  }
  sim.waves=retained;
}

export function waveDrive(tip,cell,episode,strength){
  if(strength===0)return 1;
  // In older arbors local episodes dominate; the early wave experiment is not
  // extrapolated as a universal gate on mature dendritic growth.
  const dependency=cell.stage==='immature'?.88:cell.stage==='polarized'?.48:.12;
  const pulse=.04+1.7*(tip.exploration?.pulse??0);
  const episodic=Math.min(2.6,(1-dependency)*episode+dependency*pulse);
  return 1+clamp(strength,0,1)*(episodic-1);
}

/** Conservative, morphology-dependent surface profile INSIDE each collision
 * capsule. Radius variation changes depiction, not the membrane material ledger.
 * The physical envelope remains segment.radius and is always available in
 * Mechanics view. Root taper and nascent tip taper eliminate uniform tubes. */
export function shaftProfile(sim){
  const paths=new Map(),out=new Map(),tipSegments=new Map(sim.tips.filter(t=>t.active).map(t=>[t.segmentId,t]));
  for(const s of sim.segments){
    if(!s.alive)continue;
    const len=distance(s.start,s.end),startPath=paths.get(s.parentId)||0;paths.set(s.id,startPath+len);
    const parent=sim.segments[s.parentId];
    const fraction=at=>{
      const taper=s.kind==='axon'?.66+.25*Math.exp(-at/35):.33+.64*Math.exp(-at/95);
      return clamp(taper*(1-.055*Math.min(4,s.branchOrder)),.23,.98);
    };
    let r0=s.radius*fraction(startPath),r1=s.radius*fraction(startPath+len);
    // Shared junction cross sections, including radius changes at branches.
    if(parent?.alive&&out.has(parent.id))r0=Math.min(s.radius,out.get(parent.id).r1);
    const tip=tipSegments.get(s.id);
    if(tip&&tip.status==='retracting')r1*=.7;
    out.set(s.id,{r0,r1,pathStart:startPath,pathEnd:startPath+len});
  }
  return out;
}

export function wavePosition(sim,wave){const s=sim.segments[wave.segmentId];return s?.alive?lerp(s.start,s.end,clamp(wave.offset/Math.max(1e-9,distance(s.start,s.end)),0,1)):null;}
