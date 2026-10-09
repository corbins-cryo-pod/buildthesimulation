---
title: "SIMIT silk-enabled intraventricular interface (IVI)"
order: 187
pubDate: 2026-10-09
updatedDate: 2026-10-09
device_id: "BTSD-ACAD-0089"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-09
description: "Catheter-delivered 14 micrometer polyimide microelectrode array on a shape-memory silk fibroin scaffold that unfolds in cerebrospinal fluid and lies on the inner surface of the lateral ventricle. SIMIT and NeuroXess; recorded from the caudate head in Parkinsonian sheep for four weeks."
modality: "Other"
website: "https://www.nature.com/articles/s41467-025-64397-9"
tags: ["SIMIT", "NeuroXess", "silk fibroin", "intraventricular", "deep brain", "China", "sheep", "preclinical", "primary source"]
draft: false
---

# SIMIT silk-enabled intraventricular interface (IVI)

A flexible electrode array that is folded into a clinical catheter, pushed into the lateral ventricle and unfolds there to contact the cerebrospinal-fluid-facing surface of deep nuclei such as the caudate head. It comes from Zhou Zhitao's group at the State Key Laboratory of Sensor Technology, Shanghai Institute of Microsystem and Information Technology (SIMIT, CAS), with Tao Hu's team at Shanghai NeuroXess, and Huashan Hospital among the partners. Details are from the open-access Nature Communications paper (23 October 2025) and SIMIT's Chinese release.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Intraventricular interface: deformable microelectrode array (dMEA) on a silk fibroin scaffold [1][2] |
| Origin | SIMIT, with NeuroXess (脑虎科技) and Huashan Hospital, Fudan University [2] |
| Interface class | Planar flexible array on the ventricular surface; it does not penetrate the target nucleus [1][2] |
| Species studied | Parkinsonian sheep (MPTP model): intraoperative recording and a four-week free-moving study [1][2] |
| Regulatory status | Research device; no human use reported in the sources read [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Electrode count |  |
| Total thickness | 14 µm: dual-metal layers between three polyimide layers [1] |
| Site shape | Circular sites in a hemispherical-unfolding layout with rounded corners; 700 µm radius stated for the layout [1] |
| Conventional version | dMEA center 2.32 x 2.28 mm, 0.6 mm pad pitch, used for early experiments [1] |
| Small version | Flip-chip bonded, 160 µm pad pitch, dMEA center 1.27 x 1.27 mm, used for the long-term study [1] |
| Two shapes | Convex and concave variants, differing in the silk bending direction and fixation, for convex or concave surfaces [1] |
| Delivery | Folded into a catheter; unfolds when it leaves the catheter into cerebrospinal fluid; tested in a 1:1 3D-printed ventricle model [1] |
| Curvature adaptation | Attached to a 7 mm agarose surface and further conformed to 10 mm [1] |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Substrate | Polyimide, built as 3 µm base, 2 µm interlayer and top layers on an aluminum (1 µm) sacrificial layer on silicon [1] |
| Metals | Back pads Cr/Ni/Au 100/1000/5000 angstrom by e-beam evaporation and liftoff; vias and shield Cr/Au sputtered [1] |
| Via structure | Double-sided metal exposure with interlayer vias linking a back-side reflow-pad array to front-side recording sites [1] |
| Shielding | Coplanar Cr/Au in-plane shield on the interlayer polyimide (variant T1) against variant T0 without it; the release says the shield suppresses mains noise [1][2] |
| Silk mechanism | Compressed top and tensioned bottom give oriented crystallization, seen as arcs in 2D wide-angle X-ray diffraction; cerebrospinal fluid breaks the hydrogen bonds and the scaffold returns to its elastic state and unfolds [1] |
| Simulation | ABAQUS shell-element strain models; COMSOL electrostatic models of the shield [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Electrical stability | Resistance drift within 5% after 100 stress cycles; impedance spectra unchanged by assembly [1] |
| Application demonstrated | Caudate head recording in Parkinsonian sheep: beta oscillations and response to levodopa with benserazide; an SVD-LDA model discriminated pathological states, with best channels at 90.3% and 89.9% [1][2] |
| Chronic follow-up | Four weeks free-moving in sheep with a roughly 18 Hz beta peak after model induction; CT showed no detectable displacement relative to the ventricle [1] |

## Limits

Channel count and the silk scaffold preparation steps were not read. Sheep only; the authors list integration with endoscopes and external ventricular drains as future work [1].

## References

1. [Silk-enabled conformal intraventricular interfaces for minimally invasive neural recordings, Nature Communications (2025)](https://www.nature.com/articles/s41467-025-64397-9). DOI 10.1038/s41467-025-64397-9.
2. SIMIT (Chinese), [上海微系统所在微创植入式柔性深脑区脑机接口方面取得进展, 30 October 2025](https://sim.cas.cn/xwzx2016/kyjz/202510/t20251030_7999550.html).
