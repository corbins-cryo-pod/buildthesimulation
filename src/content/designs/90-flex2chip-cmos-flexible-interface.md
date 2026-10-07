---
title: "Flex2Chip flexible-array CMOS interface"
order: 90
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0059"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-07
description: "Capillary-assembled suspended pads connect flexible neural arrays to a CMOS-MEA. Published 720/2,200-connection layouts, 1,024 simultaneous chip channels and acute 504-site ECoG use are kept distinct."
modality: "Cortical surface"
website: "https://www.science.org/doi/10.1126/sciadv.adf9524"
tags: ["Flex2Chip", "ECoG", "CMOS", "flexible", "Stanford", "ETH", "connector", "preclinical"]
draft: false
---

# Flex2Chip flexible-array CMOS interface

Zhao and colleagues' 2023 paper reports a flexible thin-film electrode array joined to a rigid CMOS microelectrode array by deformable suspended pads. The paper's affiliations include Stanford and ETH Zürich. The device bridges flexible tissue contact to rigid recording electronics; the chip itself is not a flexible implant.

## How the connector works

An isopropyl-alcohol liquid bridge pulls the suspended I/O pads toward the chip as it evaporates. After contact, van der Waals forces hold the pads down and establish an ohmic connection. Silicone encapsulation can secure the mechanically delicate interface.

The flexible leads are 1 µm wide, 100 nm thick platinum at 2 µm pitch, between two 1 µm polyimide layers. Each connector pad is supported by three 2 µm-wide, 10 µm-long beams; connector pitch is 50 µm. These connector dimensions are not the tissue recording-contact pitch.

## Counts and configurations

| Structure | Reported configuration |
| --- | --- |
| Flexible connector arrays | 720 and 2,200 nominal connections |
| Underlying CMOS-MEA | 26,400 active pixels, 17.5 µm pixel pitch |
| Simultaneous CMOS readout | 1,024 channels maximum |
| Slice recording array | 720 sites, 30 × 24 layout, 20 µm-diameter contacts, reported 90 µm pitch |
| Acute mouse ECoG array | 504 sites, 20 µm-diameter contacts, 760 × 760 µm active area |

The 2,200 nominal connections are not 2,200 simultaneous channels. The switch matrix selects connected pixels for the chip's smaller readout capacity. The [slice and seizure-mapping application](/applications/91-flex2chip-slice-seizure-mapping-2023/) uses different tissue-end layouts.

## Conflicting source dimensions retained

- Main text describes a **35 µm** I/O pad; Figure 2 caption describes **40 µm**. No single diameter is selected here.
- Figure 1 caption gives **3.5 × 2.1 mm** interface area, while the main text and electrical-performance section give **3.85 × 2.10 mm**.
- The slice section reports **3.6 × 1.62 mm**, **30 × 24 sites** and **90 µm pitch** together. Those values do not uniquely define a simple full rectangular contact grid. A complete mask is not reconstructed from them.

## Yield and durability boundary

Average connector yield was 95.3% ± 3.42% for 720-connection devices and 75.7% ± 10.4% for 2,200-connection devices. A month in a 37°C, 97%-humidity incubator changed one 720-connection measurement from 709 to 705 connected channels. This is connector bench aging, not a month-long implanted animal result.

The unencapsulated interface is delicate under external forces. The paper reports a 9.38% ± 14.6% decrease in channel yield after silicone encapsulation. That is a measured trade-off, not zero loss.

## Model boundary

No full model is supplied. Connector pads, tissue electrodes, wiring, chip and encapsulation are distinct structures. Conflicting pad dimensions and unresolved recording-mask geometry remain visible rather than guessed.

## Primary sources

- [2023 primary paper](https://www.science.org/doi/10.1126/sciadv.adf9524).
- [Institution-hosted publisher PDF, including Figures 1 and 2](https://open.metu.edu.tr/bitstream/handle/11511/111087/sciadv.adf9524.pdf).
