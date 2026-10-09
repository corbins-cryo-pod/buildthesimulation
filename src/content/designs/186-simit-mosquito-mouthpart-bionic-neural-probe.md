---
title: "SIMIT mosquito-mouthpart bionic neural probe (128-channel flexible array)"
order: 186
pubDate: 2026-10-09
updatedDate: 2026-10-09
device_id: "BTSD-ACAD-0088"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-09
description: "128-channel, 2.5 micrometer polyimide array delivered through the dura by sharpened tungsten shuttles in microtubule tracks, with a tactile sensor array that warns of vessels. Built by Tao Hu and Wei Xiaoling's group at Shanghai Institute of Microsystem and Information Technology; mouse recordings to 16 weeks."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41378-023-00565-5"
tags: ["SIMIT", "flexible electrode", "polyimide", "transdural implantation", "tactile sensor", "China", "mouse", "preclinical", "primary source"]
draft: false
---

# SIMIT mosquito-mouthpart bionic neural probe (128-channel flexible array)

A research probe system from the State Key Laboratory of Transducer Technology, Shanghai Institute of Microsystem and Information Technology (SIMIT, CAS). The Chinese release names Tao Hu and Wei Xiaoling as corresponding authors. Details below are from the open-access Microsystems & Nanoengineering paper (2023) and SIMIT's Chinese release.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Probe system of three modules: a 128-channel flexible electrode array, a shuttle implant module, and a tactile sensor array [1][2] |
| Origin | SIMIT State Key Laboratory of Transducer Technology; animal work at Shanghai Laboratory Animal Research Center, approved by the Fudan University IACUC [1][2] |
| Interface class | Penetrating flexible shanks placed through intact dura [1] |
| Species studied | Mice (C57BL/6, 8 weeks old; n = 3 in the 16-week study) [1] |
| Regulatory status | Research device; no human use reported in the sources read [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Electrode count | 128 channels: 4 shanks of 32 gold sites [1] |
| Shank width, length, thickness | About 105 µm wide on average, 5 mm long, 2.5 µm thick [1] |
| Bending stiffness | About 4.23 x 10^-13 N·m2, roughly five orders of magnitude below a commercial silicon probe (paper's comparison) [1] |
| Implant module | Microtubule tracks (150 µm inner diameter in the design; PTFE tubes 200 µm outer and 100 µm inner as built) carrying one tungsten shuttle per shank; track and shuttle counts can be changed [1] |
| Shuttle | Tungsten wire 75 µm etched to 40 µm with a sharpened tip; the unetched end is wrapped in 100 µm polyimide and flattened to touch the sensor [1] |
| Tactile sensor | Silicon piezoresistive sensor array reading shuttle force, used to tell tissue types apart and warn of vessels [1][2] |
| Insertion method | Shuttle pierces the dura, bioglue between shuttle and shank dissolves, shuttle withdraws along its track [1] |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Substrate | Polyimide PI-2610, two 1.2 µm layers, cured at 380 °C for 12 h in nitrogen [1] |
| Metal | Chromium 5 nm, nickel 150 nm, gold 50 nm for interconnects, sites and pads (methods section); the results text gives 100 nm gold sites. Both figures appear in the paper [1] |
| Release | Sacrificial 100 nm nickel layer on a thermally oxidized silicon wafer, removed with nickel etchant; sites opened by RIE under an aluminum hard mask [1] |
| Site coating | PEDOT electrodeposited from EDOT with sodium dodecyl benzene sulfonate [1] |
| Backend | Pads flip-chip bonded by reflow to a 0.8 mm PCB; two 64-pin Molex connectors; Intan RHD recording system [1] |
| Shuttle process | Electrochemical etch in 0.8 M NaOH at 2.5 V, about 1 minute to thin and 3 more to sharpen [1] |
| Track base | Two-photon 3D printed; bonded with PEG (30,000 molecular weight) [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Dura penetration force | About 3.8 mN for the sharpened 40 µm shuttle versus about 18.9 mN for a flat tip [1] |
| Acute recording | Single-unit spikes within 12 hours of implantation in awake mice [1][2] |
| Chronic recording | 16 weeks; at week 4, 99 isolated units from 194 channels in motor cortex, striatum and hippocampus (about 0.51 units per channel); at week 12, 95 units [1] |
| Tissue response | Less glial scarring and microglial aggregation than a 100 µm stainless steel wire at 4 weeks [1] |

## Limits

Mouse only. Supplementary figures were not read. Sensor sensitivity values and in vivo vessel-warning statistics are in figures not reproduced here.

## References

1. [A mosquito mouthpart-like bionic neural probe, Microsystems & Nanoengineering 9, 88 (2023)](https://www.nature.com/articles/s41378-023-00565-5).
2. SIMIT (Chinese), [上海微系统所研制类蚊口器仿生柔性神经探针实现硬脑膜外微创植入, 13 July 2023](https://www.sim.ac.cn/xwzx2016/kyjz/202307/t20230713_6809952.html).
