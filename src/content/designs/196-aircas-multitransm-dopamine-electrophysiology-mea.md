---
title: "AIR-CAS MultiTransm dual-mode MEA (dopamine plus electrophysiology)"
order: 196
pubDate: 2026-10-09
updatedDate: 2026-10-09
device_id: "BTSD-ACAD-0098"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-09
description: "Two-shank silicon MEMS probe, 5.70 mm long, with 20 micrometer electrophysiology sites, a 180 micrometer dopamine-sensing site and an on-probe IrOx reference. Aerospace Information Research Institute (CAS) with Zhejiang University and Ruijin Hospital; recorded dopamine and spikes in mouse nucleus accumbens across sleep and wake (Research 2025)."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12509213/"
tags: ["AIR-CAS", "Cai Xinxia", "MultiTransm", "dopamine", "dual-mode", "silicon MEMS", "nucleus accumbens", "China", "mouse", "preclinical", "primary source"]
draft: false
---

# AIR-CAS MultiTransm dual-mode MEA

A penetrating silicon probe that records spikes and measures dopamine on the same shank, with a reference electrode built onto the probe so no separate skull reference is implanted. It comes from the State Key Laboratory of Transducer Technology, Aerospace Information Research Institute (AIR), Chinese Academy of Sciences (Cai Xinxia, Wang Mixia), with Yu Yanqin's group at Zhejiang University and Luo Yan's group at Ruijin Hospital, Shanghai Jiao Tong University. Published 9 October 2025 in Research (Science Partner Journal), DOI 10.34133/research.0944, PMC12509213, CC BY 4.0. Full text read via Europe PMC; a Chinese summary was released through EurekAlert on 5 January 2026.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | MultiTransm microelectrode array (MT MEA): three-electrode electrochemical system plus electrophysiology sites on one probe [1] |
| Origin | AIR-CAS, Beijing; Zhejiang University; Ruijin Hospital [1] |
| Interface class | Penetrating deep-brain silicon probe, recording and sensing only [1] |
| Species studied | C57BL/6J mice, n = 6, implanted bilaterally in nucleus accumbens (NAc), freely moving through sleep and wake; approval by the AIR-CAS animal care committee [1] |
| Regulatory status | Research device; no human use reported [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Shanks | Two, each 5.70 mm long; widths 350 µm (left) and 200 µm (right); 1.65 mm apart to match the left and right NAc [1] |
| Dopamine site | 180 µm diameter working electrode on the left shank, with a concentric ring reference around it and a rectangular Pt counter electrode [1] |
| Electrophysiology sites | 20 µm diameter, 90 µm spacing, on both shanks; radially symmetric around the dopamine site on the left shank [1] |
| Channel count and shank thickness |  |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Substrate and process | MEMS on a silicon-on-insulator wafer: LPCVD oxide, Ti/Pt conductor by AZ5214 lift-off, 300 nm PECVD silicon oxide plus 500 nm silicon nitride insulation, nitride windows opened to expose sites, silicon and thermal oxide etched to the probe outline, release from the SOI by wet etch [1] |
| Site-specific coatings | Electrophysiology sites: Pt nanoparticles then PEDOT:PSS. Dopamine site: Pt nanoparticles, PEDOT:PSS and Nafion. Reference: electrodeposited IrOx, then 72 h room-temperature incubation [1] |
| Why site-specific | Whole-probe coatings cause crosstalk between sites; the paper shows by SEM and EDS that each site keeps its own coating [1][2] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Electrophysiology impedance | 1,268.53 ± 253.87 kΩ bare, 3.93 ± 0.25 kΩ with Pt nanoparticles, 1.48 ± 0.61 kΩ with PtNP/PEDOT:PSS, at 1 kHz [1] |
| Dopamine sensing | Detection limit as low as 25 nM, sensitivity 31.49 pA/µM, calibrated 25 nM to 100 µM; oxidation peak at 0.17 V [1] |
| Reference stability | IrOx open-circuit potential about 220 mV, within ±20 mV over 14 days (days 1, 3, 7, 14) [1] |
| In vivo | Dopamine peaked in wake (1.27 ± 0.12 µM), was lowest in NREM sleep (0.71 ± 0.04 µM) and jumped on REM-to-wake transition; three neuron classes (REM-inhibited, REM-stable, REM-rhythmic) were identified, with two tracking dopamine [2] |

## Limits

Six mice. The 14-day reference stability figure is from in vitro testing; the paper does not give a months-long implant duration for this probe. The same group reports related probes elsewhere; they are not covered here.

## References

1. Jia Q et al., Targeted-Modified MultiTransm Microelectrode Arrays Simultaneously Track Dopamine and Cellular Electrophysiology in Nucleus Accumbens during Sleep-Wake Transitions, Research 8:0944 (2025), [PMC12509213](https://pmc.ncbi.nlm.nih.gov/articles/PMC12509213/), DOI 10.34133/research.0944.
2. AIR-CAS release (Chinese) on EurekAlert, [破译大脑"睡与醒"的切换密码, 5 January 2026](https://e3.eurekalert.org/news-releases/1111572?language=chinese).
