import { PARAMETER_REGISTER as CORE_PARAMETERS, BUDGET as CORE_BUDGET } from './settings.mjs';

export const STAGE1_MODEL_VERSION = 'axon-interface-stage1-b3/0.1.0-dev.1';
export const STAGE1_EXPORT_SCHEMA = 'buildthesimulation.axon-interface.stage1.v1';
export const STAGE1_MODE = 'b3-fixed-topology';
const commonKeys = new Set(['seed','axonCount','channelCount','fascicleRadiusUm','wellPitchUm','wellWallUm','positionJitter',
  'perineuriumResistivityOhmM','perineuriumThicknessFraction','endoneuriumLongitudinalSPerM','endoneuriumTransverseSPerM',
  'epineuriumSPerM','surroundingSPerM','amplitudeUa','phaseWidthMs','phaseGapMs','stimulusStartMs','durationMs','dtMs','sampleDtMs','temperatureC','seedingLambda']);
const common = CORE_PARAMETERS.filter(p => commonKeys.has(p.key)).map(p => ({...p,
  ...(p.key==='amplitudeUa'?{default:.1,provenance:'Explicit initial operating point for finite small surface contacts; not a safety recommendation or optimized selectivity.'}:{}),
  ...(p.key==='wellWallUm'?{default:2.5,min:.5,provenance:'Physical insulating well wall thickness; explicitly meshed in the Stage 1 field.'}:{}),
  ...(p.key==='positionJitter'?{default:.04,max:.08,provenance:'Bounded named anatomy jitter; every actual cell/well overlap is rejected.'}:{}),
  ...(p.key==='axonCount'?{provenance:'Declared synthetic original census and equal-size fixed engineered cohort. No extrapolation to a whole human nerve.'}:{}),
  ...(p.key==='channelCount'?{provenance:'Each addressed well has one isolated contact pair; every declared cell is solved for each pair.'}:{}),
  ...(p.key==='dtMs'?{default:.000625,min:.0003125,provenance:'Declared fixed time step. The bipolar 1.25 µs comparison failed its 1 mV maximum-site gate; finer comparisons retain the same tolerance.'}:{}),
  ...(p.key==='wellPitchUm'?{provenance:'Seeded center-placement pitch. Every declared cell has a physically instantiated insulating well.'}:{})
}));
const custom = [
  ['peripheralFiberDiameterUm',5.7,'µm',5.7,16,'mathematical','Published MRG outer-fiber geometry assigned to the peripheral arm; not measured engineered tissue.'],
  ['centralFiberDiameterUm',5.7,'µm',5.7,16,'mathematical','Published MRG outer-fiber geometry assigned to the central arm; not a fitted human SGN.'],
  ['armNodeCount',6,'true nodes / arm',6,12,'estimated','At least three distal monitors outside the local initiation region and away from the terminal node.'],
  ['passiveSegments',3,'subsegments / passive section',1,5,'estimated','Explicit myelinated-section spatial subdivision; new topology requires its own refinement.'],
  ['stemSegments',3,'segments / stem',1,5,'estimated','Explicit spatial subdivision of each unmyelinated stem; no silent geometry repair.'],
  ['somaDiameterUm',20,'µm',15,25,'hypothetical','Explicit spherical-band soma with lumped area-matched cable approximation, not a fitted SGN.'],
  ['somaActiveScale',.1,'relative MRG nodal density',0,1,'hypothetical','Declared active-density hypothesis on the soma; no change to myelinated nodal conductances.'],
  ['stemActiveScale',.1,'relative MRG nodal density',0,1,'hypothetical','Declared active-density hypothesis on the two unmyelinated stems.'],
  ['peripheralStemLengthUm',30,'µm',10,150,'hypothetical','Fixed peripheral presomatic stem length; growth is not calculated.'],
  ['peripheralStemDiameterUm',1.5,'µm',.5,6,'hypothetical','Unmyelinated peripheral stem diameter; exploratory geometry.'],
  ['centralStemLengthUm',50,'µm',10,150,'hypothetical','Fixed central postsomatic stem length; growth is not calculated.'],
  ['centralStemDiameterUm',2.5,'µm',.5,6,'hypothetical','Unmyelinated central stem diameter; exploratory geometry.'],
  ['equilibrationMs',50,'ms',20,100,'estimated','Declared pre-observation preparation; saved electrical window begins afterward.'],
  ['wellFluidSPerM',.3,'S/m',.01,1.5,'estimated','Ohmic medium in the well cavity; an effective exploratory choice, not measured engineered tissue.'],
  ['fieldAngularSegments',32,'sectors',16,64,'estimated','Outer conductor angular resolution; actual mesh also conforms to local well/contact boundaries.'],
  ['wellAngularSegments',12,'sectors',8,48,'estimated','Local well angular resolution before exact contact-edge angles are added.'],
  ['fieldRadialRefinement',1,'factor',1,3,'estimated','Explicit radial refinement request; excessive meshes are rejected.'],
  ['fieldAxialRefinement',1,'factor',1,4,'estimated','Explicit axial refinement request; no automatic reduction.'],
  ['localAxialStepUm',10,'µm',2.5,20,'estimated','Axial mesh step in the explicitly resolved well region; source boundaries are additionally conformed.'],
  ['resolvedCellExtensionUm',20,'µm',10,100,'estimated','Extent beyond each well before individually resolved cell surfaces transition to the effective bulk conductor.'],
  ['wellInnerRadiusUm',13,'µm',8,40,'hypothetical','Fluid-filled cavity radius; soma clearance is checked explicitly.'],
  ['wellHalfLengthUm',70,'µm',30,250,'hypothetical','Half length of the physical cavity around the soma and stem region.'],
  ['wellApertureRadiusUm',3.5,'µm',1,15,'hypothetical','Open end-cap aperture radius; must clear the actual neurite envelope.'],
  ['wellContactHalfWidthUm',3,'µm',.5,10,'hypothetical','Rectangular sidewall contact half-width; actual mesh-integrated area is authoritative.'],
  ['wellContactHalfHeightUm',3,'µm',.5,10,'hypothetical','Rectangular sidewall contact half-height, not a disk radius.'],
  ['wellContactSeparationUm',30,'µm',5,150,'hypothetical','Axial separation of finite source and return patches on the same side wall.']
].map(([key,defaultValue,units,min,max,evidence,provenance])=>({key,default:defaultValue,units,min,max,evidence,provenance}));
export const STAGE1_PARAMETER_REGISTER = Object.freeze([...common,...custom].map(Object.freeze));
export const STAGE1_ENUM_REGISTER = Object.freeze([
  {key:'mode',default:STAGE1_MODE,values:[STAGE1_MODE],evidence:'hypothetical',provenance:'Separate fixed-topology complete-replacement experiment.'},
  {key:'topologyAssumption',default:'complete-resection-fixed-engineered-projections',values:['complete-resection-fixed-engineered-projections'],evidence:'hypothetical',provenance:'Original identities are disconnected; E processes are assumed present to electrical observation planes. No biological target-innervation yield.'},
  {key:'nativeStumpAssumption',default:'viable-disconnected-no-device-proxy',values:['viable-disconnected-no-device-proxy'],evidence:'hypothetical',provenance:'Instantaneous excitable stump state in the no-device comparator; survival and degeneration are not predicted.'},
  {key:'includeElectrodeOnlyControl',default:false,values:[false,true],evidence:'estimated',provenance:'Explicit additional counterfactual. Never substituted for true no-device or silently omitted to fit a budget.'}
].map(p=>Object.freeze({...p,values:Object.freeze(p.values)})));
export const DEFAULT_STAGE1_SETTINGS = Object.freeze(Object.fromEntries([...STAGE1_PARAMETER_REGISTER,...STAGE1_ENUM_REGISTER].map(p=>[p.key,p.default])));
export const STAGE1_BUDGET = Object.freeze({maxCableSolves:CORE_BUDGET.maxCableSolves,maxCompartmentSteps:2.4e9,maxSavedValues:CORE_BUDGET.maxSavedValues,maxEventsPerNodePerSolve:CORE_BUDGET.maxEventsPerNodePerSolve});
const integerKeys = new Set(['seed','axonCount','channelCount','armNodeCount','passiveSegments','stemSegments','fieldAngularSegments','wellAngularSegments','fieldRadialRefinement','fieldAxialRefinement']);
const diameters = [5.7,7.3,8.7,10,11.5,12.8,14,15,16];

