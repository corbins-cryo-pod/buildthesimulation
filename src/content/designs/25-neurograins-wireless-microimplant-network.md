---
title: "Neurograins (wireless microimplant network)"
order: 25
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0004"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-06
description: "Sub-millimetre, salt-grain-sized chips placed on the cortex that each record and send data wirelessly to a scalp hub. 48 recorded in a rodent, Brown University, 2021."
modality: "Cortical surface"
successRank: 25
website: "https://doi.org/10.1038/s41928-021-00631-8"
tags: ["wireless", "distributed", "microimplant", "network", "Brown", "Nurmikko", "academic", "preclinical", "bidirectional"]
draft: false
---

# Neurograins (wireless microimplant network)

> *One-line verdict:* Break the monolithic array into many independent wireless chips, each with its own network address, and coordinate them from a patch on the scalp.

*Quick tags:* Recording and stimulation · Cortical surface · Species: Rodent · Published: 2021

---

### Overview

*What it is:* Each neurograin is a hermetically sealed silicon chip about the size of a grain of salt that records neural activity and sends it wirelessly. A thumb-print-sized patch on the scalp acts as a hub: it powers the chips wirelessly and coordinates them with a network protocol, much like a small cell tower.

*Why it matters:* Today's BCIs are "little beds of needles" in the words of senior author Arto Nurmikko. A network of distributed chips could sample many more cortical locations than any single array.

*Status:* Academic demonstration. The team placed 48 neurograins on a rodent's cortex and recorded spontaneous activity, and tested stimulation from the same hub. The animal's brain size limited the count to 48. The data suggest the configuration could support up to 770, and the team envisions many thousands.

---

### Spec Card Grid

### Identity
- *Authors:* Jihun Lee, Vincent Leung, Ah-Hyoung Lee, Jiannan Huang, Peter Asbeck, Patrick P. Mercier, Stephen Shellhammer, Lawrence Larson, Farah Laiwalla, Arto Nurmikko
- *Org:* Brown University, with Baylor University, UC San Diego and Qualcomm
- *Published:* Nature Electronics 4(8):604-614, 12 August 2021
- *Species:* rodent

### Geometry & Architecture
- *Node:* sub-millimetre, hermetically sealed silicon chip, one network address each
- *Hub:* thumb-print-sized scalp patch, wireless power and coordination
- *Placement:* on the cerebral cortex
- *Function:* record and stimulate

### Evidence and limits
- *Recorded:* 48 neurograins, spontaneous brain activity, rodent
- *Projected:* up to 770 with the current configuration
- *Not shown:* chronic use, human use

---

### Engineering Verdict

*Strengths:* scales by adding nodes; no wires between nodes and hub; bidirectional.

*Limitations:* power delivery and radio link budget limit node count and depth; hermetic sealing at this size is hard; only rodent data.

*Related:* [Neural dust](/devices/22-neural-dust-ultrasonic-backscatter-mote/) takes the same idea of untethered motes but uses ultrasound.

---

### References
- Lee J, Leung V, Lee A-H, et al. *Neural recording and stimulation using wireless networks of microimplants.* Nat Electron. 2021;4:604-614. doi: 10.1038/s41928-021-00631-8. <https://doi.org/10.1038/s41928-021-00631-8>
- Stacey K. *Researchers take step toward next-generation brain-computer interface system.* Brown University, 12 August 2021. <https://www.brown.edu/news/2021-08-12/neurograins>
