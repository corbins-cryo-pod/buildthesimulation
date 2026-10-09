---
title: "Medtronic Percept and SenSight DBS"
order: 151
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-FDA-0002"
interface_class: "dbs"
status: "human"
last_updated: 2026-10-08
description: "FDA-approved deep brain stimulation family with sensing-enabled Percept neurostimulators and 8-contact SenSight directional leads. Values are scoped to the FDA record, Medtronic labeling and an independent technical report."
modality: "Other"
website: "https://www.accessdata.fda.gov/cdrh_docs/pdf/P960009S482B.pdf"
tags: ["DBS", "Medtronic", "Percept", "SenSight", "BrainSense", "FDA approved", "directional lead", "sensing", "human"]
draft: false
---

# Medtronic Percept and SenSight DBS

Percept PC (approved June 2020) and Percept RC (approved January 2024) are the current Medtronic DBS neurostimulators under PMA P960009. They pair with SenSight directional leads and can record local field potentials through BrainSense. This sheet separates the FDA record, Medtronic labeling and an independent technical paper.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Medtronic Percept PC and Percept RC neurostimulators with BrainSense sensing and SenSight directional leads [1][2][3] |
| Manufacturer | Medtronic, Inc., Medtronic Neuromodulation [1] |
| Interface class | Implanted pulse generator with directional deep brain leads that can sense local field potentials [2][3] |
| Origin | Commercial FDA-approved device within PMA P960009 (Activa and Percept family) [1] |
| First demonstrated | Percept PC FDA approval June 24, 2020 (P960009/S361) [1][4] |
| First human implant |  |
| Species studied |  |
| Regulatory status | PMA P960009. Percept PC approved June 24, 2020 (S361); Percept RC B35300 approved January 8, 2024 (S438); SenSight lead kits May 25, 2021 (S391) [1]. Not an FDA clearance of any individual research result |
| Function | Stimulation and, in the Percept PC, wireless recording of local field potentials from the implanted site [2][5] |
| Target tissue | STN or GPi (Parkinson's disease), VIM thalamus (tremor), ANT thalamus (epilepsy), GPi (dystonia, HDE history) [1][3] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | SenSight directional lead with 1-3-3-1 electrode configuration, insulated orientation markers and single set-screw connection on a non-active contact [2] |
| Array layout | 1-3-3-1 configuration [2] |
| Electrode count | 8 contacts per SenSight lead (1-3-3-1) [2] |
| Pitch | 1.5 mm and 0.5 mm electrode spacing options [2] |
| Electrode lengths |  |
| Shank width and thickness |  |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation |  |
| Insertion method | Stereotactic lead with burr hole device and depth stop; SureTune 4 software automates orientation [1][2] |
| Anchoring and fixation | Burr hole device anchors the lead to the skull [1] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality | Bipolar local field potential sensing in BrainSense modes (Setup, Streaming, Survey, Indefinite Streaming, Timeline) [5] |
| Sampling rate | Time-domain LFP at 250 Hz in the exported JSON files [5] |
| Stimulation capability | Directional stimulation with programmable amplitude, rate, pulse width, cycling and electrode configuration [1][2] |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Deep brain targets listed under Identity [1][3] |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes | Labeled device complications include lead or extension fracture, neurostimulator malfunction and high impedance [1] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Implantable neurostimulator with sensing capability; clinician programmer, patient programmer and therapy access controller [1][3] |
| Data path | Wireless LFP recording; Streaming mode shows selected power and stimulation amplitude on the clinician tablet in real time; Passive mode collects band power chronically up to 60 days [5] |
| Telemetry bandwidth |  |
| Sampling rate | 250 Hz time-domain LFP [5] |
| Power | Percept PC described by Medtronic as recharge free with projected mean longevity greater than five years for a median energy user; Percept RC is rechargeable per the SSED's component list [1][3] |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility | Medtronic states full-body MR Conditional access for 1.5T and 3T when conditions are met; non-conforming scans risk tissue lesions at the electrodes [2][3] |
| Surgical complexity | Stereotactic lead implant plus chest or abdominal neurostimulator pocket and extension [1] |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity | Projected mean greater than five years for median energy users (Percept PC, manufacturer figure) [3] |
| Revision and explant experience | In the SSED dystonia cohort (18 adults, 5 years), subcutaneous infection occurred in 16.7% (3/18) and electrode fracture in 5.6% (1/18); this is a GPi dystonia cohort, not Percept-specific [1] |
| Adverse events | Labeled risks include intracranial hemorrhage, infection, meningitis, brain abscess, cyst formation and neurological effects [1] |
| Notable demonstrations | First 20 patients at the authors' centres (14 Parkinson's, 5 dystonia, 1 chronic pain) had LFPs recorded wirelessly [5] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | 20 patients in the Percept PC technical report (14 PD, 5 dystonia, 1 chronic pain) [5]. SSED supplement S482 reviews prior studies for dystonia |
| Preclinical cohort |  |
| Follow-up duration | Not given for the Percept hardware; SSED dystonia data run to 5 years [1] |
| Indications | Parkinson's disease, essential and parkinsonian tremor, epilepsy (ANT), and dystonia per the November 22, 2025 SSED and Medtronic labeling [1][3] |
| Trials and registries | SSED cites investigator study 6 (Kupsch 2006, Volkmann 2012) for GPi dystonia [1] |
| Primary outcomes | Not given for Percept sensing as a therapy outcome; the Percept PC report found it reliably recorded LFP from the implanted site [5] |
| Key limitations | The SSED read here supports a dystonia indication, so its safety tables are not specific to Percept sensing; the technical report names artefacts, contact selection, data loss and synchronization as pitfalls [1][5] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Sensing and directional stimulation in one family, with 1.5T and 3T MR Conditional eligibility [2][3] |
| Limitations | LFP artefacts, data loss and timing synchronization limit use of the recordings [5] |
| Scaling constraints | 8 contacts per lead; sensing limited to bipolar pairs at 250 Hz in the exported data [2][5] |

## Version boundary

The newest approval in the SSED component list is Percept RC (S438, January 8, 2024). Specifications that Medtronic and the technical report give for the Percept PC are labeled as such. The November 22, 2025 SSED read here concerns the dystonia indication and does not report Percept-specific channel counts.

## References

1. [FDA SSED, P960009/S482 (dystonia, Activa, Percept and SenSight)](https://www.accessdata.fda.gov/cdrh_docs/pdf/P960009S482B.pdf).
2. [Medtronic SenSight directional lead sell sheet](https://filecache.mediaroom.com/mr5mr_medtronic/182844/download/dbs-sensight-directional-lead-system-sell-sheet.pdf).
3. [Medtronic Percept PC clinician page](https://www.medtronic.com/en-us/healthcare-professionals/products/neurological/deep-brain-stimulation/electrical-stimulation-systems/percept-pc-neurostimulator.html).
4. [Medtronic press release, June 25, 2020](https://news.medtronic.com/2020-06-25-FDA-Approves-First-Of-Its-Kind-Percept-TM-PC-Neurostimulator-with-BrainSense-TM-Technology).
5. [Thenaisie et al., J Neural Eng 2021, Percept PC sensing](https://infoscience.epfl.ch/bitstreams/146a61e0-afda-41d5-a49e-1cfc4c42630a/download).
