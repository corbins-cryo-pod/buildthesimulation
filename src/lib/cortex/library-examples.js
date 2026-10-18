import { freshActiveConfig } from './config.js';
import { getModelMetadata } from './model-registry.js';
// Exact configurations used in the per-specimen native numerical comparisons.
export function cellLibraryExample(id, mode = 'intracellular-current') {
  const model=getModelMetadata(id);
  if(!model) throw new Error('Unknown published cell.');
  const c=freshActiveConfig();c.neuron.modelId=id;c.membrane.sourceModelId=id;
  c.implant.translationUm=[1500,1500,-1000];
  c.protocol.mode=mode;c.protocol.startMs=5;c.protocol.durationMs=20;
  c.protocol.injectionNa=model.class==='excitatory'?1:.2;
  c.protocol.amplitudeUa=1;c.protocol.phaseUs=1000;
  return c;
}
