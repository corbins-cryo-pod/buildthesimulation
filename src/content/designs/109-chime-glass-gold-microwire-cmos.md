---
title: "CHIME glass-gold microwire CMOS interface, 2020"
order: 109
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0069"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "CHIME's glass-insulated gold wires and electroplated contacts coupled to MEA1k or camera-derived CMOS. Demonstrated bundles and connected pixels are separate from327,680 amplifier capacity; chronic validation remains open."
modality: "Intracortical"
website: "https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2020.00834/full"
tags: ["CHIME", "microwire", "gold", "glass", "CMOS", "Crick", "Stanford", "European-secondary", "preclinical"]
draft: false
---

# CHIME: glass microwires and CMOS

The August 11, 2020 primary paper describes CMOS-Hosted in vivo Microelectrodes (CHIME). Its affiliations include the Francis Crick Institute, UCL, Stanford, Paradromics, ETH Zurich and MaxWell Biosystems. This UK-led collaboration is marked European-secondary in the US-first catalog.

The broader wire-to-chip approach overlaps with the [Stanford 2020 bundle interface](/devices/96-stanford-microwire-cmos-bundles-2020/), which the CHIME paper cites. This record identifies the distinct glass-gold, electrochemically functionalized CHIME assembly and its camera-derived readout variant, not a new name for every microwire-CMOS bundle. It is also not the later [Argo custom readout](/devices/94-argo-microwire-cmos-recording-system/).

## Demonstrated assembly

| Component | Primary paper description |
| --- | --- |
| Recording wire | Gold core with glass sheath; 22-25 µm outer diameter and 1-7 µm core in the reported recordings |
| Fabricated bundles | 100-1, 000 wires; Figure 2 shows a 1, 000-wire fabrication example |
| Insertion tests | 200-500 wires, about 100 µm average spacing |
| Chip-side contact | Electroplated gold bumps, about 10 µm, pressed onto conductive CMOS pixels |
| Tissue-side preparation | 30-degree sharpening; gold/iridium-oxide electrodeposition |
| Released wire length | Results describes the last 2 mm; Methods describes approximately 2-5 mm free. Configurations are not collapsed into one value |
| MEA1k readout | 1, 024 selected channels from 26, 400 pixels |
| Cheetah640CL readout | 640 × 512 pixel grid, 327, 680 amplifier inputs; full-frame rate 1.7 kHz versus up to 200 kHz for the smallest window |

One wire may contact multiple pixels. Pixel capacity is not the count of implanted wires, independent signals or neurons. Figure 3's 200-electrode connection example is not a 327, 680-electrode brain recording. Mechanical presses, reference-voltage electronics and acquisition equipment remain part of the head-fixed setup.

## Noise and saturation

Saline characterization reports 24.2 ± 7.7 µV RMS for connected MEA1k pixels and 58.2 ± 21.5 µV for camera pixels. After correlated-noise subtraction, MEA1k residual noise is 6.5 ± 2.6 µV. These are distinct processing states, not conflicting measurements to average together.

The camera-derived readout lacks the MEA's offset compensation and filtering, so large drifts more often saturate pixels. Camera frame rate depends on the selected window; its maximum is not available over the entire array at once.

## Biological and scaling limits

The [acute mouse olfactory-bulb application](/applications/110-chime-acute-mouse-olfactory-bulb-2020/) documents the animal evidence. Stability over 40 minutes is not days-to-months chronic validation. The paper explicitly calls for chronic histological and functional studies.

Dense bundles increase tissue displacement. Smaller wires increase buckling risk, and flexible wire trajectories make exact site positions and spike sorting harder. The paper's minimal vascular-damage discussion cites related studies; it does not prove zero damage for all CHIME bundles or sizes.

## Model boundary

No full model is supplied: average spacing does not recover the actual packing, tip coordinates, gold-bump deformation, chip assignments or press envelope. Prospective million-channel scaling and untethered electronics are not demonstrated hardware features here.

## Primary sources

- [Published 2020 paper, Methods and Figures 1-6](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2020.00834/full).
- [Primary paper archive](https://pmc.ncbi.nlm.nih.gov/articles/PMC7432274/).
