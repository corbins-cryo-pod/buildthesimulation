---
title: "Abbott Liberta RC DBS system"
order: 152
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-FDA-0003"
interface_class: "dbs"
status: "human"
last_updated: 2026-10-08
description: "FDA-approved rechargeable DBS system from Abbott, approved by supplement S087 of PMA P140009 in January 2024. Many fields stay blank because the FDA record and company pages do not give them."
modality: "Other"
website: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=P140009S087"
tags: ["DBS", "Abbott", "Liberta RC", "FDA approved", "rechargeable", "human"]
draft: false
---

# Abbott Liberta RC DBS system

The Liberta RC is Abbott's rechargeable DBS pulse generator, approved under PMA P140009 supplement S087 with a decision date of January 24, 2024. This is the thinnest-sourced of the DBS sheets: the FDA supplement record gives model numbers and software versions, and Abbott's page adds charging claims. Unknown values stay blank.

Company brief: [Abbott Medical](/companies/54-abbott-company-brief/).

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Abbott Liberta RC DBS System: Liberta RC IPG (model 62400), Charger Kit Pectoral (model 66000), Patient Controller and Clinician Programmer applications version 2.0 [1] |
| Manufacturer | Abbott Medical, Plano, Texas [1] |
| Interface class | Rechargeable deep brain stimulation implantable pulse generator for use with Abbott DBS leads [1][2] |
| Origin | Commercial FDA-approved device within PMA P140009 [1] |
| First demonstrated |  |
| First human implant |  |
| Species studied |  |
| Regulatory status | PMA P140009/S087 decision date January 24, 2024: approval of the Liberta RC system, model 62400 IPG and model 66000 charger kit [1] |
| Function | Rechargeable stimulation of deep brain targets for parkinsonian tremor per the FDA generic name [1] |
| Target tissue | Product generic name is stimulator, electrical, implanted, for parkinsonian tremor [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Not stated for the Liberta RC IPG itself. The Abbott Infinity DBS leads in the same PMA, per the S039 SSED, are 4- or 8-contact leads; 8-contact leads use a 1-3-3-1 layout with segmented middle rings. Whether Liberta RC ships with these leads was not confirmed [3] |
| Array layout |  |
| Electrode count | 4 or 8 contacts per Infinity lead (predecessor system, S039) [3] |
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
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | Infinity IPG (non-rechargeable predecessor, S039): 16 channels, up to 15 programs, constant-current charge-balanced biphasic, up to 12.75 mA in 0.05 mA steps, pulse width 20 to 500 us, 2 to 240 Hz, unipolar or bipolar. Liberta RC values were not located [3] |
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
| Onboard electronics | Rechargeable-cell IPG with wireless charging and updated Bluetooth; also an alternate resistor component in the printed circuit board assembly [1][2] |
| Data path | Bluetooth to a clinician programmer with an iOS interface; NeuroSphere Virtual Clinic remote programming [1][2] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Rechargeable cell; Abbott states a charging frequency of 10 times per year (manufacturer claim). The charger holds two full IPG charges and has an alternate cell battery part number from an existing supplier [1][2] |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility |  |
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
| Human subjects |  |
| Preclinical cohort |  |
| Follow-up duration |  |
| Indications |  |
| Trials and registries | S087 is a normal 180-day supplement for design, components, specifications and material changes [1] |
| Primary outcomes |  |
| Key limitations | This sheet rests on the FDA supplement record and Abbott marketing pages. Lead geometry, sensing and clinical data were not located in a primary Abbott or FDA document [1][2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Abbott states the lowest recharge frequency and smallest implant profile among rechargeable DBS IPGs it compared (manufacturer comparative claim, not independently verified) [2] |
| Limitations | Requires patient recharging [2] |
| Scaling constraints |  |

## Version boundary

The sheet covers the Liberta RC IPG (model 62400) and charger kit (model 66000) named in S087. Earlier Infinity IPGs in the same PMA family, and the Abbott DBS leads, are not described here. The S087 order statement also covers a separate Abbott spinal cord stimulation PMA (P010032/S202) for software and MRI-mode changes, which is outside this sheet.

## References

1. [FDA PMA P140009/S087 record](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=P140009S087).
2. [Abbott Liberta RC rechargeable DBS page](https://www.neuromodulation.abbott/int/en/healthcare-professionals/movement-disorders/rechargeable-dbs.html).
3. [FDA summary of safety and effectiveness data, Abbott Infinity DBS System, P140009/S039](https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140009S039B.pdf).
