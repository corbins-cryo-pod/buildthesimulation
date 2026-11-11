# MRG double-cable benchmark: equations, scope and reproduction

## Recovery and current verification

The executor that held the initial implementation expired before its branch was pushed. The new JavaScript file is a reconstruction, version `mrg-double-cable-2.0.0-recovery`, with SHA-256 `cbaa91ed8e8cbe5acc56d55f229ddcd0bbbe32a4272d4b8280eded3aff772405`. It is not the former byte-identical file. The exact upstream mechanism and morphology files were recovered at the pinned revision; the native Python harness was completed from a retained source fragment, and the historical JavaScript validator was recovered and extended with source-stability and physiological-discrepancy reporting. See `mrg-recovery.md` for the provenance distinction.

All 55 required checks passed in a new execution on the reconstructed source. The report records its actual source hashes, runtime and execution date. The first reconstructed run and the later run with the restored diagnostic sections remain in `mrg-validation-history.jsonl`. Current results do not reuse the lost reports as evidence of a new execution.

## Scientific scope

This is the published MRG mammalian somatic motor-fiber electrical benchmark at 37 °C. It is not a calibrated spiral-ganglion cell, organoid-derived neuron, reconstructed human nerve or complete Stage 1 biohybrid architecture. A synthetic cohort uses these cable equations conditionally; anatomical identity and demonstrated biological continuity are separate claims.

The optional central cylinder is a hypothetical loading experiment. Its diameter and length are both `somaDiameterUm`, and its area is πdL. `somaActiveScale` multiplies fast sodium, persistent sodium and slow potassium conductances there; the nodal leak is retained. Scale 0 is an explicitly passive load. Scale 1 applies unchanged nodal densities over the enlarged area and fails the zero-drive criterion by producing spontaneous activity. Selecting the passive hypothesis does not validate or repair the active-soma hypothesis.

## Source and parameters

