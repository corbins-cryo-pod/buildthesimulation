# Biohybrid Axon-Resolution Laboratory — conditional Stage 1

Stage 1 implements a fixed, hypothetical bipolar ganglion-replacement topology with physical insulating electrode wells, anisotropic volume conduction, a resolved perineurium and MRG-derived double cables at 37°C. Later growth, optical/coil, whole-nerve screening, oxygen, interconnect and chronic/refinement stages are not included.

## Open the laboratory

The site route is `/simulations/biohybrid-axon-interface/`, with `/methods/`, `/questions/` and `/validation.json` beneath it. The default has 128 cells and 2 isolated channels; the256-cell preset has 256 cells/wells and 1 isolated contact pair. The four-cell preset uses the same equations and explicit resolution for studies.

## Executed result and meaning

The full declared fixture actually completed 256 cells and all 1,024 driven matched interventions at 0.5µA. Assigned recruitment was one central output (E0001); regional and whole-cell active removal abolished it, while soma-only active removal retained it. Original-host continuity and `Y_original` are 0/256 by the imposed complete-resection topology. One tested input does not demonstrate 256 independently addressable channels. No introduced E identity inherits an original H identity.

The matched no-device control uses the same absent-original-remnant assumption, removes the implanted cells/wells/contacts/drive, and has an analytical zero solution. The separate viable-stump diagnostic has a different population assumption and is never substituted for that comparator. Junction block is not applicable to this own-projecting-neuron topology.

Full fixture runtime was 663.709 s and peak resident memory 1,861,058,560 bytes (about 1.73 GiB), including export. The field had 1,409,165 vertices and 6,778,368 conducting tetrahedra. These are executor measurements, not browser performance predictions.

## Evidence and reproduction

- `reproduction-stage1-report.json`: current-source release aggregate, 12/12 required evidence groups, 61 source hashes, 10 frozen acceptance/correction files. Its `verified-existing-evidence` mode checks separately executed reports without claiming a monolithic rerun.
- `stage1-protocol-validation.json`: full matrices, identity and per-cell control summaries, 28/28 checks, actual resources and raw-export hashes.
- `bipolar-numerical-report.json`: 66 required component checks.
- `bipolar-soma-spatial-report.json`: retained 1→3 and 3→5 failures; passing 5→9 and 9→13 refinements select five soma bands.
- `bipolar-coupled-report.json`: 12 native NEURON cases and 16 time-step comparisons under the actual well field.
- `field-stage1-validation.json`, `field-stage1-dense-validation.json`, `field-stage1-domain-validation.json`: 21+11+2 checks, including independent Python, every-cell dense-neighbor refinement and grounded-boundary expansion.
- `integration-validation.json`: 24 current software tests, no skips or failures.
- `browser-aperture-study.json`: executed three-point browser sensitivity at 0.5µA, with full-export hash; a sensitivity result, not an extra numerical gate.

Run the complete reproduction from a fresh checkout:

```bash
python3 scripts/axon-interface/reproduce-stage1.py
npm run build
node scripts/verify-axon-interface-build.mjs
```

The script pins its native Python dependencies, compiles a fresh NEURON mechanism, regenerates every required reference/refinement/protocol report, runs the integration suites, and records hardware, commands, runtime and source stability. See `STAGE1_REPRODUCTION.md` for prerequisites and the explicitly separate `--verify-existing` mode. Large generated arrays and platform-specific native binaries are reproducible outputs. The historical recovered-core `reproduce.py` and `reproduction-report.json` remain separate records.

## Scientific boundaries

These gates establish agreement with the stated numerical equations at declared fixtures. Engineered anatomy and active soma/stem densities remain hypotheses. Human ganglion calibration, appropriate target reinnervation and survival are unknown. The original motor comparison remains 15.20% and 11.33% slower than the cited larger-cat-fiber relation at 10 and 16 µm; no tolerance was invented to convert that discrepancy to a pass.

Each cell responds to the imposed field independently. Generated neural fields enter reciprocal recording but are not fed back into membrane dynamics. The five soma bands do not resolve nonlinear circumferential polarization. Electrode impedance, polarization, noise, amplifier saturation, biological adaptation/plasticity and chronic change are not calibrated. Threshold crossings can be passive; their timing alone does not establish regenerative initiation or causal source location. Source-separated recordings are known forward-model components, not demonstrated artifact rejection or spike sorting.

All historical failed resolutions, spontaneous active-soma failures and model-domain rejections remain retained. No voltage clipping, observation-time shift, amplitude rescaling, hidden population screening or tolerance relaxation is used to obtain a pass.
