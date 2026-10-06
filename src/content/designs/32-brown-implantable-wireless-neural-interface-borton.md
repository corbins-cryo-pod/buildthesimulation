---
title: "Implantable wireless neural interface (Brown, 2013)"
order: 32
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0011"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-06
description: "A subcutaneous titanium-housed system that streams 100 channels of broadband cortical data wirelessly and charges through the skin. Brown University, tested in moving primates, 2013."
modality: "Intracortical"
successRank: 32
website: "https://iopscience.iop.org/article/10.1088/1741-2560/10/2/026010/meta"
tags: ["wireless", "implantable", "hermetic", "transcutaneous charging", "Brown", "Nurmikko", "academic", "preclinical"]
draft: false
---

# Implantable wireless neural interface (Brown, 2013)

> *One-line verdict:* An early fully implanted electronics package that replaces the percutaneous connector with a 24 Mbps wireless link and an inductive charger, designed with human clinical use in mind.

*Quick tags:* Recording · Intracortical · Species: Nonhuman primate · Published: 2013

---

### Overview

*What it is:* A neural interface microsystem in a compact, subcutaneous, hermetically sealed titanium enclosure. It connects to a 510(k)-approved, 100-element silicon microelectrode array through a custom hermetic feedthrough.

*Signal chain:* A custom ASIC amplifies (0.1 Hz to 7.8 kHz, gain of 200) and multiplexes the signals, which are then digitized and packaged for transmission. Data go out at 24 Mbps over a frequency-shift-keyed link at 3.2 GHz and 3.8 GHz to a receiver 1 m away, chosen as a point-to-point link for human clinical use.

*Power:* An embedded medical-grade rechargeable Li-ion battery runs 7 hours continuously. It recharges through an inductive transcutaneous link at 2 MHz.

*Why it matters:* The percutaneous connector is the main infection and durability risk of the Utah-array BCI systems. This is a direct engineering answer to it.

---

### Spec Card Grid

### Identity
- *Authors:* David A. Borton, Ming Yin, Juan Aceros, Arto Nurmikko
- *Org:* Brown University
- *Published:* J Neural Eng 10(2):026010, 21 February 2013
- *Species:* moving primates (per the title)

### Architecture
- *Array:* 100-element silicon MEA
- *Enclosure:* subcutaneous, hermetically sealed titanium
- *Bandwidth and rate:* 0.1 Hz to 7.8 kHz, 24 Mbps
- *Radio:* 3.2 GHz and 3.8 GHz FSK, 1 m link
- *Battery:* 7 h continuous, inductive recharge at 2 MHz

### Evidence and limits
- *Shown:* wireless recording in moving primates (details in the paper)
- *Not covered here:* human implantation

---

### References
- Borton DA, Yin M, Aceros J, Nurmikko A. *An implantable wireless neural interface for recording cortical circuit dynamics in moving primates.* J Neural Eng. 2013;10(2):026010. doi: 10.1088/1741-2560/10/2/026010. <https://iopscience.iop.org/article/10.1088/1741-2560/10/2/026010/meta>. Open copy: <https://pmc.ncbi.nlm.nih.gov/articles/PMC3638022/>
