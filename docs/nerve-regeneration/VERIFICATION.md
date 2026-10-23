# Peripheral nerve regeneration: numerical verification

Generated 2026-10-23T03:16:12.800Z. Model 1.0.1.

**Software and numerical verification only. No biological calibration, clinical validation, treatment-effect validation, or patient prediction is established.**

## Reproduce

Run from the repository root:

```sh
node tests/nerve-regeneration.mjs
node scripts/verify-nerve-regeneration.mjs --write
```

Omit `--write` for a read-only JSON report. Optional `--check-build` checks built route/worker presence and does not verify deployment.

## Source identity

- Engine SHA-256: `cd5fbd17d1ddcfc1db0c459785fdc1d00d2691fb811b3681d8bb9e361a6de35f`
- Tests SHA-256: `c172c1f05a497c7eed2072064fd9c762c1c258b38f3f464f85d64df3c4870fb9`
- Verification script SHA-256: `1cb51c9c464fa470d5440fd95b6b145f1a5b730d42ea95b156237dc27c375877`
- Runtime: v24.19.0, linux/x64.

## Executed tests

36 named tests executed; 36 passed. The machine-readable JSON records each case and measured duration. Test counts come from actual node:test events. Overall listed numerical criteria: **PASS**.

The suite exercises deterministic cohorts, conservation, physical/event bounds, no-bridge and delayed-repair cases, local myelin clocks, phenotype/target independence, time and spatial refinement, adaptive storage, fresh graft timing, and comparison with a retained earlier export.

## Analytic reference

For an ideal unobstructed pathway, `x(t)=min(gap+distal,v max(0,t-lag))`. Maximum sampled position error: 2.7000623958883807e-13 mm. Maximum distal-entry error: 2.6645352591003757e-15 day. Maximum target-arrival error: 1.5631940186722204e-13 day. Acceptance: 1e-9 in the respective units.

## Time-step refinement

Default 8 mm gap, 70 mm distal distance, 180 days, 128 parents. Errors compare each parent with the 0.05-day result.

| Step / day | Entered | Arrived | Fascicle matched | Max front difference / mm | Max paired arrival difference / day |
|---|---:|---:|---:|---:|---:|
| 0.25 | 128 | 96 | 77 | 0.00303655 | 0.01009056 |
| 0.1 | 128 | 96 | 77 | 0.00039081 | 0.00125796 |
| 0.05 | 128 | 96 | 77 | 0 | 0 |

Acceptance for these listed cases: maximum front difference ≤0.05 mm and paired arrival difference ≤0.1 day. These are numerical differences, not errors against biology. Threshold events near the horizon may change integer counts.

## Spatial refinement

| Case | Nodes | Max front difference / mm | Max paired arrival difference / day | Arrival-count difference |
|---|---:|---:|---:|---:|
| Default bridge and distal distance | 25 | 0.04432819 | 0.1648401 | 0 |
| Default bridge and distal distance | 49 | 0.00857133 | 0.02497944 | 0 |
| Default bridge and distal distance | 97 | 0.00585632 | 0.02104584 | 0 |
| Default bridge and distal distance | 129 | 0 | 0 | 0 |
| Short bridge / long distal path | 25 | 0.04677734 | No paired arrivals | 0 |
| Short bridge / long distal path | 49 | 0.00720358 | No paired arrivals | 0 |
| Short bridge / long distal path | 97 | 0.00771945 | No paired arrivals | 0 |
| Short bridge / long distal path | 129 | 0 | No paired arrivals | 0 |

Reference: 129 nodes. Acceptance applies to 49 or more nodes: ≤0.1 mm front difference and ≤0.25 day paired arrival difference. The local-reaction model has no spatial differential operator. These checks assess field interpolation and bridge resolution.

## Source reconstruction comparison

A transient workspace cleanup removed the original source before publication. Version 1.0.1 was rebuilt from retained source fragments, equations and an exported experiment, then independently reverified. Original engine hash: `97b501fd5310c31b4f676f15c5e64b98780c91e8f28478e9a8811741c56a56c5`. Retained export hash: `f79ad73fa58226ccd997f69d8f8fa9e03a702fb79130641e0d0e489e08bd9cce`.

The default endpoint parent counts are identical to the retained version1.0.0 export. Maximum parent-front difference: 0.00028438 mm; maximum paired arrival difference: 0.0009684 day; maximum sampled field difference: 7.471800955727304e-14. The JSON records the complete measured comparison. Source identity is not claimed; older-version imports are rejected.

## Bounded large-cohort measurement

One run: 512 parent axons, 730 days, 0.1-day internal step, 500 mm distal path. Measured solve: 2.960 s. Serialized result: 39356410 bytes. Stored trajectory points: 375611; maximum per parent: 745. Peak process RSS: 462573568 bytes.

One measured Node.js run in the verification process. Process memory includes the runtime, earlier checks, the result and JSON serialization; it is not isolated benchmark memory. Runtime is environment dependent and is not an iPhone/browser performance guarantee.

The adaptive display trajectory is distinct from solver steps, with a 0.002 mm local simplification criterion and at most one day between moving samples. This local criterion is not a rigorous global error bound; the dense-path test measures reconstruction error.

## Interpretation

Numerical verification establishes the stated software invariants and finite-case convergence. It does not estimate treatment efficacy, predict a patient, calibrate the assumed state rates, or validate the synthetic anatomy. Numerical acceptance for the explicitly listed cases only; not a biological error estimate or a guarantee across the complete parameter space.
