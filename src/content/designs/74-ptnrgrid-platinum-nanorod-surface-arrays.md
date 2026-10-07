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

## Sources

- Tchoe Y, Bourhis AM, Cleary DR, et al. [Human brain mapping with multithousand-channel PtNRGrids resolves spatiotemporal dynamics](https://www.science.org/doi/10.1126/scitranslmed.abj1441). Science Translational Medicine, 19 January 2022.
- [Primary full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9650779/). Fabrication, Figure 1, connection system, clinical recordings and methods.
- UC San Diego. [Clinical-trial IDE announcement](https://today.ucsd.edu/story/breakthrough-uc-san-diego-brain-recording-device-receives-fda-approval-for-a-clinical-trial), 17 June 2024. Institutional report, not an independently retrieved FDA decision file.
