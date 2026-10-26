# PRIMA Photovoltaic Laboratory

An independent research simulation of a reconstructed 378-pixel subretinal
photovoltaic array, with a separate reproduction of the published ProViSim
appearance approximation.

- [Interactive laboratory](https://buildthesimulation.com/simulations/retinal-implant/prima/)
- [Scientific methods](https://buildthesimulation.com/simulations/retinal-implant/prima/methods/)
- [Electrical equations and numerical assumptions](PHYSICS.md)
- [Published percept implementation and reference provenance](PERCEPT.md)
- [Percept verification report](PERCEPT_VALIDATION.json)
- [Physics verification and refinement report](PHYSICS_VALIDATION.json)
- [Complete experiment verification report](INTEGRATION_VALIDATION.json)

## Model structure

`src/lib/prima/engine.mjs` constructs a physical retinal image, averages it over
each reconstructed hexagon, and runs two calculations. The photovoltaic circuit
predicts currents, capacitive charge and conductive half-space fields. ProViSim
filters the normalized image using the pinned publication's spatial and contrast
operations. The electrical field is not a calibrated input to the appearance
model.

`physics.mjs` solves all 378 active interfaces with a connected return. It retains
dark recovery currents, reports residual charge, and checks nonlinear current
balance before accepting a step. `geometry.mjs` provides the idealized lattice
and finite-width return basis. These are reduced equations with documented
assumptions, not a manufacturer CAD model or a patient-specific retinal network.

`PrimaLaboratory.jsx` runs the numerical pipeline in a module worker. The 3D,
plan, section, image, field and waveform views consume its results. Changes clear
stale results immediately. A cancelled worker cannot publish a result into a
replacement calculation. Saved JSON restores only validated settings and local
image samples; imported numerical results are ignored and recomputed.

## Reproduce verification

Use Node 22 and Python 3.12. Install Python requirements in an environment of your
choice; the versions are pinned in the repository.

```sh
npm ci
python -m pip install -r scripts/prima-reference/requirements.txt
python scripts/prima-reference/percept_reference.py --check
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python scripts/prima-reference/physics_reference.py --check
node scripts/prima-reference/verify_percept.mjs
node --test tests/prima-percept.test.mjs tests/prima-physics.test.mjs tests/prima-experiment.mjs
npx astro build
node scripts/verify-prima-build.mjs
```

The ProViSim fixture is generated from the original numerical Python functions,
retained with their MIT license and source checksums. The physics reference uses
independent SciPy linear algebra, a global nonlinear solve, and continuous-time
integration for refinement comparisons. The JavaScript solver does not generate
its own expected numerical values.

The `Verify PRIMA laboratory` GitHub workflow also runs an explicit Chrome gate:

```sh
PRIMA_REQUIRE_BROWSER=1 PRIMA_QA_DIR=prima-browser-artifacts node --test tests/prima-browser.mjs
```

That gate requires installed Chrome and Astro, exercises the real worker and
file controls, and saves graphics screenshots and a machine-readable report.
It is skipped in ordinary local numerical test runs. Local visual development
can use the host environment's managed application preview.

## Interpretation

Numerical reference agreement establishes implementation accuracy for the named
equations and cases. The model does not estimate an individual patient's acuity,
reading performance or thermal exposure limit. The nominal 20/417 sampling
equivalent, magnified scene coverage, optical incident power, extracellular
driving difference and normalized image brightness each describe a different
quantity. The interface and exported provenance retain these distinctions.
