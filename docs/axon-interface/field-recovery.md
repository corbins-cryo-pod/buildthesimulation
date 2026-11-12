# Field and integration recovery provenance

The execution environment was reset before all development work had been
pushed. Files in this recovery batch were restored from retained source bodies,
patches and tool output. Known original hashes were compared with the restored
bytes. A hash match establishes source recovery, not a fresh numerical pass.

| Restored source | SHA-256 | Recovery status |
|---|---|---|
| `src/lib/axon-interface/field.mjs` | `c55565795085e37bc1804c99c152f79d563e8cad678f2eafc2e41dc3ce5a9734` | Exact original final source |
| `tests/axon-interface-contracts.mjs` | `1086b4d25fa68b33c6f75891728c6b9796bfa7d52dd280814dfc08a51a8cb338` | Exact original final source |
| `scripts/axon-interface/reproduce.py` | `e3df95c12f6244801e60b50bb8e198c1c9df7180264bb6e12f0007a9b5fb54aa` | Exact original final source |

The independent field reference, field validation script, immutable acceptance
file, field contract tests, Worker harness and reproduction requirements were
restored from their retained complete bodies. The field validation was then
executed again. Its fresh report completed at `2026-11-11T22:08:10.996Z` with
12 of 12 declared checks passing; its source hashes identify the measured code.
Subsequent combined reproductions may replace that current report with a newer
execution of the same source.

The field methods document was rewritten from the recovered code and fresh
report. It is a faithful current description; no exact historical document
hash is claimed. A retained settings source was supplied to the audit owner as
a recovery aid. It includes the final conductivity choices but may precede
the final wording of the limitations. Its original final hash is not claimed.

The old machine-readable integration and complete reproduction reports were
lost. Historical failures were reconstructed as explicitly marked JSONL
records with unknown original timestamps. They retain the measured failed
radial field refinement, the erroneous floating-point interval expectation,
the virtual-environment symlink issue, the source-change rejection and an
interrupted reproduction. They are not presented as new measurements.

The previous full reproduction had reported a pass, but those old report bytes
are unavailable. No current pass is reconstructed from memory. The recovered
integration and reproduction programs must run again against the actual
production source. The reconstructed MRG solver has a recovery-specific
version and must be evaluated with fresh native NEURON and coupled comparisons.

The full original MRG solver body was not present in this agent's retained
history. A complete historical validator and an explicitly incomplete native
reference fragment were supplied to the MRG owner as recovery aids; later
validator additions and the original missing reference tail were not claimed
as recovered. The MRG owner is responsible for the reconstructed source,
source provenance and new numerical evidence.
