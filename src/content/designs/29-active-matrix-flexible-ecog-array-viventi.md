---
title: "Active-matrix flexible ECoG array (Viventi, 2011)"
order: 29
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0008"
interface_class: "ecog"
status: "research"
last_updated: 2026-10-07
description: "Flexible, foldable cortical-surface array with a transistor at each of 360 sites, 500 µm pitch, tested acutely in anesthetized cats in 2011. Sampling, impedance and yield figures are scoped to that experiment."
modality: "Cortical surface"
successRank: 29
website: "https://www.nature.com/articles/nn.2973"
tags: ["ECoG", "active matrix", "silicon nanomembrane", "multiplexed", "flexible", "UPenn", "Rogers", "Litt", "academic", "research"]
draft: false
---

# Active-matrix flexible ECoG array (Viventi, 2011)

A flexible cortical-surface array with a buffer and a multiplexing transistor at each electrode. Every figure below belongs to the 2011 cat experiments and bench tests named in the row. It is not the later 196-site rat array and not a qualified chronic implant. A blank cell means not established by the reviewed primary paper.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Flexible, foldable, actively multiplexed 360-site surface array (2011 configuration) |
| Manufacturer | Academic fabrication, not a commercial or manufacturer-issued product. Authors from Penn, Illinois at Urbana-Champaign and collaborators |
| Interface class | Non-penetrating cortical-surface (subdural/epicortical) array with on-array active electronics |
| Origin | Jonathan Viventi, John Rogers, Brian Litt and collaborators; Nature Neuroscience 2011 |
| First demonstrated | 2011 primary paper. Earlier multiplexed-array work is not rated on this sheet |
| First human implant | No human implantation in the paper |
| Species studied | Ten cats for in vivo visual-cortex mapping. Spindle, visual and picrotoxin seizure recordings are separate demonstrations |
| Regulatory status | Preclinical research, acute animal use. No human clearance established |
| Function | Electrical recording with active multiplexing. Stimulation not demonstrated |
| Target tissue | Cat visual cortex surface, including a folded array placed into the interhemispheric fissure; 2 x 3 cm craniotomy and durotomy exposed the cortex |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Thin silicon-nanomembrane transistor array on polyimide, contacts at the cortical surface |
| Array layout | 18 rows by 20 columns, two transistors per unit cell (buffer and multiplexer) |
| Electrode count | 360 recording sites. 720 transistors are two per site, not 720 channels |
| Pitch | 500 µm contact spacing |
| Electrode lengths | Not applicable: non-penetrating surface contacts, no shank |
| Shank width and thickness | Not applicable: no shank. Assembled film about 25 µm thick. Process layers stated separately: 12.5 µm Kapton substrate, 260 nm silicon, 5 nm Cr and 150 nm Au, 1.2 µm polyimide. These layer scopes are not summed here |
| Tip and exposed site geometry | 300 x 300 µm square contacts on the surface |
| Contact coating | Platinum, about 50 nm, deposited on contacts. Applied to the test contacts used for the impedance figure |
| Insulation | 1.2 µm polyimide interlayer plus further polyimide and epoxy encapsulation (about 1.2 µm and 4 µm in the encapsulation stack); 8 µm epoxy is also stated for the assembled device. Scopes differ |
| Insertion method | Surface placement through craniotomy and durotomy. Folded around a low-modulus PDMS insert (about 700 µm) and slid into the interhemispheric fissure, as well as flat placement |
| Anchoring and fixation | Not given for the electrodes. Cat preparation and acute positioning only; no chronic anchoring described |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 300 x 300 µm (0.09 mm2) per active contact, geometric |
| Electrode material | Platinum-treated gold-based contacts on polyimide, silicon-nanomembrane transistors |
| Impedance (with measurement frequency) | Measured on 250 x 250 µm passive test electrodes at 1 kHz in 0.9% saline: gold 84 kΩ ±17%, platinum 29 kΩ ±9%. The 300 x 300 µm active contact is expected near 20 kΩ by area scaling. The integrated active contact impedance was not directly measured |
| Noise floor or SNR | Unfiltered noise 30 µV RMS in the spindle recordings. The seizure recording reported 45 µV RMS with 34 dB SNR on a 6.6 mV event. Spindle amplitude about 1.2 mV |
| Recording modality | Extracellular surface field potentials from sleep spindles, single-trial visual responses and electrographic seizures |
| Sampling rate | Actual per-site rate about 277 Hz. Row cycling 5 kHz and 100 kS/s total with 20-fold oversampling. The above 10 kS/s figure is circuit capability, not the sampling used in the cat recordings |
| Stimulation capability | Not demonstrated for this array. Recording only |
| Charge injection limit | External test current sources in the paper are not an array charge-injection rating |
| Reference and ground | Reference (ground) was clipped to nearby exposed muscle in the cat experiments |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortical surface of the cat: visual cortex and interhemispheric surface |
| Insertion trauma and BBB disruption | Craniotomy and durotomy required. The array does not penetrate cortex. Tissue injury from the surface contact is not reported |
| Vascular disruption risk | Not given for this array. Surface placement over vessels is not quantified |
| Micromotion sensitivity | Conformal thin film and folding aim at close contact. Micromotion behavior in a long-term implant is not reported |
| Gliosis and encapsulation | Not assessed. The recordings are acute and the paper gives no chronic encapsulation data |
| Neuron loss near sites | Not assessed. Surface array, no penetrating histology reported |
| Foreign-body response mitigation | Thin flexible substrate and conformal contact are the stated approach. Biological mitigation outcome is not reported |
| Typical failure modes | Process-yield limits: about 83% of channels operational in the gain test, others interpolated. Chronic insulation failure in saline-immersed implant use is not demonstrated |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Per-site buffer transistor and multiplexing transistor on the array |
| Data path | Short cable (about 2 ft) to the interface board, then a 15 ft National Instruments cable to four PXI-6289 acquisition cards, with LabVIEW; Elform anisotropic conductive film connects the array |
| Telemetry bandwidth | Not applicable: wired. No wireless link |
| Sampling rate | Per-site about 277 Hz after multiplexing. Total 100 kS/s with 20-fold oversampling; faster ADCs are described as capability only |
| Power | External acquisition electronics. No implanted battery or wireless power reported |
| Thermal management |  |
| Packaging and hermeticity | Encapsulation of polyimide and epoxy to limit leakage in saline. Not qualified as chronic hermetic packaging |
| MRI compatibility |  |
| Surgical complexity | Craniotomy and durotomy; folding and fissure insertion adds handling complexity. Human surgical workflow not reported |
| Output connectors | Elform anisotropic conductive film to a short cable and interface board; connector model not reported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Gain test: about 83% of channels operational, median gain 0.68. Non-operational channels were interpolated from 3 x 3 neighbors before plotting. Not all 360 channels were independent recordings |
| Chronic yield | Not demonstrated. The paper reports acute experiments in cats |
| Stability over time |  |
| Longevity | Not demonstrated. Experiment durations are acute recordings, not implant lifetime |
| Revision and explant experience | Not applicable: no implanted survival or explant described |
| Adverse events |  |
| Notable demonstrations | Mapping of spindles, single-trial visual responses and electrographic seizures; clinical-scale and microseizure-scale spatial patterns resolved, including seizure spiral waves in picrotoxin-treated cats |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None in the paper |
| Preclinical cohort | Ten cats; acute anesthetized recordings. Picrotoxin seizures were induced, not spontaneous epilepsy |
| Follow-up duration | Acute sessions only. Chronic follow-up not reported |
| Indications | Preclinical neural mapping research. Not an approved or indicated clinical device |
| Trials and registries | None established; animal procedures |
| Primary outcomes | Dense surface sampling of spindles, visual responses and acute seizures with multiplexed readout |
| Key limitations | Acute disinhibition seizures are not chronic epilepsy; about 83% working channels; impedance is an extrapolation; no chronic or human data |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | High site count on few wires, large flexible area, foldable for the fissure, per-site buffering |
| Limitations | Wired acquisition bulk, interpolated channels, no chronic reliability data, hardware capability figures above what was used |
| Scaling constraints | Site count scales with matrix size and wire count, but acquisition cards, cable and per-site circuit yield limit practical scaling; larger arrays are not demonstrated here |

