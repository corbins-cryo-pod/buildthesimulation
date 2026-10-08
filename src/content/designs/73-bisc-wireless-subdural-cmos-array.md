---
title: "BISC wireless subdural CMOS array"
order: 73
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0050"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-07
description: "A 50 µm-thick wireless cortical chip with 65,536 physical electrodes and a selectable subset of up to 1,024 simultaneous channels. Published pig and non-human-primate recordings, December 2025."
modality: "Cortical surface"
website: "https://www.nature.com/articles/s41928-025-01509-9"
tags: ["BISC", "CMOS", "wireless", "subdural", "ECoG", "Columbia", "Shepard", "high density", "academic", "preclinical"]
draft: false
---

# BISC wireless subdural CMOS array

A mechanically flexible micro-ECoG chip that combines electrodes, signal processing, wireless data telemetry and wireless power on one CMOS substrate. Jung and colleagues' Nature Electronics paper was published on 8 December 2025. The primary affiliations include Columbia University's electrical engineering and computer science departments, with other US collaborators.

The [Columbia University, Shepard lab](/companies/45-columbia-shepard-optical-and-electrical-interfaces/) links BISC and the distinct SCOPe optical family. Wireless electrical recording here does not establish a wireless optical SCOPe configuration.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | BISC wireless subdural CMOS array [1] |
| Manufacturer | Academic research device; Columbia University electrical engineering and computer science with US collaborators [1] |
| Interface class | Subdural flexible CMOS micro-ECoG chip, wireless power and data |
| Origin | Jung, Zeng and colleagues, Nature Electronics [1] |
| First demonstrated | 8 December 2025 [1] |
| First human implant | None; no human implantation or clinical efficacy shown [1] |
| Species studied | Pig and behaving non-human primate [1] |
| Regulatory status | Research device; no clearance |
| Function | Recording and stimulation circuitry on chip; therapeutic stimulation not shown [1, 2] |
| Target tissue | Somatosensory, motor and visual cortex, below the dura [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Single CMOS substrate with electrodes, processing and wireless telemetry [1] |
| Array layout | 256 × 256 array [1] |
| Electrode count | 65,536 recording electrodes; up to 1,024 simultaneously selectable channels; 256 channels used in Figures 2 and 3 [1, 3, 4] |
| Pitch | Unreported |
| Electrode lengths | Unreported |
| Shank width and thickness | 50 µm total thickness; chip outline not supplied [1] |
| Tip and exposed site geometry | Unreported |
| Contact coating | Titanium nitride [2] |
| Insulation | Unreported |
| Insertion method | Placed below the dura [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | Titanium nitride (TiN) [2] |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Unreported |
| Recording modality | Micro-ECoG; porcine somatosensory-evoked potentials and primate motor activity [3, 4] |
| Sampling rate | 33.9 kS/s on 256 channels in Figures 2 and 3 [3, 4] |
| Stimulation capability | Stimulation circuitry on chip; therapeutic outcome not established [2] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Analog front end for recording and stimulation, inductive power link, bidirectional transceiver and controller [2] |
| Data path | Wireless link to an external relay headstage, HDMI to a computer-controlled processor module [2] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | Inductive wireless power from the external relay [2] |
| Thermal management | Unreported |
| Packaging and hermeticity | Unreported |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Unreported |
| Stability over time | Unreported |
| Longevity | Up to two weeks in pigs and two months in behaving non-human primates [1] |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Decoding of stimulation location in pig; wrist-velocity prediction in a reaching primate [3, 4] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Pigs and non-human primates [1] |
| Follow-up duration | Two weeks (pig) and two months (primate) [1] |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Reliable chronic recordings across cortices [1] |
| Key limitations | Motor-feature prediction in a trained primate is not assistive-device control in a paralyzed person; contact sizes, pitch and coil geometry not supplied [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Very high site count on a 50 µm wireless chip [1] |
| Limitations | Only a subset of up to 1,024 channels recorded at once; external relay needed [1, 2] |
| Scaling constraints | Unreported |

## Physical sites versus channels

The chip has a 256 x 256 array: 65,536 recording electrodes. It can simultaneously record a selectable subset of up to 1,024 channels. These are different counts. The device does not stream all 65,536 sites at once in the reported configuration.

The paper reports 50 µm total thickness and placement below the dura. Figure 1 identifies titanium-nitride (TiN) electrodes. Full chip outline, contact dimensions and electrode pitch are not supplied by the abstract and captions used for this entry, so they are not inferred from the count or photographs.

## Wireless system

The implant includes an analog front-end for recording and stimulation, an inductive wireless-power link, a bidirectional wireless transceiver and a controller. An external relay headstage provides power and communication outside the body, with an HDMI connection to a processor module. The processor is computer-controlled.

"Wireless implant" describes the link across the body boundary, not the absence of external equipment or cables. Figure 1's stimulation circuitry does not, by itself, establish a therapeutic stimulation outcome.

## What was shown

The abstract reports reliable chronic recordings for up to two weeks in pigs and two months in behaving non-human primates, covering somatosensory, motor and visual cortices. Those are the durations demonstrated here, not years of implant survival.

Figure 2 shows porcine somatosensory-evoked potentials recorded from 256 channels at 33.9 kS/s and decoding of stimulation location. Figure 3 shows a behaving non-human primate reaching to grab a wand, with cortical activity used to predict wrist velocity. That example also uses 256 channels at 33.9 kS/s. The maximum 1,024-channel capability should not be substituted for the actual subset used in each result.

Motor-feature prediction during a trained reach is not the same as a paralyzed person controlling an assistive device. No human implantation or clinical efficacy is demonstrated in the abstract and figures used here.

## Limits and model status

This entry uses the peer-reviewed 2025 paper rather than treating the earlier preprint as a separate hardware device. It keeps physical electrode count, simultaneous channel capacity and example recording subset distinct.

No 3D model is added from the thickness and matrix count alone. The complete package outline, contact sizes, wireless-coil geometry and configuration-specific channel mapping remain outside the sources inspected for this entry. Chronic tissue and material reliability beyond the stated pig and primate durations are not established here.

## References

1. Jung T, Zeng N, et al. [A wireless subdural-contained brain-computer interface with 65,536 electrodes and 1,024 channels](https://www.nature.com/articles/s41928-025-01509-9). Primary abstract, author affiliations, 8 December 2025.
2. [Figure 1: implant and relay station](https://www.nature.com/articles/s41928-025-01509-9/figures/1). Circuit blocks, wireless link, TiN contacts and external equipment.
3. [Figure 2: porcine somatosensory recording](https://www.nature.com/articles/s41928-025-01509-9/figures/2).
4. [Figure 3: motor-cortex recording in a behaving non-human primate](https://www.nature.com/articles/s41928-025-01509-9/figures/3).

## Source notes

The full fabrication and implantation methods are not reproduced from the accessible abstract and captions.
