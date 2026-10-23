# Biohybrid laboratory — retained numerical findings

Date: 23 October 2026. Model: `biohybrid-hh-cable/1.0.0`.

This record preserves failed development checks and their resolutions. Passing
software and numerical verification does not establish biological validity.
The system uses a generic canonical Hodgkin–Huxley membrane at 6.3 °C, synthetic
branched geometry, and assumed synaptic parameters. It is not a calibrated
mammalian neuron, experimental micro-TENN, or chronic implant model.

## Acceptance criteria fixed before measurement

- Zero-input steady-state drift: at most 0.1 mV, with no spontaneous spikes.
- Timestep halving: membrane waveform RMS error at most 1 mV and corresponding
  threshold-crossing shifts at most 0.1 ms.
- Spatial refinement: trunk conduction delay change at most 5%, and neural
  peak-to-peak amplitude change at each remote recording disk at most 10%.
- Zero coupling: graft excitability retained, no host spikes for the default
  extracellular stimulus; geometry must remain identical.
- Signed outward membrane currents including capacitance and synaptic current
  must satisfy local Kirchhoff current balance. Tolerance: 1e-8 nA.

## Initial subthreshold candidate

The initial candidate stimulation amplitude, −12 µA with a 0.4 ms phase, failed
to initiate any soma action potential. Maximum soma potentials were about
−56.5 and −51.4 mV in the early geometry; there were no host spikes. This was a
valid subthreshold result, not a reason to add forced spikes or a special-case
success animation. The functional preset uses −24 µA. The −12 µA case remains
an automated threshold regression.

## Failed spatial validation and corrective change

The first 25 → 12.5 µm mesh comparison changed recording contact 1's neural
peak-to-peak amplitude from 5.856 to 4.827 µV, approximately 17.6% relative to
the coarser value (21.3% relative to the refined value used by the acceptance
gate), failing the declared 10% gate. Host waveforms also showed large timing
changes. Trunk conduction delay changed by only about 1.4%.

Inspection identified a geometry error: selecting a postsynaptic target as the
nearest compartment center to an x coordinate could switch anatomical
dendritic branches when compartment length changed. This compared different
biological networks instead of refining one physical model.

The correction creates a fixed 6 µm dendritic landing branch at a predefined
anatomical location. Its synaptic contact and the axon-terminal endpoint remain
fixed while the surrounding cable is refined. All terminal branches also
remain present when their conductance is zero, isolating synaptic integration
from axonal loading changes. No tolerance was changed.

The corrected comparison passes:

| Quantity | 25 µm | 12.5 µm | 6.25 µm |
| --- | ---: | ---: | ---: |
| Trunk conduction delay (ms) | 2.120274 | 2.143848 | 2.155514 |
| Recording 1 neural p–p (µV) | 9.588412 | 9.646306 | 9.658507 |
| Recording 2 neural p–p (µV) | 9.745330 | 9.804819 | 9.812778 |
| Recording 3 neural p–p (µV) | 9.134042 | 9.160380 | 9.173378 |

The 25 → 12.5 µm conduction difference is 1.100%, and the largest recording
amplitude difference is 0.607%, using the refined result as denominator.

## Timestep and equilibrium checks

At 25 µm, reducing the timestep from 0.005 to 0.0025 ms changes the seven
monitored membrane waveforms by 0.199–0.454 mV RMS. The largest corresponding
spike-time shift is 0.014914 ms. All specified gates pass.

The canonical membrane's scalar equilibrium is −64.9740524516 mV. Starting at
this voltage with equilibrium gates and no input, maximum trace drift over
40 ms is 1.55e-11 mV, with zero spikes and effectively zero neural recording.
This is a numerical equilibrium check, not a claim about physiological noise.

## Recording and causality qualifications

Recordings use total outward transmembrane current, including capacitance,
ionic current, and synaptic current. Neural signal, directly applied stimulus
artifact, and their sum remain separate exported arrays. Changing conductivity
scales the fixed-source lead field inversely. A full rerun at changed
conductivity can also change stimulation and recruitment, so its signal need
not follow a simple inverse-conductivity rule.

A disconnected host can have a nonzero extracellular signal because the
contacts detect volume-conducted graft activity. A nonzero electrode trace is
therefore not by itself evidence of successful host activation.

A host spike after its own local synaptic event is labeled **consistent with
relay**. Earlier host spikes are counted separately. The disconnected control
is necessary to support causal attribution; the default control retains graft
spikes and eliminates all host spikes. The temporal ordering test alone does
not prove causation under every adjustable configuration.

## Independent verification

The native NEURON comparison is reported separately. This record and
`numerical-validation.json` do not claim agreement with an independent solver
until that comparison is run and its quantitative results preserved.

## Reproduction

```sh
node --test tests/biohybrid-engine.mjs
node scripts/validate-biohybrid.mjs
```

The second command writes the complete numerical report and exits unsuccessfully
if any declared quantitative gate fails. The regression file additionally
checks polarity, threshold, axon dimensions, connection distribution, passive
recording distance, finite-contact averaging, full-disk clearance, deterministic
replay, charge balance, current conservation, and separate artifact bookkeeping.
