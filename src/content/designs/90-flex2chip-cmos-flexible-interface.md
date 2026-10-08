---
title: "Flex2Chip flexible-array CMOS interface"
order: 90
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0059"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-07
description: "Capillary-assembled suspended pads connect flexible neural arrays to a CMOS-MEA. Published 720/2,200-connection layouts, 1,024 simultaneous chip channels and acute 504-site ECoG use are kept distinct."
modality: "Cortical surface"
website: "https://www.science.org/doi/10.1126/sciadv.adf9524"
tags: ["Flex2Chip", "ECoG", "CMOS", "flexible", "Stanford", "ETH", "connector", "preclinical"]
draft: false
---

# Flex2Chip flexible-array CMOS interface

Zhao and colleagues' 2023 paper reports a flexible thin-film electrode array joined to a rigid CMOS microelectrode array by deformable suspended pads. The paper's affiliations include Stanford and ETH Zürich. The device bridges flexible tissue contact to rigid recording electronics; the chip itself is not a flexible implant.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Flex2Chip flexible-array CMOS interface [1] |
| Manufacturer | Academic research device; Stanford and ETH Zürich affiliations [1] |
| Interface class | Flexible thin-film electrode array joined to a CMOS microelectrode array by suspended pads [1] |
| Origin | Zhao and colleagues, Science Advances, 2023 [1] |
| First demonstrated | 2023 paper [1] |
| First human implant | None |
| Species studied | Brain slice and acute mouse ECoG [1, 2] |
| Regulatory status | Research device; no clearance |
| Function | Connect flexible tissue-contact arrays to rigid CMOS recording electronics [1] |
| Target tissue | Brain slice and mouse cortical surface [1, 2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Capillary-assembled suspended I/O pads bridging flexible array and CMOS-MEA [1] |
| Array layout | Slice array 720 sites in a 30 × 24 layout; acute mouse ECoG array 504 sites [1, 2] |
| Electrode count | Connector arrays of 720 and 2,200 nominal connections; CMOS-MEA 26,400 active pixels with up to 1,024 simultaneous channels; 720-site slice array; 504-site ECoG array [1, 2] |
| Pitch | Connector pitch 50 µm; lead pitch 2 µm; CMOS pixel pitch 17.5 µm; slice array reported 90 µm pitch [1, 2] |
| Electrode lengths | Unreported in reviewed sources |
| Shank width and thickness | Leads 1 µm wide, 100 nm thick platinum between two 1 µm polyimide layers [1, 2] |
| Tip and exposed site geometry | Recording contacts 20 µm diameter; ECoG active area 760 × 760 µm. I/O pad 35 µm (main text) or 40 µm (Figure 2 caption); interface area 3.5 × 2.1 mm (Figure 1) or 3.85 × 2.10 mm (text); slice section 3.6 × 1.62 mm. Conflicts kept [1, 2] |
| Contact coating | Unreported in reviewed sources |
| Insulation | Polyimide layers; silicone encapsulation can secure the interface [1] |
| Insertion method | Surface array on tissue; pads pulled onto the chip by an isopropyl-alcohol liquid bridge, then held by van der Waals forces [1] |
| Anchoring and fixation | Unreported in reviewed sources |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 20 µm diameter contacts [1, 2] |
| Electrode material | Platinum leads [1] |
| Impedance (with measurement frequency) | Unreported in reviewed sources |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | CMOS-MEA readout of ECoG and slice activity [1] |
| Sampling rate | Unreported in reviewed sources |
| Stimulation capability | Unreported in reviewed sources |
| Charge injection limit | Unreported in reviewed sources |
| Reference and ground | Unreported in reviewed sources |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Brain slice and mouse cortical surface [1, 2] |
| Insertion trauma and BBB disruption | Unreported in reviewed sources |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Unreported in reviewed sources |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | CMOS-MEA with 26,400 active pixels and a switch matrix selecting connected pixels [1] |
| Data path | Wired CMOS readout; 1,024 simultaneous channels maximum [1] |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Unreported in reviewed sources |
| Thermal management | Unreported in reviewed sources |
| Packaging and hermeticity | Unencapsulated interface is delicate under external forces; silicone encapsulation lowered channel yield by 9.38% ± 14.6% [1] |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Unreported in reviewed sources |
| Output connectors | Unreported in reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Connector yield 95.3% ± 3.42% (720-connection) and 75.7% ± 10.4% (2,200-connection devices) [1] |
| Chronic yield | Unreported in reviewed sources |
| Stability over time | One 720-connection device went from 709 to 705 connected channels after a month in a 37 °C, 97% humidity incubator; bench aging, not implanted [1] |
| Longevity | Unreported in reviewed sources |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Unreported in reviewed sources |
| Notable demonstrations | Slice and seizure mapping; acute 504-site mouse ECoG [1, 2] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Brain slice and acute mouse ECoG; counts not extracted here [1] |
| Follow-up duration | Acute; one-month bench incubation only [1] |
| Indications | Unreported in reviewed sources |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Connector yield and high-density slice and ECoG recordings [1] |
| Key limitations | 2,200 nominal connections are not 2,200 simultaneous channels; conflicting pad and area dimensions; no full mask reconstructed [1, 2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Links flexible tissue contact to a high-density rigid chip without wire bonding [1] |
| Limitations | Encapsulation costs yield; the chip itself is rigid and not a flexible implant [1] |
| Scaling constraints | Chip reads up to 1,024 channels at once, below the 2,200 connection count [1] |

## How the connector works

An isopropyl-alcohol liquid bridge pulls the suspended I/O pads toward the chip as it evaporates. After contact, van der Waals forces hold the pads down and establish an ohmic connection. Silicone encapsulation can secure the mechanically delicate interface.

The flexible leads are 1 µm wide, 100 nm thick platinum at 2 µm pitch, between two 1 µm polyimide layers. Each connector pad is supported by three 2 µm-wide, 10 µm-long beams; connector pitch is 50 µm. These connector dimensions are not the tissue recording-contact pitch.

## Counts and configurations

| Structure | Reported configuration |
| --- | --- |
| Flexible connector arrays | 720 and 2,200 nominal connections |
| Underlying CMOS-MEA | 26,400 active pixels, 17.5 µm pixel pitch |
| Simultaneous CMOS readout | 1,024 channels maximum |
| Slice recording array | 720 sites, 30 × 24 layout, 20 µm-diameter contacts, reported 90 µm pitch |
| Acute mouse ECoG array | 504 sites, 20 µm-diameter contacts, 760 × 760 µm active area |

The 2,200 nominal connections are not 2,200 simultaneous channels. The switch matrix selects connected pixels for the chip's smaller readout capacity. The [slice and seizure-mapping application](/applications/91-flex2chip-slice-seizure-mapping-2023/) uses different tissue-end layouts.

## Conflicting source dimensions retained

- Main text describes a **35 µm** I/O pad; Figure 2 caption describes **40 µm**. No single diameter is selected here.
- Figure 1 caption gives **3.5 × 2.1 mm** interface area, while the main text and electrical-performance section give **3.85 × 2.10 mm**.
- The slice section reports **3.6 × 1.62 mm**, **30 × 24 sites** and **90 µm pitch** together. Those values do not uniquely define a simple full rectangular contact grid. A complete mask is not reconstructed from them.

## Yield and durability boundary

Average connector yield was 95.3% ± 3.42% for 720-connection devices and 75.7% ± 10.4% for 2,200-connection devices. A month in a 37°C, 97%-humidity incubator changed one 720-connection measurement from 709 to 705 connected channels. This is connector bench aging, not a month-long implanted animal result.

The unencapsulated interface is delicate under external forces. The paper reports a 9.38% ± 14.6% decrease in channel yield after silicone encapsulation. That is a measured trade-off, not zero loss.

## Model boundary

No full model is supplied. Connector pads, tissue electrodes, wiring, chip and encapsulation are distinct structures. Conflicting pad dimensions and unresolved recording-mask geometry remain visible rather than guessed.

## References

1. [2023 primary paper](https://www.science.org/doi/10.1126/sciadv.adf9524).
2. [Institution-hosted publisher PDF, including Figures 1 and 2](https://open.metu.edu.tr/bitstream/handle/11511/111087/sciadv.adf9524.pdf).