The source is [ModelDBRepository/3810](https://github.com/ModelDBRepository/3810), pinned to `b15daeda6ea368df0198d257f339cf5e840cf31c`. Its unchanged `AXNODE.mod`, `MRGaxon.hoc` and `README` are retained under `scripts/axon-interface/mrg-modeldb/`. Their Git blob hashes match the retrieved upstream files. The corrected singular limits in the sodium rate functions are preserved. The model is described by [McIntyre, Richardson and Grill (2002)](https://journals.physiology.org/doi/full/10.1152/jn.00353.2001).

Source-defined constants have the evidence class **mathematical**: they define the published equations. Their presence in a model source does not establish that they were measured in an engineered cell. The numerical preparation and resolution are **estimated** numerical choices. The enlarged central load is **hypothetical**. No source-file attribution is represented as a newly granted software license.

| Fiber diameter / µm | Axon diameter / µm | Node diameter / µm | Node spacing / µm | FLUT length / µm | Myelin lamellae |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5.7 | 3.4 | 1.9 | 500 | 35 | 80 |
| 7.3 | 4.6 | 2.4 | 750 | 38 | 100 |
| 8.7 | 5.8 | 2.8 | 1000 | 40 | 110 |
| 10 | 6.9 | 3.3 | 1150 | 46 | 120 |
| 11.5 | 8.1 | 3.7 | 1250 | 50 | 130 |
| 12.8 | 9.2 | 4.2 | 1350 | 54 | 135 |
| 14 | 10.4 | 4.7 | 1400 | 56 | 140 |
| 15 | 11.5 | 5.0 | 1450 | 58 | 145 |
| 16 | 12.7 | 5.5 | 1500 | 60 | 150 |

Unsupported diameter interpolation is rejected. Each interval contains MYSA, FLUT, six STIN sections, FLUT and MYSA. MYSA length is 3 µm; nodal length is 1 µm in the original benchmark. STIN length is `(spacing − 1 − 2×3 − 2×FLUT)/6`. The periaxonal gaps are 0.002 µm at NODE/MYSA and 0.004 µm at FLUT/STIN. Axoplasmic and periaxonal resistivity are 0.7×10⁶ Ω·µm.

The normal 10 µm, 11-node cable is 11,501 µm long. Three numerical segments per passive anatomical section give 311 compartments. Coordinates run along z, centered on the middle node. Physical geometry is independent of graphical marker enlargement.

Nodes carry maximum conductance densities 3 S/cm² fast sodium, 0.01 S/cm² persistent sodium, 0.08 S/cm² slow potassium and 0.007 S/cm² leak. Sodium reversal is +50 mV; potassium and nodal leak reversal are −90 mV. Membrane capacitance is 2 µF/cm² of axolemma. Passive MYSA leak is 0.001 S/cm²; FLUT/STIN leak is 0.0001 S/cm², with reversal −80 mV. Myelin effective capacitance and conductance are 0.1/(2N) µF/cm² and 0.001/(2N) S/cm², referred to the fiber's outer area. Passive densities are converted consistently between inner axolemmal and outer fiber surfaces.

## Double-cable equations and units

Let v be intracellular minus periaxonal potential, w be periaxonal minus imposed extracellular potential φ, and let Dᵢ and Dₚ be the positive graph Laplacians of intracellular and periaxonal axial conductance. The solved system is

```
C_m dv/dt + I_ion(v, gates) + D_i(v + w + phi) = I_injected
C_my dw/dt + G_my w + D_i(v + w + phi) + D_p(w + phi) = I_injected
```

Thus the imposed field enters spatial differences. Electrode current is never substituted for intracellular injection. `injectedCurrentNa` exists for a separately labeled verification benchmark.

The implementation uses mV, ms, nA, nF and µS. A conductance in µS multiplied by mV gives nA. The axial conductance between neighboring compartment centers uses the sum of their half-length resistances. The periaxonal cross-section is the annulus `π[(d/2 + gap)² − (d/2)²]`, not a fitted axial shortcut.

At every step a block-tridiagonal implicit solve advances v and w with the ionic conductances evaluated from the existing channel states. The four gates then receive their exponential update at the new voltage, matching native fixed-step NEURON `secondorder=0` and the upstream `cnexp` mechanism. No membrane voltage is clipped. Unsupported or nonfinite states raise an explicit error.

The unchanged model equilibrates for 20 ms before observation. Common geometry, temperature and time step reuse the same prepared state. All matched interventions begin from that exact state, and active conductance removal occurs only after preparation. There is no balancing-current correction or adjustment of the published leak reversal. Zero-drive drift is measured.

## Currents, recording and time conventions

The axolemmal current and the current actually entering the surrounding volume conductor are separate outputs. The latter is

```
I_outer = I_injected − D_i(V_intracellular) − D_p(V_periaxonal)
```

It equals myelin capacitive plus conductive current under the cable equations. Treating all internodal axolemmal current as an extracellular source would double-count the periaxonal pathway. The saved outer current includes that bookkeeping and closes globally to the injected source.

Reciprocal recording uses `sum(I_outer[nA] × transfer[mV/µA])`, whose numerical result is µV. The reciprocal coefficient must come from the declared recording geometry. The analytic benchmark uses a homogeneous conductor; the separate production-coupled fixture uses the actual production FEM transfer coefficients.

The snapshot at time t > 0 is the state after the implicit step ending at t, with input held over `[t−dt,t)`. Recording current uses that same applied input. The baseline sample at zero precedes the stimulus. The production waveform is the exact interval-average biphasic current, including fractional boundary overlap. Saving fewer samples never changes the integration time step.

Upward 0 mV crossings are interpolated between adjacent integration states to report crossing times. Native comparison uses the identical observation grid, without trace alignment, offset removal, time transformation or amplitude rescaling. The low-level arm diagnostic reports three ordered first crossings; the production protocol applies additional explicit distal-node, event-ordinal and plausible-velocity checks. These are electrical propagation diagnostics, not proof of biological continuity or of a single traveling event identity.

## Independent reference and fresh numerical outcomes

`mrg-reference.py` independently builds anatomical NEURON sections from the original diameter table. It inserts native `extracellular`, passive mechanisms and the unchanged compiled `AXNODE.mod`. It imports no JavaScript voltage solution, stiffness matrix or cable integrator. It separately rebuilds physical axial conductances when calculating outer-current recording sources.

| Required comparison | Fresh reconstructed result | Declared limit |
| --- | ---: | ---: |
| Original cable, 6 ms zero-drive drift after 20 ms preparation | 0.00129632443 mV, zero crossings | ≤0.1 mV and zero crossings |
| Passive 20 µm central load, zero-drive drift | 0.0706216632 mV, zero crossings | ≤0.1 mV and zero crossings |
| 1.25→0.625 µs, maximum per-node waveform RMS | 0.409478805 mV | ≤1 mV |
| 0.625→0.3125 µs, maximum per-node waveform RMS | 0.205576131 mV | ≤1 mV |
| Subdivision 3→5, conduction delay | 2.217263% | ≤5% |
| Subdivision 3→5, recording peak-to-peak | 0.731915% | ≤10% |
| Subdivision 5→7, conduction delay | 0.920239% | ≤5% |
| Subdivision 5→7, recording peak-to-peak | 0.208095% | ≤10% |
| Six native NEURON fixtures, worst node RMS | ≤1.05×10⁻⁸ mV | ≤1 mV |
| Independent reciprocal recording, maximum discrepancy | ≤7.20×10⁻⁹ µV | ≤0.001 µV |

The six native cases cover intracellular injection, extracellular drive, 5.7 µm diameter, passive central loading, proximal silencing and whole-cable silencing. Their crossing counts match; timing differences are far below the declared 0.1 ms limit. The native comparison is equation verification at specified fixtures and does not validate all possible settings.

## Retained failures and physiological discrepancy

Fresh reruns retain the same substantive failures: maximum per-node RMS 2.128164 mV for 5→2.5 µs and 1.129199 mV for 2.5→1.25 µs; subdivision 1→3 conduction-delay discrepancy 12.43856% and recording discrepancy 23.06511%; and the fully active 20 µm central load's 29 spontaneous crossings and 110.524815 mV drift. The 16 µm cable's original 2 nA stimulus is also rerun: absent propagation cannot be assigned a velocity. A separate suprathreshold stimulus measures its conduction.

The broad requested fiber-class bands are not species calibration. A fresh diagnostic uses 41 nodes, seven passive subdivisions, 0.3125 µs steps, 10 nA injection at node 20, and arrival times at nodes 28 and 33. It measures 47.9963673 m/s at 10 µm and 80.2987114 m/s at 16 µm. The larger-cat-fiber line cited in MRG Figure 8 is 5.66D: 56.60 and 90.56 m/s. The discrepancies are −15.2008% and −11.3309%. This diagnostic is more finely segmented than the lost earlier diagnostic definition; its current values are used explicitly.

No post hoc physiological tolerance or channel adjustment was introduced. `biologicalValidation`, `activeSomaValidated` and `publishedDiameterRelationValidated` remain false. Native NEURON agreement cannot turn these unresolved biological questions into passes.

## Reproduction and output bounds

From the repository root, the combined reproducible entry point is `python3 scripts/axon-interface/reproduce.py`. For a membrane-only run with an existing environment:

```bash
CC=gcc CXX=g++ path/to/venv/bin/nrnivmodl
MRG_PYTHON=path/to/venv/bin/python node scripts/axon-interface/mrg-validate.mjs
MRG_PYTHON=path/to/venv/bin/python node scripts/axon-interface/mrg-coupled-validate.mjs
```

Run the native compilation command from `scripts/axon-interface/mrg-modeldb/`; run the JavaScript commands from the repository root. Dependencies are pinned in `mrg-requirements.txt`. The unchanged mechanism is compiled with GCC/G++, and generated native binaries are ignored by Git.

`simulateCable` accepts explicit compartment-step, saved-value and per-node event caps. Requests that exceed a cap fail; no axons, events or time steps are silently removed. `saveCurrents:false` avoids current arrays and returns a null uncomputed current-residual diagnostic. Detailed raw native traces, input fixtures and paired comparisons live under `docs/axon-interface/mrg-reference-data/`. Source hashes before and after a run establish whether the report describes unchanged source.