export function normalizeStage1Settings(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error('Stage 1 settings must be an object.');
  for(const key of Object.keys(input)) if(!Object.hasOwn(DEFAULT_STAGE1_SETTINGS,key)) throw new Error(`Unknown Stage 1 parameter: ${key}.`);
  const s={...DEFAULT_STAGE1_SETTINGS,...input};
  for(const p of STAGE1_PARAMETER_REGISTER){const value=s[p.key];if(typeof value!=='number'||!Number.isFinite(value)||value<p.min||value>p.max||(integerKeys.has(p.key)&&!Number.isInteger(value)))throw new Error(`${p.key} must be ${integerKeys.has(p.key)?'an integer':'a finite number'} between ${p.min} and ${p.max} ${p.units}.`);}
  for(const p of STAGE1_ENUM_REGISTER)if(!p.values.includes(s[p.key]))throw new Error(`Unsupported ${p.key}; select an explicit supported Stage 1 value.`);
  for(const key of ['peripheralFiberDiameterUm','centralFiberDiameterUm'])if(!diameters.includes(s[key]))throw new Error(`${key} must be a published MRG tabulated diameter.`);
  for(const key of ['passiveSegments','stemSegments'])if(![1,3,5].includes(s[key]))throw new Error(`${key} must be 1, 3, or 5.`);
  if(s.wellInnerRadiusUm<=s.somaDiameterUm/2)throw new Error('The soma does not fit inside the well cavity with positive fluid clearance.');
  if(s.wellApertureRadiusUm<=Math.max(s.peripheralFiberDiameterUm,s.centralFiberDiameterUm,s.peripheralStemDiameterUm,s.centralStemDiameterUm)/2)throw new Error('The aperture must have positive clearance around the exposed neurite envelope.');
  if(s.wellApertureRadiusUm>=s.wellInnerRadiusUm)throw new Error('The end-cap aperture must be smaller than the cavity radius.');
  if(s.wellHalfLengthUm<=s.somaDiameterUm/2+Math.max(s.peripheralStemLengthUm,s.centralStemLengthUm))throw new Error('The declared soma and both stems do not fit inside the well length.');
  if(s.wellContactSeparationUm<=2*s.wellContactHalfHeightUm)throw new Error('Source and return contact patches overlap.');
  if(s.wellContactSeparationUm/2+s.wellContactHalfHeightUm>=s.wellHalfLengthUm-s.wellWallUm)throw new Error('A contact patch reaches the insulating well end cap.');
  if(s.wellContactHalfWidthUm>=s.wellInnerRadiusUm)throw new Error('Contact half-width must be smaller than the cavity radius.');
  if(s.wellPitchUm<s.somaDiameterUm+2*s.wellWallUm)throw new Error('The soma and geometric wall allowances do not fit the specified pitch.');
  if(s.stimulusStartMs+2*s.phaseWidthMs+s.phaseGapMs>=s.durationMs)throw new Error('Both phases must fit inside the electrical observation window.');
  for(const [n,d,label] of [[s.sampleDtMs,s.dtMs,'Sample interval'],[s.durationMs,s.dtMs,'Duration'],[s.equilibrationMs,s.dtMs,'Equilibration']])if(Math.abs(n/d-Math.round(n/d))>1e-7)throw new Error(`${label} must be an integer multiple of the solver time step.`);
  return Object.freeze(s);
}

