# Sustained somatic current-clamp steps

The user requested repeated action potentials during extended patch-clamp-style
inputs. This update expands active input/recording bounds, adds two reproducible
long-step presets, and improves replay/statistics. It does not change the membrane
model, fitted channels, cable integration, spike detector, conductor or existing
short-case defaults. The passive cell still cannot fire action potentials.

## Configuration and interpretation

- 200 ms step: +0.3 nA from 20 to 220 ms; record 250 ms at 0.1 ms output.
- 500 ms step: +0.3 nA from 50 to 550 ms; record 600 ms at 0.25 ms output.
- Both use 0.005 ms integration, 40 µm maximum compartment length, 100 ms
  no-drive conditioning, the original fitted cell at 34 °C, and the existing
  bath return. Exact full configurations are in `examples.js` and the hashed
  `benchmarks/examples-latest.json` report.
- Active steps may reach 1000 ms, recordings 1200 ms, and saved intervals 0.5 ms.
  Existing 64 MiB and 2,000,000 node-frame storage limits still reject excessive
  configurations before allocation. No output interval, mesh or dt is changed
  automatically. A coarse saved interval can miss peaks and short transients;
  internal event detection is unchanged. These bounds do not certify arbitrary
  configurations or long-time convergence.

Count/rate/latency statistics use soma events during [onset, offset). The full
table includes pre-step and recovery events. Rates are counts divided by the
step duration, not stationary firing rates. First/last ISIs use only during-step
events. No event means unavailable latency; fewer than two events means unavailable
ISIs. Navigation rounds to retained frames; event timestamps retain internal-step
linear interpolation. All timestamps and complete configuration remain in the
existing result-bundle export.

The step is an ideal intracellular current injection with modeled bath return.
It does not model a patch pipette, access resistance, electrode capacitance,
voltage-clamp feedback or acquisition electronics. Repetitive firing and adaptation
are model outcomes, not imposed templates or independent experimental validation.

## Independent reference and acceptance gates

Before running the comparisons, retain the existing short-case acceptance gates:
all physical-compartment voltage RMS <0.1 mV and maximum absolute error <1 mV;
membrane-current RMS <max(1e-4 nA, 1% reference peak); identical soma-event counts
and corresponding event times within 0.1 ms; corresponding first local crossings
within 0.1 ms; neural/applied/total contact RMS <max(1e-4 µV, 1% reference peak);
maximum laboratory current-conservation/KCL residual <1e-8 nA. Compare the same
mesh, timestep, geometry and input without aligning spikes in time. These are
native-simulator agreement criteria, not mesh/time convergence criteria.

`cortex-current-step-reference.py` reuses the existing original-SWC/NMODL NEURON
reference kernel and actual LFPykit forward calculation. It passes only shared
geometry and full configurations into that independent solver. It adds separate
fixtures and preserves all eight original native cases. Every physical membrane's
voltage/current at every saved frame is delta-encoded, quantized far below the
gates, gzip-compressed and hashed. Reference input, generators, SWC, fit, original
mechanisms and pinned package file are hashed. Website CI needs only Node.

To reproduce, use the isolated environment/compilation procedure in ACTIVE_MODEL.md:

```sh
# Install scripts/cortex-reference-requirements.txt and compile original NMODL first.
CORTEX_ACTIVE_MECHANISM_LIBRARY=/absolute/path/to/x86_64/libnrnmech.so \
  python scripts/cortex-current-step-reference.py
node --test tests/cortex-current-step-reference.mjs
node scripts/verify-cortex-examples.mjs
node --test tests/cortex-current-step.mjs tests/cortex-worker.mjs
```

The earlier 141-run refinement study is also rerun for the expanded validation
bounds and updated budget error guidance, with unchanged physical inputs and
acceptance limits. Its failed waveform/spatial-threshold gates remain failures;
this usability update does not claim to resolve them.

## Interaction-verification scope

Node tests cover long-step configuration/import bounds, output memory rejection,
spike-window statistics, navigation rounding, independence from saved sampling,
injected charge, export configuration and actual-worker cancellation during a
long simulation. Build/static asset checks are separate from browser interaction.
Supported control-browser tooling is unavailable in this environment; keyboard,
mobile, WebGL replay and browser download behavior remain unverified here.

## Measured verification results

Both long-step native comparisons passed the unchanged gates across all physical
membranes and all retained frames. The maximum corresponding soma-event timing
difference was <2.3e-8 ms. These very small discrepancies indicate agreement of
the two implementations at these exact discretizations, not biological accuracy.

| Case | Soma events | Membrane voltage RMS / max (mV) | Membrane-current RMS (nA) | Largest recording RMS (µV) |
| --- | ---: | ---: | ---: | ---: |
| 200 ms | 9 | 3.17345e-7 / 1.30884e-5 | 2.89428e-8 | 5.80214e-9 |
| 500 ms | 18 | 4.80222e-7 / 3.06066e-5 | 2.93899e-8 | 1.65517e-8 |

Coarsening the 200 ms example's saved interval from 0.1 to 0.25 ms leaves its
entire internally detected spike list exactly unchanged. The charge test uses
this aligned rectangular input and is not an assertion that arbitrary sparse
output can reconstruct every waveform's charge. The native fixture comparisons
include complete membrane currents and both contacts' neural/applied/total traces.
