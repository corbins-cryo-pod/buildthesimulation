import {distance,clamp} from './geometry.js';

// Cytoskeletal material is measured in equivalent micrometres of new shaft,
// NOT molecular concentration. The separate membrane ledger uses µm².
export function initPhysiology(cell,seed=0){
  cell.cargo={initial:200,free:200,supplied:0,incorporated:0,recycled:0,lost:0,parcels:[]};
  cell.excitation={rng:((Math.imul(cell.id+1,2654435761)^seed)>>>0),wait:.5+cell.id*.17,recovery:0,events:0,oscillator:{phase:(seed%1000)/1000*Math.PI*2,inhibition:0,selectedRoot:null}};
  cell.polarityDecision={candidate:null,heldHours:0};
}
const random=s=>{s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return(s.rng+.5)/4294967296;};
export function pathTo(sim,id){const path=[];let guard=0;while(id>=0&&guard++<=sim.segments.length){const s=sim.segments[id];if(!s?.alive)return [];path.push(id);id=s.parentId;}return path.reverse();}
export function seedTipCargo(sim,tip){const c=sim.cells[tip.cellId].cargo;const q=Math.min(5,c.free);c.free-=q;tip.cargo=q;}
export function seedStructure(cell,length){const q=Math.min(length,cell.cargo.free);cell.cargo.free-=q;cell.cargo.incorporated+=q;}
export function consumeCargo(sim,tip,amount){if(amount>tip.cargo+1e-7)throw Error('Cytoskeletal material overdraw');tip.cargo=Math.max(0,tip.cargo-amount);sim.cells[tip.cellId].cargo.incorporated+=amount;}
export function recycleCargo(sim,cellId,amount){const c=sim.cells[cellId].cargo;const q=Math.min(amount,c.incorporated);c.incorporated-=q;c.free+=q*.6;c.recycled+=q*.6;c.lost+=q*.4;}
export function cargoAudit(sim,cell){const c=cell.cargo;const tips=sim.tips.filter(t=>t.cellId===cell.id).reduce((s,t)=>s+(t.cargo||0),0);const transit=c.parcels.reduce((s,p)=>s+p.amount,0);return {free:c.free,tips,transit,incorporated:c.incorporated,supplied:c.supplied,lost:c.lost,residual:c.initial+c.supplied-c.free-tips-transit-c.incorporated-c.lost};}

