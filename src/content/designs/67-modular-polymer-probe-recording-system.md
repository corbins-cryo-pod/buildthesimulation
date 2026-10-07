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

## Sources

- Chung JE, Joo HR, Fan JL, et al. *High-Density, Long-Lasting, and Multi-region Electrophysiological Recordings Using Polymer Electrode Arrays.* Neuron 101:21-31.e5 (2019). DOI: 10.1016/j.neuron.2018.11.002. [Primary paper, Figure 1 and recording analyses](https://www.cell.com/neuron/fulltext/S0896-6273(18)30993-0).
- [Primary abstract, affiliations and publication dates](https://pubmed.ncbi.nlm.nih.gov/30502044/).
