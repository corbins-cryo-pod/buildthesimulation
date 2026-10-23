# Exploratory neurite growth and candidate integration

Model version: `biohybrid-exploratory-growth/1.0.0`.

This module computes possible geometric trajectories inside an idealized scaffold. It has a separate day-scale clock. It is not a fitted model of implanted graft integration, and it does not predict chronic interface success. Its output can inform an explicitly selected electrical connectivity experiment; it does not replace the active cable morphology with a newly grown geometry.

## Evidence and model choices

The source register in `src/lib/biohybrid/references.js` distinguishes experimental observations from this module's assumptions. [Marinov et al. (2020)](https://doi.org/10.3233/ISB-180172) provide precedent for computational growth, turning, branching and bundling within micro-TENNs. Our geometric process does not reproduce their concentration-based equations or calibration. [Adewole et al. (2021)](https://doi.org/10.1126/sciadv.aay5347) provide experimental culture context for extension rates; preparation, construct dimensions, developmental stage, and measurement method change those rates. See `SCIENTIFIC_ARCHITECTURE.md` for the specific measured comparisons. The module's default **180 µm/day is an exploratory input**, not a fit to one of those groups or a prediction of growth after implantation.

Other defaults are explicit estimates:

| Parameter | Default | Meaning |
| --- | --- | --- |
| Duration | 8 days | Requested growth interval; unrelated to millisecond electrophysiology. |
| Time step | 0.05 day | Steering and branching update interval. |
| Scaffold | 1,000 µm long; 90 µm radius | Idealized cylindrical growth domain. |
| Elongation speed | 180 µm/day | Path speed before wall reflections or an outlet stop; zero is supported. |
| Directional cue | 0.7, dimensionless | Multiplier on an estimated 3 day⁻¹ orientation relaxation rate. |
| Angular diffusion | 0.16 rad/√day | Estimated stochastic steering scale. |
| Branch hazard | 0.08 day⁻¹ | Rate of at least one branch event, rather than a probability per numerical step. |
| Branch angle | 28 degrees | Estimated deflection at birth. |
| Target capture radius | 18 µm | Geometric encounter envelope; not a molecular synaptic cleft. |
| Formation probability | 0.4 per distinct path–target encounter | Independent exploratory Bernoulli trial. |
| Maturation interval | 0.75 day | Assumed delay from accepted encounter to a candidate connection. |
| Seed | 4281 | Repeatable realization, not a biological subject identifier. |

Changing the seed changes the realization. With the default seed and settings, geometrical encounters can occur without any accepted candidate synapses. That outcome is preserved; contact is not automatically labeled successful integration.

## Direction, growth, and confinement

Each neurite retains a unit direction from its previous step. When a target is available, the direction relaxes toward that target using

```text
w = 1 − exp(−cueStrength × cueRatePerDay × dtDays)
d_drift = normalize((1 − w) d_old + w d_target)
```

A Gaussian random vector is projected onto the plane perpendicular to `d_drift`, scaled by `angularDiffusionRadPerSqrtDay × sqrt(dtDays)`, added, and normalized. This gives a persistent stochastic direction with a declared time-step scaling. It is a geometric approximation; the module does not solve chemical diffusion or growth-cone mechanics.

The intended extension is `speedUmPerDay × dtDays`. A ray/cylinder intersection resolves wall encounters, reflecting direction at the side wall and the entry plane. Reaching the far outlet stops that neurite. Saved trajectories include reflection points with their actual times, and recorded path length is the sum of traveled segment lengths. No endpoint is teleported to a target. A safety limit of 24 wall reflections per update prevents unbounded numerical work for extreme settings; any untraveled requested distance is reported. The output's total length sums parent and child path lengths without counting the parent's history again for a child.

Targets are idealized encounter regions at the outlet, radially distributed within the cylinder. They are not reconstructed host dendrites. The UI maps selected unique candidate target counts into a separate electrical run; that transfer is an exploratory topology choice. It transfers a count rather than individual target identities, trajectories, or synaptic weights. The existing electrical connection pattern assigns the resulting count, so a candidate is not a reconstruction of an individual simulated electrical synapse. The grown trajectory and electrical cable are not identical.

## Branching and encounter trials

Branching uses the probability

```text
p_branch(dt) = 1 − exp(−branchHazardPerDay × dtDays)
```

The API retains the field name `branchProbabilityPerDay`, but its unit and interpretation are **day⁻¹ hazard**. The survival probability composes consistently over subdivisions of time. At most one child per active path is created per update, at the end of that update; branch timing is therefore quantized and high hazards require convergence checks. Different step sizes need not produce identical seeded trajectories, because the random draw sequence changes. Identical settings and seed do reproduce the same result.

A line-segment/sphere intersection checks the whole traveled segment. This detects a target even if both saved endpoints lie outside its capture envelope. The earliest intersection determines encounter position and time. Each path gets one formation trial for each target it encounters; remaining inside a target does not repeatedly redraw until it succeeds. Parent and daughter paths are separate potential contacts.

An accepted trial enters a pending state. Only after the explicit maturation interval is it returned in `candidateSynapses`. The candidate retains its encounter identifier and always has `functionalValidation: false`. It is not a demonstrated functional synapse. If maturation falls after the requested simulation horizon, it remains pending. The user must explicitly transfer a candidate target count into the electrophysiology model and test its computed behavior.

Steering, branching, and formation use independent seeded pseudorandom streams. Changing the formation probability consequently changes connection outcomes without moving the neurites. A probability of zero produces no candidates; one accepts every encountered target, subject to maturation time. Neither setting bypasses the encounter requirement.

## Bounded work and reproducibility

The default limits are 96 paths and 20,000 saved vertices. The maximum supported limits are 256 paths and 100,000 vertices. A path limit blocks additional branches and reports their number. A vertex limit ends growth, discards the incomplete global step, and returns `truncated: true` with the actual completed time horizon. The UI must not treat that as a complete simulation of the requested duration.

The result contains normalized settings, model version, roots/branches with timed vertices and measured lengths, targets, encounters, candidate records, and metrics. No wall-clock timing or unseeded randomness is included. The entire result is suitable for reproducible JSON export.

## Verification

`tests/biohybrid-growth.mjs` checks deterministic replay, seed variation, exact straight-line speed, zero speed/duration, finite cylinder confinement, chronological vertices, measured path length, outlet stopping, segment crossings, absent targets, probability-zero/one behavior, delayed candidate maturation, hazard composition, branch/vertex caps, and invalid parameter rejection.

These tests establish software and geometric consistency. They do not validate growth rates, attraction strength, branch statistics, synaptic maturation, or integration probability against biological data. No in-vivo or long-term outcome prediction is warranted.
