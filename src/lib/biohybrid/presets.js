export const PRESETS = [
  {id:'functional',number:'01',title:'Functional living electrode',description:'Follow electrical stimulation through the active graft cable, a conductance synapse, and the receiving host.',settings:{}},
  {id:'disconnected',number:'02',title:'Failed host–graft integration',description:'The engineered tract remains excitable; host–graft synaptic conductance is zero.',settings:{synapticWeightUs:0}},
  {id:'conduction',number:'03',title:'Axonal conduction',description:'A longer, thinner unmyelinated tract changes the calculated propagation delay.',settings:{axonLengthUm:1800,axonDiameterUm:1.2,durationMs:45}},
  {id:'positioning',number:'04',title:'Electrode positioning',description:'Recording contacts are farther from the same receiving cells; compare calculated neural signal amplitude.',settings:{recordDistanceUm:180}},
  {id:'connectivity',number:'05',title:'Synaptic connectivity',description:'Only one host cell receives synaptic inputs; test strength and the number of connected targets.',settings:{connectedHosts:1,synapticWeightUs:.012}},
  {id:'growth',number:'06',title:'Growth and integration',description:'Explore possible neurite paths on a separate day-scale, then explicitly choose candidate synapses for electrophysiology.',settings:{growthEnabled:true}},
  {id:'degradation',number:'07',title:'Interface degradation',description:'An assumed conductivity change, increased separation, and weakened synapses illustrate sensitivity without predicting chronic outcomes.',settings:{conductivitySPerM:.2,recordDistanceUm:160,stimDistanceUm:110,synapticWeightUs:.003}},
];
export function presetById(id){return PRESETS.find(p=>p.id===id)??PRESETS[0];}
