---
title: "Nevro Senza HFX iQ SCS"
order: 155
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-FDA-0006"
interface_class: "scs"
status: "human"
last_updated: 2026-10-08
description: "FDA-approved 10 kHz spinal cord stimulation system with a 16-channel rechargeable IPG, approved October 2022. Values rest on the FDA supplement record and Nevro's prescriber information; the SSED and clinical data were not read."
modality: "Other"
website: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P130022S044"
tags: ["SCS", "spinal cord stimulation", "Nevro", "HFX iQ", "10 kHz", "FDA approved", "human"]
draft: false
---

# Nevro Senza HFX iQ SCS

Senza HFX iQ is Nevro's current spinal cord stimulation system, approved by PMA supplement S044 on October 12, 2022. Its IPG has 16 output channels and can deliver 10 kHz therapy. This sheet is thinly sourced from the FDA record and Nevro's prescriber information; unknown cells stay blank.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Nevro Senza HFX iQ System: HFX iQ IPG (IPG3000), HFX Trial Stimulator (TSM3500), HFX iQ Remote (PTR3000) and HFX iQ Patient Application [1] |
| Manufacturer | Nevro Corp. [2] |
| Interface class | Rechargeable implantable pulse generator for spinal cord stimulation with two lead ports [2] |
| Origin | Commercial FDA-approved device within PMA P130022 [1] |
| First demonstrated |  |
| First human implant |  |
| Species studied | Human; 10 kHz safety study in 12 goats [4] |
| Regulatory status | PMA P130022/S044, received March 2, 2022, decision October 12, 2022: approval of the new Senza HFX iQ IPG system [1] |
| Function | Delivers 10 kHz therapy that does not produce paresthesia, and can also provide paresthesia-producing stimulation at lower settings [2] |
| Target tissue | Dorsal column of the spinal cord [4] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Two lead ports on the IPG header; compatible Nevro and competitor leads are listed in the prescriber information, not extracted here [2] |
| Array layout |  |
| Electrode count | 16 output channels on the IPG; contacts per lead not extracted here [2] |
| Pitch | Edge-to-edge electrode spacing 1 to 9 mm (original percutaneous leads) [4] |
| Electrode lengths | Electrode span 3.1 to 8.7 cm; lead length 30 to 90 cm in 5 cm steps [4] |
| Shank width and thickness | Lead diameter 1.4 mm [4] |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation | Pellethane 55D and Dow Corning 2363 lead body; ETFE-insulated MP35N conductor with silver core [4] |
| Insertion method |  |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 12.7 mm2 per electrode (original percutaneous lead) [4] |
| Electrode material | Platinum/Iridium, 8 electrodes per lead [4] |
| Impedance (with measurement frequency) | Below 18 ohm lead resistance; measurement frequency not stated [4] |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | Current-regulated, charge-balanced, biphasic, capacitively coupled rectangular pulses; 10 kHz capable [2] |
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
| Onboard electronics | Titanium IPG with a hermetically sealed rechargeable battery and charging coil in the header; Bluetooth enabled; Gaea Cryptofunction software for cybersecurity features [1][2] |
| Data path | Bluetooth to the patient remote and application; clinician programmer software configures trial stimulators and IPGs [1][2] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Rechargeable IPG with a charger; the trial stimulator uses 2 AAA batteries [2] |
| Thermal management |  |
| Packaging and hermeticity | Hermetic titanium enclosure around a hermetically sealed battery housing [2] |
| MRI compatibility | MR Conditional; Nevro MRI Guidelines (P/N 10001162) give the conditions. The charger, trial stimulator and remote are not MRI safe [2] |
| Surgical complexity |  |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations |  |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | SENZA-RCT: 241 patients in the PMA database at 11 sites, enrolled June 7 to December 28, 2012 (1:1 randomization to Senza or a 2 to 1,200 Hz comparator) [4] |
| Preclinical cohort | 12 goats, 6 with 10 kHz therapy at 100% duty cycle for 10 +/- 1 days through a trial lead [4] |
| Follow-up duration |  |
| Indications | Original approval: chronic intractable pain of the trunk and/or limbs, including failed back surgery syndrome, intractable low back pain and leg pain [4] |
| Trials and registries | Prospective, randomized, multi-center, non-inferiority trial, unblinded; planned 77 per group (154 total) plus at least 60 Senza subjects programmed to 10 kHz [4] |
| Primary outcomes |  |
| Key limitations | The FDA record read is a supplement for the new IPG system; pivotal 10 kHz clinical data and SSED were not read. Lead dimensions, battery life and channel mapping are left blank here [1][2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths |  |
| Limitations |  |
| Scaling constraints |  |

## Version boundary

The sheet covers the HFX iQ IPG (IPG3000) and its trial and patient components as named in S044. Values cited [4] come from the original Senza SSED (Model 1500 IPG and percutaneous leads) and describe that earlier configuration, not the HFX iQ IPG. The SENZA-RCT outcome percentages were not extracted.

## References

1. [FDA PMA P130022/S044 record](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P130022S044).
2. [Nevro information for prescribers, Senza HFX iQ and HFX Trial System](https://www.nevro.com/app/uploads/2025/02/10001223_Information_For_Prescribers_Rev_D_Clean.pdf).
4. [FDA summary of safety and effectiveness data, original Senza PMA P130022](https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130022B.pdf).
