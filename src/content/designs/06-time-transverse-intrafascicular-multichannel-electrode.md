---
title: "TIME (Transverse Intrafascicular Multichannel Electrode)"
order: 6
pubDate: 2026-02-03
updatedDate: 2026-02-03
device_id: "BTSD-0006"
interface_class: "pni"
status: "human"
last_updated: 2026-02-03
description: "A flexible thin-film intrafascicular peripheral nerve interface inserted transversely through a nerve to access multiple fascicles, trading surgical complexity for selectivity."
modality: "Peripheral nerve"
successRank: 10
tags: ["BCI", "PNI", "intrafascicular", "stimulation", "recording", "prosthetics", "sensory feedback", "TIME", "peripheral nerve", "bidirectional", "regenerative", "film"]
draft: false
---

# TIME - Transverse Intrafascicular Multichannel Electrode

The tables use the same field framework as the other implant-device sheets. Values belong to the named study or configuration. Unreported means the reviewed sources do not establish a value, not that the device lacks that property.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | TIME; geometry below is TIME-4H in the 2021 STIMEP study |
| Manufacturer | TIME developed by Laboratory for Biomedical Microtechnology, IMTEK, University of Freiburg; 2021 Methods |
| Interface class | Transverse intrafascicular peripheral nerve electrode |
| Origin | Boretius et al. 2010 primary design report |
| First demonstrated | 2010 primary report, not a claim of earliest prototype date |
| First human implant | Unreported in reviewed sources |
| Species studied | Rats in Boretius 2010 and STIMEP 2021; human amputee in Raspopovic 2014 |
| Regulatory status | Research device; 2021 design for human trials is not commercial approval |
| Function | Selective peripheral nerve stimulation; original 2010 report also characterizes recording transfer behavior |
| Target tissue | Peripheral nerve fascicles; sciatic nerve in reviewed rat experiments |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Penetrating transverse intrafascicular thin film |
| Array layout | TIME-4H folded U-to-L thin film: seven stimulation sites and one ground on each side, 2021 Methods |
| Electrode count | 14 independent stimulation sites and two ground sites, TIME-4H 2021 |
| Pitch | 0.75 mm within a side, opposite side offset 0.375 mm, TIME-4H 2021 |
| Electrode lengths | Unreported in reviewed sources |
| Shank width and thickness | Unreported in reviewed sources |
| Tip and exposed site geometry | 80 µm diameter active openings; each ground comprises 109 connected 80 µm contacts, TIME-4H 2021 |
| Contact coating | Highly porous sputtered iridium oxide on active sites, TIME-4H 2021 |
| Insulation | Polyimide thin-film substrate and insulation; PEI insulated cable, silicone protection, 2021 Methods |
| Insertion method | Attached needle and suture sling thread electrode transversely through nerve, TIME-4H 2021 |
| Anchoring and fixation | Unreported in reviewed sources |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | TIME-4H active-site diameter 80 µm; ground aggregate about 0.55 mm², 2021 Methods. Active area not separately reported |
| Electrode material | Platinum tracks, silicon carbide adhesion promoter, SIROF active contacts, TIME-4H 2021 |
| Impedance (with measurement frequency) | Unreported in reviewed sources |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | Original 2010 report characterizes recording transfer; 2021 study measures muscle CMAP with separate EMG electrodes, not TIME neural recording |
| Sampling rate | Configuration dependent; 20 kHz in 2021 is external EMG acquisition, not a TIME implant sampling spec |
| Stimulation capability | Selective stimulation demonstrated in rat sciatic nerve, 2010 and 2021 |
| Charge injection limit | Unreported in reviewed sources |
| Reference and ground | Two ground sites, each formed from 109 interconnected openings, TIME-4H 2021 |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Peripheral nerve fascicles |
| Insertion trauma and BBB disruption | BBB: not applicable to peripheral nerve; quantitative nerve insertion injury unreported in these acute studies |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Chronic failure rates unreported in reviewed sources; 2010 report explicitly leaves chronic material-tissue behavior to future work |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Passive thin-film electrode connected to external stimulator, 2021 Methods |
| Data path | Wired, 10 cm cable with 16 helically wound MP35N wires, TIME-4H 2021 |
| Telemetry bandwidth | Not applicable to the passive wired electrode |
| Sampling rate | Configuration dependent, external acquisition system |
| Power | External STIMEP stimulator in 2021 experiment |
| Thermal management | Not applicable to passive onboard electronics; tissue heating characterization unreported |
| Packaging and hermeticity | Thin film, ceramic interconnection, silicone-protected lead; no hermetic package qualification in reviewed Methods |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Exposed nerve, microscope-assisted transverse insertion, 2021 rat Methods |
| Output connectors | 16-channel Omnetics NCP-16-DD nano neuroconnector, TIME-4H 2021 |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Unreported in reviewed sources |
| Stability over time | Chronic stability unreported in reviewed acute studies |
| Longevity | Unreported in reviewed sources |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Unreported in reviewed sources |
| Notable demonstrations | Graded fascicle recruitment in 2010; prosthetic force, shape and stiffness perception in one amputee, Raspopovic 2014; multi-TIME recruitment in 2021 |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | One amputee participant in Raspopovic 2014; not a combined cohort count |
| Preclinical cohort | Two female Sprague-Dawley rats in STIMEP 2021; separate original 2010 rat study |
| Follow-up duration | Unreported in reviewed sources |
| Indications | Peripheral nerve functional restoration and human prosthetic sensory feedback research |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Stimulation selectivity and muscle recruitment curves |
| Key limitations | Acute rat studies and single-participant human demonstration; TIME-4H geometry not a specification for all TIME generations |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Thin-film transverse geometry accesses different fascicles; graded recruitment in acute studies |
| Limitations | Penetrating nerve insertion and wired lead; chronic durability not established by the reviewed acute studies |
| Scaling constraints | Per-contact wiring and nerve cross-section constrain placement; quantitative ceiling unreported |

## References

- Boretius et al. 2010. [A transverse intrafascicular multichannel electrode (TIME) to interface with the peripheral nerve](https://pubmed.ncbi.nlm.nih.gov/20627510/).
- [New Stimulation Device to Drive Multiple Transverse Intrafascicular Electrodes and Achieve Highly Selective and Rich Neural Responses](https://pmc.ncbi.nlm.nih.gov/articles/PMC8587292/). Sensors, 2021, sections 2.2.1 and 2.2.2.

- Raspopovic et al. 2014. [Restoring natural sensory feedback in real-time bidirectional hand prostheses](https://pubmed.ncbi.nlm.nih.gov/24500407/). Human functional demonstration; abstract does not establish a generic chronic lifetime.
