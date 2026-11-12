import { FIELD_LIMITS } from './field.mjs';
/** Electrical-core input contract. Recovered from retained source, with a new release identifier.
 * This is not the original final source hash; see docs/axon-interface/RECOVERED_AUDIT.md.
 * Nothing here is a device operating recommendation. */
export const MODEL_VERSION = 'axon-interface-0.1.0-recovery.1';
export const EXPORT_SCHEMA = 'buildthesimulation.axon-interface.v1';
export const EVIDENCE_CLASSES = Object.freeze(['experimental','mathematical','estimated','hypothetical']);
export const PARAMETER_REGISTER = Object.freeze([
  ['seed',2048,'integer',1,4294967295,'estimated','Independent, named deterministic streams; simulator choice.'],
  ['axonCount',128,'cells',4,256,'estimated','Explicit synthetic census; no extrapolation to a human nerve.'],
  ['channelCount',2,'channels',1,4,'estimated','Each channel is solved independently with its own source and matched return.'],
  ['fiberDiameterUm',10,'µm',5.7,16,'mathematical','Tabulated McIntyre–Richardson–Grill fiber geometry; MRG2002.'],
  ['nodeCount',11,'nodes',11,21,'estimated','Odd node count; at least three distal observation nodes beyond the locally silenced region. Sealed ends; no target innervation.'],
  ['passiveSegments',3,'subsegments/passive section',1,5,'estimated','Declared spatial resolution. Values 1, 3, or 5 only; the coarse 1-to-3 comparison failed and remains in the report. The pre-reset 3-to-5 comparison passed; recovered code requires its own current report.'],
  ['somaDiameterUm',0,'µm',0,40,'hypothetical','Synthetic central unmyelinated soma; not a fitted spiral-ganglion cell. Zero selects the original straight-cable benchmark.'],
  ['somaActiveScale',0,'relative nodal conductance',0,1,'hypothetical','Zero selects a passive hypothetical soma. Full MRG nodal density in an enlarged soma failed the zero-input test; that failure is retained. This control never rescales the axon nodes.'],
  ['fascicleRadiusUm',250,'µm',150,500,'estimated','Synthetic single cylindrical fascicle, not patient or species anatomy.'],
  ['wellPitchUm',35,'µm',20,150,'estimated','Hexagonal placement pitch; display wells do not impose unmodeled electrical insulation.'],
  ['wellWallUm',5,'µm',0,20,'estimated','Geometric clearance only. This electrical core does not resolve individual well walls.'],
  ['positionJitter',0.08,'fraction of pitch',0,0.15,'estimated','Bounded jitter in a named geometry random stream.'],
  ['perineuriumResistivityOhmM',1149,'Ω m',400,4000,'estimated','Temperature-adjusted DC value reported by Pelot et al.; not a human 37 °C measurement.'],
  ['perineuriumThicknessFraction',0.03,'fraction of fascicle diameter',0.01,0.06,'estimated','Literature-derived modeling rule in Pelot et al.; not universal anatomy.'],
  ['endoneuriumLongitudinalSPerM',0.571,'S/m',0.1,1.5,'estimated','Rounded reciprocal of 1.75 Ω m; literature-informed effective value matched exactly to the field verification fixture.'],
  ['endoneuriumTransverseSPerM',0.083,'S/m',0.03,0.3,'estimated','Rounded reciprocal of 12 Ω m; literature-informed effective value matched exactly to the field verification fixture.'],
  ['epineuriumSPerM',0.083,'S/m',0.01,0.4,'estimated','Explicit effective-conductor choice matched to the field verification fixture; not a measured human epineurial conductivity.'],
  ['surroundingSPerM',0.3,'S/m',0.01,0.6,'estimated','Explicit surrounding-conductor choice; sensitivity is not a fit.'],
  ['electrodeRadiusUm',75,'µm',20,100,'estimated','Finite volumetric source radius in the conductor. Metal polarization and electrode surfaces are not solved.'],
  ['sourceOffsetUm',105,'µm',30,250,'estimated','Source radial offset from fascicle boundary; membrane clearance is checked against the full source support.'],
  ['returnSeparationUm',600,'µm',300,2000,'estimated','Longitudinal spacing of a source–return pair.'],
  ['amplitudeUa',10,'µA',0,1000,'estimated','Signed waveform has cathodic first phase; exploratory calculation, not recommended stimulation.'],
  ['phaseWidthMs',0.1,'ms',0.025,1,'estimated','Rectangular biphasic waveform; finite-step exact phase overlap.'],
  ['phaseGapMs',0.025,'ms',0,0.5,'estimated','Interphase interval.'],
  ['stimulusStartMs',0.5,'ms',0.1,2,'estimated','Stimulus starts after the saved measured-window baseline.'],
  ['durationMs',4,'ms',2,10,'estimated','Electrical observation window, separate from biological days.'],
  ['dtMs',0.00125,'ms',0.000625,0.01,'estimated','Fixed time step. The pre-reset default 1.25 µs had a finer-step reference check; recovered-code status is in the current numerical report; coarser selectable steps are not certified by that comparison.'],
  ['sampleDtMs',0.025,'ms',0.0025,0.1,'estimated','Saved trace spacing; the solver uses dtMs regardless of display.'],
  ['temperatureC',37,'°C',37,37,'mathematical','MRG temperature-dependent channel kinetics evaluated at 37 °C.'],
  ['seedingLambda',1,'cells/well',0,4,'estimated','Analytic Poisson occupancy diagnostic only, not multiplied into simulated recruitment.'],
  ['contactAreaUm2',Math.PI*50*50,'µm²',100,100000,'estimated','Declared geometric area for charge-density arithmetic, distinct from the volumetric field-source model.'],
].map(([key,defaultValue,units,min,max,evidence,provenance])=>Object.freeze({key,default:defaultValue,units,min,max,evidence,provenance})));
export const DEFAULT_SETTINGS = Object.freeze(Object.fromEntries(PARAMETER_REGISTER.map(p=>[p.key,p.default])));
export const BUDGET = Object.freeze({maxCableSolves:4096,maxCompartmentSteps:1.2e9,maxSavedValues:5e6,maxEventsPerNodePerSolve:8,maxFieldNodes:FIELD_LIMITS.maxNodes,maxFieldTetrahedra:FIELD_LIMITS.maxTetrahedra});
const integerKeys = new Set(['seed','axonCount','channelCount','nodeCount','passiveSegments']);
export function normalizeSettings(input={}) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Settings must be an object.');
  for (const k of Object.keys(input)) if (!Object.hasOwn(DEFAULT_SETTINGS,k)) throw new Error(`Unknown parameter: ${k}.`);
  const s={...DEFAULT_SETTINGS,...input};
  for (const p of PARAMETER_REGISTER) {
    const v=s[p.key];
    if(typeof v!=='number'||!Number.isFinite(v)||v<p.min||v>p.max||(integerKeys.has(p.key)&&!Number.isInteger(v)))
      throw new Error(`${p.key} must be ${integerKeys.has(p.key)?'an integer':'a finite number'} between ${p.min} and ${p.max} ${p.units}.`);
  }
  if(![5.7,7.3,8.7,10,11.5,12.8,14,15,16].includes(s.fiberDiameterUm)) throw new Error('Select a published MRG tabulated diameter; interpolation is not silently applied.');
  if(s.nodeCount%2!==1) throw new Error('The symmetric cable benchmark needs an odd node count.');
  if(![1,3,5].includes(s.passiveSegments)) throw new Error('Passive spatial resolution must be 1, 3, or 5 explicitly selected subsegments.');
  if(s.somaDiameterUm!==0&&s.somaDiameterUm<s.fiberDiameterUm) throw new Error('Synthetic soma diameter must be at least the fiber diameter, or exactly zero for the straight-cable benchmark.');
  if(s.wellPitchUm<Math.max(s.somaDiameterUm,s.fiberDiameterUm)+2*s.wellWallUm) throw new Error('The soma and two geometric walls do not fit the specified well pitch.');
  if(s.stimulusStartMs+2*s.phaseWidthMs+s.phaseGapMs>=s.durationMs) throw new Error('Both phases must fit inside the electrical observation window.');
  for(const [n,d,label] of [[s.sampleDtMs,s.dtMs,'Sample interval'],[s.durationMs,s.dtMs,'Duration']]) if(Math.abs(n/d-Math.round(n/d))>1e-7) throw new Error(`${label} must be an integer multiple of the solver time step.`);
  return Object.freeze(s);
}
export function inputSignature(settings){return JSON.stringify(normalizeSettings(settings));}
export function validateBudget(s,compartments){
  s=normalizeSettings(s);
  if(!Number.isInteger(compartments)||compartments<1) throw new Error('Compartment count must be a positive integer.');
  const solves=3*s.axonCount*s.channelCount+3;
  const observationSteps=Math.round(s.durationMs/s.dtMs),stride=Math.round(s.sampleDtMs/s.dtMs);
  const samples=Math.floor(observationSteps/stride)+1+(observationSteps%stride?1:0);
  const preparationSteps=Math.round(20/s.dtMs)*compartments;
  const steps=solves*observationSteps*compartments+preparationSteps;
  // Every pair retains an all-node assigned trace and two four-node controls,
  // each with its own time vector. Three shared zero-drive references are kept.
  const pairCount=s.axonCount*s.channelCount;
  const retainedTraceValues=(pairCount+1)*samples*(s.nodeCount+11);
  const transferValues=pairCount*compartments;
  const recordingValues=s.channelCount*samples*8;
  const eventRecords=solves*s.nodeCount*BUDGET.maxEventsPerNodePerSolve;
  // Events occur both in pair traces (four numeric fields) and the event table
  // (three fields). Eight is a conservative serialization allowance.
  const eventValues=eventRecords*8;
  const metadataValues=96*(pairCount+s.axonCount+compartments)+2048;
  const retainedValues=retainedTraceValues+transferValues+recordingValues+eventValues+metadataValues;
  // The two full-current matrices for one assigned cable are reduced into a
  // recording, then discarded; their peak allocation is still budgeted.
  const transientValues=2*samples*compartments+s.axonCount*compartments;
  const saved=retainedValues+transientValues;
  if(solves>BUDGET.maxCableSolves||steps>BUDGET.maxCompartmentSteps||saved>BUDGET.maxSavedValues) throw new Error(`Request exceeds the declared work budget (${solves} cable solves; ${steps.toLocaleString('en-US')} compartment steps; ${saved.toLocaleString('en-US')} saved/temporary values). Reduce the explicit census or channels, or shorten the observation window. No resolution was changed.`);
  return {cableSolves:solves,compartmentSteps:steps,preparationCompartmentSteps:preparationSteps,savedValues:saved,retainedValues,peakTransientValues:transientValues,samplesPerTrace:samples,maxEventRecords:eventRecords,eventLimitMeaning:'At most eight upward crossings per node per solve; excess is rejected, never truncated.',caps:BUDGET};
}
export const LIMITATIONS = Object.freeze([
 'Synthetic single-fascicle cohort. Resolved cells are not extrapolated to a full human nerve census.',
 'MRG parameters describe a mammalian motor-fiber benchmark. The optional central soma and its nodal channel assignment are hypothetical, not measured human spiral-ganglion morphology or fitted kinetics.',
 'A complete ganglion-replacement hypothesis removes the original neuronal identities. Engineered output selectivity cannot be counted as original-host axon preservation or original-host addressability.',
 'No organoid-to-host excitatory synapse or ganglion-replacement topology is instantiated in this cable benchmark. Junction block is not applicable, not a passing causal test.',
 'Ohmic, anisotropic volume conduction with an explicit perineurial layer; frequency-dependent sheath impedance, electrode polarization, noise and ephaptic feedback are omitted.',
 'Finite distributed electrical sources are a regularized field model; individual insulating microwell walls and metal boundary conditions are not resolved.',
 'No growth-to-target mapping, cell fate, immune survival, oxygen supply, chronic response, fabrication or routing yield is calculated by this electrical core.',
 'Zero-input and silencing runs retain the specified initial state. Zeroing active conductances can itself change passive resting balance; this is part of the recorded intervention.',
 'Source decomposition partitions known simulated currents. It is not spike sorting or an inverse reconstruction.',
 'Numerical agreement verifies the stated implementation. It does not establish integration, reinnervation, sensation, clinical efficacy or device safety.',
]);
