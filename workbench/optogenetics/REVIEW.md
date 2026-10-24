# Optogenetics Laboratory — review report

**Edition 0.2.0 · 24 October 2026**  
**Status: runnable local review; no GitHub or Cloudflare publication.**

The program was recovered from the earlier saved numerical artifact, extended, tested, and rebuilt from editable source. The delivered simulation calculates photocurrents and membrane voltages; it is not only a schematic or pulse-timeline preview.

## Delivered functionality

A documented reconstructed human neuron with active native channels; ChR2(H134R); uniform light and one finite-fiber Monte Carlo kernel; source placement and aiming; expression masks down to an anatomical section; single/paired/train/step stimulation; linked voltage/light/opening/expression views; time replay; compartment inspection; baseline comparison; an ideal channel assay; pulse-by-pulse event analysis; bounded response maps with actual trace retrieval; setup import/export and full computed recordings.

New in this continuation: the response-map workspace, apical/basal/axon/section expression, branch aiming, matched local exposure, extra timing controls, light-following replay, dose/energy readouts, channel-state display, exactly-one-event accounting, and an explicit validation ledger. The default timestep was refined to 0.005 ms.

## Current executed checks

| Check | Result and scope |
|---|---|
| Node unit / reference / engine tests | **46 passed, 0 failed**; `validation/node-tests.tap`. |
| Real Chromium interaction checks | **46 passed, 0 failed**; includes current recordings, replay, per-pulse table, real CSV/JSON downloads, setup round trip, malformed import rejection, invalidation, baseline retention, targeting, matched exposure, channel states, map selection, map cancellation, and mobile layout. |
| Browser application errors / resource requests | No uncaught application exceptions; no HTTP(S) runtime resource requests in the recorded checks. |
| Independent ChR2 ODE integration | **32 protocols × 2 timesteps**; SciPy DOP853 uses a separately implemented continuous RHS. Maximum state error at 0.005 ms: **2.65698e-07**. Maximum current error: **1.3869e-05 nA/µS**. |
| Independent cable matrix solve | **6 frozen-state cases**, two meshes. Max difference from independently assembled SciPy/SuperLU solve: **2.27374e-13 mV**. This does not independently validate native gating dynamics. |
| Discrete current conservation | Maximum residual across current engine scenarios: **1.8832e-12 nA**, below the declared 1e−8 nA gate. |
| Zero-light / zero-expression controls | No light-driven spikes or photocurrent. The no-expression voltage trajectory is identical to the no-light trajectory for the checked setup. |
| Fiber-placement response | Moving the tested 0.05 mW fiber farther away changes the calculated exposure and current; the near case gives one event, the far case none. This is a model result, not measured recruitment. |
| Stored optical normalization / geometry | Absorption integral, source power scaling, rigid transforms, bounds and interpolation checks pass. Photon transport itself was not rerun. |

The browser checks used Chromium **144.0.7559.96** via Playwright `set_content`, with a real inline Blob worker. Direct `file://`/HTTP navigation is blocked by the review environment's administration policy, so that launch route was not exercised. Safari, Firefox, and physical iPhone behavior remain untested. The source does not require a web server, but a viewer must permit scripts and workers.

## Default experiment — actual numerical output

| Input or result | Value |
|---|---:|
| Cell | Allen 571654895, 211 membrane nodes + 75 junctions |
| Expression | Whole cell, assumed 0.35 mS/cm² |
| Local uniform light | 1 mW/mm², 470 nm |
| Pulses | 5 ms at 30, 80, 130 ms |
| Recording / maximum timestep | 250 ms / 0.005 ms |
| Soma events | **3** |
| Exactly-one-event pulse windows | **3 of 3** |
| Extra events | **0** |
| Mean associated latency | **5.500679 ms** |
| First event | **35.964709 ms** |
| Peak soma voltage (integration steps) | **21.117038 mV** |
| Peak whole-cell inward photocurrent magnitude | **1.532024 nA** |
| Uniform radiant exposure | **15 µJ/mm²** |

The remaining event times are 85.124964 and 135.412364 ms. The events are threshold crossings of −25 mV, not reconstructed axon initiation events. Uniform mode has no defined total source energy. These results are retained in `validation/current-engine-checks.json`.

## Refinement: do not hide numerical sensitivity

A separate 80 ms single-pulse experiment used 1 mW/mm² for 5 ms at 20 ms and the same expression density.

| Refinement | Event counts | Event-time shift | Soma waveform RMS change | Maximum pointwise change |
|---|---|---:|---:|---:|
| dt 0.01 → 0.005 ms, 40 µm mesh | 1 → 1 | +0.008069 ms | 0.149627 mV | 1.807198 mV |
| mesh 40 → 20 µm, dt 0.005 ms | 1 → 1 | -0.220399 ms | 2.795680 mV | 38.974977 mV |

The large pointwise spatial difference occurs with shifted sharp spikes; it is still a real waveform difference, not a passed convergence gate. Whole-cell photocurrent relative RMS changes were 1.208% and 6.453% respectively. These selected tests support event-count robustness in one case, **not** global threshold or waveform convergence. Complete traces are in `validation/current-refinement.json`.

## What remains unverified or unimplemented

The combined human-cell + ChR2 + tissue-optics prediction is not experimentally validated. A full independent native-NEURON optical comparison was not run. The frozen-state matrix reference and fixed-voltage channel reference do not replace it. Native NEURON provenance in the recovered assets is archival provenance, not a newly executed NEURON result.

The source axon is a synthetic 60 µm stub. Expression is assumed. Rest and spike voltages extrapolate the opsin fit. Scalar tissue fluence and the retained channel loss factor are not independently calibrated for this specimen.

The archived transport field is retained, but the original photon generator and separate seed outputs were not recovered. Its two-seed historical agreement must not be called a fresh transport run or an MCX comparison. Boundaries, layered tissue, finite-domain errors, and membrane-surface sampling need additional checks.

MicroLEDs, other opsins, chloride inhibition, multiple cells, synapses, temperature rise, extracellular electrodes, artifacts, and design/cleanroom imports remain future stages. They are not represented by fake enabled options.

## Review package and next integration gate

Use the standalone HTML for review and the source ZIP for continuation. Seven reloadable setups are in `examples/`. Actual interface screenshots are in `previews/`. `docs/INTEGRATION.md` describes the proposed static route and its worker/security-policy requirements. No full current-site build or deployed-route verification is claimed.

The Allen license with its noncommercial condition is included verbatim. No font binaries are included. C059/Century Schoolbook and URW Gothic use installed-local fallbacks. Source and report hashes are captured in `SHA256SUMS.txt`; regenerated execution timings and browser reports can differ across machines.