export function advancePhysiology(sim,dt){
  for(const cell of sim.cells){
    const c=cell.cargo,e=cell.excitation,tips=sim.tips.filter(t=>t.cellId===cell.id&&t.active);
    const supplied=Math.min(Math.max(0,400-c.free),sim.config.cargoRate*dt);c.free+=supplied;c.supplied+=supplied;
    for(const t of sim.tips)if(t.cellId===cell.id&&!t.active&&t.cargo){c.free+=t.cargo;t.cargo=0;}
    const keep=[];
    for(const p of c.parcels){
      const tip=sim.tips[p.tipId];
      if(!tip?.active||p.path.some(id=>!sim.segments[id]?.alive)){c.free+=p.amount;continue;}
      let travel=sim.config.transportSpeed*dt;
      while(p.index<p.path.length){const s=sim.segments[p.path[p.index]],remaining=Math.max(0,distance(s.start,s.end)-p.offset);if(travel<remaining){p.offset+=travel;break;}travel-=remaining;p.index++;p.offset=0;}
      if(p.index===p.path.length)tip.cargo+=p.amount;else keep.push(p);
    }
    c.parcels=keep;
    for(const tip of tips){
      const queued=c.parcels.filter(p=>p.tipId===tip.id).reduce((s,p)=>s+p.amount,0);
      const amount=Math.min(c.free,Math.max(0,24-tip.cargo-queued),16*dt);
      if(amount>1e-10){const path=pathTo(sim,tip.segmentId);if(path.length){c.free-=amount;c.parcels.push({tipId:tip.id,amount,path,index:0,offset:0});}}
    }
    cell.supply=clamp(tips.length?tips.reduce((s,t)=>s+t.cargo,0)/(tips.length*8):c.free/50,0,1);
    if(!['excitable','oscillator'].includes(sim.config.excitation)||sim.config.growthPulses===0){for(const s of sim.segments)if(s.cellId===cell.id)s.excitation={a:0,h:0};continue;}
    const segments=sim.segments.filter(s=>s.alive&&s.cellId===cell.id),roots=segments.filter(s=>s.parentId<0);
    if(sim.config.excitation==='oscillator'){
      // A phase-oscillator hypothesis, NOT the fitted molecular model of Lin
      // et al. 2026. A declared 2.5 h cycle coordinates transient withdrawal
      // with excitation of one root. Coordination ends after axon selection.
      const o=e.oscillator;o.inhibition*=Math.exp(-dt/.45);
      if(cell.axonRootId===null){o.phase+=2*Math.PI*dt/2.5;if(o.phase>=2*Math.PI){o.phase%=2*Math.PI;if(roots.length){const root=roots[Math.floor(random(e)*roots.length)];o.selectedRoot=root.id;o.inhibition=1;root.excitation={a:1,h:0};e.events++;}}}
      else o.inhibition=0;
    }else{
      e.wait-=dt;e.recovery*=Math.exp(-dt/1.2);
      if(e.wait<=0&&roots.length){const s=roots[Math.floor(random(e)*roots.length)];s.excitation={a:1,h:0};e.recovery=Math.min(1,e.recovery+.35);e.wait=.5+e.recovery-Math.log(random(e))*1.1;e.events++;}
    }
    // Directed local excitable coupling, inspired by the soft-cell prototype.
    // Time constants are declared assumptions, not a molecular pathway fit.
    const count=Math.ceil(dt/.005),h=dt/count;
    for(let k=0;k<count;k++){
      const next=[];
      for(const s of segments){const x=s.excitation||{a:0,h:0},parent=sim.segments[s.parentId]?.excitation?.a||0;
        const da=45*x.a*(1-x.a)*(x.a-.16)-10*x.h*x.a+12*(parent-x.a);
        next.push([s,clamp(x.a+h*da,0,1.2),clamp(x.h+h*(1.6*x.a-.7*x.h),0,1.4)]);
      }
      for(const [s,a,r] of next)s.excitation={a,h:r};
    }
    for(const t of tips){const x=sim.segments[t.segmentId].excitation||{a:0};t.exploration.pulse=Math.max(t.exploration.pulse,x.a);}
  }
}
export function validatePhysiology(sim){
  for(const cell of sim.cells){const c=cell.cargo,e=cell.excitation;if(!c||!e||!Array.isArray(c.parcels)||c.parcels.length>20000)throw Error('Invalid V5 transport state');
    for(const k of ['initial','free','supplied','incorporated','recycled','lost'])if(!Number.isFinite(c[k])||c[k]<0)throw Error('Invalid V5 reservoir');
    if(!Number.isInteger(e.rng)||e.rng<0||e.rng>4294967295||!Number.isFinite(e.wait)||!Number.isFinite(e.recovery)||e.recovery<0||e.recovery>1||!Number.isSafeInteger(e.events)||e.events<0)throw Error('Invalid V5 excitation state');
    const o=e.oscillator;if(!o||!Number.isFinite(o.phase)||o.phase<0||o.phase>=2*Math.PI+1e-8||!Number.isFinite(o.inhibition)||o.inhibition<0||o.inhibition>1||!(o.selectedRoot===null||Number.isInteger(o.selectedRoot)&&sim.segments[o.selectedRoot]?.cellId===cell.id&&sim.segments[o.selectedRoot]?.parentId===-1))throw Error('Invalid soma oscillator state');
    if(!cell.polarityDecision||!Number.isFinite(cell.polarityDecision.heldHours)||cell.polarityDecision.heldHours<0)throw Error('Invalid polarity state');
    for(const p of c.parcels)if(!sim.tips[p.tipId]||sim.tips[p.tipId].cellId!==cell.id||!Number.isFinite(p.amount)||p.amount<0||!Array.isArray(p.path)||!p.path.length||p.path.some(id=>!sim.segments[id]||sim.segments[id].cellId!==cell.id)||!Number.isInteger(p.index)||p.index<0||p.index>=p.path.length||!Number.isFinite(p.offset)||p.offset<0)throw Error('Invalid cargo path');
    if(Math.abs(cargoAudit(sim,cell).residual)>1e-6)throw Error('Cytoskeletal ledger mismatch');
  }
  for(const s of sim.segments)if(s.excitation&&(!Number.isFinite(s.excitation.a)||s.excitation.a<0||s.excitation.a>1.2||!Number.isFinite(s.excitation.h)||s.excitation.h<0||s.excitation.h>1.4))throw Error('Invalid local excitation');
  for(const t of sim.tips)if(!Number.isFinite(t.cargo)||t.cargo<0)throw Error('Invalid cone cargo');
}
