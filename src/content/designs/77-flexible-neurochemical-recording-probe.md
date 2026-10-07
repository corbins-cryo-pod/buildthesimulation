---
title: "Flexible neurochemical-release and recording probe (CMU and Pittsburgh)"
order: 77
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0053"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Parylene C probe with 16 recording contacts and two electrically actuated chemical-release sites. Acute rat proof of concept, with finite drug loading, stimulation artifacts and chronic-use work still open."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41378-024-00685-6"
tags: ["intracortical", "cortex", "recording", "chemical modulation", "Parylene C", "PEDOT", "Carnegie Mellon", "University of Pittsburgh", "academic", "preclinical"]
draft: false
---

# Flexible neurochemical-release and recording probe

Malekoshoaraie and colleagues' 2024 hardware combines electrical recording with electrically triggered, localized neurotransmitter release. The paper lists Carnegie Mellon University and University of Pittsburgh affiliations. The device is a flexible penetrating probe, not a cortical grid or a fluidic pump.

## Published hardware

| Feature | Reported structure |
| --- | --- |
| Shank | 10 mm long, 350 µm wide, 20 µm thick |
| Insulation | Parylene C, nominally 10 µm lower and 10 µm upper layers |
| Recording contacts | 16, each 33 × 33 µm, 50 µm pitch |
| Chemical-release sites | Two, each 40 × 400 µm; separate from the recording contacts |
| Recording interconnects | 4 µm wide, 4 µm spacing |
| Chemical-site interconnects | 10 µm wide |
| Backend | 0.3 mm-pitch flat cable and adaptor PCB; a 19-position ZIF connector includes one unconnected pad because a compatible 18-position connector was unavailable |
| In vivo interface | 16-channel Omnetics connector and TDT Medusa/RX5 recording chain; separate waveform-generator connections for release |

The 18 electrodes are not 18 recording channels. The 16 small contacts record activity; the two larger sites store and release chemicals.

## Coatings and release mechanism

PEDOT:PSS reduces recording-contact impedance. The paper reports mean ± SE at 1 kHz of 387.64 ± 9.04 kΩ before coating and 16.18 ± 0.14 kΩ afterward, across 128 microelectrodes. That characterization sample is not the rat cohort size.

Chemical sites carry PEDOT doped with mesoporous sulfonated silica nanoparticles loaded with glutamate or GABA. Electrical actuation releases these chemicals from the coating. It is not direct electrical stimulation alone and does not require the same plumbing as a pressure-driven reservoir.

## Insertion and demonstrated use

A 50 µm tungsten-wire shuttle is temporarily attached with PEG for insertion. The linked [acute rat experiment](/applications/78-neurochemical-probe-rat-modulation-2024/) tests excitatory and inhibitory effects in barrel cortex. The study does not establish chronic use, human safety or assistive BCI control.

## Engineering limits

- The authors could not quantify activity during the five-second release stimulus because of stimulation artifacts, despite separating the recording and release circuits.
- Drug loading is finite. Refilling or recycling is future work; an estimate of repeated effective releases is not demonstrated long-term dosing reliability.
- The paper identifies connector miniaturization, drug capacity, shuttle-related tissue damage and long-term stability as work needed for chronic use.
- Parylene C's use in other approved implants does not make this probe an approved device.

## Geometry boundary

Shank and contact sizes are reported. No 3D model is supplied here: the full tip outline, exact contact coordinates, coating thickness and backend assembly would need a separately grounded reconstruction. The paper's schematic is not an acquisition channel map.

## Primary sources

- [2024 paper: design, characterization, acute results and limits](https://www.nature.com/articles/s41378-024-00685-6).
- [Publisher PDF, including methods and author affiliations](https://www.nature.com/articles/s41378-024-00685-6.pdf).
- [Figure 1: design and packaging](https://www.nature.com/articles/s41378-024-00685-6/figures/1).
