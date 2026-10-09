---
title: "Neuropixels Opto photonic prototype"
order: 107
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0068"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
modality: "Intracortical"
description: "960-site, 384-channel electrical probe with two sets of 14 laser-fed photonic emitters. Prototype blue-light leakage and tethered operation remain explicit."
website: "https://www.nature.com/articles/s41592-026-03076-z"
tags: ["cortex", "recording", "stimulation", "bidirectional", "microelectrode", "Neuropixels Opto", "photonics", "optogenetics", "Allen Institute", "UCL", "IMEC", "prototype"]
draft: false
---

# Neuropixels Opto prototype

Lakunina, Socha, Ladd and colleagues combine electrical recording with dual-color photonic stimulation in a Nature Methods paper published June 1, 2026. Values are scoped to the prototype in that paper and its supplement. A blank cell means not established by the reviewed sources.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Neuropixels Opto prototype: silicon CMOS recording probe with integrated dual-color photonic emitters |
| Manufacturer | Allen/UCL collaboration with UK and Belgian development partners; recording backend derives from Neuropixels 1.0. Prototype, not a commercial product |
| Interface class | Penetrating silicon probe with integrated optical waveguides and electrical recording |
| Origin | Lakunina, Socha, Ladd and colleagues; Nature Methods, June 1, 2026 |
| First demonstrated | 2026 peer-reviewed paper; supplement Table 2 distinguishes 2019 design targets from 2023 prototype results |
| First human implant | No human implant |
| Species studied | Mouse optotagging and cortical activation and inhibition experiments; cohort sizes are in the application pages |
| Regulatory status | Research prototype. No clearance. UCL expects community availability in 2028, a forecast |
| Function | Electrical recording plus blue and red light delivery for optotagging and photostimulation |
| Target tissue | Mouse brain |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Silicon shank with TiN recording sites, SiN waveguides and thermo-optic switching |
| Array layout | Two columns of 480 recording sites; 14 blue and 14 red emitters along the distal region; two four-level thermo-optic switching trees |
| Electrode count | 960 physical TiN sites; 384 selectable electrical channels; 14 blue plus 14 red emitters, one emitter per color addressed at a time |
| Pitch | 20 µm along the shank, 48 µm between columns; emitters spaced 100 µm |
| Electrode lengths | 10 mm long shank |
| Shank width and thickness | 70 µm wide, 33 µm thick. Silicon base 9.6 x 10.2 mm with package base thickness 1.1 mm |
| Tip and exposed site geometry | Emitter areas described as 16 to 25 µm2; Table 2 gives blue 0.45 x 32 µm and red 0.60 x 42 µm. Emitters span about 1.4 mm (introduction) or 1.5 mm from the tip (Results) |
| Contact coating | TiN recording sites; 150 nm SiN waveguide layer |
| Insulation |  |
| Insertion method | Inserted into mouse brain for acute and tethered recording; tip-deflection specification is reported inconsistently (200 µm in Results versus below plus or minus 200 nm in Methods) |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 12 x 12 µm (144 µm2) per recording site |
| Electrode material | Titanium nitride |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR | Mean AP/LFP noise 5.45/5.33 µV RMS across tested sites. Red-onset electrical artifact about 30 µV, reduced by common-average referencing and tapered pulses |
| Recording modality | Extracellular spikes (0.3 to 10 kHz AP band) and LFP below 1 kHz |
| Sampling rate | AP 30 kHz; LFP 2.5 kHz |
| Stimulation capability | Optical stimulation, not electrical. Red or blue light pulses to individual emitters |
| Charge injection limit | Not applicable: light delivery, not electrical stimulation |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Mouse brain |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation | Blue light limited in power; red used for higher-intensity precise addressing. Tapered pulses reduce artifact |
| Typical failure modes | High-intensity blue light produces material instability and leaks from unintended emitters. Blue 0.24% and red 2.07% of fiber input; about 5 mW red or 40 mW blue input to deliver 100 µW at an emitter. Tip-deflection spec conflict unresolved |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | 130 nm SOI CMOS backend with 150 nm SiN waveguides, thermo-optic switching trees |
| Data path | External 450 nm and 638 nm lasers coupled by fibers to a laser PXI module; flex cable to headstage and data cable; another PXI module for acquisition; SpikeGLX and Open Ephys |
| Telemetry bandwidth | Not applicable: tethered with fibers |
| Sampling rate | Same 30 kHz AP and 2.5 kHz LFP |
| Power | External lasers and PXI systems; no implanted power |
| Thermal management | Table 2 reports below 1 degree C probe-tissue temperature difference in prototype tests |
| Packaging and hermeticity |  |
| MRI compatibility |  |
| Surgical complexity | Craniotomy and tethered fiber plus cable in mice. About 740 processing steps in fabrication |
| Output connectors | Fiber coupling and flex cable to headstage; connector model unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Optical and electrical activation of cortical neurons in mice; optotagging of cell types in parallel |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | Parallel dual-color optotagging and cortical activation and inhibition in mice |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mouse; sizes in the linked application pages |
| Follow-up duration |  |
| Indications | Preclinical research, not a clinical indication |
| Trials and registries | Reporting summary: randomized stimulus conditions, no blinding, no planned sample-size calculation; no data excluded per the form while the paper applies unit-quality criteria |
| Primary outcomes | Integrated optotagging with recording; characterization of loss, leakage and artifact |
| Key limitations | Prototype with leakage and loss; blue power limited; about 740 processing steps; mass production needs more fabrication and testing; no chronic or human data |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Combined electrical and optical function on one 70 µm shank |
| Limitations | Optical loss, leakage, tethering, fabrication complexity (about 740 steps versus about 400 for earlier platforms) and one emitter per color at a time |
| Scaling constraints | Only one emitter per color addressable at a time; more combinations proposed but not demonstrated |

## References

- [2026 peer-reviewed paper](https://www.nature.com/articles/s41592-026-03076-z), Nature Methods, June 1, 2026.
- [Published supplement with Tables 1 and 2](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM1_ESM.pdf).
- [Reporting summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM2_ESM.pdf).
- [UCL program page](https://www.ucl.ac.uk/brain-sciences/neuropixels/neuropixels-opto).

Related: [paper-level application overview](/applications/108-neuropixels-opto-mouse-optotagging-2026/), [cortical activation and inhibition](/applications/141-neuropixels-opto-cortical-activation-inhibition/), [parallel optotagging](/applications/142-neuropixels-opto-parallel-optotagging/), [Allen Institute](/companies/46-allen-ucl-neuropixels-opto-collaboration/), [University College London, Carandini lab](/companies/50-ucl-carandini-lab/), [IMEC](/companies/51-imec/).

The interactive 3D model covers only the electrical recording window: 960 contacts, 20 µm along-shank pitch, 48 µm column spacing, 12 x 12 µm contacts and 33 µm thickness; the 9.6 mm length is a half-pitch-margin crop with the origin at the crop center. No optical emitters, waveguides, tip, package base, fibers or cables are modeled. No human implant, chronic lifetime or therapy outcome is established.
