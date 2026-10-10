---
title: "Fudan MNIS active silicon-transistor multimodal cortical interface"
order: 198
pubDate: 2026-10-09
updatedDate: 2026-10-09
device_id: "BTSD-ACAD-0100"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-09
description: "4 x 4 array of silicon PMOS transistor nodes on a 31 micrometer flexible film that records ECoG by capacitive coupling, senses temperature with gold resistors and detects light with built-in photodiodes. Song Enming's group at Fudan University; acute rat recordings (Advanced Science 2025)."
modality: "Cortical surface"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12806190/"
tags: ["Fudan", "Song Enming", "silicon transistor", "capacitive coupling", "active electrode", "multimodal", "ECoG", "China", "rat", "preclinical", "primary source"]
draft: false
---

# Fudan MNIS active silicon-transistor multimodal cortical interface

An active ECoG array: each recording node is a p-channel silicon transistor that amplifies the cortical signal at the sensing site and couples to tissue through a thin thermal oxide, with no metal contact to the brain. The same chip adds gold resistors for temperature and uses the transistors' photoelectric effect to sense light. It was built by Song Enming's group (with Zhang Rongjun) at Fudan University's Institute of Optoelectronics, with the Yiwu Research Institute of Fudan University and Dalian University of Technology among the affiliations. Published 29 October 2025 in Advanced Science (volume 13, e12114, January 2026), DOI 10.1002/advs.202512114, PMC12806190, CC BY 4.0. The full text was read via Europe PMC.

Fudan's own news page (2026) lists a "whole-brain amplifying microelectrode array" from the same group built from thousands of silicon nanofilm transistors. That page names no paper, so this sheet does not claim it is the same device.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Multifunctional neural interface system (MNIS) with active (MOSFET) and passive (gold resistor) elements [1] |
| Origin | Fudan University, Shanghai; Song Enming and Zhang Rongjun corresponding authors [1] |
| Interface class | Cortical-surface array, recording and sensing only [1] |
| Species studied | Sprague Dawley rats, 6 weeks old, anesthetized for ECoG; Fudan animal ethics approval 202504001S; L929 cell test for cytocompatibility [1] |
| Regulatory status | Research device; no human use reported [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Array | 4 x 4 sensing nodes (16 PMOS transistors), each node 220 x 300 µm2, over a 3.28 x 3.36 mm2 active area [1] |
| Layer stack, top to bottom | Thermal SiO2 bio-fluid barrier (0.3 to 2 µm selectable), 220 nm single-crystal silicon PMOS channel, 50 nm SiO2 plus 15 nm Al2O3 gate oxide, 50 nm Au interconnects and resistors, 6 µm polyimide encapsulation [1] |
| Total thickness | About 31 µm including a commercial Kapton film used during processing [1] |
| Readout | Each transistor is read separately in the reported setup (a PXI data acquisition system on 16 outputs); no on-probe multiplexing is described for this 16-node chip [1] |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Substrate | N-type SOI wafer (220 nm Si / 300 nm buried oxide / 500 µm handle), thinned to a 200 µm handle [1] |
| Process | 600 nm SiO2 diffusion mask; boron predeposition at 960 C and drive-in at 1100 C for p-type regions; SF6/O2 isolation trenches; dual gate dielectric (PECVD SiO2 and ALD Al2O3); Cr/Au 5 nm / 50 nm sputtered and wet-etched for gates, interconnects and resistors; 6 µm polyimide overcoat [1] |
| Release | Chip bonded face-down to 15 µm Kapton with PDMS at about 40 kPa; silicon handle removed by ICP-RIE then XeF2 vapor, stopping on the buried oxide, which becomes the capacitive tissue interface and biofluid barrier; contact openings by RIE and BOE; laser cut outline [1] |
| Why PMOS | The P+N junction used for the photodiode allows single-step doping; the paper says p+ silicon is more stable under physiological conditions [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Array yield | 100% of channels in the tested array, near-unity average gain [1] |
| Temperature | Gold resistor temperature coefficient of about 0.142% per C in vitro (20 to 50 C) and about 0.116% per C against a thermocouple on rat cortex [1] |
| In vivo ECoG | Anesthetized rat cortex; sharp-peak RMS amplitudes 150 to 600 µV across four example events [1] |
| Accelerated soak | 300 nm barrier devices showed small leakage and threshold-voltage shifts for 6 days at 70 C in PBS, then abrupt changes with cracks at the leads on day 9 [1] |
| Cytocompatibility | L929 cell viability 99.23% with the chip versus 98.78% control at 72 h [1] |

## Limits

Acute rat recordings and bench tests only; no chronic implant in animals was reported in the sections read. The paper itself notes the array's low spatial density limited the alpha and delta features seen. The 300 nm barrier failed by day 9 in the 70 C soak, so thicker barriers are the longer-life option.

## References

1. Li J et al., An Active, Multimodal Neural Interface for Real-Time Monitoring of Cortical Electrical, Thermal, and Optical Dynamics, Advanced Science 13, e12114 (2026), [PMC12806190](https://pmc.ncbi.nlm.nih.gov/articles/PMC12806190/), DOI 10.1002/advs.202512114.
2. Fudan University Institute of Intelligent Nanorobots and Nanosystems (Chinese and English), [Song Enming's whole-brain microelectrode array named a key BCI achievement at the 2026 Zhongguancun Forum](https://iiinn.fudan.edu.cn/dc/1d/c46029a777245/page.psp), cited only for the related array and its lack of a named paper.
