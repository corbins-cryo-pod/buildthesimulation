---
title: "NeuroPace RNS System"
order: 150
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-FDA-0001"
interface_class: "other"
status: "human"
last_updated: 2026-10-08
description: "FDA-approved responsive neurostimulator that records ECoG through four-contact cortical strip and depth leads and delivers stimulation when programmed detections fire. Values come from the FDA summary and the published trials, scoped to the 2013 RNS-300M approval."
modality: "Other"
website: "https://www.accessdata.fda.gov/cdrh_docs/pdf10/P100026b.pdf"
tags: ["epilepsy", "responsive stimulation", "ECoG", "closed loop", "NeuroPace", "FDA approved", "depth lead", "cortical strip", "human"]
draft: false
---

# NeuroPace RNS System

The RNS System is an FDA-approved, cranially implanted neurostimulator from NeuroPace that listens to electrocorticography through up to two four-electrode leads and responds with stimulation when a programmed detection fires. This sheet is scoped to the RNS-300M and leads described in the 2013 FDA summary and to the published trials. Later models and supplements are not reviewed.

Company brief: [NeuroPace, Inc.](/companies/52-neuropace-company-brief/).

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | NeuroPace RNS System: RNS-300M neurostimulator (2013 approval) with NeuroPace cortical strip and depth leads; later RNS-320 model named in the 2020 paper [1][2] |
| Manufacturer | NeuroPace, Inc., Mountain View, California [1] |
| Interface class | Cranially implanted responsive neurostimulator with one or two cortical strip or depth leads [1] |
| Origin | Commercial FDA-approved device; Feasibility (G010288 external model), pivotal and long-term treatment studies [1][2] |
| First demonstrated | Feasibility study began 2004 per the long-term paper [2] |
| First human implant |  |
| Species studied |  |
| Regulatory status | FDA PMA P100026, approval November 14, 2013 (panel recommendation February 22, 2013) [1]. Later supplements and the RNS-320 model were not read for this sheet |
| Function | Records electrocorticography, detects programmed abnormal activity and delivers responsive stimulation; adjunctive therapy for adults with partial onset seizures from no more than 2 foci, refractory to two or more antiepileptic drugs [1] |
| Target tissue | Seizure foci in or near the brain, via cortical surface strips or stereotactic depth leads [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Cortical strip leads on the brain surface and depth leads placed stereotactically; the neurostimulator sits in the cranium coplanar with the skull surface in a ferrule [1] |
| Array layout | 1 x 4 electrode array on each lead; one or two leads per neurostimulator [1] |
| Electrode count | 4 electrodes per lead, up to 2 leads [1] |
| Pitch | 10 mm spacing (cortical strip); 3.5 mm or 10 mm (depth) [1] |
| Electrode lengths | Lead length 15, 25 or 35 cm (cortical strip); 30 or 44 cm (depth) [1] |
| Shank width and thickness | Lead diameter 1.27 mm for both lead types [1] |
| Tip and exposed site geometry | Electrode surface area 0.079 cm2 [1] |
| Contact coating |  |
| Insulation | Silicone lead body [1] |
| Insertion method | Depth leads stereotactic, using a stop gauge to set depth; strip leads placed near epileptic foci; neurostimulator in a craniectomy with ferrule [1] |
| Anchoring and fixation | Ferrule secures the neurostimulator in the skull; suture sleeves protect the lead body when sutured [1] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 0.079 cm2 per electrode [1] |
| Electrode material | Platinum/iridium [1] |
| Impedance (with measurement frequency) | Lead conductor resistance listed as 15, 25, 35 ohm (cortical strip) and 30, 44 ohm (depth), +/-10% by lead length; this is lead resistance, not electrode-tissue impedance [1] |
| Noise floor or SNR |  |
| Recording modality | Electrocorticographic (ECoG) activity monitored; three programmable detection tools: area, line-length and bandpass [1] |
| Sampling rate |  |
| Stimulation capability | Max current 11.5 mA +/-10% and 6 V +/-10% at 500 ohm; pulse width 40-1000 us; 1-333 Hz; 1-1666 pulses per burst; bipolar or multipolar current paths [1] |
| Charge injection limit | Maximum charge density 25 uC/cm2/phase [1] |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Seizure foci in cortex or depth structures [1] |
| Insertion trauma and BBB disruption | Rabbit study (6 days, 4 and 26 weeks): no evidence of systemic toxicity, neurotoxicity or local tissue reaction beyond expected effects of surgical placement and the physical presence of implants [1] |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation | Rabbit histopathology included GFAP (astroglial activation) and macrophage staining; no reaction beyond expected effects of placement and presence [1] |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes | RNS-300M: median time to replacement about 1,284 days (3.5 years), with no battery-related device malfunctions; ECoG recording can be affected by radio-frequency identification devices [1][2] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Hermetically sealed titanium enclosure with electronic circuitry and a Li-CFx/SVO battery [1] |
| Data path | Programmer or Remote Monitor wand communicates with the neurostimulator; Remote Monitor uploads data over analog phone lines to the Patient Data Management System [1] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Li-CFx/SVO primary battery; manual end-of-service estimate 2.6 to 4.2 years depending on settings; RNS-320 anticipated to reach 8 years at moderate use [2] |
| Thermal management |  |
| Packaging and hermeticity | Hermetic titanium case; helium leak rate no greater than 5.0 x 10^-9 cc-atm/s per acceptance criteria [1] |
| MRI compatibility | Contraindicated at the 2013 approval; MR imaging not permitted with any implanted RNS System [1]. Later labeling not read |
| Surgical complexity | Craniectomy with ferrule, stereotactic or subdural lead placement; infection risk 4.1% per procedure including replacements [2] |
| Output connectors | Connector cover secures proximal lead contacts to the neurostimulator [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity | RNS-300M median replacement about 3.5 years in the long-term study [2] |
| Revision and explant experience | Serious infection at the implant site in 12.1% of participants; 16 of 35 infections led to explantation [2] |
| Adverse events | Non-seizure-related hemorrhage in 7 of 256 (2.7%); status epilepticus 8.2%; suicidality-related events 9.8%; 16 deaths over 9 years including probable or definite SUDEP 3.2 per 1,000 patient-implantation years [2] |
| Notable demonstrations | Class I pivotal trial and 9-year follow-up with 1,895 patient-implantation years [2][3] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Feasibility n=65; pivotal n=191; long-term study enrolled 230 of 256 treated [1][2] |
| Preclinical cohort | Rabbit neuroimplantation and chronic toxicity study [1] |
| Follow-up duration | Pivotal 2 years; long-term study to 9 years (median follow-up 8.97 years) [2] |
| Indications | Adults 18 and older, partial onset seizures, no more than 2 foci, refractory to two or more antiepileptic drugs, averaging 3 or more disabling seizures per month [1] |
| Trials and registries | IDE feasibility G010288; pivotal and long-term treatment studies per the SSED [1] |
| Primary outcomes | Pivotal blinded period: seizures reduced 37.9% (n=97) with stimulation versus 17.3% (n=94) with sham, p=0.012. At 9 years: median reduction 75%, responder rate 73% [2][3] |
| Key limitations | Long-term study was open label (Class IV evidence); SSED sections read here stop before its efficacy results; later device models and labeling not reviewed [1][2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Closed-loop detection and stimulation from cortical or depth electrodes with stored ECoG [1] |
| Limitations | Short battery life of the RNS-300M, infection risk per procedure, MRI contraindication at approval [1][2] |
| Scaling constraints | Up to 8 electrodes (2 leads x 4) per neurostimulator [1] |

## Version boundary

The FDA summary describes the RNS-300M neurostimulator and its lead specifications. The 9-year paper names a newer RNS-320 model but gives only an anticipated battery figure. Results listed here belong to the cohorts in the cited papers, not to every later device.

## References

1. [FDA summary of safety and effectiveness, P100026](https://www.accessdata.fda.gov/cdrh_docs/pdf10/P100026b.pdf).
2. [Nair et al., Neurology 2020, nine-year prospective results](https://pmc.ncbi.nlm.nih.gov/articles/PMC7538230/).
3. [Morrell, Neurology 2011, pivotal randomized trial](https://pubmed.ncbi.nlm.nih.gov/21917777/).
