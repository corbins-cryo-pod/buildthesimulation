---
title: "MERF 128-channel ultraflexible polyimide array (CEBSIT)"
order: 185
pubDate: 2026-10-09
updatedDate: 2026-10-09
device_id: "BTSD-ACAD-0087"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-09
description: "Two-shank, 128-channel, 1 micrometer thick polyimide array from Zhao Zhengtao's group at CEBSIT (Chinese Academy of Sciences) with Li Chengyu's group at Lingang Laboratory. Chronic single-unit recording in macaque visual and motor cortex for up to eight months, plus a cursor-control demonstration."
modality: "Intracortical"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10667845/"
tags: ["MERF", "ultraflexible", "polyimide", "CEBSIT", "Lingang Laboratory", "China", "macaque", "preclinical", "primary source"]
draft: false
---

# MERF 128-channel ultraflexible polyimide array (CEBSIT)

MERF ("mechanically robust ultraflexible") is a research electrode array built for single-unit recording in the macaque cortex. The facts below come from the open-access paper in Advanced Science (2023) and the institute's own Chinese-language release. The authors are at the CAS Center for Excellence in Brain Science and Intelligence Technology (脑智卓越中心, Institute of Neuroscience) and Lingang Laboratory, Shanghai. The Chinese release names Zhao Zhengtao's group and Li Chengyu's group.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | MERF electrode array, 2 shanks of 64 sites [1][2] |
| Origin | Research groups of Zhao Zhengtao (CEBSIT) and Li Chengyu (Lingang Laboratory), with the CEBSIT primate platform and micro-nano fabrication platform [1][2] |
| Interface class | Penetrating intracortical array, single-unit resolution [1] |
| Species studied | Three macaques; one array in M1 (monkey 1), seven arrays in V1 (monkey 2), three in V1 (monkey 3) [1] |
| Regulatory status | Research device; no human use reported in the sources read [1] |
| Function | Chronic single-unit recording; offline and online cursor control from M1 signals in one monkey [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Two flexible penetrating shanks on one array, shuttled into cortex by tungsten wires [1] |
| Electrode count | 128 channels, 64 per shank [1] |
| Pitch | 30 µm along the shank [1] |
| Electrode lengths | Shank length 20 mm; effective recording length customized to 1.9 mm for full cortical depth [1] |
| Shank width and thickness | Base polyimide down to 1 µm; whole device 1 to 1.5 µm; shank cross-section about 100 µm2 [1] |
| Tip and exposed site geometry | Circular sites 25 µm in diameter, placed at the shank edge and slightly protruding; a 20 µm hole at the tip anchors the shuttle wire [1] |
| Contact coating | Iridium oxide or PEDOT:PSS, to about 100 kΩ [1] |
| Insulation | Non-photosensitive polyimide [1] |
| Insertion method | Needle-and-thread coupling to an electrochemically etched tungsten shuttle (10 µm column at the tip), driven by a solenoid at 1.25 m/s; shuttle removal retracted shanks under 80 µm in agarose (n = 7) [1] |
| Anchoring and fixation | Customized protective chamber over the array; backend by flexible printed circuit [1] |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Base material | Polyimide chosen over SU-8: SU-8 shanks of rodent thickness failed to penetrate monkey pia; at 1 µm polyimide had about 5.8 times the tensile strength of SU-8 [1] |
| Process | Planar multilayer microfabrication adapted from the group's earlier NET probes; polyimide patterned by O2 plasma etching [1] |
| Metals | Gold interconnect and site surface; titanium adhesion layer instead of chromium [1] |
| Interconnect | Minimum line width and spacing 1.5 µm; line resistance 160 Ω/mm [1] |
| Comparison with prior design | NET probes had 8 sites per shank with sites mid-shank; MERF has 64 sites per shank at the edge [1] |
| Backend | Soldered to a 128-channel flexible printed circuit board 42 mm long, read out by Intan or SpikeGadgets headstages; tungsten wires held on a carrier chip with 5% PEG-300000 [1] |
| Mechanics | Finite element models (SolidWorks, ANSYS) compared 1 and 7 µm thick shanks; paper reports more than two orders of magnitude lower bending stiffness than 7 µm polyimide shanks [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Functional channels | 115, 633 and 317 channels in the three monkeys (impedance criterion in the paper) [1] |
| Single units | 662 units over 25 sessions (monkey 1), 1262 over 31 (monkey 2), 989 over 52 (monkey 3) [1] |
| Signal | Mean single-unit amplitude 85, 113 and 80 µV; SNR 3, 7 and 6 [1] |
| Longevity | Stable recording for up to eight months [1] |
| Volume coverage | Ten shanks in seven insertions covered about 4 x 6 x 3 mm3 with 640 sites in V1 of monkey 2 [1] |
| Comparison with Utah arrays | The authors say MERF did not show better yield than reported Utah-array figures, and attribute this possibly to site location [1] |
| Application demonstrated | Orientation tuning and receptive-field mapping in V1; center-out cursor control from M1, with no significant difference from hand control in time cost and path efficiency in most directions [1][2] |

## Limits

Beyond eight months and any clinical use are stated by the authors as open questions [1]. Per-device impedance spread, yield tables and supplementary figures were not read. The paper's full text was read through PubMed Central; the Wiley page and supplementary files were not opened.

## References

1. [An Ultraflexible Electrode Array for Large-Scale Chronic Recording in the Nonhuman Primate Brain, Advanced Science 2023 (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10667845/). DOI 10.1002/advs.202302333.
2. CEBSIT (Chinese), [脑智卓越中心利用超柔性电极在非人灵长类中实现大规模单细胞信号记录和脑机接口运动控制, 27 October 2023](https://cebsit.cas.cn/yjz/zzt/xw/202310/t20231030_6910915.html).
