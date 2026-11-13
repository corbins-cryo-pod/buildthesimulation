# Stage 3: Growth and Integration — development preview

This is a working, separate biological-clock module for the Biohybrid Axon-Resolution Laboratory. It is not a completed Stage 3 release and does not declare Stage 2 complete. Stage 1's files and numerical evidence are unchanged.

## Open and reproduce

The website wrapper is `/simulations/biohybrid-axon-interface/stage-3/`. The standalone web module is `/axon-stage3/`. The source package also includes `axon-stage3-laboratory.html`, with the engine, interface and verification report embedded; no external runtime dependency is required.

From the package or repository root:

```sh
python -m pip install -r scripts/axon-interface-stage3/requirements.txt
python scripts/axon-interface-stage3/reproduce.py
python -m http.server 8000 --directory public
```

Open `http://localhost:8000/axon-stage3/` in a full browser, not an attachment viewer that disables JavaScript or workers. The reproduction command runs the Node contracts and independent Python references and rebuilds the self-contained HTML. Node 22.16.0 and Python 3.13.5 were used locally. The server command is a usage instruction; hosted and local-URL navigation were not verified in the restricted test browser.

Browser QA is separate. It requires Playwright 1.57.0 and system Chromium at `/usr/bin/chromium`:

```sh
python -m pip install playwright==1.57.0
python scripts/axon-interface-stage3/browser_qa.py
```

That script renders the portable HTML in memory, exercises actual controls and worker calculations, and writes screenshots/downloads. It does not inject numerical results. Browser policy prevented file and localhost navigation; no security policy was changed. Safari and physical mobile devices were not tested.

## Implemented

- Deterministic fixed-soma bipolar growth in physical 3D coordinates, with independent extension bursts, pauses, retraction, branching, wall reflection, and explicit work caps.
- Scaffold-axis alignment, nearest-lane guidance, a target cue field, prescribed repair-support/debris/scar proxies, and visible wrong-target contacts.
- One-cell placement as an assumption, or Poisson loading with empty and multiply occupied wells counted as failures rather than silently removed from the census.
- One-dimensional steady trophic diffusion/loss, aperture-limited dynamic well exchange, and cumulative-hazard survival.
- A deliberately hypothetical marker-response network and phenotype score. These are neither measured expression nor a validated neuronal-fate model.
- Separate contact, candidate, and opt-in **assumed-functional** states. Assumed function is not an action potential or a demonstrated synapse.
- Exact saved-frame replay, 3D-coordinate Canvas projections, selected-cell inspector, trophic and count plots, pin/compare, settings import, cancellation, and JSON/CSV exports.
- A confirmed **pending identity manifest**. It preserves all original host IDs, donor IDs, and all retained target contacts, including wrong targets. It is non-executable and contains no substituted electrical geometry.

## Default result actually executed

Seed 2048, 24 placed cells, 28 modeled days, default parameters:

| Endpoint | Count |
|---|---:|
| Original synthetic census | 24 |
| Single-cell wells admitted | 24 |
| Living engineered cells | 16 |
| Living cells above the hypothetical signature threshold | 16 |
| Qualified cells contacting both intended target zones | 2 |
| Qualified cells with candidates at both intended zones | 0 |
| Live wrong-target contacts, not distinct cells | 15 |
| Electrically selective outputs | Not calculated |

The matched trophic-withdrawal run retained 3 of 24 cells. These are consequences of the stated invented rates, geometry and seed, not experimental or clinical predictions. The default result retains 9,875 coordinate records and 57 saved frames.

## Verification and limits

The executed source passes **33 Node software contracts**, **17 independent mathematical component checks**, and **17 in-memory Chromium browser checks**. These counts refer to distinct scopes, not 67 biological validations. The frozen acceptance file and retained failure history accompany the code. The machine-readable report is `public/axon-stage3/validation.json`.

The independent checks include analytic slab transport, independently assembled dense linear algebra, an independent well-exchange ODE, numerical quadrature of survival hazard, and a separately written continuous marker ODE. Default marker integration differs from the latter by approximately 0.00343 normalized units, below the fixed 0.01 gate. This does not verify the complete stochastic growth process.

Not implemented or not established: calibrated neuronal specification; measured culture morphology; soma mechanics or movement; actual Schwann-cell agents; remyelination; oxygen/perfusion; chronic response; biologically appropriate reinnervation; whole-model stochastic convergence; Stage 2 optical/magnetic membrane coupling; or the geometry-aware growth-to-electrical adapter. The exported constants `myelinLagDays` and `myelinRatePerDay` are inactive reserved values and do not affect any result.

B3 assumes complete replacement: original neurons are absent in both the introduced-cell and no-device ledgers. Preservation of original host identities is zero **by assumption**. Donors never become preserved host axons. The no-device ledger is not a hollow-conduit repair simulation.

## Review path

Run the default configuration, replay its saved days, inspect individual trajectories, then pin it and select **Trophic withdrawal**. Inspect the contact ledger before enabling the explicit transmission hypothesis. The handoff exports candidate identities for future review only; the laboratory cannot currently convert those trajectories into an electrical response.

The next release gate is a geometry-aware electrical adapter plus independent validation of growth-to-cable coupling. Biological calibration and stochastic convergence remain separate requirements, not badges borrowed from Stage 1.
