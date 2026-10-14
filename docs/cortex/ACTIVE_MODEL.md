# Active reference model and predeclared verification gates

Selected reference: Allen/Mosher–Wei human layer-2 spiny specimen **571654895**,
middle temporal gyrus. Source repository `AllenInstitute/Human_all_active_models_EAP`,
commit `750e7840cc1a9eb32492c924e79609a85a893b8a`; ModelDB entry 263961;
Mosher, Wei et al. (2020), DOI 10.1016/j.celrep.2020.02.027.

The source includes reconstructed dendrites and section-specific fitted membrane
parameters. The directed published processor replaces the reconstructed axon with
two 30 µm × 1 µm active sections at soma(1). The original axon is retained in the
downloadable SWC for provenance, but is not the simulated axon. No sensorimotor
identity, complete axonal anatomy or single-neuron selectivity is claimed.

The nine channel mechanisms are NaV, Ih, Im, K_Pst, K_Tst, Kv3_1, Ca_HVA,
Ca_LVA and SK, with CaDynamics and passive leak. Densities are fitted to human
somatic recordings; underlying kinetics include mouse sodium, rat potassium and
bullfrog M-current. They are not measured human channel kinetics.

## Initialization and morphology contracts

Use the parameter JSON's −80 mV initialization at 34 °C, followed by a declared
100 ms no-drive conditioning period. The upstream example instead starts at
−70 mV; this difference is explicit. Frame zero is the conditioned state, not
an assertion of exact equilibrium. The NaV seqinitial I3 equation uses `bi3`
where the kinetic reverse transition uses `b13`; the browser preserves this
legacy initialization and the correct subsequent kinetic transition equations.

The offline native NEURON SWC adapter retains taper, section area and axial
resistances, including shared zero-area branch junctions. It exports geometry
and parameters only. Four odd-segment meshes (maximum lengths 10/20/40/80 µm)
are derived from the same morphology. Zero-area nodes have no channel/membrane
or recording source. The renderer receives the full compartment polylines;
the line-source recording approximation uses each compartment's endpoint chord.
Chord accuracy must be assessed by spatial refinement.

The SWC contains 18,589 reconstruction rows. Import3d's native soma convention
is retained electrically; its displayed sphere has the same membrane area.
Mesh nodes are ordered parent before child and share zero-area section endpoints;
using independent child half-resistances would change the source circuit.

| Maximum segment length (µm) | Membrane compartments | Shared junctions | Total nodes |
| --- | ---: | ---: | ---: |
| 80 | 135 | 75 | 210 |
| 40 (default) | 211 | 75 | 286 |
| 20 | 369 | 75 | 444 |
| 10 | 669 | 75 | 744 |

Positions are soma-centered in µm. The source orientation uses X −0.010516 rad,
then Z −3.011895 rad, followed by `[X,Z,−Y]` to laboratory +Z depth, requested
cell X/Y/Z rotations and soma translation. The default soma is
`[−100,−200,1500]` µm. These rigid transforms do not stretch the cell or implant.

## Source membrane parameters and kinetics

The unmodified `optim_param_571654895.json` is the exact numerical authority.
Each density is uniform within its source section type and survives remeshing;
zero means the mechanism is absent. Values below are rounded to six significant
digits for readability; browser and native reference use full source precision.

| Parameter | Soma | Axon stub | Apical dendrites | Basal dendrites |
| --- | ---: | ---: | ---: | ---: |
| Cm (µF/cm²) | 3.66256 | 3.01338 | 0.421136 | 2.85871 |
| NaV (S/cm²) | 0.135438 | 0.391423 | 0.0181534 | 0.000269503 |
| Ih (S/cm²) | 0.0000245309 | 0 | 0.00000447718 | 0.00000629382 |
| Im (S/cm²) | 0 | 0 | 0.000477588 | 0.00352002 |
| K_Pst (S/cm²) | 0.0246325 | 0.0975583 | 0 | 0 |
| K_Tst (S/cm²) | 0.0131738 | 0.957913 | 0 | 0 |
| Kv3_1 (S/cm²) | 0.0112786 | 1.09153 | 0.0743371 | 0.0161232 |
| Ca_HVA (S/cm²) | 0.000190394 | 0.000165987 | 0 | 0 |
| Ca_LVA (S/cm²) | 0.000330344 | 0.00000247216 | 0 | 0 |
| SK (S/cm²) | 0.000386532 | 0.0139247 | 0 | 0 |
| CaDynamics decay (ms) | 438.851 | 148.907 | absent | absent |
| CaDynamics gamma | 0.00563041 | 0.00829359 | absent | absent |

