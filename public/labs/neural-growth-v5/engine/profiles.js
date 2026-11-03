// All rates are exploratory reductions. These profiles are not fitted cultures.
export const PROFILES = [
  {id:'first',name:'First cell',subtitle:'Plating → exploration → polarity',hours:24,config:{mode:'culture',source:'precursor',cellCount:1}},
  {id:'arm',name:'Soma & one process',subtitle:'Traction, stretching and material addition',hours:12,config:{mode:'culture',source:'immature',cellCount:1,maxTipsPerCell:1,branching:0}},
  {id:'cone',name:'Growth cone close-up',subtitle:'Local activation and independent filopodia',hours:16,config:{mode:'culture',source:'immature',cellCount:1,maxTipsPerCell:3,branching:0}},
  {id:'branch',name:'Branch formation',subtitle:'Transient buds and retained collaterals',hours:36,config:{mode:'culture',source:'immature',cellCount:1,branching:1.8}},
  {id:'pair',name:'Two-cell encounter',subtitle:'Physical contact is not a synapse',hours:24,config:{mode:'culture',source:'immature',cellCount:2,density:3}},
  {id:'culture',name:'Developing culture',subtitle:'Six cells, one shared environment',hours:24,config:{mode:'culture',source:'immature',cellCount:6,density:2}},
  {id:'pattern',name:'Patterned substrate',subtitle:'Adhesive lanes and finite obstacles',hours:24,config:{mode:'pattern',source:'immature',cellCount:3,guidance:.65}},
  {id:'gel',name:'Growth in a gel',subtitle:'3-D confinement · uncalibrated CNS-like profile',hours:24,config:{mode:'gel',source:'immature',cellCount:3,adhesion:.2,guidance:.3}},
  {id:'repair',name:'Injury & repair',subtitle:'300 µm microbridge · exploratory, not a clinical gap',hours:48,config:{mode:'repair',source:'immature',cellCount:2,guidance:1,branching:.6}},
  {id:'interface',name:'Neural interface culture',subtitle:'Cells, channels and inert electrode surfaces',hours:24,config:{mode:'interface',source:'immature',cellCount:4,guidance:.7}}
];
export const PREPARATION = 'Early neuronal development; rat hippocampal culture motivates the surface profile. Parameters remain exploratory, not preparation-fitted.';
export const DEFAULTS = {profile:'first',seed:714,excitation:'excitable',cargoRate:24,transportSpeed:120,fieldDiffusion:1800,fieldDecay:.2,fieldSource:1,fieldStepHours:.05,fieldGrid:20,glialSupport:1};
