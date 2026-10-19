import {useEffect,useRef,useState} from 'preact/hooks';
export default function CortexFiniteLaboratory(){
  const host=useRef(null),[error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false,dispose;
    import('../lib/cortex/finite-ui.js').then(({mountFiniteLaboratory})=>{
      if(!cancelled)dispose=mountFiniteLaboratory(host.current);
    }).catch(e=>{if(!cancelled)setError(e.message);});
    return()=>{cancelled=true;dispose?.();};
  },[]);
  return <section ref={host} class="cx-finite" aria-label="Finite disk laboratory">
    <h1>Cortex Laboratory · Finite disk</h1>
    <p>A 50 µm diameter equipotential disk drives a reconstructed human neuron. Inspect membrane voltage and ionic currents compartment by compartment, alongside the applied extracellular potential.</p>
    <p>Conductivity: 0.3 S/m. Insulating plane outside the contact. Distant grounded return. This mode uses the verified disk potential; arbitrary shapes, implant shanks and population steering are not integrated.</p>
    {error&&<p role="alert">{error}</p>}
    <div class="cx-finite-settings">
      <label>Human cell<select id="disk-cell" /></label>
      <label>Compartment length (µm)<select id="disk-mesh" defaultValue="40">{[10,20,40,80].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Current amplitude (µA)<input id="disk-current" type="number" defaultValue="1" min="0" max="100" step="0.1" /></label>
      <label>Cell height offset (µm)<input id="disk-offset" type="number" defaultValue="0" min="-200" max="200" step="5" /></label>
      <label>Timestep (ms)<select id="disk-dt" defaultValue="0.005">{['0.00125','0.0025','0.005','0.01'].map(v=><option key={v}>{v}</option>)}</select></label>
    </div>
    <p>One cathodic-first biphasic pulse at 5 ms: 200 µs per phase, 100 µs gap. Each full reconstruction is centered without scaling or trimming. Its membrane must fit within r ≤ 250 µm and z ≤ 250 µm and remain at least 25 µm above the contact plane.</p>
    <div class="cx-finite-actions"><button id="disk-run" disabled>Run human cell</button><button id="disk-cancel">Stop</button><button id="disk-export" disabled>Export result</button></div>
    <p id="disk-status" role="status" aria-live="polite">Loading finite-contact workspace…</p>
    <details class="cx-evidence" open><summary>Scientific evidence for this configuration</summary><p id="disk-evidence">Loading scoped evidence…</p><a href="/cortex/validation/">Validation results and limitations</a></details>
    <div id="disk-scene" aria-label="Finite disk and human neuron in three dimensions" />
    <p>Drag to orbit; scroll to zoom; click a branch to inspect it. Neuron: blue −100 mV → orange +40 mV. Gold: whole neuron excluded. Tissue slices: blue negative / orange positive applied potential, saturating at ±10 mV. Cylinder: field coverage. Disk: conducting contact.</p>
    <div class="cx-finite-actions"><button id="disk-play" disabled>Play</button><input id="disk-frame" aria-label="Replay frame" type="range" min="0" max="0" defaultValue="0" disabled /></div>
    <p id="disk-readout">Run the cell to inspect membrane voltage and ionic currents.</p>
    <label>Inspect compartment <select id="disk-compartment" /></label>
    <canvas id="disk-trace" width="800" height="180" aria-label="Selected compartment membrane voltage over time" />
    <p>Recording traces and electric-field magnitude are unavailable in this mode. Local threshold crossings, somatic waveform evidence, and propagation are distinct; neural spatial/timestep convergence and firing thresholds remain unresolved.</p>
    <p><a href="/cortex/finite-contact/">Field validation and benchmark</a> · <a href="/cortex/fields/">Explore other geometries and sizes</a></p>
  </section>;
}
