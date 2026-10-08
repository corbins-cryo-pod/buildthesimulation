---
title: "PtNRGrid platinum-nanorod surface arrays"
order: 74
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0051"
interface_class: "ecog"
status: "human"
last_updated: 2026-10-07
description: "Reconfigurable cortical grids with 30 µm platinum-nanorod contacts in 6.6 µm parylene C. The 2022 paper reports 1,024- and 2,048-channel layouts with different pitch and coverage; a later IDE announcement is not commercial clearance."
modality: "Cortical surface"
website: "https://www.science.org/doi/10.1126/scitranslmed.abj1441"
tags: ["PtNRGrid", "platinum nanorods", "UCSD", "Dayeh", "micro-ECoG", "thin film", "surface", "academic", "human"]
draft: false
---

# PtNRGrid platinum-nanorod surface arrays

Reconfigurable thin-film cortical recording grids from Tchoe and colleagues. The 2022 Science Translational Medicine paper describes scalable platinum-nanorod contacts, flexible parylene C substrates and dense connectorization, with rat and human intraoperative recordings.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | PtNRGrid platinum-nanorod surface arrays [1] |
| Manufacturer | Academic research device (Tchoe, Bourhis, Cleary and colleagues, UC San Diego) [1, 3] |
| Interface class | Thin-film cortical surface grid (micro-ECoG) [1] |
| Origin | Tchoe and colleagues, Science Translational Medicine [1] |
| First demonstrated | Published 19 January 2022 [1] |
| First human implant | Intraoperative human recordings reported in the 2022 paper; implant duration and subject count not extracted here [1, 2] |
| Species studied | Rat and human (intraoperative) [1] |
| Regulatory status | Research device. UC San Diego announced an FDA investigational device exemption on 17 June 2024; this is research permission, not commercial clearance [3] |
| Function | Recording and mapping; larger holes in some human grids allow a handheld clinical stimulator access to the cortex, which is not stimulation through every recording contact [1] |
| Target tissue | Cortical surface [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Reconfigurable surface grid with perforation holes [1] |
| Array layout | Rodent grid; narrow human layout (Figure 1E); 1 mm pitch human layout (Figure 1C); large human layout (Figure 1D). Layouts are kept separate [1, 2] |
| Electrode count | 1,024 channels (Figure 1E and 1C layouts); 2,048 channels (Figure 1D layout); rat grid is a multichannel layout with count not extracted [1, 2] |
| Pitch | 150 µm (rodent), 200 µm (narrow human), 1 mm (human 1,024), 1.8 mm (large human 2,048) [1, 2] |
| Electrode lengths | Not applicable; surface grid. Devices up to 17 cm long including connection regions [1] |
| Shank width and thickness | 6.6 µm parylene C substrate in the paper; the 2024 announcement describes a 1,024-sensor grid around 6 µm thick, kept separate [1, 3] |
| Tip and exposed site geometry | 30 µm contacts recessed about 2 µm below the surface; sensing coverage 5 x 5 mm (rodent), 3 x 13 mm, 32 x 32 mm and 80 x 80 mm for the human layouts [1, 2] |
| Contact coating | Platinum nanorods [1] |
| Insulation | Parylene C: 3.5 µm bottom and 3.1 µm top layers around 500 nm gold traces, 4 µm wide on 6 µm spacing [1, 2] |
| Insertion method | Placed on the cortical surface; recessed contacts protect against shear during placement [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 30 µm contacts; area not stated [1] |
| Electrode material | Platinum nanorods on gold traces [1] |
| Impedance (with measurement frequency) | At 1 kHz: 11 ± 2 kΩ (1,024-channel grid) and 8 ± 4 kΩ (2,048-channel grid) [1, 2] |
| Noise floor or SNR | Unreported |
| Recording modality | Surface cortical field potential recording [1] |
| Sampling rate | Unreported |
| Stimulation capability | No stimulation through the PtNR recording contacts is established; handheld clinical stimulator access through larger holes in some human grids [1] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortical surface [1] |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Perforation holes let saline and cerebrospinal fluid move away from the contact interface [1] |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Unreported |
| Data path | Wired; land-grid-array CPU sockets and extender boards to external acquisition electronics. Not a fully implanted wireless BCI [1, 2] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | Unreported |
| Thermal management | Unreported |
| Packaging and hermeticity | Unreported |
| MRI compatibility | Unreported |
| Surgical complexity | Intraoperative placement; scale up to 17 cm device length [1] |
| Output connectors | Land-grid-array CPU sockets with extender boards [1, 2] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Up to 99.4% (1,024-channel grid) and 95.2% (2,048-channel grid); results for those configurations, not a guarantee for every array [1, 2] |
| Chronic yield | Unreported |
| Stability over time | Unreported |
| Longevity | Unreported |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | High-resolution rat barrel-cortex mapping, human grasp-related activity and epileptic-discharge dynamics [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Intraoperative human recordings in the 2022 paper; subject count not extracted here [1, 2] |
| Preclinical cohort | Rat recordings [1] |
| Follow-up duration | Unreported |
| Indications | Intraoperative mapping and monitoring in the planned IDE study [3] |
| Trials and registries | Announced IDE study, first phase planned for 20 patients; no registry ID or enrollment status inferred [3] |
| Primary outcomes | Mapping results; not demonstrated restoration of function in a person with paralysis [1] |
| Key limitations | Coverage is not the full device outline; later announcement figures do not replace the 2022 layer stack or prove trial devices match a published layout [1, 3] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Thousands of channels on a thin flexible film with recessed contacts and perfusion holes [1] |
| Limitations | Wired connection; no complete model, perforation pattern, full outline or site map reconstructed [1] |
| Scaling constraints | Connectorization of thousands of channels uses sockets and extender boards [1, 2] |

## Published structures

The paper reports 30 µm contacts in a 6.6 µm parylene C substrate. Contacts are recessed about 2 µm below the surface to protect them from shear during placement. Gold traces are 500 nm thick, 4 µm wide and 6 µm apart, encapsulated between 3.5 µm bottom and 3.1 µm top parylene layers.

Perfusion holes allow saline and cerebrospinal fluid to move away from the contact interface. Larger holes in some human grids also allow a handheld clinical stimulator access to the cortex. That does not establish stimulation through every PtNR recording contact.

## Configuration-specific geometry

| Layout in the paper | Contacts / channels | Pitch | Reported sensing coverage |
| --- | --- | --- | --- |
| Rodent grid | Multichannel rat recording layout | 150 µm | 5 x 5 mm |
| Narrow human layout, Figure 1E | 1,024 | 200 µm | 3 x 13 mm |
| Human layout, Figure 1C | 1,024 | 1 mm | 32 x 32 mm |
| Large human layout, Figure 1D | 2,048 | 1.8 mm | 80 x 80 mm |

Coverage is not the complete device or cable outline. The paper describes devices up to 17 cm long, including connection regions. Different layouts should not be collapsed into one universal PtNRGrid footprint.

Figure 1 reports impedance at 1 kHz of 11 ± 2 kΩ for its 1,024-channel grid and 8 ± 4 kΩ for its 2,048-channel grid, with yields up to 99.4% and 95.2%, respectively. These are results for those reported configurations, not a guaranteed yield for every manufactured array.

## Connection and evidence

The system uses land-grid-array CPU sockets and extender boards to connect thousands of channels to external acquisition electronics. It is not a fully implanted wireless BCI.

The [2022 mapping study](/applications/75-ptnrgrid-human-mapping-2022/) shows high-resolution rat barrel-cortex mapping, human grasp-related activity and epileptic-discharge dynamics. Those are mapping results, not demonstrated restoration of function in a person with paralysis.

## Later investigational step

UC San Diego's 17 June 2024 announcement says the FDA approved an investigational device exemption for a study of intraoperative mapping and monitoring. Its first phase planned 20 patients. Planned enrollment is not a completed outcome, and IDE permission for research is not commercial clearance.

The announcement describes a 1,024-sensor grid around 6 µm thick; its photograph caption also describes 1,024- and 2,048-sensor grids. Those later figures do not replace the 2022 paper's 6.6 µm layer stack or prove that every trial device matches a specific published layout. This entry does not infer a trial registry ID or current enrollment status from the announcement.

## Model limits

No complete model is added in this entry. Contact pitch and coverage alone do not recover perforation patterns, the exact full film outline, connection geometry or every configuration's site map. Recording patches can be modeled separately only with those omissions made explicit.

## References

1. Tchoe Y, Bourhis AM, Cleary DR, et al. [Human brain mapping with multithousand-channel PtNRGrids resolves spatiotemporal dynamics](https://www.science.org/doi/10.1126/scitranslmed.abj1441). Science Translational Medicine, 19 January 2022.
2. [Primary full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9650779/). Fabrication, Figure 1, connection system, clinical recordings and methods.
3. UC San Diego. [Clinical-trial IDE announcement](https://today.ucsd.edu/story/breakthrough-uc-san-diego-brain-recording-device-receives-fda-approval-for-a-clinical-trial), 17 June 2024. Institutional report, not an independently retrieved FDA decision file.
