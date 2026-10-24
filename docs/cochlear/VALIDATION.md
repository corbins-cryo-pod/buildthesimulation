# Cochlear Implant Laboratory — validation record

## Status

**Field and end-to-end numerical checks passed on 2026-10-24: 22 tests across the two files documented below.** These checks verify the implemented calculations and their coupling. Published-model reproduction, whole-site build checks, and browser interface checks are separate verification activities; passing this suite does not establish patient-specific prediction or biological validation.

The laboratory couples a sound processor, an interleaved charge-balanced pulse schedule, a homogeneous volume-conductor calculation, and a multicompartment auditory-nerve model. The quantitative coordinate system is an unrolled cochlea: cochlear place on x, longitudinal fiber coordinates on y, and radial contact distance on z. A coiled display is a schematic visualization of this calculation, not a tissue-boundary finite-element model.

## Physical reference and units

For a circular disk with uniform current density, radius `a`, total current `I`, and observation point on its normal axis at distance `z`, the potential in an unbounded homogeneous conductor of conductivity `sigma` is

```text
V(z) = I / [2 pi sigma (sqrt(z² + a²) + |z|)].
```

This stable expression equals `I/(2 pi sigma a²) * (sqrt(z²+a²) - |z|)`. It follows directly by integrating the point-source Green function `1/(4 pi sigma r)` over the disk surface.

- SI units give volts.
- With `I` in µA and `a,z` in mm, the same numerical expression gives mV.
- The center value is `I/(2 pi sigma a)`.
- The far-field limit is `I/(4 pi sigma |z|)`.
- An insulating half-space would double the potential. That is a different boundary model and is not the reference used here.
- A softened point-source kernel is not the exact disk solution.

For one rectangular pulse phase, `Q_nC = I_µA * width_µs / 1000`. Thus a 200 µA, 25 µs phase carries 5 nC. Opposite signed phases must cancel, and the interphase gap must carry no current.

For a serial interleaved schedule, the maximum occupancy is

```text
selected_contacts_per_frame * frame_rate_Hz
  * (2 * phase_width_µs + interphase_gap_µs + guard_µs) * 1e-6.
```

For CIS, every enabled contact is eligible in each frame. For n-of-m, the maximum selected count is `min(maxima, enabled_count)`. Frame rate is not the achieved rate at every contact under n-of-m selection.

## Independent field tests

| Check | Independent criterion | Result |
|---|---|---|
| On-axis disk reference | Compare radii 0.03, 0.15, 0.35 mm at axial distances 0, 0.01, 0.1, 1, 1000 mm | Passed |
| Far-field reference | Approach the full-space point-source solution at 100 mm within 10⁻⁶ relative error | Passed |
| Units | 100 µA, 1 mm axial distance, 0.15 mm disk, 1 S/m gives 7.91348143118 mV | Passed |
| Zero input | Zero delivered current gives zero evoked neural activity | Passed in integration suite |
| Conductivity | Halving homogeneous conductivity doubles potential | Passed |
| Coordinate invariance | Rigid translation, axis rotation, and disk-normal reversal preserve potential | Passed |
| Superposition | MP, BP, and partial-TP contact gains equal independently assembled source/return combinations | Passed |
| Return accounting | Source/return currents sum to zero, including partial-TP edge contacts | Passed |
| Finite inputs/outputs | Eight independent off-axis fixtures are finite; unsupported source-surface samples are rejected explicitly | Passed for tested fixtures |

The remote return is part of the potential calculation. Benchmarks against a single disk must isolate the source contribution or independently subtract the known return contribution.

## End-to-end acceptance tests

