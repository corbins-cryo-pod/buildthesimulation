---
title: "SIMIT 256-channel high-density micro-ECoG (64 electrodes/cm2)"
order: 188
pubDate: 2026-10-09
updatedDate: 2026-10-09
device_id: "BTSD-ACAD-0090"
interface_class: "ecog"
status: "human"
last_updated: 2026-10-09
description: "16 x 16 gold-on-polyimide micro-ECoG array with 850 micrometer sites at 1250 micrometer pitch, in a titanium-housed implant with four Intan chips. 203 days in a Labrador, then intraoperative and short-term human motor-imagery decoding at Huashan Hospital. SIMIT with NeuroXess."
modality: "Cortical surface"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12677598/"
tags: ["SIMIT", "NeuroXess", "micro-ECoG", "polyimide", "motor decoding", "Huashan Hospital", "China", "human", "primary source"]
draft: false
---

# SIMIT 256-channel high-density micro-ECoG (64 electrodes/cm2)

A cortical-surface array from Zhou Zhitao's group at the Shanghai Institute of Microsystem and Information Technology (SIMIT, CAS) and Tao Hu's team at NeuroXess, tested clinically at Huashan Hospital, Fudan University (Wu Zehan is a corresponding author). It is a different array from the [NeuroXess 256-channel flexible ECoG](/devices/179-neuroxess-flexible-ecog-256-channel-bci/), which the sources there describe with 3 mm pitch. Details are from the Advanced Science paper (2025, full text via Europe PMC) and SIMIT's Chinese release.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | µECoG array, flexible printed circuit, signal processing unit and titanium enclosure, with a decoding and device-control software stack [1][2] |
| Origin | SIMIT with NeuroXess and Huashan Hospital [2] |
| Interface class | Cortical-surface array, mesh recording area [1] |
| Species studied | One Labrador (male, about 18 months, 30 kg) for 203 days; human intraoperative and short-term trials [1] |
| Regulatory status | Research; Huashan Hospital IRB approval KY2021-918; participants were tumor patients needing awake surgery [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Electrode count | 256 channels, 16 x 16 [1] |
| Site diameter and pitch | 850 µm sites, 1250 µm apart; 64 electrodes/cm2, which the SIMIT release calls 64 times the density of clinical ECoG [1][2] |
| Layers | Ultrathin mesh recording area with thickened lead zones for robustness [1] |
| Implant electronics | Four Intan RHD2164 chips; flexible printed circuit; customized titanium enclosure, watertight and airtight [1] |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Process | Sandwich of gold in polyimide, adapted from the group's earlier silk-enabled bioelectronics work [1] |
| Layers | 7 µm PI-2610 on a silicon wafer; Cr 50 angstrom and Au 150 nm by e-beam evaporation with lift-off; 13 µm PI encapsulation [1] |
| Openings | Aluminum etch mask, aluminum etched, oxygen plasma dry etch for site openings and perfusion holes [1] |
| Release | Hydrofluoric acid etch from the wafer [1] |
| Pre-implant test | More than 95% of electrodes under 1 MΩ at 1 kHz; RMS noise under 2 µV in PBS [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Canine stability | 203 days; electrode yield fell 5.49%; SNR stayed above 20 dB; real-time 3D motor decoding mean accuracy 0.84 [1][2] |
| Decoders | LSTM and position-velocity Kalman filter on high-gamma power spectral density features; recalibration 5 to 7 minutes between sessions [1] |
| Human intraoperative | After 7 minutes of training the participant played ping-pong (1D, mean accuracy 0.90) and snake (2D) by brain signals [1] |
| Human short-term | Implanted up to about 12 days; 19.87 h of training; center-out up to 1.13 bits/s, WebGrid up to 4.15 bits/s after interface changes [1][2]. The SIMIT release compares this with a 4.60 bits/s figure for a Neuralink participant; that comparison is the institute's, not the paper's |
| Density effect | Within a 2 x 2 cm area, higher electrode density improved decoding without more coverage [1] |

## Limits

Human follow-up is days, not months. Participant numbers beyond the quoted sessions and supplementary figures were not read. The "comparable to intracortical" language is the authors' framing.

## References

1. [Chronically Stable, High-Resolution Micro-Electrocorticographic Brain-Computer Interfaces for Real-Time Motor Decoding, Advanced Science (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12677598/). DOI 10.1002/advs.202506663. Read through Europe PMC full text.
2. SIMIT (Chinese), [上海微系统所在高通量柔性脑机接口临床实时运动解码方面取得进展, 15 September 2025](https://www.sim.ac.cn/kybm2016/cgjslhgjzdsys2016/kyjz2016/202509/t20250915_7968499.html).
