---
title: "Medtronic Inceptiv closed-loop SCS"
order: 154
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-FDA-0005"
interface_class: "scs"
status: "human"
last_updated: 2026-10-08
description: "FDA-approved Medtronic spinal cord stimulator with closed-loop ECAP sensing, approved April 2024. Values rest on the FDA supplement record and Medtronic's announcement; the SSED was not read."
modality: "Other"
website: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=P840001S512"
tags: ["SCS", "spinal cord stimulation", "Medtronic", "Inceptiv", "closed loop", "ECAP", "FDA approved", "human"]
draft: false
---

# Medtronic Inceptiv closed-loop SCS

Inceptiv is Medtronic's closed-loop rechargeable spinal cord stimulator, approved by PMA supplement S512 on April 24, 2024. This sheet is thinly sourced: the FDA supplement record names the models and features, and a Medtronic announcement adds the sensing rate and MRI statements. Unknown cells stay blank.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Medtronic Pain RC SCS System: Inceptiv (model 977119), Inceptiv LT (977117) and Intellis Pro (977118) neurostimulators with Neuro Sense closed-loop feature and WR9230 wireless recharger [1] |
| Manufacturer | Medtronic, Inc. [1][2] |
| Interface class | Rechargeable spinal cord stimulator with epidural leads and closed-loop sensing of evoked compound action potentials [1][2] |
| Origin | Commercial FDA-approved device within PMA P840001 [1] |
| First demonstrated |  |
| First human implant |  |
| Species studied |  |
| Regulatory status | PMA P840001/S512, received March 1, 2022, decision April 24, 2024. Medtronic reports earlier approvals in Europe and Japan [1][2] |
| Function | Spinal cord stimulation for chronic pain with ECAP sensing, about 50 times per second, to adjust stimulation toward the prescribed setting; Medtronic notes sensing signals may not be measurable in all cases [2] |
| Target tissue | Spinal cord via epidural leads [1][2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Closed-loop feature approved for Vectris SureScan MRI 1x8 Compact leads, models 977A260, 977A275 and 977A290 only [1] |
| Array layout | 1x8 lead per the model names [1] |
| Electrode count | 8 contacts per Vectris 1x8 Compact lead (from the lead name) [1] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness |  |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation |  |
| Insertion method |  |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality | ECAP sensing by specialized circuitry and a proprietary algorithm [2] |
| Sampling rate |  |
| Stimulation capability | Multiple waveform types including Medtronic Differential Target Multiplexed (DTM) programming; updated DTM user interface with Spine Anatomy View and templating in this approval [1][2]. Operating ranges for models 977119, 977117 and 977118: pulse width 60 to 1000 µs, rate 2 to 1200 Hz, maximum 25.5 mA per electrode, program intensity 0 to 100 mA, 8 groups with up to 32 programs; Neuro Sense (closed loop) is on model 977119 only [3] |
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
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Closed-loop circuitry in the Inceptiv neurostimulator; the Intellis Pro and Inceptiv LT are named in the same approval [1] |
| Data path | CareGuidePro mobile application and web portal (Medtronic) [2] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Rechargeable; new wireless recharger WR9230 [1][2] |
| Thermal management |  |
| Packaging and hermeticity | Titanium, polysulfone with titanium dioxide, and silicone; case 57 x 47 x 6 mm, 57 x 47 x 9 mm at the connector block, 13.9 cm3, 29 g, surface area 53 cm2 [3] |
| MRI compatibility | Medtronic states 1.5T and 3T full-body MRI access with no power or impedance restrictions under labeled conditions [2] |
| Surgical complexity |  |
| Output connectors | Octapolar inline connector, 2.8 mm spacing; electrode configuration from 2 to 16 electrodes [3] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity | Manufacturer implant manual: lithium ion rechargeable battery, expected lifetime 15 years before the elective replacement indicator [3] |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations |  |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects |  |
| Preclinical cohort |  |
| Follow-up duration |  |
| Indications | Chronic pain (the Medtronic announcement states treatment of chronic pain); the FDA record read does not list the indication text [2] |
| Trials and registries |  |
| Primary outcomes | DTM waveform: 84% responder rate at 12 months in a multicenter open-label randomized trial (Fishman 2021, Pain Practice). This is a waveform result, not a closed-loop result [2] |
| Key limitations | The PMA SSED and closed-loop clinical data were not read. Statements about size, MRI and market rank are Medtronic announcement claims [2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Closed-loop ECAP sensing with MRI access stated by the manufacturer [2] |
| Limitations |  |
| Scaling constraints |  |

## Version boundary

The approval covers Inceptiv, Inceptiv LT and Intellis Pro neurostimulators. Inceptiv is the closed-loop model named in the announcement. Earlier Medtronic SCS systems in P840001 are not described.

## References

1. [FDA PMA P840001/S512 record](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=P840001S512).
2. [Medtronic announcement, April 26, 2024](https://news.medtronic.com/2024-04-26-Medtronic-receives-FDA-approval-for-Inceptiv-TM-closed-loop-spinal-cord-stimulator).
3. Medtronic (manufacturer labeling, Inceptiv 977119, Inceptiv LT 977117 and Intellis Pro 977118 rechargeable neurostimulators implant manual), as hosted by the Slovak Ministry of Health categorization site (Slovak host; the manual itself is Medtronic's). [Implant manual](https://kategorizacia.mzsr.sk/Pomocky/Download/RequestAttachment/129256). Physical and operating tables read October 9, 2026; hosted copy not dated.
