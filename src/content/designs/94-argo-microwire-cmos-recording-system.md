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

## Primary sources

- [2021 complete primary manuscript, methods, Table 1 and Figures 2/6](https://pmc.ncbi.nlm.nih.gov/articles/PMC8607496/).
- [Publisher record](https://beta.iopscience.iop.org/article/10.1088/1741-2552/abd0ce).
