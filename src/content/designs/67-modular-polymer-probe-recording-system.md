---
title: "Modular polymer probe system (UCSF and Lawrence Livermore)"
order: 67
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0046"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Polyimide arrays with 16 contacts per shank and stackable 64-channel modules, supporting up to 1,024 recording channels in freely behaving rats. Neuron, 2019."
modality: "Intracortical"
successRank: 67
website: "https://www.cell.com/neuron/fulltext/S0896-6273(18)30993-0"
tags: ["polyimide", "modular headstage", "1024 channels", "UCSF", "Lawrence Livermore", "SpikeGadgets", "academic", "preclinical"]
draft: false
---

# Modular polymer probe recording system

A recording platform built from flexible polymer probes, stackable electronics and a shared acquisition system. The paper describes 32- and 64-channel arrays with two or four shanks, respectively. Each shank carries 16 recording contacts in a dual-line layout.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Modular polymer probe recording system (32 and 64 channel arrays) [1] |
| Manufacturer | Academic research device; UCSF, Lawrence Livermore National Laboratory, Flatiron Institute, SpikeGadgets, NYU, HHMI [1] |
| Interface class | Intracortical flexible polymer shank arrays with stackable electronics |
| Origin | Chung, Joo, Fan and colleagues, Neuron 101:21-31.e5 [1] |
| First demonstrated | Online November 27, 2018; issue date January 2, 2019 (one paper) [1, 2] |
| First human implant | None |
| Species studied | Freely behaving rat [1] |
| Regulatory status | Research device; no clearance |
| Function | Recording [1] |
| Target tissue | Multiple rat brain regions [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Flexible polymer shanks inserted with temporary silicon stiffeners [1] |
| Array layout | Two or four shanks, 16 contacts per shank in a dual-line layout [1] |
| Electrode count | 32 or 64 channels per array; system up to 1,024 channels [1] |
| Pitch | 20 µm edge-to-edge contact spacing (not center pitch); four-shank arrays 250 µm edge-to-edge [1] |
| Electrode lengths | Unreported in reviewed sources |
| Shank width and thickness | Shank thickness 14 µm; stiffener silicon 30 µm thick and 60 µm wide, 25° tip [1] |
| Tip and exposed site geometry | Circular contacts, 20 µm diameter [1] |
| Contact coating | Electrodeposited PEDOT:PSS [1] |
| Insulation | Unreported in reviewed sources |
| Insertion method | Serial insertion with silicon stiffeners; multiple arrays per region [1] |
| Anchoring and fixation | Unreported in reviewed sources |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 20 µm diameter circles [1] |
| Electrode material | Platinum with electrodeposited PEDOT:PSS [1] |
| Impedance (with measurement frequency) | Unreported in reviewed sources |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | Single-unit and multi-unit extracellular recording [1] |
| Sampling rate | 30 kHz per channel [1] |
| Stimulation capability | Unreported in reviewed sources |
| Charge injection limit | Unreported in reviewed sources |
| Reference and ground | Unreported in reviewed sources |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported in reviewed sources |
| Insertion trauma and BBB disruption | Unreported in reviewed sources |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Unreported in reviewed sources |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | 64-channel Intan amplifying, digitizing and multiplexing chip on a custom PCB per module; two stacks of eight modules [1] |
| Data path | FPGA headstage and HDMI commutator [1] |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Unreported in reviewed sources |
| Thermal management | Passive aluminum heatsinks [1] |
| Packaging and hermeticity | Silicone gel, elastomer and a printed casing [1] |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Unreported in reviewed sources |
| Output connectors | Unreported in reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | 375 putative single units from 512 channels of a 1,024-channel implant by automated curation [1] |
| Stability over time | Units tracked over 10- or 11-day recordings in three animals starting 42, 47 and 53 days after implantation; not every unit identifiable for months [1] |
| Longevity | Months-long recordings reported [1] |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Unreported in reviewed sources |
| Notable demonstrations | Unreported in reviewed sources |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Rats; three animals in the continuous-tracking analysis [1] |
| Follow-up duration | Unreported in reviewed sources |
| Indications | Unreported in reviewed sources |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Hundreds of well-isolated units across brain regions in freely behaving rats [1] |
| Key limitations | Preclinical only; 1,024-channel capacity is not the count of isolated neurons [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Modular stackable electronics scaling to 1,024 channels [1] |
| Limitations | Unreported in reviewed sources |
| Scaling constraints | Unreported in reviewed sources |

## Published hardware

| Field | Paper detail |
| --- | --- |
| Shank thickness | 14 µm |
| Contact shape and diameter | Circular, 20 µm |
| Contact edge-to-edge spacing | 20 µm |
| Four-shank array spacing | 250 µm edge-to-edge |
| Contact material | Platinum with electrodeposited PEDOT:PSS |
| Module | 64-channel Intan amplifying, digitizing and multiplexing chip on a custom PCB |
| Stack capacity | Two stacks of eight modules, up to 1,024 channels |
| Acquisition | 30 kHz per channel, through an FPGA headstage and HDMI commutator |
| Temporary insertion stiffener | Silicon, 30 µm thick, 60 µm wide, 25° tip angle |

Edge-to-edge spacing is not center pitch. The shank and contact layout should not be reconstructed by substituting one for the other. The 1,024-channel system capacity is separate from the count of isolated neurons.

## Recording evidence

The paper describes months-long recordings from hundreds of well-isolated units across several brain regions in freely behaving rats. In one analysis, automated curation identified 375 putative single units from 512 channels of a 1,024-channel implant.

For continuous tracking, the team analyzed 10- or 11-day recordings in three animals. The recording windows started 42, 47 and 53 days after implantation. This supports the paper's claim of tracking many units for more than a week, not an assertion that every unit remained identifiable for months.

## Implantation and limits

Flexible arrays were inserted serially with silicon stiffeners and assembled into a protected head-mounted system. Multiple arrays could be placed within one region. Silicone gel, elastomer, a printed casing and passive aluminum heatsinks were part of the assembly.

This is a preclinical research platform. No human implantation or clinical BCI outcome is established by the paper. No full 3D model is added here because a faithful assembly needs the shank outline, contact map, stiffener and module drawings, not just the few dimensions in this entry.

## Organizations and publication

The paper lists UCSF, Lawrence Livermore National Laboratory, the Flatiron Institute, SpikeGadgets, NYU and the Howard Hughes Medical Institute among its affiliations. Published online November 27, 2018; Neuron issue date January 2, 2019. Those two dates describe the same paper, not separate devices.

## References

1. Chung JE, Joo HR, Fan JL, et al. *High-Density, Long-Lasting, and Multi-region Electrophysiological Recordings Using Polymer Electrode Arrays.* Neuron 101:21-31.e5 (2019). DOI: 10.1016/j.neuron.2018.11.002. [Primary paper, Figure 1 and recording analyses](https://www.cell.com/neuron/fulltext/S0896-6273(18)30993-0).
2. [Primary abstract, affiliations and publication dates](https://pubmed.ncbi.nlm.nih.gov/30502044/).
