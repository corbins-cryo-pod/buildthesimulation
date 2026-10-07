---
title: "Active-matrix flexible ECoG array (Viventi, 2011)"
order: 29
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0008"
interface_class: "ecog"
status: "research"
last_updated: 2026-10-07
description: "A flexible, foldable surface array with a silicon transistor at each electrode so hundreds of sites share a few wires. 360 channels at 500 µm spacing, Penn, Illinois and collaborators, 2011."
modality: "Cortical surface"
successRank: 29
website: "https://www.nature.com/articles/nn.2973"
tags: ["ECoG", "active matrix", "silicon nanomembrane", "multiplexed", "flexible", "UPenn", "Rogers", "Litt", "academic", "research"]
draft: false
---

# Active-matrix flexible ECoG array (Viventi, 2011)

A flexible cortical-surface recording array with a buffer and multiplexing transistor at each electrode. Active multiplexing reduces the number of external wires relative to a passive array. This is the 2011 research configuration, not the later 196-site auditory array or a clinically qualified chronic implant.

## Identity and configuration

| Property | Published configuration |
| --- | --- |
| Primary paper | Viventi, Kim, Vigeland and colleagues; Nature Neuroscience, 2011 |
| Research lineage | Jonathan Viventi, John Rogers, Brian Litt and collaborators |
| Tissue interface | Non-penetrating cortical-surface array |
| Function | Electrical recording with active multiplexing |
| Evidence | Animal in-vivo mapping of spindles, visual responses and seizures |
| Clinical status | Human implantation and chronic clinical qualification are not established by this paper |

## Geometry and contacts

| Property | Published specification |
| --- | --- |
| Recording sites | 360 |
| Silicon transistors | 720, two per unit cell |
| Contact dimensions | 300 × 300 µm |
| Contact spacing | 500 µm |
| Silicon nanomembrane thickness | Approximately 260 nm |
| Polyimide insulation | Approximately 1.2 µm |
| Encapsulation layers | Approximately 1.2 µm polyimide and 4 µm epoxy |

The layer figures are individual components, not a complete assembled-system thickness. The site count is for the array shown in the paper; it does not include a later-generation grid or an arbitrary number of external channels.

## Electrical and system specifications

| Property | Published specification and condition |
| --- | --- |
| Unit-cell electronics | Buffer transistor connected to the electrode and a multiplexing transistor |
| Readout | Shared wired external acquisition, rather than one long wire per electrode |
| Contact treatment | Approximately 50-nm platinum deposition to reduce surface-electrode impedance |
| Contact impedance | Approximately 20 kΩ at 1 kHz, as reported for that fabrication |
| Unfiltered noise | 30 µV RMS in the reported recording context |
| Implant power, battery and wireless link | Not a battery-powered wireless implant configuration |
| MRI and chronic packaging qualification | Not established in this sheet |

The noise result is not a universal specification for every amplifier or biological recording. External acquisition and signal processing remain part of the system.

## Tissue interface and reliability

The flexible and foldable construction allows conformal surface contact, including access discussed for sulcal anatomy. The paper does not establish long-term implanted reliability, a multi-year tissue-response result or a chronic human use indication. Thin-transistor-array fabrication and chronic insulation reliability remain separate from the acute mapping demonstrations.

## Evidence and regulatory boundary

The report maps sleep spindles, single-trial visual responses and electrographic seizures with dense surface sampling. Those are recording applications, not a stimulation-system qualification or assistive BCI outcome. Statements about finer spatial sampling than conventional clinical electrodes are comparisons in the paper, not regulatory approval.

For the later related configuration, see the [196-site active micro-ECoG auditory array](/devices/65-active-microecog-auditory-cortex-array/). Its smaller contacts and pitch are not assigned backward to this hardware.

## Model and missing specifications

No complete fabrication model is supplied. The dimensions above do not recover full substrate outline, site-field origin, cable geometry, transistor routing or all encapsulation edges. Exact full-assembly geometry and chronic qualification remain unreported here.

## Primary sources

- Viventi J et al. [Flexible, foldable, actively multiplexed, high-density electrode array for mapping brain activity in vivo](https://www.nature.com/articles/nn.2973), 2011.
- [Full primary author manuscript, device fabrication and recording results](https://pmc.ncbi.nlm.nih.gov/articles/PMC3235709/).
