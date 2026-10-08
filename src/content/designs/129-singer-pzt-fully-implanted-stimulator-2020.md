---
title: "Fully implanted two-film PZT ME stimulator, 2020"
order: 129
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0079"
interface_class: "dbs"
status: "preclinical"
last_updated: 2026-10-07
description: "Two PZT/Metglas films, discrete rectifiers and a bias magnet in a 175-mm³ package drive rat MFB place preference. Acute behavioral evidence is separate from the PVDF Parkinson headstage."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/"
tags: ["magnetoelectric", "Rice", "two-film", "stimulation", "preclinical"]
draft: false
---

# Fully implanted PZT ME stimulator

The 2020 Neuron paper miniaturizes its discrete two-film circuit for [rat medial-forebrain-bundle place preference](/applications/131-singer-mfb-rat-place-preference-2020/). This PZT/Metglas configuration replaces the [PVDF head-mounted version](/devices/128-singer-pvdf-two-film-headstage-2020/) used for Parkinsonian rotations. It is not evidence that the fully implanted package treated Parkinson's disease.

The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) links the later ASIC-based ME devices separately.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Fully implanted PZT/Metglas ME stimulator (Demo 2) [1] |
| Manufacturer | Academic research device; Rice and UTHealth Houston [1] |
| Interface class | Fully implanted wireless stimulator with a bipolar stereotrode |
| Origin | Singer and colleagues, Neuron 2020 [1] |
| First demonstrated | 2020 [1] |
| First human implant | None |
| Species studied | Rat, medial-forebrain-bundle place preference, three rats tested 1-3 days after surgery [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation; not evidence of Parkinson's treatment [1] |
| Target tissue | Medial forebrain bundle [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Case channel holds a 9 mm Pt-Ir bipolar stereotrode [1] |
| Array layout | Unreported in reviewed sources |
| Electrode count | Bipolar stereotrode, two contacts [1] |
| Pitch | Unreported in reviewed sources |
| Electrode lengths | 9 mm stereotrode [1] |
| Shank width and thickness | Films 4.3 × 2 mm and 5.4 × 2 mm; whole assembly 175 mm³, 500 mg; power source 2-4 mm³ (Table 1) [1] |
| Tip and exposed site geometry | Unreported in reviewed sources |
| Contact coating | Unreported in reviewed sources |
| Insulation | Parylene-coated films and circuit in a rounded 3D-printed case, outer Flow-It ALC and epoxy [1] |
| Insertion method | Stereotrode enters the brain through the case; skin sutured over [1] |
| Anchoring and fixation | Fixed to skull screws and dental materials [1] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in reviewed sources |
| Electrode material | Platinum-iridium [1] |
| Impedance (with measurement frequency) | Nominal 10 kΩ at 1 kHz [1] |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Stimulation capability | 150 Hz (Table 1); biphasic from two rectifier branches balanced by magnet position [1] |
| Charge injection limit | Less than 1 nC residual charge, discharging within 2 ms, in the general two-film circuit test; not a per-implant qualification [1] |
| Reference and ground | Unreported in reviewed sources |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported in reviewed sources |
| Insertion trauma and BBB disruption | Unreported in reviewed sources |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Unreported in reviewed sources |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Components soldered directly without a circuit board; two resonances, full-wave rectifier branches with transistor isolation [1] |
| Data path | Unreported in reviewed sources |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Table 1: 250-400 kHz carrier, 1-2 mT AC field, 7 W required, 2 mW maximum in-animal; resonant-coil methods 300-400 kHz; place-preference track used 1.5 mT [1] |
| Thermal management | Unreported in reviewed sources |
| Packaging and hermeticity | Ethylene-oxide sterilized then degassed; 14-day saline test of coated films; lead-containing PZT lifetime containment not established [1] |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Unreported in reviewed sources |
| Output connectors | Unreported in reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Unreported in reviewed sources |
| Stability over time | Unreported in reviewed sources |
| Longevity | Acute 1-3 days after surgery; skin sutures held at least one month, not a functional or histology result [1] |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Unreported in reviewed sources |
| Notable demonstrations | Place preference from medial-forebrain-bundle stimulation without a headstage [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Three rats [1] |
| Follow-up duration | 1-3 days after surgery [1] |
| Indications | Unreported in reviewed sources |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Reward-circuit behavior from wireless stimulation [1] |
| Key limitations | No chronic function, human therapy, recording channel or feedback loop shown; chronic packaging and foreign-body tests called for [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Fully implanted, no exposed headstage; no genetic modification needed [1] |
| Limitations | Lead-containing PZT; 7 W drive; supplement geometry not readable in this pass [1] |
| Scaling constraints | Unreported in reviewed sources |

## Package and output

| Part | Published detail |
| --- | --- |
| Films | PZT/Metglas, 4.3 × 2 mm and 5.4 × 2 mm |
| Power conversion | Two distinct resonances; positive and negative full-wave rectifier branches with transistor isolation |
| Assembly | Components soldered together directly without a circuit board; films attached with conductive epoxy |
| Bias | Small permanent magnet positioned to balance the two phases |
| Encapsulation | Parylene-coated films/circuit in a rounded 3D-printed plastic case; outer Flow-It ALC and epoxy |
| Interface | Case channel holds a 9-mm platinum-iridium bipolar stereotrode; nominal impedance 10 kΩ at 1 kHz |
| Whole assembly | Table 1: 175 mm³, 500 mg; power-source volume 2-4 mm³ |
| Wireless drive | Table 1: 250-400-kHz carrier, 1-2-mT alternating field, 7-W required power |
| Stimulation | Table 1: 150 Hz, maximum reported in-animal power 2 mW |

The separate resonant-coil methods describe 300-400-kHz drive for miniature devices. This narrower methods range is retained alongside Table 1, without inventing an exact pair of carrier frequencies for every implant. The place-preference experiment uses 1.5-mT fields at both ends of its track.

The case is fixed to skull screws and dental materials, with the skin sutured over it and the stereotrode entering the brain. Fully implanted means no exposed headstage during the experiment, not a freely floating injectable grain or a lead-free device. Methods include ethylene-oxide sterilization followed by degassing.

## What the paper establishes

The 2020 study demonstrates acute reward-circuit behavior in three rats, tested 1-3 days after surgery. It does not establish chronic functional performance, human therapy, a recording channel or an autonomous feedback loop. The output is electrical stimulation, not optogenetics, and the behavioral rats do not require genetic modification.

The general two-film circuit characterization reports less than 1 nC residual charge and discharge within 2 ms. That result is not a device-by-device chronic safety qualification of every packaged implant. Films, external coils, the permanent bias field and the implanted electrode each have separate safety constraints.

The paper's 14-day saline lifetime experiment concerns coated films. Methods say skin sutures held for at least one month; intact sutures are not evidence of a month of functional stimulation or histological tolerance. The discussion calls for chronic packaging and foreign-body-response tests and notes magnetic-imaging and possible pressure-wave limits. PZT is lead-containing; this study does not establish lifetime containment of that material.

No 3D model is added. Figure 5 confirms the separate films, compact circuit and buried assembly, but the published film rectangles and total volume do not define the rounded case, magnet, contact spacing or component arrangement closely enough.

## References

1. [Singer and colleagues, Neuron 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/): Table 1, Figure 5, two-film circuit, place-preference implant design, surgery and Discussion. Exact supplement-only geometry is omitted because the PDF download was not readable.
