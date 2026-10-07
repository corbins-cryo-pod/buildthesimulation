---
title: "Neurotrophic Electrode (Kennedy cone electrode)"
order: 8
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-IMBCI-0009"
interface_class: "intracortical"
status: "human"
last_updated: 2026-02-06
description: "A biologically integrated intracortical electrode (hollow cone with microwires) designed to encourage neurite ingrowth for long-term single-unit recording in humans."
modality: "Intracortical"
successRank: 13
website: "https://pubmed.ncbi.nlm.nih.gov/9665587/"
tags: ["BCI", "intracortical", "single-unit", "neurotrophic", "cone electrode", "Kennedy", "cortex", "recording", "regenerative", "array"]
draft: false
---

# Neurotrophic Electrode (Kennedy cone electrode)

The tables use the same field framework as the other implant-device sheets. Values belong to the named study or configuration. Unreported means the reviewed sources do not establish a value, not that the device lacks that property.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Neurotrophic electrode, Kennedy cone family |
| Manufacturer | Neural Signals research program; 2008 assembly report |
| Interface class | Intracortical neurite-ingrowth electrode |
| Origin | Kennedy and collaborators; historical human recording program |
| First demonstrated | Unreported in reviewed sources |
| First human implant | A human restoration report was published in 1998; earliest implantation date not established by this audit |
| Species studied | Human in reviewed 2008 and 2020 reports |
| Regulatory status | 2020 study reports FDA IDE G960032; not general commercial approval |
| Function | Recording for communication research |
| Target tissue | Motor speech cortex in the reviewed subject |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Penetrating intracortical glass cone with ingrown neuropil |
| Array layout | Hollow glass cone containing gold wires |
| Electrode count | Three gold wires and two recording channels in 2020 subject 5; 2008 abstract describes a four-wire version, not one universal count |
| Pitch | Configuration dependent; wires offset inside cone, no uniform grid pitch |
| Electrode lengths | Cone length 1.5-2 mm, 2020 Methods |
| Shank width and thickness | Cone openings: 50 µm at deep end and 200-300 µm at upper end, 2020 Methods; wall thickness unreported |
| Tip and exposed site geometry | Hollow tip; closest wire end about 500 µm from deep opening in subject 5, 2020 |
| Contact coating | 99.9% gold wire, 2020 Methods; separate coating unreported |
| Insulation | Teflon-insulated 2 mil gold wires, glass cone and acrylic assembly, 2020 Methods |
| Insertion method | Surgical insertion into cortex; depth and angle not generalized across versions |
| Anchoring and fixation | Neurite ingrowth through cone; coiled flexible leads reduce strain, 2020 Methods |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in reviewed sources |
| Electrode material | 99.9% gold wires inside glass cone, 2020 Methods |
| Impedance (with measurement frequency) | Unreported in reviewed sources |
| Noise floor or SNR | 2020 subject 5: neural amplitude 12-80 µV peak-to-peak, system noise reported as 10 µV without a standardized RMS bandwidth qualification |
| Recording modality | Single-unit and continuous neural recordings, 2020 Methods |
| Sampling rate | Unreported as a single hardware sampling rate; 2020 describes digital filtering and approximately 1 ms spike windows |
| Stimulation capability | Not used for stimulation in 2020 configuration |
| Charge injection limit | Not applicable to reviewed recording configuration |
| Reference and ground | Three wires feed two differential recording channels in 2020; pin-level reference assignment unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Motor speech cortex |
| Insertion trauma and BBB disruption | Penetrating cortical placement; quantitative BBB injury unreported |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Coiled leads intended to reduce strain at tip, 2020; quantified micromotion unreported |
| Gliosis and encapsulation | 2020 single-subject tip histology reports neurofilaments and absence of gliosis inside tip after 13 years; not a whole-cortex or cohort claim |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | 2020: handling-related trauma required three electronics replacements; electrode itself did not need replacement |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Subcutaneous skull-mounted differential amplifiers and FM transmitters, 2008/2020; not a percutaneous tether in this configuration |
| Data path | Cone wires to subcutaneous electronics, FM transmission through scalp to external receiver |
| Telemetry bandwidth | FM carrier 42 ± 8 MHz and amplifier bandpass 5-5,000 Hz in 2020; carrier range is not digital throughput |
| Sampling rate | Configuration dependent; exact rate unreported in reviewed Methods |
| Power | External induction coil powers implanted receiver coil; no battery in 2020 configuration |
| Thermal management | Unreported in reviewed sources |
| Packaging and hermeticity | Elvax internal and Silastic external protection, 2020; hermetic qualification unreported |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Cortical insertion plus subcutaneous electronics fixed to skull with acrylic, 2020 |
| Output connectors | Internal miniature connector in 2008 assembly; external receiver captures FM signal |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Unreported in reviewed sources |
| Stability over time | Functional neural activity at year nine, 2020 subject 5 report |
| Longevity | Recordings through 10 years in subject 5; histology after 13 years implanted. Implant duration is not recording duration |
| Revision and explant experience | Three electronics replacements due to handling trauma; electrode recovered postmortem, 2020 |
| Adverse events | Subject became too ill to record after year 10 owing to stroke progression; no device adverse-event rate established |
| Notable demonstrations | Functional single-unit conditioning at year nine; prior communication experiments cited in 2020 report |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | 2020 histology: one locked-in subject, designated subject 5; designation is not an audited cohort size |
| Preclinical cohort | Unreported in reviewed sources |
| Follow-up duration | Unreported in reviewed sources |
| Indications | Locked-in syndrome after brainstem stroke; experimental communication |
| Trials and registries | FDA IDE G960032 reported in 2020; modern registry record unreported |
| Primary outcomes | Histological confirmation of myelinated filaments in cone and relation to decade-long recordings |
| Key limitations | Single-subject histology, hand-built version differences, few recording channels; not comparative lifetime evidence |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Single-subject decade-long recording with postmortem ingrowth confirmation |
| Limitations | Few channels, hand assembly, and repeated electronics repair in reviewed case |
| Scaling constraints | Each cone requires implantation and wire routing; high-channel scaling unreported |

## References

- Bartels et al. 2008. [Neurotrophic electrode: method of assembly and implantation into human motor speech cortex](https://europepmc.org/articles/PMC2574508). Assembly abstract; four-wire configuration.
- Kennedy et al. 2020. [Histological Confirmation of Myelinated Neural Filaments Within the Tip of the Neurotrophic Electrode After a Decade of Neural Recordings](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2020.00111/full). Subject 5 Methods and histology.
- Kennedy and Bakay 1998. [Restoration of neural output from a paralyzed patient by a direct brain connection](https://pubmed.ncbi.nlm.nih.gov/9665587/). Historical report; not used to infer earliest implant date.
