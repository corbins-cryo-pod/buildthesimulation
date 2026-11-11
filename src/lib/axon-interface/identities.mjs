import { randomStream } from './geometry.mjs';
import { normalizeStage1Settings } from './stage1-settings.mjs';
const tag=(prefix,i)=>prefix+String(i+1).padStart(4,'0');

export function createStage1Cohort(input) {
  const s=normalizeStage1Settings(input),random=randomStream(s.seed,'anatomy'),candidates=[];
  const radius=s.fascicleRadiusUm-s.somaDiameterUm/2-s.wellWallUm-10,dy=s.wellPitchUm*Math.sqrt(3)/2,n=Math.ceil(radius/dy);
  for(let row=-n;row<=n;row++)for(let col=-n*2;col<=n*2;col++){
    const x=(col+(Math.abs(row)%2)*.5)*s.wellPitchUm+(random()-.5)*s.positionJitter*s.wellPitchUm;
    const y=row*dy+(random()-.5)*s.positionJitter*s.wellPitchUm;
    if(Math.hypot(x,y)<radius)candidates.push({x,y,order:random()});
  }
  if(candidates.length<s.axonCount)throw new Error(`Only ${candidates.length} center positions fit this fixed cross-section; requested ${s.axonCount}. Change radius, pitch or census explicitly.`);
  candidates.sort((a,b)=>a.order-b.order);
  const cells=candidates.slice(0,s.axonCount).map((p,i)=>({id:tag('E',i),index:i,slotId:tag('S',i),xUm:p.x,yUm:p.y,zUm:0,
    fiberDiameterUm:Math.max(s.peripheralFiberDiameterUm,s.centralFiberDiameterUm),peripheralFiberDiameterUm:s.peripheralFiberDiameterUm,centralFiberDiameterUm:s.centralFiberDiameterUm,somaDiameterUm:s.somaDiameterUm,
    peripheralStemLengthUm:s.peripheralStemLengthUm,peripheralStemDiameterUm:s.peripheralStemDiameterUm,centralStemLengthUm:s.centralStemLengthUm,centralStemDiameterUm:s.centralStemDiameterUm,
    class:'hypothetical bipolar projecting neuron',fascicle:1,origin:'introduced-engineered-identity',originalHostIdentity:null,topology:'own peripheral and central projections; fixed assumed geometry'}));
  for(let i=0;i<cells.length;i++)for(let j=0;j<i;j++)if(Math.hypot(cells[i].xUm-cells[j].xUm,cells[i].yUm-cells[j].yUm)<s.somaDiameterUm)throw new Error(`Somas ${cells[i].id} and ${cells[j].id} overlap; no placement was repaired.`);
  const wells=cells.map((cell,index)=>({id:`W${index+1}`,index,cellId:cell.id,cellIndex:cell.index,center:[cell.xUm,cell.yUm,0],
    innerRadiusUm:s.wellInnerRadiusUm,halfLengthUm:s.wellHalfLengthUm,wallThicknessUm:s.wellWallUm,apertureRadiusUm:s.wellApertureRadiusUm,
    contactHalfWidthUm:s.wellContactHalfWidthUm,contactHalfHeightUm:s.wellContactHalfHeightUm,contactSeparationUm:s.wellContactSeparationUm}));
  for(let k=0;k<wells.length;k++){
    const w=wells[k],outer=w.innerRadiusUm+w.wallThicknessUm;
    if(Math.hypot(w.center[0],w.center[1])+outer>=s.fascicleRadiusUm)throw new Error(`${w.id} intersects the fascicle boundary.`);
    for(let j=0;j<k;j++)if(Math.hypot(w.center[0]-wells[j].center[0],w.center[1]-wells[j].center[1])<=outer+wells[j].innerRadiusUm+wells[j].wallThicknessUm)throw new Error(`${w.id} and ${wells[j].id} have intersecting walls.`);
    for(const cell of cells)if(cell.index!==w.cellIndex&&Math.hypot(cell.xUm-w.center[0],cell.yUm-w.center[1])<=outer+s.somaDiameterUm/2)throw new Error(`${w.id} intersects the soma envelope of ${cell.id}.`);
  }
  const channels=wells.slice(0,s.channelCount).map((well,index)=>({id:`C${index+1}`,index,wellId:well.id,targetCellId:well.cellId,
    source:[well.center[0]+well.innerRadiusUm,well.center[1],-well.contactSeparationUm/2],return:[well.center[0]+well.innerRadiusUm,well.center[1],well.contactSeparationUm/2],
    sourceContactId:`${well.id}:source`,returnContactId:`${well.id}:return`,contactMeaning:'Proposed finite rectangular inner-sidewall patches; actual contact topology and area are returned by the field mesh.'}));
  return {cells,wells,channels,census:s.axonCount,censusMeaning:'Declared synthetic original census H and distinct equal-size engineered census E; each is an explicit fixed-topology scenario.',capacity:candidates.length,
    capacityMeaning:'Candidate center positions only. Every stated cell has one explicit physical well; only the selected channel pairs are driven.',physicalWellCount:wells.length,addressedWellCount:channels.length,fascicleRadiusUm:s.fascicleRadiusUm,
    perineuriumOuterUm:s.fascicleRadiusUm*(1+2*s.perineuriumThicknessFraction),wellPitchUm:s.wellPitchUm,coordinateUnits:'µm',displayEnlargement:1,seed:s.seed,
    streams:['anatomy','growth (not run)','fabrication (not run)'],evidence:'hypothetical'};
}

