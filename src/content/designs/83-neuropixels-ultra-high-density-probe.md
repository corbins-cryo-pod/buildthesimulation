---
title: "Neuropixels Ultra"
order: 83
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0056"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "6,144-site silicon probe with 5 × 5 µm TiN contacts at 6 µm pitch and 384 simultaneous channels. Dense sampling trades recording span for waveform detail; channel selections and study results are kept separate."
modality: "Intracortical"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/"
tags: ["Neuropixels Ultra", "intracortical", "recording", "silicon", "TiN", "University of Washington", "Allen Institute", "imec", "academic", "preclinical"]
draft: false
---

# Neuropixels Ultra

Ye and colleagues' 2025 paper describes Neuropixels Ultra, a silicon probe designed for much denser extracellular sampling than earlier Neuropixels probes. The primary author affiliations include University of Washington, Allen Institute, Columbia, Janelia and imec, alongside other international collaborators. It is a distinct hardware configuration, not a software resolution upgrade to a standard probe.

## Published site layout

| Feature | Reported specification |
| --- | --- |
| Physical sites | 6,144, on a 768 × 8 grid |
| Recording-site material and size | Titanium nitride, 5 × 5 µm |
| Gap / center pitch | 1 µm gap; 6 µm center-to-center spacing |
| Total dense site span | Approximately 4.6 mm × 48 µm |
| Simultaneous readout | 384 channels selected from the available sites |
| Dense readout configuration | 48 × 8 sites |
| Longer configurations | 96 × 4, 192 × 2 and 384 × 1 |
| Mechanical form factor | Paper states shank dimensions and base match Neuropixels 1.0 |

The available physical sites are not 6,144 simultaneous channels. Site selection uses grouped switching because multiple sites share switch memory. Different configurations can be placed at different positions along the total span.

## Density versus coverage

The densest 384-channel configuration covers approximately 288 µm vertically, compared with approximately 3,840 µm for the paper's Neuropixels 1.0 comparison. Selecting fewer columns allows a longer span at reduced density. The 4.6 mm total site field is not the length of every simultaneously sampled region.

The paper reports higher per-site impedance and somewhat higher noise than Neuropixels 1.0. Dense sampling nevertheless improves measured waveform amplitude, spatial localization and sorting in the tested conditions. That is a trade-off, not a claim that smaller contacts always improve every recording.

## Demonstrated use

The linked [animal recording and classification study](/applications/84-neuropixels-ultra-animal-recordings-2025/) reports mouse visual-cortex yield, small-footprint signals across regions and species, and optotagged interneuron classification. These are research results, not clinical qualification or demonstrated assistive-device control.

## Geometry and evidence limits

The contact lattice is well specified, but a complete model would also require the exact site-field origin, tip, shank and package definitions. No complete 3D model is inferred from the statement that its form factor matches Neuropixels 1.0. The contact configurations do not supply a universal acquisition channel map.

The paper's online publication is September 30, 2025; its issue date is December 3, 2025. These are publication dates, not separate hardware generations.

## Primary sources

- [Primary full text and author affiliations](https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/).
- [Publisher article](https://www.cell.com/neuron/fulltext/S0896-6273(25)00665-8).
- [Author-hosted publisher PDF, inspected for design and methods](https://www.yezhiwen.com/assets/pdf/ye2025_neuropixels_ultra.pdf).

## Dense-window reference model

The viewer shows a cropped 48 × 8 dense recording window: 384 contact faces at 6 µm center pitch, each 5 × 5 µm. It is not the entire 6,144-site probe. The 48 × 288 µm crop includes half-pitch margins; actual contact-face outer extents are 47 × 287 µm. Silicon thickness follows the [NP 1.0 manufacturer datasheet](https://www.neuropixels.org/_files/ugd/832f20_4a14406ba1204e60ae8534b09e201b49.pdf), because the Ultra paper explicitly reports identical shank form. Full shank, tip origin, switch groups, channel map and electronics are omitted. Exported site IDs are geometry labels.
