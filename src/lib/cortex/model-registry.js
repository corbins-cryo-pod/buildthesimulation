import epilepsyMetadata from './models/epilepsy-metadata.json' with { type: 'json' };
import metadata from './models/library-metadata.json' with { type: 'json' };
export const ACTIVE_MODEL_ID = 'allen-human-571654895/1';
const originalRegistry = [
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

export const modelRegistry = metadata.map(entry => ({
  ...originalRegistry[0], ...entry,
  label: entry.id === ACTIVE_MODEL_ID ? originalRegistry[0].label : `Human ${entry.layer} ${entry.class === 'excitatory' ? 'pyramidal / spiny' : 'interneuron / aspiny'} · ${entry.specimenId}`,
  dataset: 'human-eap', datasetLabel: 'Allen human EAP · Mosher 2020',
  cellType: entry.class === 'excitatory' ? 'Pyramidal / spiny excitatory' : 'Aspiny inhibitory interneuron',
  region: `Human neocortex, ${entry.layer}; surgical tissue`,
  atlas: entry.specimenId === 508378649,
  scope: 'Measured human dendrites and published fitted channels; source-prescribed synthetic 60 µm axon stub. Numerical comparisons do not establish biological or spatial-selectivity validation.',
})).sort((a,b) => (b.id === ACTIVE_MODEL_ID) - (a.id === ACTIVE_MODEL_ID));
modelRegistry.push(...epilepsyMetadata.map(entry=>({
  ...originalRegistry[0], ...entry,
  label:`Human L3 basket interneuron · ${entry.specimenId}`,
  dataset:'human-epilepsy',datasetLabel:'Human epilepsy circuitry · 2023',
  cellType:'Aspiny inhibitory basket interneuron',region:'Middle temporal gyrus, layer 3; surgical epilepsy tissue',
  source:'https://github.com/anastassiou-team/human-epilepsy-project',
  citation:'Multi-modal characterization and simulation of human epileptic circuitry (2023), PMC9841067',
  scope:'Published basket-cell fit paired with the current Allen reconstruction of the same specimen; the original historical morphology revision is unavailable. Source-prescribed 60 µm axon stub with measured source diameters; numerical adaptation, not a claim of exact reproduction of the historical model.',
  atlas:false,
})));
export const getModelMetadata = id => modelRegistry.find(model => model.id === id);
export function eligibleModels({ cellClass = 'all', dataset = 'all', layer = 'all', atlasOnly = false } = {}) {
  return modelRegistry.filter(m => (cellClass === 'all' || m.class === cellClass) &&
    (dataset === 'all' || m.dataset === dataset) && (layer === 'all' || m.layer === layer) && (!atlasOnly || m.atlas));
}