export function createIdentityLedger(input,cohort=createStage1Cohort(input)) {
  const s=normalizeStage1Settings(input);
  if(cohort.cells.length!==s.axonCount||cohort.seed!==s.seed)throw new Error('Identity ledger requires the exact declared seed and census.');
  const original=cohort.cells.map((cell,i)=>Object.freeze({id:tag('H',i),index:i,slotId:cell.slotId,xUm:cell.xUm,yUm:cell.yUm,
    preoperativeContinuity:'assumed intact context',postoperativeContinuity:false,continuityCause:'complete declared ganglion resection',
    peripheralRemnantId:`${tag('H',i)}:peripheral`,centralRemnantId:`${tag('H',i)}:central`,evidence:'hypothetical'}));
  const engineered=cohort.cells.map((cell,i)=>Object.freeze({id:cell.id,index:i,slotId:cell.slotId,originalHostIdentity:null,ownsBothProjections:true,
    projectionContinuity:'fixed assumed path to electrical observation planes',targetReinnervationValidated:false,survivalYield:null,evidence:'hypothetical'}));
  const nativeRemnants=original.flatMap(item=>['peripheral','central'].map(arm=>Object.freeze({id:item[arm+'RemnantId'],originalHostIdentity:item.id,slotId:item.slotId,arm,connectedAcrossResection:false,
    membraneState:'explicit instantaneous viable electrical proxy',survivalForecast:null,evidence:'hypothetical'})));
  return Object.freeze({originalCensus:s.axonCount,original:Object.freeze(original),engineered:Object.freeze(engineered),nativeRemnants:Object.freeze(nativeRemnants),
    mainTopology:'complete replacement with fixed engineered projections',noDeviceTopology:'same complete resection with disconnected native remnants and no implanted cells/walls/contacts',
    intactNativeContext:Object.freeze({continuousOriginalCount:s.axonCount,assumption:'Different assumed preoperative/intact anatomy; not the matched postoperative comparator.'}),
    seed:s.seed,denominatorMeaning:'The immutable declared original H census is retained in every postoperative condition; E identities never inherit H identity.',biologicalGrowthSolved:false});
}

export function applyB3IdentityMetrics(electrical,ledger,{auditValid=electrical.auditValid}={}) {
  if(!Number.isInteger(ledger?.originalCensus)||ledger.originalCensus<1||ledger.original.length!==ledger.originalCensus)throw new Error('A complete original identity ledger is required.');
  if(ledger.original.some(item=>item.postoperativeContinuity!==false)||ledger.engineered.some(item=>item.originalHostIdentity!==null))throw new Error('This metric requires explicit complete replacement and distinct engineered identities.');
  const valid=auditValid===true&&electrical.auditValid===true,N=ledger.originalCensus;
  return {...electrical,originalHostCensus:N,originalHostPreservedCount:0,originalHostUniqueCount:0,originalHostY:0,
    originalHostYBasis:'Structural zero: all H identities are disconnected by the declared complete-resection topology. This does not depend on the electrical audit passing and is not a postoperative forecast.',
    originalHostMeaning:'Fixed synthetic preoperative census; no introduced E output is counted as an original axon.',
    noDeviceOriginalPreservedCount:0,noDeviceOriginalY:0,
    engineeredCensus:ledger.engineered.length,engineeredOriginalCensusDenominator:N,
    engineeredConditionedExclusiveY:valid?electrical.engineeredExclusiveCount/N:null,
    engineeredConditionedCausalY:valid&&electrical.engineeredCausalExclusiveCount!==null?electrical.engineeredCausalExclusiveCount/N:null,
    engineeredYieldMeaning:'Electrical fraction over the retained original census, conditional on fixed assumed E projections. No growth, target-reinnervation or survival success is asserted.',
    biologicalTargetReinnervationYield:null,biologicalSurvivalYield:null};
}

export function assertDisconnectedNativeStumps(stumps) {
  const peripheral=stumps?.peripheral,central=stumps?.central;
  if(!peripheral?.compartments?.length||!central?.compartments?.length||peripheral===central)throw new Error('Two distinct native-stump morphologies are required.');
  const pmax=Math.max(...peripheral.compartments.map(c=>c.zUm+c.lengthUm/2)),cmin=Math.min(...central.compartments.map(c=>c.zUm-c.lengthUm/2));
  if(!Number.isFinite(pmax)||!Number.isFinite(cmin)||pmax>=cmin)throw new Error('Native stumps must be separated by an explicit positive resection gap.');
  return {peripheralMaximumZUm:pmax,centralMinimumZUm:cmin,gapUm:cmin-pmax,axialConnectionAcrossGap:false,criterion:'Two separate solver graphs with sealed boundaries and a physical gap; no axonal continuity is inferred from coincident timestamps.'};
}
