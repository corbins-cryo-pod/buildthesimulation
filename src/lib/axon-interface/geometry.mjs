import {normalizeSettings} from './settings.mjs';
export function randomStream(seed,name){
  let h=seed>>>0;for(let i=0;i<name.length;i++){h^=name.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  return ()=>{h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function createCohort(input){
  const s=normalizeSettings(input),random=randomStream(s.seed,'anatomy'),candidates=[];
  const radius=s.fascicleRadiusUm-Math.max(s.somaDiameterUm,s.fiberDiameterUm)/2-s.wellWallUm-10;
  const dy=s.wellPitchUm*Math.sqrt(3)/2,n=Math.ceil(radius/dy);
  for(let row=-n;row<=n;row++)for(let col=-n*2;col<=n*2;col++){
    const x=(col+(Math.abs(row)%2)*0.5)*s.wellPitchUm+(random()-.5)*s.positionJitter*s.wellPitchUm;
    const y=row*dy+(random()-.5)*s.positionJitter*s.wellPitchUm;
    if(Math.hypot(x,y)<radius)candidates.push({x,y,order:random()});
  }
  if(candidates.length<s.axonCount)throw new Error(`Only ${candidates.length} cells fit this cross-section at ${s.wellPitchUm} µm pitch. Requested ${s.axonCount}. Increase the radius, decrease the census, or change pitch explicitly.`);
  candidates.sort((a,b)=>a.order-b.order);
  const cells=candidates.slice(0,s.axonCount).map((p,i)=>({id:`E${String(i+1).padStart(4,'0')}`,index:i,xUm:p.x,yUm:p.y,zUm:0,fiberDiameterUm:s.fiberDiameterUm,somaDiameterUm:s.somaDiameterUm,class:'MRG myelinated benchmark',fascicle:1,origin:s.somaDiameterUm>0?'hypothetical-engineered-proxy':'synthetic-cable-benchmark',originalHostIdentity:null}));
  const minimumSeparation=Math.max(s.somaDiameterUm,s.fiberDiameterUm)+2*s.wellWallUm;
  for(let i=0;i<cells.length;i++)for(let j=0;j<i;j++)if(Math.hypot(cells[i].xUm-cells[j].xUm,cells[i].yUm-cells[j].yUm)<minimumSeparation-1e-9)throw new Error(`Jitter makes the geometric envelopes of ${cells[i].id} and ${cells[j].id} overlap. Increase pitch or explicitly reduce jitter. No geometry was repaired.`);
  const channels=Array.from({length:s.channelCount},(_,i)=>{const angle=2*Math.PI*i/s.channelCount,r=s.fascicleRadiusUm+s.sourceOffsetUm;return {id:`C${i+1}`,index:i,source:[r*Math.cos(angle),r*Math.sin(angle),0],return:[r*Math.cos(angle),r*Math.sin(angle),s.returnSeparationUm],electrodeRadiusUm:s.electrodeRadiusUm};});
  for(const channel of channels){
    if(s.returnSeparationUm<2*s.electrodeRadiusUm)throw new Error(`${channel.id} finite source and return supports overlap.`);
    for(const cell of cells)for(const [label,point] of [['source',channel.source],['return',channel.return]]){
      const radialDistance=Math.hypot(cell.xUm-point[0],cell.yUm-point[1]);
      if(radialDistance<=s.electrodeRadiusUm+Math.max(s.fiberDiameterUm,s.somaDiameterUm)/2+2)throw new Error(`${channel.id} ${label} support overlaps ${cell.id}'s conservative enclosing-cylinder clearance. Increase the source offset or reduce the source radius explicitly.`);
    }
  }
  return {cells,channels,census:s.axonCount,censusMeaning:'Declared synthetic electrical cohort; no preoperative host census or target identity is represented.',capacity:candidates.length,capacityMeaning:'Candidate center positions in one jittered cross-section; actual selected-envelope clearance is checked separately. No three-dimensional fabricated-well capacity is inferred.',fascicleRadiusUm:s.fascicleRadiusUm,perineuriumOuterUm:s.fascicleRadiusUm*(1+2*s.perineuriumThicknessFraction),wellPitchUm:s.wellPitchUm,displayEnlargement:1,coordinateUnits:'µm',seed:s.seed,streams:['anatomy','growth (not run)','junctions (not run)','fabrication (not run)']};
}
export function geometryDiagnostics(s,cohort){
  const pOne=s.seedingLambda*Math.exp(-s.seedingLambda),qNc=s.amplitudeUa*s.phaseWidthMs;
  const areaCm2=s.contactAreaUm2*1e-8,chargeUc=qNc/1000,densityUcCm2=chargeUc/areaCm2;
  return {geometricCapacity:cohort.capacity,geometricCapacityMeaning:'Candidate-position upper bound in one synthetic cross-section; not a verified three-dimensional fabricated-well array.',representedCensus:s.axonCount,poissonSingleOccupancy:pOne,poissonExpectedSingleWells:cohort.capacity*pOne,poissonMeaning:'Analytic independent loading of hypothetical candidate slots; occupancy is not simulated or multiplied into recruitment.',chargePerPhaseNc:qNc,geometricChargeDensityUcCm2:densityUcCm2,shannonK:chargeUc>0?Math.log10(chargeUc)+Math.log10(densityUcCm2):null,shannonMeaning:'Arithmetic diagnostic only. No safe/unsafe classification: electrode polarization, impedance, tissue injury and geometry-dependent limits are not solved.',evidence:'mathematical'};
}
