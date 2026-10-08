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

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Flexible neurochemical-release and recording probe [1] |
| Manufacturer | Academic research device; Carnegie Mellon University and University of Pittsburgh affiliations [1, 2] |
| Interface class | Flexible penetrating intracortical probe with recording and chemical-release sites [1] |
| Origin | Malekoshoaraie and colleagues, 2024 [1] |
| First demonstrated | 2024 paper [1] |
| First human implant | None |
| Species studied | Rat (acute, barrel cortex) [1] |
| Regulatory status | Research device; no clearance [1] |
| Function | Electrical recording plus electrically triggered localized glutamate or GABA release [1] |
| Target tissue | Rat barrel cortex [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | 16 recording contacts plus two chemical-release sites on one shank [1, 3] |
| Array layout | 16 contacts at 50 µm pitch; two release sites separate from recording contacts [1, 3] |
| Electrode count | 16 recording contacts and two chemical-release sites (18 electrodes, not 18 recording channels) [1] |
| Pitch | 50 µm contact pitch [1] |
| Electrode lengths | Shank 10 mm long [1] |
| Shank width and thickness | 350 µm wide, 20 µm thick [1] |
| Tip and exposed site geometry | Recording contacts 33 × 33 µm; release sites 40 × 400 µm. Interconnects 4 µm wide at 4 µm spacing (recording), 10 µm wide (release) [1, 3] |
| Contact coating | PEDOT:PSS on recording contacts; PEDOT doped with mesoporous sulfonated silica nanoparticles loaded with glutamate or GABA on release sites [1] |
| Insulation | Parylene C, nominally 10 µm lower and 10 µm upper layers [1] |
| Insertion method | Temporary 50 µm tungsten-wire shuttle attached with PEG [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Recording contacts 33 × 33 µm; release sites 40 × 400 µm [1] |
| Electrode material | PEDOT:PSS-coated recording contacts; PEDOT with silica nanoparticles on release sites [1] |
| Impedance (with measurement frequency) | At 1 kHz, mean ± SE 387.64 ± 9.04 kΩ before and 16.18 ± 0.14 kΩ after PEDOT:PSS, across 128 microelectrodes (characterization sample, not the rat cohort) [1] |
| Noise floor or SNR | Activity could not be quantified during the five-second release stimulus because of stimulation artifacts [1] |
| Recording modality | Extracellular recording on 16 channels with a TDT Medusa/RX5 chain [1, 3] |
| Sampling rate | Unreported |
| Stimulation capability | Electrically actuated chemical release (glutamate or GABA), not direct electrical stimulation alone [1] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Rat barrel cortex [1] |
| Insertion trauma and BBB disruption | Shuttle-related tissue damage listed among work needed for chronic use [1] |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Finite drug loading; stimulation artifacts; long-term stability open [1] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Unreported |
| Data path | Wired: 16-channel Omnetics connector to TDT recording chain; separate waveform-generator connections for release [1, 3] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | Unreported |
| Thermal management | Unreported |
| Packaging and hermeticity | Unreported |
| MRI compatibility | Unreported |
| Surgical complexity | Shuttle-assisted insertion of a flexible probe [1] |
| Output connectors | 0.3 mm-pitch flat cable and adaptor PCB; 19-position ZIF connector with one unconnected pad (no compatible 18-position connector available) [1, 3] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Acute rat recordings; yield figures not extracted [1] |
| Chronic yield | Unreported |
| Stability over time | Unreported |
| Longevity | Acute; chronic use not established [1] |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Excitatory and inhibitory effects tested in rat barrel cortex [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Acute rat experiment; cohort size not extracted here [1] |
| Follow-up duration | Acute [1] |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Localized neurotransmitter release with electrophysiological readout in rat barrel cortex [1] |
| Key limitations | No chronic use, human safety or assistive BCI control established; Parylene C use in other approved implants does not make this probe approved [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Recording and localized chemical release on one flexible shank, without a pressure-driven reservoir [1] |
| Limitations | Finite drug loading, artifacts during release, connector size [1] |
| Scaling constraints | Connector miniaturization, drug capacity, shuttle-related damage and long-term stability need work for chronic use [1] |

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

## References

1. [2024 paper: design, characterization, acute results and limits](https://www.nature.com/articles/s41378-024-00685-6).
2. [Publisher PDF, including methods and author affiliations](https://www.nature.com/articles/s41378-024-00685-6.pdf).
3. [Figure 1: design and packaging](https://www.nature.com/articles/s41378-024-00685-6/figures/1).
