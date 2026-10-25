# Cell Growth Lab 2.1: local growth behavior

## Problem and resulting behavior

Continuous shared growth drive produced overly uniform advancing processes and
fixed-angle tip splits. Strictly coplanar paths could only turn away at a shaft.
Microscopy reference recordings instead motivated unequal local advance,
changing exploratory tips, and asymmetric branch histories.

The engine now has independent, serializable growth/pause/retraction episodes
per tip, variable cone-rim and filopodial exploration, variable-angle tip splits
and lateral buds at retained nodes. Plate paths can rise over transverse shafts
while preserving swept finite-radius collision checks. Growth episodes can be
blended down to zero for a continuous-drive comparison.

## Verification

- 55 distinct cell-growth tests pass (54 in the full run plus the added
  interleaved-ancestry regression), including new tests for asynchronous episodes,
  timestep-partition integration, exact save/resume, invalid imports, a genuine
  projected crossing with positive physical clearance, and lateral tree ancestry.
- The remaining top-level site suite passes 773 tests, with two browser tests
  skipped because their browser prerequisites are unavailable.
- Astro builds all 526 pages successfully.
- Mechanical verification passes all 13 acceptance gates.
- All 34 numerical acceptance gates pass across the two current reports.
- All four 72-hour presets complete with no detected solid, soma, unrelated
  shaft, or growth-cone penetrations, and closed membrane-area ledgers.

The cloud browser could not access the local preview due to its URL policy.
Local browser appearance and playback have therefore not been verified.

## Scientific and compatibility limits

These changes use the recordings qualitatively. Durations, branch probabilities
and routing gains are model choices, not extracted biological measurements.
The episode state is not a molecular signal or traveling actin-wave simulation.
A projected overlap does not identify a functional synapse. Crossing is a
geometric routing approximation; established distal shafts remain anchored.

Version 2.1 saves include per-tip episode state. Version 2.0 saves are rejected
explicitly rather than silently replaying under changed rules.
