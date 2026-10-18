import { useState } from 'preact/hooks';
import { modelRegistry, eligibleModels, getModelMetadata } from '../lib/cortex/model-registry.js';

export default function CortexCellLibrary({ selectedId, onSelect, onPatch, disabled }) {
  const [filters,setFilters]=useState({cellClass:'all',dataset:'all',layer:'all',atlasOnly:false});
  const entries=eligibleModels(filters), selected=getModelMetadata(selectedId);
  const change=(key,value)=>setFilters(f=>({...f,[key]:value}));
  return <section class="cx-cell-library" aria-label="Published neuron library">
    <span class="cx-eyebrow">Published cells · no repeated specimens</span>
    <h2>Choose a neuron</h2><p><a href="/cells/">Browse the Cell Model Atlas →</a></p>
    <p>{modelRegistry.length} distinct human specimens. Each keeps its own reconstructed dendrites, published fitted membrane parameters and source-prescribed axon stub. Cortical region, layer and cell class remain source identities regardless of placement.</p>
    <fieldset disabled={disabled} class="cx-library-filters">
      <label>Cell type<select value={filters.cellClass} onChange={e=>change('cellClass',e.currentTarget.value)}><option value="all">All cell types</option><option value="excitatory">Pyramidal / spiny excitatory</option><option value="inhibitory">Aspiny inhibitory interneurons</option></select></label>
      <label>Dataset<select value={filters.dataset} onChange={e=>change('dataset',e.currentTarget.value)}><option value="all">All published datasets</option>{[...new Map(modelRegistry.map(m=>[m.dataset,m.datasetLabel]))].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label>Source layer<select value={filters.layer} onChange={e=>change('layer',e.currentTarget.value)}><option value="all">All source layers</option><option value="L2">Layer 2</option><option value="L3">Layer 3</option></select></label>
      <label><input type="checkbox" checked={filters.atlasOnly} onChange={e=>change('atlasOnly',e.currentTarget.checked)} /> Also in Finger Atlas</label>
      <label>Target specimen<select value={entries.some(m=>m.id===selectedId)?selectedId:''} onChange={e=>e.currentTarget.value && onSelect(e.currentTarget.value)}><option value="" disabled>Choose one of {entries.length} matching specimens</option>{entries.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
      <button type="button" onClick={()=>onPatch(selectedId)}>Load selected cell’s 20 ms patch-clamp example</button>
    </fieldset>
    <p><strong>Selected: {selected.label}.</strong> {selected.cellType} · {selected.region} · {selected.datasetLabel}. {selected.atlas && <a href="/simulations/finger-pathway-atlas/v4/">Also preserved in the Finger Atlas.</a>} <a href={selected.source} target="_blank" rel="noreferrer">Published source</a></p>
    <p class="cx-muted">{selected.scope}</p>
    <details><summary>Finger Atlas specimens and morphology-only references</summary>
      <p>The atlas’s Allen specimen 508378649 is included here with its own matching published active fit. Nine other measured Allen reconstructions and twelve H01 neurite references remain available for anatomical inspection in the atlas; they have no matched electrical model in this library. Their firing response is unknown here. The atlas’s procedural DRG, spinal, thalamic and receptor illustrations are not counted as measured specimens.</p>
      <p><a href="/simulations/finger-pathway-atlas/v4/">Inspect Finger Atlas anatomy</a> · <a href="/assets/finger-pathway-atlas/v4/provenance.json">Atlas provenance</a> · <a href="/assets/finger-pathway-atlas/v4/h01/reference-neurites.json">Measured H01 reference pack</a></p>
    </details>
  </section>;
}
