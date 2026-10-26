---
title: "Argus II retinal prosthesis"
order: 165
pubDate: 2026-10-06
updatedDate: 2026-10-14
device_id: "BTSD-FDA-0016"
interface_class: "retinal"
status: "human"
last_updated: 2026-10-14
description: "An epiretinal implant that sends camera-derived stimulation to a platinum electrode array tacked over the fovea. FDA humanitarian device approval in 2013; discontinued by its maker in 2019, leaving more than 350 users with an unsupported implant."
successRank: 38
modality: "Other"
website: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfhde/hde.cfm?id=h110002"
axis: ["retina"]
function: ["stimulation"]
form: ["array"]
regulatory: "fda-hde"
origin: "US"
tags: ["retinal prosthesis", "epiretinal", "visual prosthesis", "Second Sight", "Cortigent", "discontinued", "dead end"]
draft: false
---

# Argus II retinal prosthesis

The first retinal prosthesis to reach routine clinical use in the US, and a case study in what happens to implanted users when the company behind a device fails. FDA authorized it under a Humanitarian Device Exemption on February 13, 2013, and Cortigent says it is discontinued. Orion, the cortical visual prosthesis, is investigational and gets its own sheet.

Company brief: [Second Sight](/companies/23-second-sight-medical-products-company-brief/), [Cortigent](/companies/24-cortigent-company-brief/).

Interactive research model: [Retina Laboratory: electrical stimulation](/simulations/retinal-implant/?technology=electrical) · [models and verification](/simulations/retinal-implant/methods/).

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Argus II Retinal Prosthesis System: epiretinal implant with an eye-worn electronics case and antenna, glasses-mounted camera and external video processing unit [1][2] |
| Manufacturer | Second Sight Medical Products, now Cortigent, Inc. [2]; the FDA record lists Cortigent, Inc. as applicant [1] |
| Interface class | Epiretinal implant stimulating the retinal surface [2] |
| Origin | Commercial FDA-approved Humanitarian Device Exemption device [1][2] |
| First demonstrated | Cortigent says Argus II launched in 2011, with EU approval in March 2011 [2] |
| First human implant |  |
| Species studied | Human [1] |
| Regulatory status | HDE H110002: received May 4, 2011, approved February 13, 2013; European approval March 2011. Cortigent states Argus II is discontinued and no longer available; IEEE Spectrum reports Second Sight discontinued it in 2019. The label says effectiveness for this use has not been demonstrated, as is standard for a humanitarian device [1][2][4][5] |
| Function | Electrical stimulation of the retina to induce visual perception in blind patients with severe to profound retinitis pigmentosa and bare or no light perception in both eyes [1][2] |
| Target tissue | Retina, over the fovea; for severe to profound retinitis pigmentosa with bare or no light perception. The company says activity reaches the brain via the optic nerve [2][4] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Epiretinal array on a polymer cable, secured over the fovea by a spring retinal tack, with an electronics case and antenna fixed to the outer surface of the eye [2][4] |
| Array layout | Thin-film electrode array in a 6 x 10 pattern on the retinal surface, connected by a thin-film cable to the electronics package [3] |
| Electrode count | 60 exposed platinum electrodes, of which 55 are enabled for use [3]; the physician labeling describes 55 enabled platinum electrodes [4] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness |  |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation | Implant coil wire encased in silicone; polymer cable carries the electrode wires, with silicone over much of the array to buffer the polymer from retinal tissue [3] |
| Insertion method | Array carried through a pars plana incision, grasped by a handle at its distal end with intraocular forceps, positioned over the fovea and fixed with a retinal tack; case and coil sutured to the sclera and held by a scleral band. A 5 mm wide sclerotomy is made at a setback set by axial length [3] |
| Anchoring and fixation | Array secured to the retina with a retinal tack (a titanium alloy tack; two included); the implant is secured to the outside of the eye with a scleral band (equivalent to a 240 band used in scleral buckling) and a suture-tab assembly around the electronics package [3][4] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material | Platinum [3] |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | Electrical stimulation of the retina [4] |
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
| Typical failure modes | Labeling warns of conjunctival complications at any time after implantation that, untreated, may cause conjunctival erosion and endophthalmitis; long-term monitoring is needed. The long-term effects of chronic stimulation are unknown [3] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Data processing unit converts camera images into small electrical pulses [2]. Electronics case and coil on the eye; glasses with camera and RF coils; battery-powered video processing unit [4] |
| Data path | Images from a miniature camera on glasses are processed externally and sent wirelessly to the retinal implant [2]. The video processing unit sends stimulation data and power to the glasses, which transmit them to the implant by RF telemetry [4] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Powered wirelessly through a coil implanted in the eye and an external primary coil on the glasses; the video processing unit has a rechargeable battery and is worn on a belt or strap per the summary [3]; the surgeon manual says it comes with a pouch worn by the patient [4] |
| Thermal management |  |
| Packaging and hermeticity | Small hermetic electronics package with a suture tab assembly, internal coil and scleral band [3]. Cylindrical hermetically sealed case holding an ASIC that processes received data and generates stimulation [4]. The assembled implant interconnect met a design lifetime specification of at least 5 years in vitro under accelerated active soak [3] |
| MRI compatibility | Conditional: MRI only with 1.5 T or 3.0 T systems and following the manufacturer's MRI instructions; patients should not enter rooms with other field strengths [3]. A bench study (Magn Reson Imaging 2012) found magnetic field interactions acceptable and RF heating not hazardous under the test conditions, at 1.5 T and 3 T; artifacts were moderate relative to the implant size and no functional changes occurred. The authors conclude a patient may undergo MRI at 1.5 T or 3 T when manufacturer guidelines and conditions are followed [6] |
| Surgical complexity | Vitreoretinal surgery plus scleral fixation of case, coil and band; the labeling recommends a backup implant and backup tacks for each procedure, and training before implanting [3][4] |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity | Bench lifetime testing only: active soak at the maximum charge density limit at 30 Hz reached the equivalent of 32 years in accelerated aging with no significant waveform change, and an interconnect flexural test ran for a 5-year equivalent [3]. IEEE Spectrum reports more than 350 implanted users were left with obsolete, unsupported technology after discontinuation in 2019 and near-failure in 2020 [5] |
| Revision and explant experience | One of 30 subjects was explanted at 1.2 years in the pivotal study; an explant study in 3 canines was used to refine the explantation procedure [3] |
| Adverse events |  |
| Notable demonstrations |  |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | 30 subjects implanted at 10 centers (6 in the United States, 4 in Europe) in the pivotal study: 29 with retinitis pigmentosa (one with Leber congenital amaurosis) and 1 with choroideremia; 21 men and 9 women, median age about 58 [3] |
| Preclinical cohort | Canine mechanical-model studies: 30 canines in design development, then 3 with the final design and 3 more with the design used at the start of the human trial. Active-implant canine studies: 3 with fully active devices (all functional at 2 weeks, two functional through 6 months, the third explanted after 3 months for clinical issues while functioning) and 2 more with the upgraded design for 4 weeks [3] |
| Follow-up duration | As of March 15, 2012 every subject had at least 2.5 years of follow-up except one explanted at 1.2 years; mean 3.5 years [3] |
| Indications | Adults aged 25 or older with severe to profound retinitis pigmentosa and bare or no light perception in both eyes (the order statement lists further criteria not extracted here) [1]. The summary also lists a previous history of useful form vision and being aphakic or pseudophakic [3] |
| Trials and registries | FDA HDE H110002 [1] |
| Primary outcomes |  |
| Key limitations | Electrode count, array layout and pivotal-study population now come from the original HDE summary (configuration at original approval, not later supplements); stimulation parameters and clinical outcomes are still not in the sources read. The HDE and later supplements (S001 to S033) were not reviewed [1]. Implant dimensions and electrode diameter are in the FDA labeling figures, not extracted here; effectiveness not demonstrated, as is standard for an HDE [4] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths |  |
| Limitations | Support ended when the manufacturer discontinued the device [5] |
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
- *Electrodes:* 60 exposed platinum, 55 enabled, on a polymer cable
- *Placement:* epiretinal, over the fovea, held by a retinal tack
- *Implant body:* electronics case and coil on the eye, scleral band equivalent to a 240 band
- *External:* camera glasses with RF coils, video processing unit

