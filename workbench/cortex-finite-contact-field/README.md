# Finite-contact extracellular field component

Version 1.0.0 delivers a numerical **equipotential circular disk**, an offline
FEM generator, a versioned field package, and a browser/Worker JavaScript
potential sampler. It is a standalone contribution for BuildTheSimulation;
the repository and website were not modified or deployed.

The exposed disk has radius 25 µm (diameter 50 µm), lies in an infinite
insulating plane, and contacts homogeneous isotropic tissue of conductivity
0.3 S/m. Positive prescribed current enters tissue. An artificial grounded
cylinder of radius and height 50 mm approximates return at infinity.
The unit field is in V/A; all runtime core quantities use SI.

**Status: experimental integration candidate for this benchmark geometry.**
All final release gates pass. The accepted runtime region is tissue with
0 ≤ r ≤ 250 µm, 0 < z ≤ 250 µm, excluding points less than 0.5 µm from the
sharp rim. This is a tested numerical coverage region, not a uniform error
proof or biological safety boundary. Do not change the simulator's existing
25 µm guardrail on the strength of this package alone.

Start with [INTEGRATION_HANDOFF.md](INTEGRATION_HANDOFF.md),
[validation/REPORT.md](validation/REPORT.md), and
[docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md).

## Setup and reproduction

Tested environment: Linux x86-64, Python 3.12.14, Node.js 24.19.0,
NumPy 2.3.5, SciPy 1.17.0, Matplotlib 3.10.8. The numerical dependencies are
pinned; no native FEM library, mesher service, or Python is needed at runtime
in the browser. Python builds the graded mesh directly. This small SciPy FEM
implementation was chosen for transparent boundary conditions, low setup
cost, and independent verification. Its present mesher supports this disk
only; the documented 3D FEM/BEM extension is **not implemented**.

From this directory:

```bash
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1
export MPLCONFIGDIR="$PWD/work/matplotlib"
python -m validation.study --force
python -m solver.current_control --solution validation/checkpoints/L2_R2000.npz --output validation/current-control-results.json
npm test
node --expose-gc tests/validate-js.mjs
node examples/waveform.mjs
```

`--force` regenerates all eight numerical cases. Without it, source-hashed
checkpoints are reused. Each subprocess has a 240 s limit and writes a log
and NPZ checkpoint before the next case. One final finest solve measured
3.21 s and 671 MiB peak process RSS on the supplied environment; allow at
least 1 GiB available memory. Timing is hardware dependent.

To verify an actual browser and Worker, install the optional test driver:

```bash
python -m pip install -r requirements-browser.txt
python -m playwright install chromium
python tests/browser-validation.py
python -m validation.finalize
python -m validation.plots
python -m validation.package
```

The browser runner uses an installed `chromium` if available, otherwise
Playwright's browser; `CHROMIUM_EXECUTABLE=/path/to/chromium` selects one
explicitly. The delivered measurements use Chromium 154.0.8037.57 and
Playwright 1.62.0. The driver serves only loopback, opens a main-thread test,
a module Worker test, and the interactive example, then closes the browser.
Its `--no-sandbox` launch flag is for the isolated validation container.
Running the webpage normally does not require that flag.

`validation.finalize` requires both Node and browser result files; it does
not claim browser success when they are absent. It exits nonzero for failed
final release gates. Historical and coarse-refinement failures remain in
the consolidated report. After changes, rerun every affected validation;
archived reports describe the shipped source, not arbitrary modifications.

Generate only the final field with:

```bash
python -m solver.fem --level 4 --domain 2000 --output work/final.npz --export artifacts/disk-v1 --force
```

To run the interactive example:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/examples/browser.html`. HTTP localhost or HTTPS
provides Web Crypto for mandatory SHA-256 verification. No remote service
or solver is called by the sampler.

## Contents

| Path | Purpose |
|---|---|
| `solver/fem.py`, `solver/METHOD.md` | Mesh generation, P1 FEM, current normalization, export |
| `solver/current_control.py` | Separate current-loaded algebraic formulation check |
| `artifacts/disk-v1/field.json`, `field.bin` | Portable manifest and little-endian nodal field |
| `js/field-sampler.js` | Dependency-free browser/Worker sampler and SI helpers |
| `tests/`, `examples/` | Automated tests, real browser runner, cached biphasic waveform |
| `validation/tolerances.json` | Predeclared, unchanged acceptance criteria |
| `validation/results.json`, `REPORT.md`, `plots/` | Machine-readable evidence, report and figures |
| `validation/checkpoints/` | All numerical solutions, source fingerprints and logs |
| `validation/initial-domain1000-results.json` | Original failed domain gate, retained |
| `docs/PHYSICAL_MODEL.md` | Assumptions, boundary conditions and primary references |
| `docs/ARBITRARY_GEOMETRY_PATH.md` | Credible 3D FEM/BEM plan and unimplemented scope |
| `FILE_MANIFEST.json`, `SHA256SUMS` | Archive inventory and integrity checks |

Verify the extracted archive with `sha256sum -c SHA256SUMS`. The checksums
detect corruption; they are not a publisher signature. The outer ZIP has
its own separately supplied SHA-256. Third-party packages retain their
own licenses; original source in this archive is MIT licensed.
