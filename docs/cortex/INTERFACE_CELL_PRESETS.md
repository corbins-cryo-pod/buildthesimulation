# Human-cell drive presets for the interface laboratory

The default ensemble contains **12 unique published human-cell specimens**. Every cell uses the existing Cortex Laboratory morphology, fitted membrane densities, channel mechanisms, temperature, and active-cable solver. Each compartment's voltage is solved; no spike is inserted into a trace or assigned to a cell for display.

Repeated firing is produced by **explicit constant intracellular current at the soma**, analogous to a patch-clamp current step. It is not spontaneous firing, synaptic network activity, or a claim that an isolated source cell naturally fires at the displayed rate. The population is a test ensemble rather than a representative cortical census.

## Measured protocol

- Source-prescribed initial voltage; 100 ms of conditioning with no drive at 34 °C.
- Constant positive soma current for 220 ms, with no extracellular stimulation during calibration.
- Default compartment target 40 µm, timestep 0.005 ms. The original reconstructed geometry and fitted parameters are unchanged.
- A soma event crosses −25 mV upward, with a 2 ms refractory interval. The calibration gate additionally requires a peak of at least 0 mV within 3 ms and repolarization below −40 mV within 20 ms.
- A passing preset has at least two such complete waveform events, including one after 100 ms. This is a descriptive waveform gate, not proof of propagation or independent biological validation.
- Events near the recording's end may be censored before peak/repolarization can be observed. Raw crossings and the observations used for classification are retained in the data report.

The runtime staggers soma-current onset by 0–22 ms and runs for 260 ms. These offsets were not used in the zero-offset calibration below; the complete integrated default is checked separately before its replay is cached.

## Final selected currents

Counts below are complete events during the 220 ms calibration window. Spatial comparisons retain dt = 0.005 ms; timestep comparisons retain the 40 µm mesh.

| Specimen | Soma drive (nA) | 40 µm, dt 0.005 ms | 20 µm, dt 0.005 ms | 40 µm, dt 0.0025 ms |
|---|---:|---:|---:|---:|
| 571654895 | 0.3 | 9 | 9 | 9 |
| 508378649 | 2.0 | 14 | 14 | Not checked at 2.0 nA |
| 508417989 | 0.8 | 9 | 9 | 9 |
| 529878215 | 0.8 | 11 | 11 | 11 |
| 541563728 | 0.5 | 6 | 6 | 6 |
| 569844159 | 0.4 | 4 | 4 | 5 |
| 531520637 | 0.4 | 16 | 16 | 16 |
| 601927090 | 0.1 | 17 | 16 | 17 |
| 614651270 | 0.6 | 12 | 12 | 12 |
| 526734407 | 0.6 | 2 | 2 | 2 |
| 529807751 | 0.4 | 26 | 26 | 26 |
| 541536216 | 0.4 | 24 | 24 | 24 |

All 12 final presets pass the sustained-event gate on both 40 and 20 µm meshes. Eleven final-current configurations were also checked at half timestep, and all 11 retain sustained firing. The old 1.6 nA setting for 508378649 passed its timestep check, but that evidence is **not** attributed to the revised 2.0 nA preset.

**These results do not establish spike-count, spike-timing, or threshold convergence.** Eleven of 12 spatial comparisons retain the same complete-event count, and ten of 11 final-current timestep comparisons do. Corresponding events paired by order shift by as much as 37.134 ms across the two meshes and 4.710 ms across the two timesteps. Ordinal pairing is only a descriptive comparison; it is not a validated error bound. A longer recording window can also change count agreement.

The two final basket-cell entries, 529807751 and 541536216, use the existing human epilepsy dataset adaptation. Their published fitted channels are paired with the available reconstruction of the same specimen; the original historical morphology revision is unavailable. The source scope in the model registry remains applicable. All cells retain the source-prescribed short synthetic axon and the other limitations of the original models.

## Failed and changed candidates

The initial candidate scan did not pass every cell. Those results remain in the report:

- **528038990:** repeated −25 mV crossings at 1.2, 1.8, and 2.4 nA did not produce enough complete events under the declared peak/repolarization gate. It was excluded from the default ensemble.
- **531526539:** 0.8 and 1.2 nA produced only an onset event. Higher tested currents did not pass the complete-event gate. It was excluded.
- **571500474:** the tested 0.8–2.4 nA settings did not produce sustained complete events. It was excluded.
- **508378649:** the initially selected 1.6 nA setting produced 12 complete events at 40 µm but only one onset event at 20 µm. The final 2.0 nA setting produces 14 complete events on each mesh; the finer mesh also has two crossings that fail the complete-event gate. The failed 1.6 nA comparison is preserved.
- **548457754:** an alternate 0.8 nA setting passed at both meshes with four complete events. It was not needed in the final 12-cell selection and has a larger compartment count.
- **529807751 and 541536216:** the initial 0.2 nA trials failed the late-event requirement; 0.4 nA produces sustained complete events.

The final presets are not estimates of rheobase or physiological operating current. They are bounded, measured drive choices for a recording test. No threshold search, extracellular recruitment study, or new independent NEURON comparison was performed as part of this preset calibration.

## Reproduction and evidence

`scripts/interface-calibrate.mjs` runs the original active cable directly. `src/lib/cortex/interface-presets.js` stores each selected current, zero-offset calibration event times, compartment target, and source-asset hash. `docs/cortex/interface-cell-calibration.json` includes the input protocols, all selection trials, failed cases, final matched checks, source hashes, and summary metrics. `docs/cortex/interface-cell-calibration-traces.json.gz` retains approximately 0.25 ms soma-voltage samples for all distinct tested configurations; event peaks and crossing times were measured at the internal integration timestep.

Run the final preset protocols from the repository root:

```bash
node scripts/interface-calibrate.mjs --presets --output=/tmp/interface-baseline.json
node scripts/interface-calibrate.mjs --presets --lengthUm=20 --output=/tmp/interface-spatial.json
node scripts/interface-calibrate.mjs --presets --dtMs=0.0025 --output=/tmp/interface-timestep.json
```

The last command includes the final 2.0 nA setting and would add the currently missing timestep check for that current. The original failed spatial case can be reproduced with:

```bash
node scripts/interface-calibrate.mjs --specimen=508378649 --currentNa=1.6 --lengthUm=20 --output=/tmp/interface-rejected-current.json
```

A failed gate exits nonzero after writing its measured results. The original candidate scan can be reproduced by omitting `--presets`; it is expected to contain failures. A serial 12-cell baseline repeat took about 167 seconds in the development environment, including conditioning; runtime depends on hardware and concurrent work.

The final report's top-level hashes identify the source and presets at report assembly. Each recorded batch retains its own source snapshot. Initial screening snapshots intentionally predate the corrected current and are not relabeled as final-configuration evidence.
