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