All sections use Ra 129.088816436 Ω·cm, g_pas 0.0000526101819431 S/cm²,
E_pas −93.3142719865 mV, ENa +53 mV and EK −107 mV. Ih reversal is −45 mV.
Calcium begins at 0.0001 mM internally with 2 mM external concentration;
ECa follows the source Nernst convention at 34 °C. CaDynamics uses a 0.1 µm
shell, source buffer factor gamma and exponential removal to 0.0001 mM.

The executable `active-channels.js` port and original `.mod` files retain every
rate equation, activation/inactivation power and singular-voltage limit. NaV
uses its original 12-state kinetic network with an implicit linear step; scalar
gates use source exponential updates. Q10 conventions are mechanism-specific:
NaV uses 37 °C reference and Im/K/Ca_LVA use the source 21 °C factor where present;
K_Pst/K_Tst explicitly retain their fixed 34 °C assumption. No global temperature
slider or generic Hodgkin–Huxley substitution is used.

Voltage uses backward Euler with old channel state/reversals; state integration
then uses the new voltage. As in native NEURON, CaDynamics is driven by calcium
current evaluated with old gates and old voltage, then SK reads the new calcium
concentration. The separate solve-consistent old-state/new-voltage ionic current
is used for KCL and extracellular recording. This ordering was checked with a
native nonzero-Ca/SK probe and the complete cell traces, rather than inferred
from final current variables alone.

The browser timestep is 0.005 ms by default and output period 0.05 ms. Numerical
refinement is reported below; supported bounds are not a proof of convergence
for every user configuration. The synthetic synaptic protocol places a fixed
100 µm conductance patch on the longest apical section; it is an explicit test
input, not a reconstructed synapse or original model-fitting protocol.

## Acceptance gates, declared before inspecting active comparisons

| Comparison | Acceptance gate |
| --- | --- |
| Channel rates/state updates under specified voltage steps | State absolute error <1e−9; normalization error <1e−10 |
| Full voltage trace against native NEURON | Membrane-bearing nodes RMS <0.1 mV; maximum <1 mV |
| Computed spikes | Identical soma spike count; crossing-time difference <0.1 ms |
| Transmembrane currents | RMS <1% of reference peak or 1e−4 nA, whichever is larger |
| Applied and neural recordings against independent forward model | RMS <1% of reference peak or 1e−4 µV, whichever is larger |
| Local KCL and total conservation | Maximum residual <1e−8 nA |
| Tested amplitude threshold brackets | Independent solver brackets agree within 5% |
| Halved timestep and spatial refinement | Report spike count/time, voltage, signal and threshold changes; explain unresolved differences |

The gates check finite numerical accuracy, not biological uncertainty. They must
not be loosened after a failed comparison merely to pass. Reference generators
use native imported morphology and original NMODL mechanisms, not browser solutions.

## Achieved independent comparisons

Executed NEURON 9.0.1 using the pinned original SWC/NMODL and LFPykit 0.6.2
using its own recording matrix applied to native total membrane currents.
The shared input contains only geometry and exact configurations, never browser
solutions. The native generator independently imports/discretizes the morphology
and checks its topology against that input.

All cases retain 40 ms at 0.05 ms output period after 100 ms conditioning.
The default integration is 0.005 ms with 40 µm maximum length. Full physical
voltage/current traces are quantized to 1e−6 mV / 1e−7 nA, delta encoded and
hashed; rounding error is at most half a quantum, far below the declared gates.
Fourteen snapshots and dense soma/contact signals retain unquantized values.

