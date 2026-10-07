---
title: "Utah Slanted Electrode Array (USEA)"
order: 5
pubDate: 2026-02-03
updatedDate: 2026-10-07
device_id: "BTSD-0005"
interface_class: "pni"
status: "human"
last_updated: 2026-10-07
description: "Slanted silicon peripheral-nerve arrays: 100 physical needles with 96 recording/stimulation electrodes in the 2017 human study; current manufacturer options and investigational-use limits remain separate."
modality: "Peripheral nerve"
successRank: 7
tags: ["BCI", "PNI", "intrafascicular", "USEA", "stimulation", "recording", "prosthetics", "sensory feedback", "peripheral nerve", "bidirectional", "regenerative", "array", "microelectrode"]
draft: false
---

# Utah Slanted Electrode Array (USEA)

A penetrating silicon array with unequal electrode lengths for peripheral-nerve recording and stimulation. This sheet separates current manufacturer options from the particular arrays implanted in the 2017 human study. A physical needle, a connected channel and a usable recording channel are not the same count.

## Core interface specifications

The 12 fields follow the Blackrock Utah table for comparison, not a manufacturer-issued datasheet. Missing values remain unreported; inapplicable fields are marked. Configuration-specific details and limits follow below.

| Field | Specification and source scope |
| --- | --- |
| Electrode Pitch | 400 µm, 2017 study and current manufacturer |
| Channel Count | 2017: 100 physical needles, 96 recording/stimulation paths plus four on-array reference electrodes. Current options: 16-96; 1024 wording is multi-configuration system scope |
| Output Connectors | 2017: custom PCB with ZIF-Clip-96. Current manufacturer: Omnetics, CerePort pedestal 128/256, Custom |
| Output Conn. dimensions L x W x H | Current page: Omnetics 7 × 37 × 9 mm; CerePort 128 16.5 × 12 × 19 mm, 256 16.5 × 10.7 × 19 mm (height × neck diameter × base diameter). Not the 2017 PCB dimensions; those are not reported here |
| Standard Electrode Lengths | 2017 approximately 0.75-1.5 mm. Current table custom 0.75-1.5 mm; overview has 0.5-1.5 mm grading |
| Impedance | Current manufacturer: platinum 20-800 kΩ; SIROF/IrOx 1-80 kΩ, frequency not stated. Study checks at 1 kHz; ≥500 kΩ is that analysis's failed-channel threshold |
| Array Dimensions | 2017: 10 × 10 needles on a 4 × 4 mm base. Current table: "Customizable from 2 - 12", no unit printed |
| Multi-Port Options | Current options: 1, 2, 3, 4. Not a claim of the 2017 study assembly |
| Metalization | Current platinum or sputtered iridium oxide (SIROF); no generic coating assigned to the particular 2017 study from options alone |
| Wire Bundle Length | Current customizable 20-130 mm; specific 2017 lead length not reported here |
| Reference and Ground | 2017: four on-array corner references plus two looped platinum wires as off-array reference and ground. Current page: "Ground Source and Selectable Reference Wires" |
| Insulation | Current manufacturer: Parylene-C; study-specific coating stack not extracted here |

## Identity and configuration

| Property | Specification and evidence boundary |
| --- | --- |
| Hardware | Utah Slant / USEA silicon-array family |
| Manufacturer | Blackrock Neurotech; the 2017 paper names Blackrock Microsystems |
| Tissue interface | Intrafascicular peripheral nerve; penetrating |
| Functions | Recording and electrical stimulation |
| Published human configuration | 2017 median/ulnar-nerve research arrays, not every current order option |
| Current labeling claim | Manufacturer describes human research under IDE; this is not general commercial approval |

## Geometry and contacts

| Property | 2017 study hardware | Current manufacturer page |
| --- | --- | --- |
| Physical electrodes | 100 in a 10 × 10 grid | Overview says 100 electrodes |
| Recording/stimulation paths | 96; four corner electrodes used as references | Specification table: 16-96 channels; overview also advertises up to 1,024 channels across multiple configurations |
| Base | 4 × 4 mm | Customizable; no single footprint substituted here |
| Pitch | 400 µm | 400 µm |
| Electrode length | Approximately 0.75-1.5 mm | Overview: 0.5-1.5 mm linear grading; specification table: custom 0.75-1.5 mm |
| Contact coatings | Do not infer one coating from generic Utah-family figures | Platinum or sputtered iridium oxide (SIROF/IrOx) |
| Insulation | Study-specific fabrication details not extracted here | Parylene-C |

