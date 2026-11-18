---
title: "Medtronic Inceptiv closed-loop SCS"
order: 154
pubDate: 2026-10-08
updatedDate: 2026-11-18
device_id: "BTSD-FDA-0005"
interface_class: "scs"
status: "human"
last_updated: 2026-11-18
description: "FDA-approved Medtronic spinal cord stimulator with closed-loop ECAP sensing, approved April 2024. Values rest on the FDA supplement record, Medtronic's announcement and the peer-reviewed Closed-Loop study (NCT05177354); the SSED was not read."
modality: "Other"
website: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=P840001S512"
axis: ["spinal-cord"]
function: ["recording", "stimulation", "bidirectional"]
regulatory: "fda-approved"
origin: "US"
tags: ["spinal cord stimulation", "Medtronic", "closed loop", "ECAP"]
draft: false
---

# Medtronic Inceptiv closed-loop SCS

Inceptiv is Medtronic's closed-loop rechargeable spinal cord stimulator, approved by PMA supplement S512 on April 24, 2024. This sheet is thinly sourced: the FDA supplement record names the models and features, and a Medtronic announcement adds the sensing rate and MRI statements. Unknown cells stay blank.

Company brief: [Medtronic plc](/companies/53-medtronic-company-brief/).

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
| Pitch | Vectris SureScan MRI 1x8 Compact leads (977A260, 977A275, 977A290): 4.0 mm spacing per the Medtronic product page. A 2021 recall (FDA Z-2159-2021, 1,131 units, EU distribution) covered specific PINs of these kits for incorrect electrode spacing printed on box and sterile pack labels [4][5] |
| Electrode lengths | Contact length 3.0 mm on 8 contacts; lead lengths 60, 75 and 90 cm for models 977A260, 977A275 and 977A290 respectively [4] |
| Shank width and thickness |  |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation |  |
| Insertion method | Kit includes bent and straight 0.30 mm stylets, guidewire, passing straw, 14 ga 3.5 in Tuohy needles and a tunneling tip and rod, per the Vectris SureScan kit contents [4] |
| Anchoring and fixation | Kit includes an Injex bumpy anchor with an anchor dispenser tool [4] |

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
| Human subjects | Closed-Loop study (NCT05177354): 94 enrolled at Australian sites; 60 implanted with the closed-loop system, 54 completed the 3-month visit; 12-month analyses covered 36 to 39 participants [6][7] |
| Preclinical cohort |  |
| Follow-up duration | In-clinic randomized crossover testing at 1 month; pain outcomes through 12 months; study completed July 2025 [6][7][8] |
| Indications | Chronic pain (the Medtronic announcement states treatment of chronic pain); the FDA record read does not list the indication text [2] |
| Trials and registries | NCT05177354 (Closed-Loop study): multicenter, prospective, single-arm with in-clinic randomized crossover testing (closed loop on vs off), completed [6] |
| Primary outcomes | Primary endpoint met: 89.3% of the primary analysis set (n=28) reported reduced overstimulation with closed loop vs open loop at 1 month (p<0.001); 86% of low-back/leg pain subjects (n=51) had at least 50% pain reduction at 3 months; at 12 months 78% (n=36) had at least 50% pain relief, pain intensity down 60 mm from baseline and stable; overstimulation median 0.4 (closed loop) vs 3.0 (open loop) [7][8]. DTM waveform: 84% responder rate at 12 months in a multicenter open-label randomized trial (Fishman 2021, Pain Practice). This is a waveform result, not a closed-loop result [2] |
| Key limitations | The PMA SSED was not read; clinical rows come from the peer-reviewed Closed-Loop study reports (Australian sites; sponsor Medtronic; several authors are Medtronic employees). Single-arm design; the crossover comparison was in-clinic and short-term. Statements about size, MRI and market rank are Medtronic announcement claims [1][2][7][8] |

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
4. [Medtronic Vectris SureScan MRI surgical lead product page](https://www.medtronic.com/en-us/healthcare-professionals/products/neurological/spinal-cord-stimulation/mri-leads/vectris-surescan-surgical-lead.html), manufacturer.
5. [FDA recall record Z-2159-2021, Medtronic Vectris SureScan MRI lead kits](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfRes/res.cfm?id=188265).
6. [ClinicalTrials.gov, NCT05177354 (Medtronic Closed-Loop Spinal Cord Stimulation System)](https://clinicaltrials.gov/study/NCT05177354). Verified November 18, 2026.
7. [Mohabbati V, Sullivan R, Yu J, et al., Early outcomes with a flexible ECAP based closed loop using multiplexed spinal cord stimulation waveforms, Pain Medicine 2025;26(11):773-782](https://pubmed.ncbi.nlm.nih.gov/40378232/). Peer reviewed; PMID 40378232; open access PMC12585107.
8. [Mohabbati V, Sullivan R, Yu J, et al., In-Clinic and At-Home Patient Experiences with Closed-Loop Spinal Cord Stimulation: 12-Month Outcomes, Pain and Therapy 2026;15(5):1673-1684](https://pubmed.ncbi.nlm.nih.gov/42518116/). Peer reviewed; PMID 42518116; open access PMC13624207.
