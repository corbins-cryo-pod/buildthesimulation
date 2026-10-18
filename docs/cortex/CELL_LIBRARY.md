# Distinct published cells — 18 October 2026

The laboratory now uses **16 unique human cortical specimens**, without
replacement within a population. The former 64-copy option is retired. The
selected target occupies one specimen identity; filters choose additional cells,
and excluded placements still consume their identity. Count cannot exceed the
remaining unique pool or numerical budgets. Filters cover excitatory/inhibitory
class, source layer and dataset. Target selection also offers an Atlas filter.

| Dataset | Specimens | Cell classes |
| --- | --- | --- |
| Allen Human_all_active_models_EAP, Mosher/Wei 2020 | 14 | 10 spiny excitatory/pyramidal, 4 inhibitory interneurons; layers 2/3 |
| Human epilepsy circuitry publication | 2 | MTG layer-3 aspiny basket interneurons, 529807751 and 541536216 |

All cells are human surgical tissue. This release does not claim mouse diversity,
complete axons, measured motor/sensory circuits, molecular subtypes, or a network.
The term cortical describes region; pyramidal describes cell class. Neither a
changed layer placement nor a new position creates another source identity.

## Sources and exact scope

- EAP repository: <https://github.com/AllenInstitute/Human_all_active_models_EAP>,
  commit `750e7840cc1a9eb32492c924e79609a85a893b8a`. Unmodified SWCs, fits, source
  metadata and license are under `public/models/cortex/human-eap/`. The original
  571654895 reference assets and generator remain unchanged. Source-directed
  axon replacement retains the publication's two 30 × 1 µm sections.
- Second dataset: <https://github.com/anastassiou-team/human-epilepsy-project>;
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC9841067/>. The retained manifest gives
  exact fetched URLs, hashes and repository revision. Published fits and original
  NMODL are paired with current Allen reconstructions of the same specimen.
  **The exact historical morphology revision is unavailable.** These are
  explicitly labeled numerical adaptations, not claimed exact reproductions of
  the historical published models. The original processor's two 30 µm axon
  sections use diameters from the source axon. No new fitted parameters are made.
- Allen software notices and noncommercial redistribution terms are preserved.
  The second dataset's original README and its license section are retained.

NEURON Import3d reports disconnected fragments in several SWCs. Its native
import behavior is retained in both geometry export and reference simulations;
no missing attachment is invented. Available reconstructions are not complete
biological cells. Every specimen retains a synthetic axon stub as prescribed by
its source model, not the complete traced axon. Published channel kinetics have
mixed species origins.

The inhibitory mechanisms Im_v2, Kd, Kv2like and K_T are ported literally into
`extra-channels.js`. Kd's computed-but-unused temperature factor stays unused.
EAP's negative Kv2like h2Tau guard is present only for EAP; the epilepsy source
omits it. Initial voltage is −80 mV for EAP and −78 mV for the basket fits.
Conditioning caches include specimen identity and all extra channel state.

## Finger Atlas reuse

Atlas specimen **508378649** overlaps the EAP collection and now has its own
matching active fit in Cortex. The other nine Allen atlas reconstructions have
no matched active fit in this imported collection. Twelve H01 references are
measured neurite anatomy without fitted electrical models. They remain linked
for morphology inspection, with unknown firing response. The atlas's procedural
DRG, spinal, thalamic and receptor illustrations are not added as measured cells.

## Placement, memory and rendering

The default is a 16-specimen cloud; logarithmic radii resample the requested
1,2,5,12,20,28,40,60… ladder between 1 and 960 µm with seed 20261018. This default
has eight supported and eight excluded placements. The original target still
uses the existing 40 µA example. Exclusions remain gold/null/blank, never inactive.
Changing filters, target, seed or pose changes eligibility. Source-specific
morphologies are used in every placement check and rendered individually;
per-cell surface merging reduces draw calls without changing electrical geometry.

Different cells differ in anatomy and conductance fits as well as distance and
angle. The resulting response plot **cannot isolate distance causally** or define
a continuous activation boundary. Inhibitory cells do not inhibit their neighbors
without synapses; synaptic/ephaptic coupling remains absent. Neural potentials
sum over simulated cells, and the common applied artifact is counted once.

Work is capped at 200 million node-steps, now including **separate conditioning
for every cell**. Actual heterogeneous node counts determine the cap. The 16 MiB
compact and 64 MiB per-cell detailed-output limits remain. No hidden coarsening.
Only selected model/resolution assets are fetched; gzip payloads preserve native
floating-point values without quantization. Bounds exclude browser/GPU overhead.

An observed fresh-process default cloud run took 44.6 s for 40 ms biological time
at dt0.005 ms and 40 µm compartment maximum, with 18,470,144 bytes retained output.
Other verification was running concurrently; this is not a dedicated benchmark,
browser-speed prediction, or real-time claim. The previous repeated-specimen
timings remain historical. `benchmark-cortex-population.mjs` now measures distinct
specimens and writes `population-unique-latest.json` separately.

## Verification and limits

The independent native reference script loads original NMODL and native SWCs,
never browser-computed solutions. It covers two protocols for each specimen:
40 ms current clamp and weak extracellular forcing after 100 ms conditioning,
dt0.005 ms, 40 µm geometry. Comparisons use complete sampled soma waveforms,
selected full-membrane snapshots, soma event counts and timing. Gates remain
0.1 mV RMS, 1 mV peak and 0.1 ms event-time disagreement. They verify numerical
reproduction of these cases, not biological validity or every placement.

Population regression checks cover unique selection, native source dimensions,
per-cell conditioning cost, independent response equivalence, single artifact,
null exclusions, export identities, distinct rendering and worker cancellation.
Original cell reference and sustained patch-clamp tests remain. The six historical
spatial-threshold convergence failures are still unresolved. No claim is made
that adding cell types resolves spatial selectivity, propagation, or activation
threshold uncertainty. Browser interaction QA is unavailable in this environment.

Reproduction scripts: `acquire-cortex-cell-library.py`,
`cortex-cell-library-model.py`, `cortex-epilepsy-library-model.py`,
`cortex-library-reference-input.mjs`, `cortex-library-native-reference.py`.
Compile each dataset's original mechanisms separately with NEURON 9.0.1; point
`CORTEX_ACTIVE_MECHANISM_LIBRARY` at its shared library before native generation.