## Core interface specifications

The 12 fields follow the Blackrock Utah table for comparison, not a manufacturer-issued datasheet. Missing values stay blank; inapplicable fields are marked.

| Field | Specification and source scope |
| --- | --- |
| Electrode Pitch | 500 µm contact spacing |
| Channel Count | 360 recording sites, 720 transistors |
| Output Connectors | Elform anisotropic conductive film to interface board; model not reported |
| Output Conn. dimensions L x W x H |  |
| Standard Electrode Lengths | Not applicable: surface contacts |
| Impedance | 84 kΩ gold and 29 kΩ platinum measured on 250 x 250 µm passive test contacts at 1 kHz; about 20 kΩ expected for the 300 x 300 µm active contact, not directly measured |
| Array Dimensions | 18 by 20 sites at 500 µm pitch; sampled region discussed as 10 x 9 mm; full substrate outline not reported |
| Multi-Port Options | Not applicable: research prototype |
| Metalization | Cr/Au interconnects with about 50 nm platinum on contacts |
| Wire Bundle Length | About 2 ft short cable plus 15 ft acquisition cable |
| Reference and Ground | Clip to exposed muscle in the cat experiments |
| Insulation | Polyimide and epoxy encapsulation as stated above |

## References

- Viventi J et al. [Flexible, foldable, actively multiplexed, high-density electrode array for mapping brain activity in vivo](https://www.nature.com/articles/nn.2973). Nature Neuroscience 2011.
- [Author manuscript, PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC3235709/).
- [Full paper PDF with Methods and supplementary methods (Rogers group)](https://rogersgroup.northwestern.edu/files/2011/nneuroepilepsy.pdf).

The later 196-site rat configuration is a separate sheet: [Active micro-ECoG array (196 sites, auditory cortex)](/devices/65-active-microecog-auditory-cortex-array/). Its contact size, pitch and acquisition are not assigned backward to this hardware.