| Case | Intervention / refinement | Soma events | Voltage RMS (mV) | Maximum recording RMS (µV) |
| --- | --- | ---: | ---: | ---: |
| Rest | No injected current | 0 | 2.8925e−7 | 1.26e−12 |
| Intracellular subthreshold | 0.05 nA for 5 ms | 0 | 2.8854e−7 | 1.28e−12 |
| Intracellular spiking | 1.2 nA for 5 ms | 1 | 2.8878e−7 | 1.08e−11 |
| Extracellular subthreshold | 1 µA bipolar pulse | 0 | 2.8924e−7 | 2.11e−13 |
| Extracellular local crossing | 40 µA bipolar pulse | 0 | 2.8908e−7 | 2.89e−13 |
| Changed implant pose | 40 µA; rotations [0,5,10]°; translation [−50,100,0] µm | 0 | 2.8896e−7 | 3.83e−13 |
| Half timestep | 1.2 nA; dt 0.0025 ms | 1 | 2.8834e−7 | 1.80e−11 |
| Refined morphology | 1.2 nA; dt 0.0025 ms; 20 µm mesh | 1 | 2.8875e−7 | 1.72e−11 |

Maximum voltage error is <5.05e−7 mV and current RMS <2.9e−8 nA across these
cases, at the encoding floor. Soma counts and all compartment first-crossing
classifications agree, with timing within the declared 0.1 ms gate. Both default
threshold boundaries agree with native NEURON: 0.928125–0.9375 nA for a soma
crossing, and 19.6875–20 µA for any-membrane crossing by 15 ms. These are specified
numerical event criteria, not experimental rheobase or proof of axonal recruitment.

The extracellular case uses r4-c4/r4-c5 with the standard 200 µs phases and 50 µs
gap; sensing sites are r3-c3/r3-c6. Exact configs and generator/package/source
hashes are in `tests/fixtures/cortex-active-neuron.json` and
`cortex-active-thresholds.json`. Original mechanism sources, offline generators
and pinned requirements are executable from the README reproduction instructions.
Normal Node CI uses the retained fixtures and requires no simulator installation.

Refinement preserves the soma event count; temporal signal change is 0.31%,
spatial change 1.13%, and spatial extracellular threshold sensitivity is 6.25%
at the benchmark's bracket resolution. This remains an explicit convergence
limit rather than a tolerance that was loosened. See [PERFORMANCE](PERFORMANCE.md)
for exact costs, storage, signals and threshold changes. Experimental validation
and interactive browser QA remain separate unfinished gates.

## Experimental evidence and license

The published model was fitted to somatic whole-cell recordings from surgical
human cortical tissue. Paper Figure 3 reports training error. This project has
not performed independent held-out biological validation. Allen raw NWB voltages
are uncorrected for a −14 mV liquid-junction potential; model/observation comparisons
must preserve that conversion explicitly. Public specimen NWB:
https://api.brain-map.org/api/v2/well_known_file_download/618228920.

The published preparation is ex vivo surgical human tissue, somatic whole-cell
current-clamp electrophysiology and biocytin morphology. The model uses 34 °C;
this milestone does not reconstruct a donor-specific bath/preparation history.
Paper Figure 3F reports training performance for the optimized models, including
this example. The fitted JSON supplies no fitting sweep IDs (`sweeps: []`), so
it cannot establish which individual public NWB sweeps were held out.
Available Allen features include uncorrected resting voltage −75.35 mV, input
resistance 123.93 MΩ, time constant 31.19 ms and long-protocol rheobase 120 pA.
These are source observations, not successful comparisons by this port. Our
conditioned rest is near −92.34 mV and retains drift; our 5 ms spike-threshold
bracket is not the experimental long-protocol rheobase. Raw NWB traces have not
been downloaded or validated in this stage.

Source and derived assets retain the **Allen Institute Software License**, a
BSD-2-derived license with a noncommercial redistribution restriction, verbatim
at `/models/cortex/allen571654895/LICENSE.txt` and beside offline mechanisms.
The site is noncommercial; do not describe this license as plain BSD.

Primary sources:

- https://github.com/AllenInstitute/Human_all_active_models_EAP
- https://github.com/AllenInstitute/ateam-tools/blob/04850c7bc585fa065073eda0fefd1fd401209b27/ateam/sim/cell_functions.py
- https://doi.org/10.1016/j.celrep.2020.02.027
- https://modeldb.science/263961
