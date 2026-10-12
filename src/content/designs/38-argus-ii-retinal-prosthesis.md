---
title: "Argus II retinal prosthesis"
order: 38
pubDate: 2026-10-06
updatedDate: 2026-10-11
device_id: "BTSD-ACAD-0017"
interface_class: "retinal"
status: "human"
last_updated: 2026-10-11
description: "An epiretinal implant that sends camera-derived stimulation to a platinum electrode array tacked over the fovea. FDA humanitarian device approval in 2013; discontinued by its maker in 2019, leaving more than 350 users with an unsupported implant."
modality: "Other"
successRank: 38
website: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfhde/hde.cfm?id=H110002"
tags: ["retinal prosthesis", "epiretinal", "visual prosthesis", "Second Sight", "discontinued", "dead end"]
draft: false
---

# Argus II retinal prosthesis

The first retinal prosthesis to reach routine clinical use in the US, and a case study in what happens to implanted users when the company behind a device fails.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Argus II Retinal Prosthesis System [1, 2] |
| Manufacturer | Second Sight Medical Products; the FDA record now lists Cortigent, Inc. as applicant [1] |
| Interface class | Epiretinal electrode array, wirelessly powered |
| Origin | Second Sight Medical Products [1] |
| First demonstrated | FDA humanitarian device exemption H110002 received 4 May 2011 [1] |
| First human implant |  |
| Species studied | Human [2] |
| Regulatory status | FDA HDE H110002, decision 13 February 2013; label says effectiveness for this use has not been demonstrated; discontinued by Second Sight in 2019 per IEEE Spectrum [1, 2, 3] |
| Function | Electrical stimulation of the retina to induce visual perception [2] |
| Target tissue | Retina, over the fovea; for severe to profound retinitis pigmentosa with bare or no light perception [2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Epiretinal array on a polymer cable, secured over the fovea by a spring retinal tack [2] |
| Array layout |  |
| Electrode count | 55 enabled platinum electrodes [2] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness |  |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation | Implant coil wire encased in silicone; polymer cable carries the electrode wires, with silicone over much of the array to buffer the polymer from retinal tissue [2] |
| Insertion method | Array carried through a pars plana incision, grasped by a handle at its distal end with intraocular forceps, positioned over the fovea and fixed with a retinal tack; electronics case and coil are sutured to the sclera and held by a scleral band. A 5 mm wide sclerotomy is made at a setback set by axial length [2] |
| Anchoring and fixation | Retinal tack; electronics case and coil held around the eyeball by a scleral band (equivalent to a 240 band) [2] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material | Platinum [2] |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | Electrical stimulation; parameters are in the FDA labeling, not extracted here [2] |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue |  |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes | Labeling warns of conjunctival complications at any time after implantation that, untreated, may cause conjunctival erosion and endophthalmitis; long-term monitoring is needed. The long-term effects of chronic stimulation are unknown [4] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Electronics case and coil on the eye; glasses with camera and RF coils; battery-powered video processing unit worn in a pouch [2] |
| Data path | Video processing unit sends stimulation data and power to the implant by RF telemetry via the glasses [2] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Battery-powered external video processing unit [2] |
| Thermal management |  |
| Packaging and hermeticity | Cylindrical hermetically sealed case holding an ASIC that processes received data and generates stimulation. Assembled implant interconnect met a design lifetime specification of at least 5 years in vitro under accelerated active soak [2][4] |
| MRI compatibility |  |
| Surgical complexity | Vitreoretinal surgery plus scleral fixation of case, coil and band; the labeling recommends a backup implant and backup tacks for each procedure. Training is required before implanting [2] |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity | More than 350 implanted users were left with obsolete, unsupported technology after discontinuation in 2019 and near-failure in 2020 per IEEE Spectrum [3] |
| Revision and explant experience | One of 30 subjects was explanted at 1.2 years in the pivotal study; an explant study in 3 canines was used to refine the explantation procedure [4] |
| Adverse events |  |
| Notable demonstrations |  |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Patients with severe to profound retinitis pigmentosa [2] |
| Preclinical cohort | Canines: 3 with fully active devices (all functional at 2 weeks, two functional through 6 months, third explanted after 3 months for clinical issues while functioning); 2 more with the upgraded design for 4 weeks; 3 for an explant study [4] |
| Follow-up duration | As of March 15, 2012 every subject had at least 2.5 years of follow-up except one explanted at 1.2 years; mean follow-up 3.5 years [4] |
| Indications | Severe to profound retinitis pigmentosa; adults 25 or older; bare or no light perception in both eyes; previous history of useful form vision; aphakic or pseudophakic [4] |
| Trials and registries | FDA HDE H110002 [1] |
| Primary outcomes |  |
| Key limitations | Implant dimensions and electrode diameter are in the FDA labeling figures, not extracted here; effectiveness not demonstrated as is standard for an HDE [2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths |  |
| Limitations | Support ended when the manufacturer discontinued the device [3] |
| Scaling constraints |  |

## Overview

*What it is:* A visual prosthesis for people with severe to profound retinitis pigmentosa and bare or no light perception in both eyes. The FDA labeling states it provides electrical stimulation of the retina to induce visual perception.

*How it works:* Glasses carry a miniature video camera and radio-frequency coils. A battery-powered video processing unit turns the video into stimulation data, which the glasses send with power to the implant by telemetry.

*What is implanted:* An electronics case and coil, held around the eyeball by a scleral band, and an electrode array tacked onto the retina. The array has 55 enabled platinum electrodes on a polymer cable and is secured over the fovea with a spring retinal tack.

*What happened:* IEEE Spectrum reports that Second Sight discontinued the implant in 2019 and nearly went out of business in 2020, and that more than 350 people with its implants were left with technology that is obsolete and unsupported.

## Summary card

#### Identity
- *Regulatory:* FDA humanitarian device exemption H110002, received 4 May 2011, decision 13 February 2013
- *Original maker:* Second Sight Medical Products; the FDA record now lists Cortigent, Inc. as applicant

#### Architecture
- *Electrodes:* 55 enabled, platinum, on a polymer cable
- *Placement:* epiretinal, over the fovea, held by a retinal tack
- *Implant body:* electronics case and coil on the eye, scleral band equivalent to a 240 band
- *External:* camera glasses with RF coils, video processing unit worn in a pouch

#### Evidence and limits
- *Not covered here:* implant dimensions and electrode diameter, which are in the FDA labeling figures; no 3D model yet
- *Approval note:* the label says the device's effectiveness for this use has not been demonstrated, as is standard for a humanitarian device

## References

1. FDA. *Argus II Retinal Prosthesis System, HDE H110002.* <https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfhde/hde.cfm?id=H110002>
2. FDA. *Argus II Retinal Prosthesis System, physician labeling.* <https://www.accessdata.fda.gov/cdrh_docs/pdf11/H110002C.pdf>
3. IEEE Spectrum. *Their Bionic Eyes Are Now Obsolete and Unsupported.* 15 Feb 2022. <https://spectrum.ieee.org/bionic-eye-obsolete>
4. [FDA summary of safety and probable benefit, HDE H110002](https://www.accessdata.fda.gov/cdrh_docs/pdf11/H110002B.pdf).
