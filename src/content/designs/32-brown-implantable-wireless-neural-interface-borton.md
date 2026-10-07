---
title: "Implantable wireless neural interface (Brown, 2013)"
order: 32
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0011"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "A subcutaneous titanium-housed system that streams 100 channels of broadband cortical data wirelessly and charges through the skin. Brown University, tested in moving primates, 2013."
modality: "Intracortical"
successRank: 32
website: "https://iopscience.iop.org/article/10.1088/1741-2560/10/2/026010/meta"
tags: ["wireless", "implantable", "hermetic", "transcutaneous charging", "Brown", "Nurmikko", "academic", "preclinical"]
draft: false
---

# Implantable wireless neural interface (Brown, 2013)

An implanted cortical-recording electronics package in a hermetic titanium enclosure, connected to a silicon microelectrode array. This is the 2013 subcutaneous, rechargeable device. It is not the later external head-mounted neurosensor.

## Core interface specifications

The 12 fields follow the Blackrock Utah table for comparison, not a manufacturer-issued datasheet. Missing values remain unreported; inapplicable fields are marked. Configuration-specific details and limits follow below.

| Field | Specification and source scope |
| --- | --- |
| Electrode Pitch | Not explicitly extracted for this connected MEA; do not substitute generic current Utah pitch |
| Channel Count | 100 cortical sites/100-element MEA in this 2013 system |
| Output Connectors | Custom hermetic feedthrough: 104 Pt/Ir pins, 100 connected to MEA, two reference leads, two open |
| Output Conn. dimensions L x W x H | Feedthrough overall dimensions not reported here. Separate electronics enclosure: 56 × 42 × 9 mm, not an electrode connector footprint |
| Standard Electrode Lengths | Paper reports 1.5 mm insertion in macaques; that surgical depth is not a complete manufacturer shank-length option list |
| Impedance | 100-800 kΩ, manufacturer-verified at 1 kHz for the attached study MEA |
| Array Dimensions | 10 × 10 element layout; full physical MEA footprint not assigned here |
| Multi-Port Options | No demonstrated multi-port order option. Future flexible sensor integration is design intent |
| Metalization | Contact-tip material not explicitly assigned here; Pt/Ir feedthrough pins and gold interconnect wires are different components |
| Wire Bundle Length | Specific length described as matching clinical-trial assemblies, but no number given here; individual gold wires 25 µm diameter |
| Reference and Ground | Two 25 µm diameter Pt/Ir reference wires attached to feedthrough pins; no independent ground wiring inferred |
| Insulation | Individually insulated gold wires; Kapton interconnect overmolded in biocompatible silicone (MED-4211). No unreported shank insulation assigned |

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Implantable wireless neural interface, subcutaneous rechargeable system, 2013 [1, 2] |
| Manufacturer | Brown University research system; authors David Borton, Ming Yin, Juan Aceros and Arto Nurmikko [1] |
| Interface class | Penetrating cortical silicon array with subcutaneous electronics, wireless |
| Origin | Brown University, Journal of Neural Engineering 2013;10:026010 [1] |
| First demonstrated | 2013 paper; swine and rhesus macaque implants [1, 2] |
| First human implant | No human implantation of the complete system established by the paper [1] |
| Species studied | Swine and rhesus macaques; four interfaces implanted in two Yorkshire pigs and two rhesus macaques in the Figure 5 animals [2] |
| Regulatory status | Paper calls the connected silicon array "510k-approved", a component statement, not retrieved FDA clearance evidence for the complete Brown package [1] |
| Function | Broadband neural recording [1] |
| Target tissue | Cerebral cortex [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Penetrating cortical silicon array with subcutaneous hermetic titanium electronics [1] |
| Array layout | 10 × 10 element layout; physical footprint not assigned here [1] |
| Electrode count | 100-element silicon microelectrode array [1] |
| Pitch | Not explicitly extracted for this connected array; no generic Utah pitch substituted |
| Electrode lengths | 1.5 mm insertion in macaques; not a complete shank-length option list [2] |
| Shank width and thickness | Unreported in the reviewed sources |
| Tip and exposed site geometry | Unreported in the reviewed sources |
| Contact coating | Contact-tip material not explicitly assigned here |
| Insulation | Individually insulated gold wires; Kapton interconnect overmolded in biocompatible silicone (MED-4211) [2] |
| Insertion method | Unreported in the reviewed sources |
| Anchoring and fixation | In the two initial macaque experiments the titanium can was mostly embedded in PMMA and partly exposed; fully subcutaneous placement was in swine [2] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in the reviewed sources |
| Electrode material | Silicon array; Pt/Ir feedthrough pins and 25 µm gold interconnect wires are separate components [2] |
| Impedance (with measurement frequency) | 100-800 kΩ, manufacturer-verified at 1 kHz for the attached study array [2] |
| Noise floor or SNR | Unreported in the reviewed sources |
| Recording modality | Action potentials, field potentials and lower-frequency rhythms in freely moving animals [1, 2] |
| Sampling rate | 20 kS/s per preamplifier channel [2] |
| Stimulation capability | Not established as a function of this recording system [2] |
| Charge injection limit | Unreported in the reviewed sources |
| Reference and ground | Two 25 µm Pt/Ir reference wires attached to feedthrough pins; no independent ground wiring inferred [2] |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cerebral cortex [1] |
| Insertion trauma and BBB disruption | Unreported in the reviewed sources |
| Vascular disruption risk | Unreported in the reviewed sources |
| Micromotion sensitivity | Unreported in the reviewed sources |
| Gliosis and encapsulation | Unreported in the reviewed sources |
| Neuron loss near sites | Unreported in the reviewed sources |
| Foreign-body response mitigation | Unreported in the reviewed sources |
| Typical failure modes | Heating during charging, handled with active skin cooling in animals; incomplete skin closure over the enclosure in the two initial macaque experiments [2] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Preamplifier band 0.1 Hz-7.8 kHz, gain 200; two 12-bit SAR ADCs, one per multiplexed group; PCBs and components 6.5 g [2] |
| Data path | Wireless FSK link using 3.2 and 3.8 GHz; 1 m point-to-point design, with more than 1 m operation reported in the system section [2] |
| Telemetry bandwidth | 24 Mbit/s neural-data link [2] |
| Sampling rate | 20 kS/s per preamplifier channel [2] |
| Power | Embedded medical-grade rechargeable Li-ion, 200 mAh; 90.6 mW normal power; seven hours of continuous operation per charge; inductive transcutaneous recharge at 2 MHz. A proposed extension to 16-hour operation is development work, not achieved battery life [2] |
| Thermal management | Heating observed during charging; active skin cooling used in animals [2] |
| Packaging and hermeticity | Hermetically sealed titanium enclosure with sapphire window; whole neural interface 44.5 g (battery 7.4 g, titanium package 30.6 g, PCBs and components 6.5 g) [2] |
| MRI compatibility | Unreported in the reviewed sources |
| Surgical complexity | Unreported in the reviewed sources |
| Output connectors | Custom hermetic feedthrough: 104 Pt/Ir pins, 100 connected to the array, two reference leads, two open [2] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in the reviewed sources |
| Chronic yield | Unreported in the reviewed sources |
| Stability over time | Abstract reports stable operation during over one year of testing; not identical uninterrupted lifetime for every channel, animal or package [2] |
| Longevity | Over one year of testing reported in the abstract; seven hours per battery charge [1, 2] |
| Revision and explant experience | Unreported in the reviewed sources |
| Adverse events | Unreported in the reviewed sources |
| Notable demonstrations | Wireless recording in moving swine and rhesus macaques [1, 2] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None for this complete system [1] |
| Preclinical cohort | Swine and rhesus macaques; four interfaces in the Figure 5 animals [2] |
| Follow-up duration | Over one year of testing per the abstract [1] |
| Indications | Neural recording research; clinical use was a design goal, not a human result [1] |
| Trials and registries | Unreported in the reviewed sources |
| Primary outcomes | Stable wireless recording of cortical dynamics in moving primates and swine [1] |
| Key limitations | Component regulatory status is not whole-system approval; heating during charging; incomplete skin closure in two initial macaques [1, 2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Fully subcutaneous hermetic package removes the external percutaneous electronics connection; transcutaneous charging [2] |
| Limitations | Charging and enclosure constraints, heating during charging, seven hours per charge [2] |
| Scaling constraints | Battery life, charging heat and the single-array connection [2] |

## Identity and configuration

| Property | Published configuration |
| --- | --- |
| Authors | David Borton, Ming Yin, Juan Aceros and Arto Nurmikko |
| Institution | Brown University |
| Primary paper | Journal of Neural Engineering, 2013; 10:026010 |
| Interface | Penetrating cortical silicon array with subcutaneous electronics |
| Function | Broadband neural recording |
| Test models | Swine and rhesus macaques |
| Human use | No human implantation of this complete wireless system established by this paper |

## Geometry and packaging

| Property | Published specification |
| --- | --- |
| Electrode array | 100-element silicon microelectrode array |
| Enclosure | Hermetically sealed titanium with sapphire window |
| Array connection | Custom hermetic feedthrough |
| Whole neural-interface mass | 44.5 g |
| Battery mass | 7.4 g |
| Titanium-package mass | 30.6 g |
| PCBs and electronic components | Remaining 6.5 g |

The sapphire window supports RF/infrared communication and inductive charging. The package and array are different system components; the mass table is not the mass of the tissue-penetrating array alone.

## Electrical and system specifications

| Property | Published specification and condition |
| --- | --- |
| Preamplifier band | 0.1 Hz-7.8 kHz |
| Preamplifier gain | 200 |
| Sample rate | 20 kS/s per preamplifier channel |
| Conversion | Two 12-bit SAR ADCs, one per multiplexed group |
| Neural-data link | 24 Mbit/s |
| Radio modulation | FSK using 3.2 and 3.8 GHz |
| Intended link separation | 1 m point-to-point design; system section reports greater than 1 m operation |
| Normal system power | 90.6 mW during the reported wireless operation |
| Battery | Embedded medical-grade rechargeable Li-ion; 200 mAh |
| Continuous operation | Seven hours per charge in the reported device |
| Recharge link | Inductive transcutaneous power at 2 MHz |
| Stimulation | Not established as a function of this recording system |

A proposed extension to 16-hour operation is development work, not achieved battery life. ADC resolution, data-link bit rate and per-channel sampling frequency describe different parts of the chain.

## Tissue interface and reliability

The implanted hermetic package removes the external percutaneous electronics connection used in other array systems, but introduces charging and enclosure constraints. The paper observed heating during charging and used active skin cooling on animals. That mitigation matters; wireless charging is not presented as automatically thermally safe.

The two initial macaque experiments did not fully close the skin over the enclosure: the MEA, bundle and feedthrough were in tissue, while most of the titanium can was embedded in PMMA and left partially exposed. Fully subcutaneous swine implantation must not be turned into a claim that every reported animal had a fully enclosed implant.

Four neural interfaces were implanted in the Figure 5 animals: two Yorkshire pigs and two rhesus macaques. The abstract reports stable operation during over one year of testing. This does not establish identical uninterrupted signal lifetime for every channel, animal or package.

## Evidence and regulatory boundary

Animal recordings include action potentials, field potentials and lower-frequency rhythms in freely moving animals. The earlier sheet's clinical-use framing was a design goal, not a human clinical result.

The paper describes the connected silicon array as "510k-approved." That is the paper's wording about a component, not retrieved FDA clearance evidence for the complete Brown wireless package. A component's regulatory status must not be transferred to the battery, radio, charging system or full implant. No whole-system human clearance, MRI labeling or unrestricted clinical implantation is established here.

## Model and missing specifications

No complete 3D reconstruction is supplied. This sheet does not infer array contact maps, enclosure drawing, feedthrough layout or patient-specific placement from whole-system mass. Recording yield, lifetime and exposure conditions remain study-specific, not universal product specifications.

## Primary sources

- Borton DA et al. [An implantable wireless neural interface for recording cortical circuit dynamics in moving primates](https://iopscience.iop.org/article/10.1088/1741-2560/10/2/026010/meta), 2013.
- [Full primary manuscript, circuitry, animal implants and charging discussion](https://pmc.ncbi.nlm.nih.gov/articles/PMC3638022/).
- [Related but distinct 2014 external head-mounted neurosensor](/devices/33-wireless-neurosensor-yin-2014/).
