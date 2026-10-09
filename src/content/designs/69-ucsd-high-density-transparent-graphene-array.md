---
title: "High-density transparent graphene array (UC San Diego)"
order: 69
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0048"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-07
description: "Transparent graphene surface arrays up to 256 channels with 20 µm contacts and platinum nanoparticles. Combined electrical and calcium imaging in mouse visual cortex, 2024."
modality: "Cortical surface"
successRank: 69
website: "https://www.nature.com/articles/s41565-023-01576-z"
tags: ["graphene", "transparent", "high density", "calcium imaging", "UC San Diego", "academic", "preclinical"]
draft: false
---

# High-density transparent graphene array

A transparent cortical-surface array with cell-scale contacts. The 2024 paper reports arrays up to 256 channels and 20 µm electrode diameters. Platinum nanoparticles improve the small graphene contacts' electrical interface; interlayer-doped double-layer graphene reduces open-circuit failures in the long, thin traces.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | High-density transparent graphene array, up to 256 channels [1] |
| Manufacturer | Academic research device; UC San Diego, Duygu Kuzum group [2] |
| Interface class | Transparent cortical-surface array with cell-scale contacts |
| Origin | Ramezani, Kim, Liu and colleagues, Nature Nanotechnology 2024 [1] |
| First demonstrated | January 11, 2024 [2] |
| First human implant | None |
| Species studied | Mouse visual cortex [1, 2] |
| Regulatory status | Research device; no clearance |
| Function | Recording, combined with two-photon calcium imaging [1, 2] |
| Target tissue | Cortical surface; imaged neurons to 250 µm depth [2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Thin transparent flexible polymer strip, no gold trace extensions in the field of view [2] |
| Array layout |  |
| Electrode count | Up to 256 channels, a design capability not used in every experiment [1] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness |  |
| Tip and exposed site geometry | 20 µm contact diameter [1] |
| Contact coating | Platinum nanoparticles [1] |
| Insulation |  |
| Insertion method |  |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material | Interlayer-doped double-layer graphene traces; platinum-nanoparticle contacts [1] |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality | Surface potentials; multiunit-band power related to cellular calcium activity; neural networks predict calcium activity, an inference not a deep electrical recording [1, 2] |
| Sampling rate |  |
| Stimulation capability |  |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue |  |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics |  |
| Data path |  |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power |  |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility |  |
| Surgical complexity |  |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations |  |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mice [1] |
| Follow-up duration |  |
| Indications |  |
| Trials and registries |  |
| Primary outcomes | Prediction of single-cell and population calcium activity from surface potentials [1] |
| Key limitations | Mouse only; film thickness, contact map and full outline not grounded; longer-duration and BCI aims are not demonstrations [2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Transparent field with cell-scale contacts [1] |
| Limitations | Doped double-layer traces needed to avoid open-circuit failures in long thin traces [1] |
| Scaling constraints |  |

## Hardware distinction

Unlike the [2014 CLEAR device](/devices/68-clear-transparent-graphene-microecog/), this design has a transparent recording field without gold trace extensions in the field of view. The 256-channel maximum is a design capability reported by the paper, not a statement that every experiment used 256 channels.

| Field | Published detail |
| --- | --- |
| Array scale | Up to 256 channels |
| Contact diameter | 20 µm |
| Contact treatment | Platinum nanoparticles |
| Trace conductor | Interlayer-doped double-layer graphene |
| Substrate | Thin, transparent flexible polymer strip, described by UC San Diego |
| Complete geometry | Not reconstructed here; film thickness, contact map and full outline are not grounded in the sources used for this entry |

## What was measured and predicted

The team combined cortical electrical recordings with two-photon calcium imaging in mouse visual cortex. UC San Diego reports imaging neurons as deep as 250 µm below the surface. The paper found a relationship between surface multiunit-band power and cellular calcium activity.

Neural networks and dimensionality reduction were used to predict single-cell and population-average calcium activity from surface potentials. This is an inference trained against optical measurements, not direct electrical recording from a deep implanted electrode. It is not evidence of reading arbitrary thoughts or of an uncalibrated human decoder.

## Evidence limits

The reported experiments are in mice. No human implantation or clinical BCI result is asserted. The institutional article discusses future longer-duration experiments and BCI possibilities; those aims are separate from the paper's demonstrations. A full 3D device model is deliberately omitted until the remaining geometry is checked.

## References

1. Ramezani M, Kim JH, Liu X, et al. *High-density transparent graphene arrays for predicting cellular calcium activity at depth from surface potential recordings.* Nature Nanotechnology (2024). DOI: 10.1038/s41565-023-01576-z. [Primary paper abstract](https://www.nature.com/articles/s41565-023-01576-z).
2. UC San Diego. [Transparent Brain Implant Can Read Deep Neural Activity From the Surface](https://today.ucsd.edu/story/transparent-brain-implant-can-read-deep-neural-activity-from-the-surface), January 11, 2024.

## Source notes

The University of California San Diego announcement identifies Duygu Kuzum's group and describes the device, fabrication changes and mouse experiments. The paper was published January 11, 2024.