#### Evidence and limits
- *Not covered here:* implant dimensions and electrode diameter, which are in the FDA labeling figures; no 3D model yet
- *Approval note:* the label says the device's effectiveness for this use has not been demonstrated, as is standard for a humanitarian device

## Version boundary

The HDE has 33 supplements (S001 to S033) listed on the FDA record; the sheet describes the system at the level of the original approval order and company page.

## References

1. [FDA HDE record, H110002](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfhde/hde.cfm?id=h110002).
2. [Cortigent Argus II page](https://www.cortigent.com/argus-ii).
3. FDA HDE H110002, Summary of Safety and Probable Benefit (Second Sight Medical Products, Argus II Retinal Prosthesis System), original HDE configuration. [FDA PDF](https://www.accessdata.fda.gov/cdrh_docs/pdf11/H110002B.pdf)
4. FDA. *Argus II Retinal Prosthesis System, surgeon manual (physician labeling).* [FDA PDF](https://www.accessdata.fda.gov/cdrh_docs/pdf11/H110002C.pdf)
5. IEEE Spectrum. *Their Bionic Eyes Are Now Obsolete and Unsupported.* 15 Feb 2022. <https://spectrum.ieee.org/bionic-eye-obsolete>
6. [Assessment of MRI issues for the Argus II retinal prosthesis, PubMed 22260934](https://pubmed.ncbi.nlm.nih.gov/22260934/). Peer-reviewed bench study abstract.
