export const ACTIVE_MODEL_ID = 'allen-human-571654895/1';
export const PASSIVE_MODEL_ID = 'canonical-passive-arbor/1';
export const modelRegistry = [
  {
    id: PASSIVE_MODEL_ID,
    label: 'Synthetic passive arbor',
    species: 'Synthetic',
    cellType: 'Passive tree',
    source: '/cortex/methods/',
    scope:
      'Analytical and fixed NEURON/LFPykit checks; no active channels or experimental validation.',
  },
  {
    id: ACTIVE_MODEL_ID,
    label: 'Human temporal L2 spiny cell · 571654895',
    species: 'Homo sapiens',
    cellType: 'Layer 2 spiny/excitatory',
    source: 'https://github.com/AllenInstitute/Human_all_active_models_EAP',
    scope:
      'Human reconstructed dendrites and fitted densities; published 60 µm axon stub; mixed-species channel kinetics. Numerical reference comparisons, not independent biological validation.',
    license:
      'Allen Institute Software License: BSD-2-derived with noncommercial redistribution restriction',
    citation: 'Mosher, Wei et al. (2020), Cell Reports, doi:10.1016/j.celrep.2020.02.027',
    region: 'Middle temporal gyrus, layer 2; surgical tissue',
    temperatureC: 34,
  },
];
