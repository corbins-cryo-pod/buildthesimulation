# Biohybrid Axon-Resolution Laboratory — Stage 2 progress

## Delivered

**Version:** `axon-modalities-0.1.0-component-preview`

**Status:** Working local component preview. Stage 2 is not complete. The existing Stage 1 repository and deployment are unchanged; no GitHub push, merge or hosted deployment was performed.

The next stage specified in the original build prompt is modalities and selectivity: coil and optical addressing, finite amplitude studies, recruitment-matrix analysis and four selectivity metrics. Biological growth and survival belong to a later stage.

### Working component workspaces

| Workspace | What it calculates | What it does not establish |
|---|---|---|
| Selectivity | Exclusive and shared-only identities, exact real-valued rank, isolated-input information; imports retained Stage 1 result tables | New neural recruitment, arbitrary simultaneous control, clinical function |
| Microcoil | Fields from a closed trace/via/return geometry; primary induced E and its gradient; R, estimated L and drive-energy arithmetic | Tissue-corrected firing threshold, tissue temperature or safety |
| Light transport | Seeded scattering/absorption histories with explicit walls, caps and apertures; soma-volume fluence and energy accounting | Converged membrane-surface exposure or optical axon activation |
| Opsin assay | Four-state ChR2(H134R) kinetics, voltage-clamp photocurrent, adaptation and recovery | A propagating action potential in the bipolar neuron |
| Spectral overlap | Photon-weighted overlap for clearly hypothetical 2–4 population examples | Measured opsin multiplexing or an increase in independent channels |

The source also contains an induction-to-FEM adapter and an adjacent-valid-sample amplitude-bracket analyzer. The production-mesh induction adapter is not enabled in the bench and has not passed a coupled release gate. The amplitude analyzer evaluates supplied tables; it does not run new neurons.

## Executed verification

- **39 automated component tests passed**, zero failures or skipped tests in the final run.
- **65 independent numerical checks passed**. These include exact ranks with SymPy, line-integral magnetic fields with SciPy quadrature, independently assembled P1 induction loads, six opsin protocols integrated directly with SciPy, and optical analytic/energy checks.
- **3 off-target optical comparisons remain unresolved**, not passed as confinement or selectivity.
- **22 actual browser checks passed**, covering inputs, worker computations, cancellation, imports, exports, retained settings, pinning, a 390px layout, and bundled methods.
- Acceptance-file SHA-256 remained identical to the version recorded before the studies. No tracked source changed during the final validation run.

The execution browser rejected localhost and file-URL navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. No security policies were changed. Browser checks loaded the exact delivered self-contained HTML into a normal in-memory document and exercised its real controls and blob worker. Application results were not injected. This does not certify file navigation on a physical iPhone, a full Astro build, or a hosted deployment.

### Results worth retaining

The default clamp assay produced a peak inward photocurrent of approximately **−0.19235 nA** under its hypothetical expression and membrane-area assumptions. This is a voltage-clamp current, not an action potential. Across the six independent comparison conditions, maximum state discrepancy was approximately **2.01×10⁻⁷** against the fixed 2×10⁻⁶ criterion.

The default coil geometry had an estimated **8.475 Ω** DC resistance and **1.733 nH** regularized-filament inductance. These are model arithmetic, not measured implant parameters or operating recommendations.

The default optical runs illuminated the target detector but sampled too few off-target intersections to quantify confinement robustly. Finite ratios derived from rare packets were unstable. The interface now withholds the confinement headline instead of presenting an enormous number as success.

### Retained corrections

1. A one-layer winding test detected a return lead crossing the sampled cable. The default lateral offset changed from 35 to 60 µm. The original failure and conductor-intersection guard are preserved.
2. Raw optical ratios from 1–3 off-target intersections are preserved as diagnostic history. A conservative display-adequacy rule now withholds the headline; it is not a biological or convergence criterion.

## Remaining work before Stage 2 can be called complete

The central unfinished step is to drive the **same Stage 1 37°C bipolar neuron and anatomy** with the new modalities, rather than treating component output as neuronal output. That requires tissue-corrected induction fields, membrane-surface optical sampling, coupled opsin conductances, matched zero-input/isolated-channel/silencing controls, propagated-event analysis and actual finite amplitude experiments. The new coupling must pass spatial/temporal convergence and independent native membrane comparisons. Stochastic threshold uncertainty, full-site build and hosted-browser verification remain open as well.

No biological growth, neuron survival, target reinnervation or clinical efficacy is claimed.

## Files and integration

`biohybrid-stage2-preview.html` is the self-contained application. The review ZIP contains editable source, an additive native-site overlay, 80 parameter entries with provenance, methods, scientific questions, fixed acceptance criteria, tests, independent reference scripts, reports, screenshots and retained failures.

The overlay does not modify Stage 1 source. Its apply script verifies the pinned membrane blob and refuses conflicting overwrites. Applying it is not a deployment. A full repository build and review are still required.

Start the preview with **Opsin assay → Calculate component** for the clearest demonstration of the new state/current calculations. For the actual Stage 1 electrode result, export its full JSON from the existing laboratory and use **Selectivity → Complete Stage 1 result JSON**. Imported results are explicitly identified as source data, not newly verified experiments.
