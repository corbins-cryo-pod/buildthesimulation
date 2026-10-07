---
title: "Neuropixels 1.0 NHP long-shank probe"
order: 85
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0057"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "45 mm silicon shank with 4,416 selectable sites and 384 simultaneous channels, engineered for acute recordings in nonhuman primates. Reticle stitching, stress compensation and insertion geometry are part of the hardware."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41593-025-01976-5"
tags: ["Neuropixels", "NHP", "intracortical", "recording", "silicon", "macaque", "imec", "academic", "preclinical"]
draft: false
---

# Neuropixels 1.0 NHP long-shank probe

Trautmann and colleagues' 2025 technical report describes an extended Neuropixels probe for acute, deep and multi-area recordings in nonhuman primates. Author affiliations include Columbia, Stanford, Berkeley, Caltech, Janelia and imec, among other institutions. This is new physical hardware, not simply an extended recording cable.

## Published geometry and electronics

| Feature | Reported specification |
| --- | --- |
| Shank | 45 mm long, 125 µm wide, 90 µm thick |
| Recording contacts | 12 × 12 µm, illustrated in Figure 1b |
| Site density | Two sites per 20 µm along the shank |
| Available sites | 4,416 |
| Simultaneous channels | 384, selected by switches and shift registers |
| Banks | Eleven 384-site banks plus one half-sized bank at the shank-base junction |
| Fabrication | 130 nm silicon-on-insulator CMOS; stitched reticle exposures |
| Monolithic silicon piece | 54 mm long including shank and base; not the insertion length |
| Study version base | 48 mm² |
| Tip preparation | 20° top-plane chisel taper, mechanically sharpened to a 25° side-plane bevel for the reported data |

The paper describes a 5 mm tip segment, two 20 mm middle segments and a base segment in the mask design. These reticle segments describe fabrication, not extra length to add to the 45 mm shank specification.

## Long-shank engineering

The rodent probe's 24 µm shank thickness was increased to 90 µm to support length and primate-dura penetration. Stress compensation limits bending. Wider and more widely separated metal lines, larger decoupling capacitors and adjusted power routing address noise, coupling and attenuation along the longer shank.

Reticle boundaries overlap to preserve electrical continuity. The paper reports locally narrower metal wires in stitching regions, not disconnected segments. A long-shank model must preserve these distinctions rather than stretch the dimensions of a standard Neuropixels mesh.

## Demonstrated use and limits

The linked [macaque recording experiments](/applications/86-neuropixels-nhp-macaque-recordings-2025/) demonstrate deep and multi-area access, selectable sites and multi-probe scaling. The report is about acute recording; it does not establish a chronic human implant or clinical BCI indication.

Up to seven probes were used together. The authors warn that yields may scale less than linearly because each trajectory is harder to optimize and probes may encounter dura resistance. Large physical site count does not mean all sites record simultaneously or that every insertion produces thousands of isolated units.

## Geometry boundary

A complete model is not supplied here. Shank and site dimensions are grounded, but exact site origins, full tip geometry, reference electrode and package details need their own reconstruction. A mechanically sharpened probe is not identical to its as-fabricated tip.

## Primary sources

- [2025 primary technical report](https://www.nature.com/articles/s41593-025-01976-5).
- [Full text and affiliations](https://pmc.ncbi.nlm.nih.gov/articles/PMC12229894/).
- [Publisher PDF, including Figure 1 and fabrication details](https://www.nature.com/articles/s41593-025-01976-5.pdf).
