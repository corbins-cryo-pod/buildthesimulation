import defaultModel from './models/allen571654895.json' with { type: 'json' };
import { getModelMetadata } from './model-registry.js';

export const activeModelData = defaultModel;
const models = new Map([[defaultModel.id, defaultModel]]), pending = new Map();
export function getActiveModel(id = defaultModel.id) {
  if (!getModelMetadata(id)) throw new Error('Unknown published cell model.');
  const model = models.get(id);
  if (!model) throw new Error('Loading published cell morphology…');
  return model;
}
export async function loadActiveModel(id, length = 40, readAsset) {
  const metadata = getModelMetadata(id);
  if (!metadata) throw new Error('Unknown published cell model.');
  if (![10,20,40,80].includes(length)) throw new Error('Unsupported cell discretization.');
  if (models.get(id)?.variants[String(length)]) return models.get(id);
  const key = `${id}:${length}`;
  if (!pending.has(key)) pending.set(key, (async () => {
    const path = `/models/cortex/library/allen${metadata.specimenId}-${length}.json.gz`;
    let bytes;
    if (readAsset) bytes = await readAsset(path);
    else {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Could not load specimen ${metadata.specimenId} (${response.status}).`);
      bytes = await response.arrayBuffer();
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const model = JSON.parse(await new Response(stream).text());
    if (model.id !== id || model.specimenId !== metadata.specimenId || !model.variants[String(length)])
      throw new Error('Cell asset identity does not match the selected specimen.');
    const combined = {...model, variants: {...models.get(id)?.variants, ...model.variants}};
    models.set(id, combined);
    return combined;
  })().finally(() => pending.delete(key)));
  return pending.get(key);
}
export const loadActiveModels = (ids, length=40, readAsset) => Promise.all(
  [...new Set(ids)].map(id => loadActiveModel(id,length,readAsset)));
