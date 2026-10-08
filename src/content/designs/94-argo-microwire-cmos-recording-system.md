---
title: "Argo microwire-CMOS recording system"
order: 94
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0061"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
description: "Paradromics/Caeleste's 2021 acute research system: a 65,536-pixel CMOS readout bonded to disordered PtIr wires, with 1,300-wire rat spiking and over 30,000 connected sheep surface channels kept separate."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8607496/"
tags: ["Argo", "Paradromics", "Caeleste", "microwire", "CMOS", "PtIr", "rat", "sheep", "preclinical"]
draft: false
---

# Argo microwire-CMOS system

The 2021 Argo paper describes a head-fixed neural recording system from Paradromics and Caeleste, with University of Pittsburgh participation. It is not the later [Connexus clinical module](/devices/09-paradromics-connexus-acute-first-in-human/).

PtIr microwire arrays are compressively and reversibly bonded to a custom CMOS amplifier array. Wire locations are stochastic, not a regular contact map. The system supports penetrating arrays for spikes and flat-ended surface arrays for local field potentials.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Argo microwire-CMOS recording system [1] |
| Manufacturer | Paradromics and Caeleste, with University of Pittsburgh participation [1] |
| Interface class | PtIr microwire arrays bonded to a CMOS amplifier array, penetrating and surface variants [1] |
| Origin | 2021 Argo paper [1] |
| First demonstrated | 2021 paper [1, 2] |
| First human implant | None |
| Species studied | Rat and sheep [1] |
| Regulatory status | Research system; not the later Connexus clinical module [1] |
| Function | Acute head-fixed recording: spikes with penetrating arrays, local field potentials with surface arrays [1] |
| Target tissue | Rat cortex (spikes) and sheep cortical surface [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Compressively and reversibly bonded PtIr microwires on a CMOS sensor; wire locations are stochastic [1] |
| Array layout | Rat illustrated array 1,300 wires, 10 mm diameter; surface example roughly 35,000 wires, 12 × 12 mm. Kept separate [1] |
| Electrode count | CMOS 256 × 256 = 65,536 pixels; 1,300 wires (rat array); 30,146 connected pixels at 86% connectivity in a surface example [1] |
| Pitch | CMOS pixel pitch 50 × 50 µm (landing pad 40 × 40 µm); rat array 200 µm spacing; surface example 60 µm pitch; fabrication examples 100-400 µm [1] |
| Electrode lengths | Rat array 1 mm wire length [1] |
| Shank width and thickness | Rat wires 18 µm diameter; electrosharpened tip below 200 nm; sensor active area 12.8 × 12.8 mm, ASIC 14.5 × 16 mm [1] |
| Tip and exposed site geometry | Penetrating tips electrosharpened; surface-array tips polished flat; selective insulation removal at recording sites [1] |
| Contact coating | Unreported |
| Insulation | 20-30 nm alumina; sacrificial parylene sets spacing and is removed from the recording end [1] |
| Insertion method | Penetrating array in rat; flat surface array on sheep cortex [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Not reported for the exposed sites; wire diameter 18 µm [1] |
| Electrode material | Platinum-iridium, 90% Pt and 10% Ir [1] |
| Impedance (with measurement frequency) | Typical 300-500 kΩ at 1 kHz in saline [1] |
| Noise floor or SNR | Table 1 lists 6.3 ± 0.5 µV RMS; the text reports 7.5 ± 0.4 µV RMS (300-6,000 Hz band). Surface example: 6.3 ± 0.5 µV RMS in text, 6.5 µV RMS in the Figure 6 caption. Not combined [1] |
| Recording modality | Spikes (penetrating) and local field potentials (surface) [1] |
| Sampling rate | 32 kHz per channel, 12-bit [1] |
| Stimulation capability | Unreported |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Rat cortex and sheep cortical surface [1] |
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
| Onboard electronics | Custom CMOS amplifier array, 65,536 pixels [1] |
| Data path | Head-fixed wired acute preparation limited by downstream electronics [1] |
| Telemetry bandwidth | Unreported |
| Sampling rate | 32 kHz per channel, 12-bit [1] |
| Power | Unreported |
| Thermal management | Unreported |
| Packaging and hermeticity | Compressive reversible bonding of wires to the chip [1] |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Connectivity 71 ± 2.9% (SEM) across 32 sensor/array combinations; 86% in a selected surface example [1] |
| Chronic yield | Unreported |
| Stability over time | Unreported |
| Longevity | Acute only; summary table lists continuous recording greater than eight hours, which is not a chronic follow-up [1] |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | 1,300-wire rat spiking and sheep surface mapping with over 30,000 connected channels [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Rat and sheep acute experiments; animal counts not extracted here [1] |
| Follow-up duration | Acute [1] |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Spiking in rat and surface potential mapping in sheep [1] |
| Key limitations | Electronics address 65,536 channels but the paper reports no 65,536 independent implanted wires or neurons; head-fixed acute use only; smaller floating device is future work [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Very large channel capacity in the readout chip [1] |
| Limitations | Stochastic wire positions, acute head-fixed use, noise figures that disagree across the paper [1] |
| Scaling constraints | Full sensor use would need an ordered one-to-one electrode array rather than the tested stochastic arrays [1] |

## Electronic capacity versus tested arrays

| Structure | Published configuration |
| --- | --- |
| CMOS sensor | 256 × 256 pixels, 65,536 total |
| Pixel pitch / landing pad | 50 × 50 µm / 40 × 40 µm |
| Sensor active area / whole ASIC | 12.8 × 12.8 mm / 14.5 × 16 mm |
| Acquisition | 32 kHz/channel, 12-bit resolution |
| Illustrated rat array | 1,300 wires, 10 mm diameter, 18 µm wire diameter, 200 µm spacing, 1 mm length |
| Surface array example | Approximately 35,000 wires, 12 × 12 mm, 60 µm pitch |
| Connected surface example | 30,146 CMOS pixels, 86% connectivity |

The electronics can address all 65,536 channels, but the paper does not report 65,536 independent implanted wires or neurons. Full sensor use would require an ordered one-to-one electrode array rather than the stochastic arrays tested. See the [rat and sheep application](/applications/95-argo-rat-spikes-sheep-surface-mapping-2021/).

## Wire preparation and connectivity

Wire cores are 90% platinum and 10% iridium. Rat penetrating tips were electrosharpened to a final diameter below 200 nm. The tip diameter is not the entire wire diameter. A 20-30 nm alumina coating provides insulation, with selective removal at recording sites. Typical impedance is 300-500 kΩ at 1 kHz in saline.

Sacrificial parylene sets spacing and is removed from the recording end. Surface-array tips are polished flat rather than sharpened. Fabrication-method spacing examples of 100-400 µm are not applied to the separate 60 µm surface configuration.

Across 32 sensor/array combinations, connectivity was 71 ± 2.9% (SEM). The selected 86% surface example is not the yield of every array.

## Conflicting noise figures retained

For the 32 bonded-array summary, Table 1 lists **6.3 ± 0.5 µV RMS** noise, while the following text reports **7.5 ± 0.4 µV RMS** in the 300-6,000 Hz band. The selected surface example's main text gives **6.3 ± 0.5 µV RMS**; its Figure 6 caption says **6.5 µV RMS**, while the plotted annotation again shows **6.3 ± 0.5 µV RMS**. These figures are not silently combined into one specification.

## Limits and model boundary

The system is limited to acute, head-fixed preparations because of its downstream electronics. The summary table's greater-than-eight-hour continuous recording specification is not a chronic implanted follow-up duration. A smaller floating device is future work in this paper.

No full contact model is supplied. CMOS pixels, landed wires and exposed tissue contacts differ; stochastic wire positions and sharpened-tip shapes are not fully specified by nominal array diameter and spacing. A regular 1,300-wire grid would misrepresent the tested array.

## References

1. [2021 complete primary manuscript, methods, Table 1 and Figures 2/6](https://pmc.ncbi.nlm.nih.gov/articles/PMC8607496/).
2. [Publisher record](https://beta.iopscience.iop.org/article/10.1088/1741-2552/abd0ce).