The abstract calls the arrays "100-channel"; Methods explicitly allocates 96 electrodes for recording/stimulation and four for on-array reference. Both descriptions are preserved. The manufacturer's 100-needle overview, 16-96-channel table and up-to-1,024-channel system wording are different scopes, not one 1,024-site implant. Electrode area, exposed tip dimensions and one universal noise floor are not established by the sources inspected here.

## Electrical and system specifications

| Property | Specification and condition |
| --- | --- |
| Platinum impedance | Manufacturer: 20-800 kΩ; measurement frequency not stated on this page |
| SIROF/IrOx impedance | Manufacturer: 1-80 kΩ; frequency not stated on this page |
| Study impedance check | 1 kHz; electrodes at or above 500 kΩ were classified as failed for this analysis |
| Study connection | Percutaneous wires to a custom PCB and ZIF-Clip-96 recording/stimulation connection |
| Current connector options | Omnetics, CerePort 128/256 and custom, per manufacturer |
| Current lead options | Manufacturer: 20-130 mm wire bundle |
| Power and acquisition | External recording/stimulation hardware, not an autonomous wireless implant |
| MRI labeling | Not established here; no compatibility assertion |

A study's failure threshold is not the manufacturer's acceptable impedance range or a universal clinical safety threshold. Connector model names do not determine electrode count. Safe charge limits, waveform limits and tissue-current density require configuration-specific instructions and evidence; none is inferred from the generic array name.

## Tissue interface and reliability

Nerve penetration, lead motion and the percutaneous connection are separate engineering concerns. The 2017 study tracked working channels during four/five-week implants and found different channel-loss trends across arrays. These bounded observations do not establish a standard multi-year lifetime.

The current manufacturer reports more than ten years of recording in primates and six years in humans. Those are manufacturer claims about its broader experience, not the follow-up of the two-subject 2017 paper. This sheet does not convert them into a warranty or independently audited cohort result.

## Evidence and regulatory boundary

Two subjects each received two arrays, one in the median nerve and one in the ulnar nerve. Implant duration was four weeks for S3 and five weeks for S4. The study demonstrated virtual-hand control and evoked proprioceptive/cutaneous sensations, with a one-degree-of-freedom closed-loop task in one subject. Up to 12 degrees of freedom in informal freeform decoding, five independent real-time degrees of freedom and four proportional degrees of freedom describe different tasks.

The paper reports no observed long-term functional deficits from the implants, but the short implanted observation window does not establish long-term electrical reliability or general safety. Its abstract's up-to-131 percepts belong to the study, not a specification guaranteeing 131 percepts per implant.

The manufacturer's IDE wording describes investigational human use and says teams need IDE/IRB support. No general clearance for arbitrary implantation is inferred. First-implant year, patient-wide lifetime statistics and one universal tissue-risk grade are not supplied by this sheet.

## Model and missing specifications

The site's 100-needle reference geometry is not a reconstruction of every current USEA option or the complete 2017 assembly. Exact exposed contacts, wire routing, insulation geometry and connector packaging remain outside that model. Unknown dimensions, charge limits and MRI conditions remain unknown rather than being filled with generic Utah-array numbers.

## Primary sources

- Blackrock Neurotech. [Utah Slant Array, current manufacturer specification and research-use descriptions](https://blackrockneurotech.com/products/slant-array/), checked 7 October 2026.
- Wendelken S et al. [2017 human study, full primary Methods and results](https://jneuroengrehab.biomedcentral.com/articles/10.1186/s12984-017-0320-4).
- [Same primary manuscript in PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5702130/).
- [Primary indexed abstract](https://pubmed.ncbi.nlm.nih.gov/29178940/).
- George JA et al. [2020 decoding study cited in the earlier sheet](https://pubmed.ncbi.nlm.nih.gov/31711883/). Its different protocol is not used to fill the 2017 hardware configuration.
