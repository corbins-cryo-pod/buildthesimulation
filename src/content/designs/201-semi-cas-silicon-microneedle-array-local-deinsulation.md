---
title: "Semi CAS silicon microneedle array with local de-insulation"
order: 201
pubDate: 2026-10-09
updatedDate: 2026-10-09
device_id: "BTSD-ACAD-0103"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-09
description: "10 x 10 bulk-silicon microneedle array, Utah-style, with tips exposed by masking in PDMS before Parylene-C deposition instead of etching. Tip exposure about 50 um, platinum black sites at 33.2 kOhm at 1 kHz, 15 of 16 channels recording in rat with mean spike SNR 12.63. Pei Weihua's group, Institute of Semiconductors, CAS."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41378-025-00922-6"
tags: ["Institute of Semiconductors", "Pei Weihua", "silicon microneedle", "Utah-style", "Parylene-C", "platinum black", "China", "rat", "preclinical", "primary source"]
draft: false
---

# Semi CAS silicon microneedle array with local de-insulation

A 10 x 10 silicon microneedle array for chronic cortical recording from Pei Weihua's group at the Institute of Semiconductors, Chinese Academy of Sciences, Beijing. The new part is how the tips are opened: the tips are pressed into a thin PDMS mask, Parylene-C is deposited over everything, and pulling the array out of the mask fractures the film at the tip, so no etching is needed. Paper: "A local de-insulation method and its application in neural microneedle array", Microsystems & Nanoengineering, 2025, DOI 10.1038/s41378-025-00922-6 (PMC12106818, open access). The Institute's Chinese release of 17 June 2025 gives the same method and a 97% site consistency figure; the paper reports its own non-uniformity numbers, both listed below.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Silicon neural microneedle electrode array chip [1][2] |
| Origin | Institute of Semiconductors, CAS (Pei Weihua) [1][2] |
| Funding named | NSFC 62071447; National Key R&D Program 2022YFF1202303 [1] |
| Regulatory status | Research device; rat implants only [2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Array | 10 x 10 silicon pillars, maximum 100 channels; a 16-channel (4 x 4) version was implanted [2] |
| Pillar depth | 1300 um from a 1800 um double-polished wafer, including fins and corner posts around the array [2] |
| Tip exposure | Acceptable range quoted as 30 to 100 um; four electrodes from one batch averaged 50 +/- 0.77 um [2] |
| Pitch | Equal in X and Y, set by the backside pillar pattern; value blank |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Substrate | Silicon pillars etched by ICP from a double-polished wafer, anodically bonded to BF33 glass, annealed under nitrogen so glass fills around the pillars, then polished to expose pillar ends [2] |
| Backside contacts | Cr/Au by PVD with lift-off [2] |
| Singulation | Front-side dicing saw cuts the silicon and glass into arrays [2] |
| Insulation | Silane A-174 adhesion layer, Parylene-C about 3 um thick; tips protected by a PDMS mask (10:1, spun at 1250 rpm for 50 s, cured at 80 C for 8 min, about 50 um thick) [2] |
| Site coating | Platinum black over Au [2] |
| Packaging | Wedge-bonded insulated gold wires to a PCB, wrapped and coated in silicone [2] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Site uniformity | Paper: tip non-uniformity 3.32 +/- 1.02% across 10 x 10 arrays; range 2.32 +/- 0.57% to 5.22 +/- 1.82% across process settings [2]. Institute release: 97% consistency of exposed sites [1] |
| Impedance at 1 kHz | Au 1.36 MOhm; platinum black 33.2 kOhm [2] |
| Charge storage | Au 0.597 mC/cm2; platinum black 85.7 mC/cm2 at 50 mV/s [2] |
| Aging | In vitro test equivalent to 32 days in 37 C PBS [2] |
| In vivo | Rat, 16-channel array: 15 channels recorded spikes; mean SNR 12.63 +/- 6.64, best channel 28.472 [2] |
| Process time | The paper's comparison lists about 1 h against about 11 h for the etching route [2] |

## Limits

Rat acute-to-short implants only as reported; no chronic duration was found in the text read. Channel-to-channel SNR spread is large, which the authors tie to implant position and damage. Pitch and needle diameter were not extracted, so they are blank.

## References

1. Institute of Semiconductors, CAS (Chinese), [半导体所植入式脑机接口器件研究取得新进展, 17 June 2025](https://semi.cas.cn/xwdt/zhxw/202506/t20250617_7870922.html).
2. A local de-insulation method and its application in neural microneedle array, Microsystems & Nanoengineering (2025), [DOI 10.1038/s41378-025-00922-6](https://doi.org/10.1038/s41378-025-00922-6); full text via [Europe PMC PMC12106818](https://europepmc.org/article/MED/40419549).
