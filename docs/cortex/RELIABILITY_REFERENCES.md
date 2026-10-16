# Independent reliability references — 2026-10-16

The new [comparison report](benchmarks/reliability-native-comparison.json) has
`completed: true`, `passed: true`: **12/12 tests passed** (provenance plus 11 fresh
native cases). NEURON uses the original SWC/NMODL; no JavaScript solution enters
generation. Independently reconstructed geometry and world coordinates match
the input exactly in every case.

The cases cover six historical extracellular threshold endpoints, 19 µA at each
40/20/10 µm mesh, the moved 40 µA/1000 µs soma-response example at 10 µm, and the
1.2 nA/5 ms intracellular example at 10 µm. All use dt = 0.00125 ms, −80 mV
initialization followed by 100 ms no-drive conditioning, 34 °C, 20 ms observation
and 0.05 ms retained samples. Each exact configuration is stored in
`tests/fixtures/cortex-reliability-neuron.json`.

These **historical wider brackets** concern any positive-area membrane's upward
−25 mV crossing by 15 ms. The tighter JavaScript brackets in
[TARGETED_REFINEMENT](TARGETED_REFINEMENT.md) were not independently verified
endpoint-for-endpoint by this native run.

| Maximum compartment length | Native lower: no local crossing | Native upper: local crossing | Native result at 19 µA |
| --- | ---: | ---: | --- |
| 40 µm | 19.37500 µA | 19.53125 µA | No local crossing |
| 20 µm | 18.59375 µA | 18.75000 µA | Local crossing |
| 10 µm | 19.06250 µA | 19.21875 µA | No local crossing |

All nine table cases have **zero soma crossings**: unchanged Utah r4-c4/r4-c5
pair, 200 µs cathodic-leading/return phases, 100 µs gap, onset 5 ms. All 11 cases
retain the same global classification at 15 and 20 ms; no first compartment
crossing occurs during 15–20 ms. The two soma-response cases each have one soma
crossing with sampled positive-peak/return evidence. Crossing order does not
establish initiation or propagation.

| Native/browser comparison | Worst error across 11 cases |
| --- | ---: |
| Complete physical-compartment voltage RMS | 2.8981 × 10⁻⁷ mV |
| Complete physical-compartment voltage maximum | 5.4327 × 10⁻⁷ mV |
| Membrane-current RMS | 2.8911 × 10⁻⁸ nA |
| First membrane-crossing time | 6.6053 × 10⁻¹¹ ms |
| Neural recording RMS | 8.0527 × 10⁻¹¹ µV |
| Applied-source artifact RMS | 8.6175 × 10⁻¹³ µV |

Voltage/current errors are approximately the reference quantization floor
(10⁻⁶ mV and 10⁻⁷ nA quanta); traces are not time-aligned. Agreement verifies these
discretized equations, not spatial convergence or biological accuracy. Consumers
must require both `completed` and `passed` and retain per-case/provenance gates.

## Reproduce the 11 cases

Run from the repository root. These offline dependencies and compiled mechanisms
are not website dependencies. The original compilation instructions and
host-specific `NMODL_PYLIB` guidance remain in [README](README.md#active-reference-reproduction).

```sh
python -m venv /tmp/cortex-reliability-neuron
/tmp/cortex-reliability-neuron/bin/python -m pip install -r scripts/cortex-reference-requirements.txt
cortex_repo_dir="$PWD"
mkdir -p /tmp/cortex-reliability-neuron-build
cd /tmp/cortex-reliability-neuron-build
CC=gcc CXX=g++ /tmp/cortex-reliability-neuron/bin/nrnivmodl "$cortex_repo_dir/scripts/cortex-active-mechanisms"
export CORTEX_ACTIVE_MECHANISM_LIBRARY="$PWD/x86_64/libnrnmech.so"
cd "$cortex_repo_dir"
/tmp/cortex-reliability-neuron/bin/python scripts/cortex-reliability-neuron-reference.py
CORTEX_RELIABILITY_REPORT=docs/cortex/benchmarks/reliability-native-comparison.json \
  node --test tests/cortex-reliability-reference.mjs
```

Generation replaces only the new reliability fixture/payloads and checks all 20
dependency pins. Observed runtime: NEURON 9.0.1 (`b12a541+`), LFPykit 0.6.2,
GCC/G++ 13.3.0. The fixture retains actual versions, source and compiled-library
hashes; compiled hashes can differ across hosts.

A stopped generator checkpoints completed cases. After stopping it, the same
environment can resume with isolated workers:

```sh
/tmp/cortex-reliability-neuron/bin/python scripts/cortex-reliability-native-parallel.py --workers 3
```

Do not run both writers simultaneously. Workers handle one case each; only the
parent writes the manifest. Provenance preserves the earlier duplicate-NMODL
worker-reuse failure and exact orchestration source/hash. Failed tasks supplied
no accepted results; numerical sources and acceptance limits were unchanged.

## Supplemental 42/43 µm source-position check

[position-check-latest.json](benchmarks/position-check-latest.json) retains this
separate research-only experiment: soma `[0,0,1500]` µm, active source
`[0,-42,1500]` or `[0,-43,1500]` µm, fixed return `[0,1000,1500]` µm, 40 µA,
200/100/200 µs phases/gap, 0.3 S/m, 10 µm compartments and dt = 0.00125 ms.
Explicit research positions override the configuration's catalog contact IDs;
importing that configuration alone into the normal UI does not recreate them.

Both implementations produce a soma crossing at 42 µm and none at 43 µm.
Their sampled soma peaks are approximately +18.6069 and −45.0272 mV. The
comparison covers **only the 801 retained soma-voltage samples**, at 0.025 ms
intervals including conditioned frame zero. Worst soma RMS/maximum differences
are 9.3460 × 10⁻⁹ / 1.3386 × 10⁻⁷ mV. This does not claim complete-compartment
or recording agreement for the supplement, minimum separation of two neurons,
or 1 µm biological targeting precision.

The record retains both soma traces, configurations, geometry checks, source
hashes and the exact executed scratch native wrapper. The relocated native
wrapper below was **not itself executed** for this result; its numerical routines
are unchanged and its serialized input was verified byte-identical. The browser
script was actually rerun. Reproduce using the environment above:

```sh
node scripts/cortex-position-study.mjs > /tmp/cortex-position-browser.json
/tmp/cortex-reliability-neuron/bin/python scripts/cortex-position-neuron-reference.py \
  --output /tmp/cortex-position-native.json
```

Both outputs provide `somaVoltageMv` and `spikeTimesMs` for the same two IDs;
compare soma arrays at matching indices without shifting time. The explicit
input generator is `scripts/cortex-position-reference-input.mjs`.
