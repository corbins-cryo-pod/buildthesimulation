---
title: "NeuroGrid (PEDOT:PSS surface array)"
order: 24
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0003"
interface_class: "ecog"
status: "research"
last_updated: 2026-10-06
description: "A 4 µm thick organic electrode array with 10 × 10 µm sites on 30 µm pitch that records single-neuron action potentials from the brain surface. NYU and collaborators, 2015."
modality: "Cortical surface"
successRank: 24
website: "https://www.nature.com/articles/nn.3905"
tags: ["ECoG", "PEDOT:PSS", "organic electronics", "conformable", "spikes from surface", "NYU", "Buzsaki", "academic", "research"]
draft: false
---

# NeuroGrid (PEDOT:PSS surface array)

> *One-line verdict:* A surface array dense and thin enough to isolate putative single neurons without penetrating the brain, shown in rats and intraoperatively in epilepsy patients.

*Quick tags:* Recording · Cortical surface · Species: Rat, human (intraoperative) · Published: 2015

---

### Overview

*What it is:* An ultra-conformable electrode array built on an organic material (PEDOT:PSS) as the interface. Neuron-sized sites sit close together, so a spike seen on several neighboring sites can be used to isolate a putative single neuron from the surface.

*Why it matters:* It challenges the usual split between surface arrays (field potentials, no spikes) and penetrating arrays (spikes, tissue damage).

*Status:* Research tool. The paper reports rat recordings, with spiking activity showing consistent phase modulation for more than a week, and intraoperative recordings in patients undergoing epilepsy surgery.

---

### Spec Card Grid

### Identity
- *Authors:* Dion Khodagholy, Jennifer N. Gelinas, Thomas Thesen, Werner Doyle, Orrin Devinsky, George G. Malliaras, György Buzsáki
- *Published:* Nature Neuroscience 18:310-315, 2015
- *Species:* rat; human (intraoperative)

### Geometry & Architecture
- *Site size:* 10 × 10 µm
- *Inter-electrode spacing:* 30 µm
- *Film thickness:* 4 µm
- *Interface material:* PEDOT:PSS
- *Channel count:* a 256-channel and a 64-channel version appear in the paper's supplementary figures

### Evidence and limits
- *Rat:* putative single-neuron isolation from the surface; phase-modulated spiking stable over more than one week
- *Human:* LFP-modulated spiking recorded intraoperatively
- *Not shown:* chronic human implantation

---

### Engineering Verdict

*Strengths:* conforms to curved cortex, no penetration, neuron-scale site density.

*Limitations:* single-unit isolation relies on spikes being visible on neighboring sites, so it depends on the array lying flat against the surface; chronic human data not reported in this paper.

---

### References
- Khodagholy D, Gelinas JN, Thesen T, et al. *NeuroGrid: recording action potentials from the surface of the brain.* Nat Neurosci. 2015;18:310-315. <https://www.nature.com/articles/nn.3905>
