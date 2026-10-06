---
title: "Neural dust (ultrasonic backscatter mote)"
order: 22
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0001"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-06
description: "A battery-free, 3 mm sensor that is powered and read out by ultrasound. Demonstrated in 2016 on rat sciatic nerve and muscle at UC Berkeley."
modality: "Peripheral nerve"
successRank: 22
website: "https://www.cell.com/neuron/fulltext/S0896-6273%2816%2930344-0"
tags: ["wireless", "ultrasound", "backscatter", "battery-free", "peripheral nerve", "EMG", "ENG", "Berkeley", "academic", "preclinical"]
draft: false
---

# Neural dust (ultrasonic backscatter mote)

> *One-line verdict:* The first demonstration that a battery-free sensor the size of a grain of sand can be powered and read out by ultrasound alone, shown in rat nerve and muscle and not yet in a brain implant.

*Quick tags:* Recording · Peripheral nerve · Species: Rat · Demonstrated: 2016

---

### Overview

*What it is:* A mote with a piezoelectric crystal, one transistor and a pair of recording electrodes. An external ultrasound transducer sends pulses that power the crystal. A voltage spike at the nerve or muscle changes the circuit, which changes the echo that returns to the transducer. That change in the echo (backscatter) carries the signal.

*Why it matters:* It removes the battery, the lead and the radio from an implant. Ultrasound passes through tissue where radio-frequency links lose power, so the concept points at motes deep in the body and, in the authors' longer-term view, in the brain.

*Status:* Academic demonstration. The sources cited here report rat experiments only, in peripheral nerve (ENG) and muscle (EMG), under anesthesia. No human implant is reported in them.

---

### Spec Card Grid

### Identity
- *Device name:* Neural dust mote
- *Inventors / key authors:* Dongjin Seo, Ryan M. Neely, Konlin Shen, Jan M. Rabaey, Jose M. Carmena, Michel M. Maharbiz (and co-authors)
- *Org:* University of California, Berkeley
- *Published:* Neuron, August 2016
- *Species:* rat
- *Primary use:* recording (stimulation is discussed as a future use)

### Geometry & Architecture
- *Mote size (demonstrated):* 3 mm long, 1 × 1 mm cross-section, attached to a nerve fiber
- *Mote size (reported follow-up):* shrunk to a 1 mm cube, per Berkeley's release
- *Power and data link:* ultrasound, both directions, no battery
- *Interrogation:* six 540 ns ultrasound pulses every 100 µs in the reported experiment

### Tissue Interface
- *Targets:* sciatic nerve and muscle in anesthetized rats
- *Penetrating?:* not described as penetrating in the sources cited here

### Evidence and limits
- *Evidence:* rat recordings of nerve and muscle activity read out wirelessly; the signal is a change in echo amplitude, so readout quality depends on mote alignment with the transducer.
- *Not shown in the cited sources:* chronic implantation, brain recording, human use.

---

### Engineering Verdict

*Strengths:* no battery, no lead, no RF antenna; scales conceptually to many motes read by one transducer.

*Limitations:* depends on ultrasound reaching the mote, so bone and gas block the link; mote and transducer alignment sets signal quality; only acute rat data in the cited work.

*What it feeds into:* later wireless microimplant work such as [Neurograins](/devices/25-neurograins-wireless-microimplant-network/) uses radio-frequency links instead of ultrasound.

---

### References
- Seo D, Neely RM, Shen K, et al. *Wireless Recording in the Peripheral Nervous System with Ultrasonic Neural Dust.* Neuron. 2016. <https://www.cell.com/neuron/fulltext/S0896-6273%2816%2930344-0>
- Sanders R. *Sprinkling of neural dust opens door to electroceuticals.* Berkeley News, 3 August 2016. <https://news.berkeley.edu/2016/08/03/sprinkling-of-neural-dust-opens-door-to-electroceuticals/>
