# Native reference runtime investigation (2026-11-03)

The failure in [run 41675963989](https://github.com/corbins-cryo-pod/buildthesimulation/actions/runs/41675963989/job/126056517483)
was Python reference reproduction, not CPU/GPU parity. The actual tested merge
was `1a21c8b5cd2765b76fa64e0e72e99d05246ccb67`. Its complete tree matches the
subsequently merged `e0db7db` main tree. The retinal inputs also match passing
run 40363750602. The workflow moved from Ubuntu 24.04 to 26.04 through
`ubuntu-latest`.

## Controlled evidence

Local host: Debian 13, glibc 2.41, AMD EPYC 9V45, Python 3.12.14. Both CI runs
used Python 3.12.15. All experiments used the unmodified pinned packages in
`scripts/retinal-reference/requirements.txt`, the same installed wheel files,
`OPENBLAS_NUM_THREADS=1`, and `OMP_NUM_THREADS=1`. No golden files were rewritten.

The upstream source archive SHA-256 was verified as
`8a9ba4997212ca1b9e386814808c4aadf2a6ba5427664f3961911ab461104b34`.
Its `pulse2percept/models/retina/_beyeler2019.pyx:33` implements
`fast_jansonius`. This function calls system float32 `tanhf` for the Jansonius
coefficients, which then enter `powf` and the trajectory angle. Changing only
`tanhf` to the older implementation restores the exact geometry and passes the
full native verifier. Separately substituting `expf`, `sinf`, or `cosf` leaves
the failure unchanged. Thus a package-version pin alone does not specify this
reference's numerical runtime.

At one actual coefficient input, 2.0864861011505127, old `tanhf` returns
0.9696546792984009 and new `tanhf` returns 0.9696547389030457. This is a numerical
compatibility change, not evidence that the newer math implementation is wrong.

| Experiment | RE.xy maximum delta, μm | Geometry SHA-256 |
| --- | ---: | --- |
| Host default or Ubuntu 26.04 libm | 0.0079345703125 | `b584732ea5e4027bc8b879d830eb7681867752b38a5629d79b3700d29ed82700` |
| Ubuntu 24.04 libm only | 0 | `3e0a5a4e8ebf3aa6e1576452b2d19e97ebdaca701414b6df25049b907ef2a79d` |
| Only Ubuntu 24.04 tanhf | 0 | `3e0a5a4e8ebf3aa6e1576452b2d19e97ebdaca701414b6df25049b907ef2a79d` |
| Actual Ubuntu 24.04 container, no library substitution | 0 | `3e0a5a4e8ebf3aa6e1576452b2d19e97ebdaca701414b6df25049b907ef2a79d` |
| Ubuntu 24.04 libm, NumPy AVX-512 disabled | 0.001953125 | `4d70194b9dc6ee14584693ea47b0c4c037898baa936209d31b2d9ebd2d1b499e` |
| New libm, NumPy AVX-512 disabled | 0.007080078125 | `0f9e9c680ba719be8f289ee8791081ef6853d06811ec1fdc2697e6463017431f` |

The zero-delta SHA is the committed golden SHA. The older AVX-512-disabled SHA
matches the passing CI run exactly. Failing CI produced
`6b35758a9e6d0d04895ba037e8e0477bb08373a2388df33513b83eb551d0e97b`;
we reproduced its error magnitude but do not claim to have reproduced every
byte on its different CPU/runtime. Disabling AVX-512 alone does not fix the
newer-libm failure.

## Library identity and reproduction commands

Images used:

- Ubuntu 24.04: `ubuntu@sha256:fe81560990fae86dc4743202b2cb4d3df98d0bcf949173cecef15ce1127ef852`
- Ubuntu 26.04: `ubuntu@sha256:6a06111c3b0a8600feadb270aec771dc239bf407b25625f93f44ab00e11f4d3c`

The file extracted from each image was `/usr/lib/x86_64-linux-gnu/libm.so.6`.
Its SHA-256 was, respectively:

- `fce00b6f25f459cf4ae0b7fae4257909a1a8a86f9149e7c029a5d617baf1ccd0`
- `1c488db6f4fe8cecb72456bc018de000b7a9b539c2994864b0416b5e8371b3d8`

The following commands reproduce the controlled experiment on Linux x86-64.
Run from the repository root, with Docker configured normally. Library
substitution is diagnostic only; CI uses the normal Ubuntu 24.04 runtime.

```sh
python3.12 -m venv /tmp/retinal-venv
/tmp/retinal-venv/bin/pip install -r scripts/retinal-reference/requirements.txt
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
mkdir -p /tmp/retinal-evidence
docker run --rm ubuntu@sha256:fe81560990fae86dc4743202b2cb4d3df98d0bcf949173cecef15ce1127ef852 cat /usr/lib/x86_64-linux-gnu/libm.so.6 > /tmp/retinal-evidence/libm24.so.6
docker run --rm ubuntu@sha256:6a06111c3b0a8600feadb270aec771dc239bf407b25625f93f44ab00e11f4d3c cat /usr/lib/x86_64-linux-gnu/libm.so.6 > /tmp/retinal-evidence/libm26.so.6
for version in 24 26; do
  LD_PRELOAD=/tmp/retinal-evidence/libm$version.so.6 /tmp/retinal-venv/bin/python scripts/retinal-reference/generate.py --repo /tmp/retinal-evidence/v$version
  /tmp/retinal-venv/bin/python -W error scripts/retinal-reference/field_reference.py --output /tmp/retinal-evidence/v$version/tests/fixtures/retinal-field/independent-reference.json
  /tmp/retinal-venv/bin/python scripts/retinal-reference/verify_reproduction.py --generated /tmp/retinal-evidence/v$version
done
```

Repeat generation with
`NPY_DISABLE_CPU_FEATURES=X86_V4,AVX512_ICL,AVX512_SPR` for the dispatch comparison.
For selective substitution, compile this diagnostic shim and preload it instead
of all of libm (change `tanhf` to `expf`, `sinf`, or `cosf` for negative controls):

```c
#include <dlfcn.h>
float tanhf(float x) {
    static float (*original)(float);
    if (!original) original = dlsym(dlopen(
        "/tmp/retinal-evidence/libm24.so.6", RTLD_LAZY | RTLD_LOCAL), "tanhf");
    return original(x);
}
```

```sh
gcc -shared -fPIC /tmp/retinal-evidence/old-tanhf.c -ldl -o /tmp/retinal-evidence/old-tanhf.so
LD_PRELOAD=/tmp/retinal-evidence/old-tanhf.so /tmp/retinal-venv/bin/python scripts/retinal-reference/generate.py --repo /tmp/retinal-evidence/tanhf
```

For the actual Ubuntu 24.04 container test, the installed Python runtime and
site-packages were mounted read-only. `python_root` below must be a relocatable
Python 3.12 installation compatible with glibc 2.39 (the task used its managed
standalone Python); a normal distro Python may require installation inside the
container instead.

```sh
python_root=$(/tmp/retinal-venv/bin/python -c 'import sys; print(sys.base_prefix)')
docker run --rm   --mount "type=bind,src=$python_root,dst=/opt/python,readonly"   --mount type=bind,src=/tmp/retinal-venv/lib/python3.12/site-packages,dst=/opt/packages,readonly   --mount "type=bind,src=$PWD,dst=/repo,readonly"   --mount type=bind,src=/tmp/retinal-evidence,dst=/evidence   -e PYTHONPATH=/opt/packages -e MPLCONFIGDIR=/tmp/matplotlib   -e OPENBLAS_NUM_THREADS=1 -e OMP_NUM_THREADS=1 -w /repo   ubuntu@sha256:fe81560990fae86dc4743202b2cb4d3df98d0bcf949173cecef15ce1127ef852   sh -c '/opt/python/bin/python3.12 scripts/retinal-reference/generate.py --repo /evidence/container && /opt/python/bin/python3.12 -W error scripts/retinal-reference/field_reference.py --output /evidence/container/tests/fixtures/retinal-field/independent-reference.json && /opt/python/bin/python3.12 -W error scripts/retinal-reference/verify_reproduction.py --generated /evidence/container && /opt/python/bin/python3.12 -W error -m unittest discover -s scripts/retinal-reference -p "test_*.py" -v'
```

This passed all native comparisons (16 percept cases and 69 electrical cases)
and all 26 Python tests on final code. The existing 0.004 μm geometry bound,
percept bounds, exact topology, zero controls, hashes, and provenance rules
remain unchanged. Future runner upgrades need a reference compatibility study.

## Browser cancellation regression

Two local runs of the original harness reached `running`, then observed
`complete` when checking the result of cancellation. The running-state check
and click were separate CDP round trips, allowing completion between them.
The harness now checks `running` and clicks Cancel in one browser task. It
still starts the real worker, requires `running`, verifies state `dirty` and
export disabled after cancellation, and reruns the experiment to completion.
The full browser test passed after this change; no product logic or assertion
was removed.