export function validateStage1Budget(input,morphology,stumps) {
  const s=normalizeStage1Settings(input),m= morphology,arms=[stumps?.peripheral,stumps?.central];
  if(!m?.compartments?.length||arms.some(a=>!a?.compartments?.length))throw new Error('Stage 1 budget requires explicit engineered and two disconnected stump morphologies.');
  const pairs=s.axonCount*s.channelCount,observationSteps=Math.round(s.durationMs/s.dtMs),stride=Math.round(s.sampleDtMs/s.dtMs);
  const samples=Math.floor(observationSteps/stride)+1+(observationSteps%stride?1:0),prepSteps=Math.round(s.equilibrationMs/s.dtMs);
  const c=m.compartments.length,nativeC=arms.reduce((sum,a)=>sum+a.compartments.length,0);
  const active=m.eventSiteCount??m.activeSiteIndices?.length??m.nodeIndices.length,nativeA=arms.reduce((sum,a)=>sum+(a.eventSiteCount??a.activeSiteIndices?.length??a.nodeIndices.length),0);
  const eSolves=3*pairs+3,nativeDriven=s.includeElectrodeOnlyControl?pairs:0,cableSolves=eSolves+2+2*nativeDriven;
  const preparationCompartmentSteps=prepSteps*(c+nativeC);
  const compartmentSteps=observationSteps*(eSolves*c+(1+nativeDriven)*nativeC)+preparationCompartmentSteps;
  const monitorCount=1+m.armMonitors.central.compartmentIndices.length+m.armMonitors.peripheral.compartmentIndices.length;
  const traceValues=(pairs+1)*samples*(active+2*monitorCount+3)+(nativeDriven+1)*samples*(nativeA+2);
  const transferValues=pairs*(c+(s.includeElectrodeOnlyControl?nativeC:0));
  const maxEventRecords=(eSolves*active+(1+nativeDriven)*nativeA)*STAGE1_BUDGET.maxEventsPerNodePerSolve;
  const recordingValues=s.channelCount*samples*(s.includeElectrodeOnlyControl?18:8);
  const metadataValues=128*(pairs+3*s.axonCount+c+nativeC)+8192;
  const retainedValues=traceValues+transferValues+8*maxEventRecords+recordingValues+metadataValues;
  const peakTransientValues=2*samples*Math.max(c,...arms.map(a=>a.compartments.length))+s.axonCount*(c+(s.includeElectrodeOnlyControl?nativeC:0));
  const savedValues=retainedValues+peakTransientValues;
  if(cableSolves>STAGE1_BUDGET.maxCableSolves||compartmentSteps>STAGE1_BUDGET.maxCompartmentSteps||savedValues>STAGE1_BUDGET.maxSavedValues)throw new Error(`Stage 1 request exceeds the declared work budget (${cableSolves} solves; ${compartmentSteps} compartment steps; ${savedValues} saved/temporary values). Change the explicit census, optional comparator or window; no resolution or condition was removed.`);
  return {cableSolves,engineeredSolves:eSolves,nativeStumpSolves:2+2*nativeDriven,compartmentSteps,preparationCompartmentSteps,retainedValues,peakTransientValues,savedValues,samplesPerTrace:samples,maxEventRecords,caps:STAGE1_BUDGET,scope:'Two exact zero-field stump reference trajectories are reused only because their dynamics are position-independent under zero imposed field. Every driven cell and requested intervention is resolved.'};
}

export const STAGE1_LIMITATIONS=Object.freeze([
  'Fixed hypothetical complete replacement: every E identity owns both modeled projections. No original host identity is inherited.',
  'Engineered projections are assumed present to electrical observation planes. Growth, correct target reinnervation and survival are not simulated.',
  'The bipolar soma/stem/axon parameterization is an explicit electrical hypothesis, not a calibrated human spiral-ganglion neuron.',
  'Complete resection disconnects every original neuron. Original-host Y=0 is a consequence of that topology, not a postoperative forecast.',
  'True no-device removes implanted cells, well walls and contacts, has no implant drive, and retains explicitly disconnected native-stump electrical proxies. An intact native context is a different anatomy.',
  'Native-stump viability in the comparator is imposed at the modeled electrical instant; degeneration and chronic survival are not predicted.',
  'Local active-conductance dependence plus early initiation location is conditional electrical evidence. Whole-cell silencing alone cannot establish soma mediation.',
  'Junction block is not applicable because B3 has no engineered-to-host junction. No numerical intervention or passing score is invented.',
  'Numerical acceptance is attached to declared sources, settings and fixtures. Biological calibration, device safety and clinical outcomes are not established.'
]);
