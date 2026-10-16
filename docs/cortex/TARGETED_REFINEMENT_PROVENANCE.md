# Targeted study provenance and completeness

The targeted experiment's numerical criteria are frozen in
`TARGETED_REFINEMENT.md`. Its direct hashes cover the active kernel, channel
implementation, native morphology adapter, transforms, model asset and volume
conductor. Configuration defaults, placement and device definitions, pulse
helpers, and the production comparison's transitive imports also affect
reproduction.

`scripts/cortex-targeted-refinement-audit.mjs` closes that provenance gap by
walking the complete static local-import graph, hashing it before and after the
study, and auditing the pulse helper functions. It records the completed report
hash in `benchmarks/targeted-refinement-provenance.json`. Use this wrapper for
future complete reproduction:

```sh
CORTEX_REFERENCE_PYTHON=/path/to/pinned-env/bin/python \
CORTEX_ACTIVE_MECHANISM_LIBRARY=/path/to/x86_64/libnrnmech.so \
node scripts/cortex-targeted-refinement-audit.mjs
```

The initial execution began before this wrapper was added. It used the study's
initial core-source hashes plus an explicitly timestamped supplemental
configuration/placement/catalog/pulse snapshot captured during execution, then
checked at completion. The supplemental file records that narrower historical
capture scope without claiming all transitive files were hashed at launch. The
complete import graph is included in its final audit.

Fixed waveform experiments integrate the full 20 ms observation. Threshold-only
trials integrate until the first qualifying crossing, or to 15 ms if none occurs;
an already observed event cannot change its existence classification later.
Their current-residual maxima therefore cover the timesteps actually simulated,
not an uncomputed post-crossing trajectory. The nominal configuration retains
the fixed-case duration, while each threshold's explicit event window is 15 ms.

The lightweight `tests/cortex-targeted-refinement-report.mjs` test guards the
declared matrix, actual tested threshold endpoints, stable source and criteria
hashes, physical invariants, and truthful retention of failed gates. It does not
require every scientific acceptance gate to pass. Updating a numerical input
requires regenerating the study; changing tolerances to hide a failure does not
satisfy the audit.