| Check | Failure caught | Result |
|---|---|---|
| Silent audio produces no pulses | False threshold carrier or envelope offset | Passed |
| A known 1 kHz tone reaches zero-based contact 6 in the 12-band map | Reversed tonotopy, index errors, filter-selection errors | Passed |
| Disabled source channels receive no source events | Mask applied to display but not actual scheduling | Passed |
| Every event fits its frame, serial slot, and clip duration | µs/ms errors, impossible rate/width combination | Passed |
| Opposite phases have equal and opposite charge | Pulse reconstruction or polarity mistakes | Passed |
| Zero drive gives stable rest | Solver bias or incorrect resting initialization | Passed |
| Uniform time-varying extracellular voltage does not excite the cable | Incorrect coupling or sealed-end discretization | Passed |
| Adding a spatially uniform reference to an actual field preserves neural responses | Incorrect extracellular reference dependence | Passed |
| A nonuniform finite-disk field causes propagated spikes in a documented positive control | Disconnected geometry, units, or local-only event detection | Passed |
| Geometry/current/source-channel changes alter the actual neural result | Stale field or response reuse across calculations | Passed |
| Distal response follows the proximal central-axon response | Confusing local polarization with propagated response | Passed |
| Local fiber loss removes its response while preserving the pulse schedule | Hidden stimulus changes or dead fibers contributing activity | Passed |
| Saved experiment roundtrip reproduces audio fingerprint, pulses, spikes, and membrane traces | Omitted units, input settings, mask, or random seed | Passed |
| Empty recruitment profiles have undefined normalized overlap | Treating nonresponse as excellent channel separation | Passed |
| Reported threshold bracket separates nonfiring and firing responses | Inconsistent pulse parameters, detection criteria, or reported threshold | Passed |

Published-model reproduction and numerical convergence are separate from these integration invariants. Agreement with an independent implementation is numerical verification; agreement with relevant measured data is biological validation. Neither should be described as patient-specific prediction.

## Concrete scheduler fixtures

| Enabled/selected contacts | Frame rate | Phase / gap / guard | Maximum occupancy | Expected result |
|---|---:|---|---:|---|
| 12, CIS | 800 Hz | 25 / 8 / 2 µs | 57.6% | Feasible |
| 12, CIS | 1600 Hz | 25 / 8 / 2 µs | 115.2% | Reject as impossible |
| 4 of 12, n-of-m | 1200 Hz | 25 / 8 / 2 µs | 28.8% | Feasible |

## Interpretation boundaries

- Field width, neural recruitment width, and channel overlap are different quantities. A normalized width must be accompanied by absolute current and recruitment.
- Geometric frequency-to-place mismatch compares an assigned sound band with a chosen anatomical reference. It is not a direct perceived-pitch estimate.
- A propagated action potential is a model result; a sum of spikes is not an electrically evoked compound action potential without a recording forward model.
- Acoustic vocoding illustrates selected information losses and does not reconstruct an individual recipient's auditory experience.
- Digital input level is dBFS unless an explicit acoustic calibration is supplied.
- No speech-recognition percentage, restored-hearing score, optimal clinical map, or surgical-injury probability is derived from these model outputs.

## Primary research informing experiment interpretation

