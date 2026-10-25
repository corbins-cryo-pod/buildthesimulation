# Review import contract

All JSON file imports are local; no remote code, assets or URLs are fetched. Maximum input file size is 1 MB. Invalid imports do not replace an accepted device. New calculations are required after setup changes; imported result arrays are never treated as new solver output.

## Experiment

`schema: "bts-opto-experiment/3"`, with `config` equal to `OptoAdvanced.getConfig()`, plus `modelId` and `sourceCommit`. Save experiment produces this format. Optional provenance identifiers must match when supplied. A small v3 full-result document may be used to recover its configuration; the 1 MB input cap still applies. Full-result exports can be much larger and are intended for external analysis, not necessarily re-import.

## Native optoelectrode

```json
{
  "schema": "bts-opto-device/1",
  "units": "um",
  "name": "Assumed two-color optoelectrode",
  "emitters": [{
    "id": "LED-1", "enabled": true,
    "positionUm": [-100, 0, 0], "normal": [1, 0, 0],
    "widthUm": 22, "heightUm": 22, "rotationDeg": 0,
    "powerMw": 0.02, "wavelengthNm": 470, "efficiency": 0.065
  }],
  "contacts": [{
    "id": "E1", "positionUm": [-100, 40, 0],
    "widthUm": 20, "heightUm": 20,
    "shape": "square", "rotationDeg": 0
  }],
  "metadata": {"assumption": "All emitter properties are explicit design hypotheses."}
}
```

Bounds: 0–16 emitters, 0–256 contacts; unique IDs; explicit micrometer units. Emitter width/height 2–500 µm; optical power 0–1 mW/site; wavelength 400–700 nm; wall-plug efficiency 0.005–1. Positions within ±10,000 µm. Normals are nonzero 3-vectors, normalized on input. Metadata is retained up to 120 kB. Imported contact shapes are preserved as metadata; viewport contact markers are schematic, with no electrical recording or stimulation inferred.

## Neural Interface Designer

Actual upstream contract inspected at repository commit `b59adb6fe3f2c9f3d646528a3c9a5712eb6ef74a`, `src/lib/designer/model.js`:

```
schema: "bts-neural-interface"
version: 1
units: "um" or "µm"
contacts: [{id, x, y, shape, w, h, rotation, ...}]
routing: {...}
```

This bridge requires explicit units (it does not inherit the Designer's permissive missing-unit behavior). x/y positions are retained and z is initially zero. Original contacts, routing and source design are archived in metadata. Layouts above 256 contacts are rejected rather than truncated.

**Apply device geometry** keeps all imported sites as non-emitting electrode markers. **Convert selected footprints** requires explicit selection and creates assumed rectangular emitters, preserving the original electrode records. Default conversion assumptions: 470 nm, 0.02 mW/site, 6.5% efficiency, +Z direction, z = −75 µm. They remain editable. Converting a circular/ring contact uses its rectangular width/height envelope; it is not fabrication evidence. Width/height limits are enforced and unsupported large footprints rejected.

## Microfabrication Laboratory

Actual upstream export inspected at the same repository commit, `src/components/MicrofabricationLaboratory.jsx`: `schema: "microfabrication-1"`, `config`, `stage`, `process`, `measurements`, `channels`, `assumptions`, `references`.

This review importer archives that document under `device.metadata.cleanroomRecipe`. It does **not** recompute the fabrication recipe or apply channel continuity, layer thickness, material properties, optical openings, LED efficiency, device heat paths or fabricated shape to the solver. A direct as-fabricated optoelectrode adapter remains future work. Provide explicit native emitter geometry/properties for the simulated device.

## Exports and units

- Experiment JSON: reloadable configuration and neuron provenance.
- Device JSON: geometry, source power, spectrum, efficiency, metadata, conversions.
- Full result JSON: configurations, all cell/compartment arrays, spike events, matched-control soma traces, heat field, diagnostics and source hashes. Float32 replay arrays and Float64 soma records retain their documented precision; serialization expands arrays normally.
- Trace CSV: per-cell time, soma and selected voltage, soma chloride and ECl, whole-cell opsin current, local soma physical light, injected current, matched dark soma voltage and local temperature rise. Missing/unsupported values are blank. Cell IDs are escaped and prefixed to avoid spreadsheet formula interpretation.

Geometry µm; time ms; voltage mV; current nA (outward-positive photocurrent); chloride mM; local light mW/mm²; emitted power mW; energy µJ; temperature rise °C. Conductance density is displayed in mS/cm² but stored in S/cm². Optical efficiencies are fractions, not percentages.