1. **Goehring T, Archer-Boyd AW, Arenberg JG, Carlyon RP.** The effect of increased channel interaction on speech perception with cochlear implants. *Scientific Reports*. 2021;11:10383. [doi:10.1038/s41598-021-89932-8](https://www.nature.com/articles/s41598-021-89932-8). Direct manipulation of channel interaction supports studying recruitment overlap. Its perceptual results do not establish a universal numerical mapping from simulated overlap to speech recognition.
2. **Bierer JA, Litvak L.** Reducing Channel Interaction Through Cochlear Implant Programming May Improve Speech Perception: Current Focusing and Channel Deactivation. *Trends in Hearing*. 2016;20. [doi:10.1177/2331216516653389](https://pmc.ncbi.nlm.nih.gov/articles/PMC4948253/). Focusing and deactivation effects varied among participants and configurations, supporting comparative experiments rather than a guaranteed-benefit control.
3. **Sturm JJ, Ma C, McRackan TR, Schvartz-Leyzac KC.** Frequency-to-Place Mismatch Impacts Cochlear Implant Quality of Life, But Not Speech Recognition. *Laryngoscope*. 2024;134:2898–2905. [doi:10.1002/lary.31264](https://pubmed.ncbi.nlm.nih.gov/38214299/). This cohort study separates anatomical mismatch, early speech outcomes, and quality-of-life measures; a mismatch metric should not be relabeled as an intelligibility score.
4. **Başkent D, Shannon RV.** Interactions between cochlear implant electrode insertion depth and frequency-place mapping. *Journal of the Acoustical Society of America*. 2005;117:1405–1416. [doi:10.1121/1.1856273](https://pubmed.ncbi.nlm.nih.gov/15807028/). Shallow insertion was simulated through apical electrode deactivation. That experimental manipulation should not be represented as a direct surgical insertion trial.

## Executed checks

```sh
python tests/fixtures/generate-cochlear-disk-reference.py
node tests/cochlear-fields.mjs
node tests/cochlear-integration.mjs
```

- **Field/geometry suite:** 11 tests passed.
- **Integration suite:** 11 tests passed.
- `node --test tests/cochlear-fields.mjs tests/cochlear-integration.mjs` can run the same files through the repository runner. In the current runtime, that runner reports aggregate files; direct invocation shows the individual tests.

### Independent off-axis reference

`tests/fixtures/cochlear-disk-reference.json` contains eight numerical references. The generator analytically integrates azimuth using the complete elliptic integral of the first kind, then applies SciPy adaptive radial integration. Production uses Gauss–Legendre integration in squared radius and a discrete azimuthal rule. These are separate numerical methods.

Across the eight fixtures, including a 0.35 mm disk observed at only 0.1 mm axial separation:

| Production quadrature | Largest observed relative error | Test tolerance |
|---|---:|---:|
| Default 8 radial × 24 angular points | 5.8121 × 10⁻⁵ (0.0058121%) | 10⁻⁴ (0.01%) |
| Refined 16 radial × 64 angular points | 2.2334 × 10⁻¹⁰ | 5 × 10⁻⁹ |

These are errors for the stated homogeneous disk problem and tested positions. They do not quantify anatomical-model error, all possible locations, or clinical uncertainty.

### Field-to-cable positive control

The reference contact has center `[0, 0, 0.5]` mm, radius 0.15 mm, and normal `[0, 0, 1]`. The modeled fiber lies at cochlear place `x=0`; the remote return is at `[17.5, -20, 20]` mm; conductivity is 1/3 S/m. A cathodic-first biphasic pulse begins at 1 ms, with 1000 µA, 25 µs per phase, and an 8 µs interphase gap. The solver uses 1 µs steps and a distal detection criterion of an upward 0 mV crossing.

- Proximal central-axon event: approximately **1.7731 ms**.
- Distal central-axon event: approximately **1.8862 ms**.
- Distal maximum membrane voltage: approximately **22.761 mV**.
- A spatially uniform extracellular pulse produces no event and preserves rest.
- Adding a uniform 10 mV/µA offset to all values of the physical lead field preserves distal event time within 10⁻⁸ ms and final membrane potentials within 10⁻⁷ mV.

The timing above describes this deterministic model and prescribed geometry. It is not a measured human latency.

### Coupled processor/geometry/nerve control

The small integration fixture uses a 12 ms, 1500 Hz synthetic tone; 12 contacts across a 16 mm span ending at reference place 26 mm; n-of-m with one selected maximum; 600 frames/s; 25/8/2 µs phase/gap/guard; maximum current 1200 µA; 0.25 mm radial separation; nine modeled fibers; and 2 µs integration steps. A 3 ms response tail follows the sound.

| Change from fixture | Delivered source events | Propagated result |
|---|---|---|
| Baseline | Six events at zero-based source contact 5 | Six distal events in the fiber at 17.5 mm |
| Disable source contact 5 | Events select another enabled source | No distal events |
| Increase radial separation to 1.5 mm | Exact baseline event sequence retained | No distal events |
| Set maximum current to zero | No events | No distal events; stable rest |
| Remove the fiber at 17.5 mm | Exact baseline event sequence retained | Eight survivors; no distal events |
| Serialize and import the full experiment | Identical events and audio fingerprint | Identical spike times and recorded membrane arrays |

These fixtures verify causal coupling. They are selected test cases, not general assertions that increasing distance or deactivating a channel always changes perception in a particular direction.

### Deterministic threshold check

For the four-contact fixture with only source 0 enabled, radial separation 0.25 mm, and target fiber at 9.75 mm, a 25/8 µs biphasic pulse at 0.5 ms gives a nonfiring/firing bracket of approximately **385.4736–385.4980 µA** at a 2 µs solver step. The upper and lower endpoints are re-evaluated independently through the cable solver in the integration test.

The search finds the first sampled transition on a 25 µA coarse grid and then bisects that bracket. It does not prove global monotonicity or exclude a narrow response interval between coarse samples. The criterion is a distal 0 mV upward crossing within the **4 ms simulation window**, which starts 0.5 ms before the pulse. This is a deterministic model threshold, not an auditory or clinical fitting threshold.

### Scope of source-channel masks

A disabled source channel is excluded from source-pulse selection. It can remain eligible as a local return in bipolar or partial-tripolar configurations. The mask therefore does not represent a physically disconnected or electrically isolated contact.
