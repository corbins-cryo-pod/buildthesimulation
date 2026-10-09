---
title: "LivaNova VNS Therapy SenTiva"
order: 157
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-FDA-0008"
interface_class: "pni"
status: "human"
last_updated: 2026-10-08
description: "FDA-approved vagus nerve stimulation system for refractory epilepsy with the SenTiva generator that senses heart rate. Values come from the FDA supplement records, summary and LivaNova's spec sheet."
modality: "Peripheral nerve"
website: "https://www.accessdata.fda.gov/cdrh_docs/pdf/P970003S207B.pdf"
tags: ["VNS", "vagus nerve", "LivaNova", "SenTiva", "epilepsy", "FDA approved", "human"]
draft: false
---

# LivaNova VNS Therapy SenTiva

The VNS Therapy System is the longest-running implanted vagus nerve stimulator, approved under PMA P970003. This sheet is scoped to the SenTiva Model 1000 generator and the lead models listed with it. Unknown cells stay blank.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | LivaNova VNS Therapy System: SenTiva Model 1000 generator (with SenTiva Duo), Lead models 302, 303 and 304, Model 2000 wand, Model 3000 programmer [1][2][3] |
| Manufacturer | LivaNova USA, Inc., Houston, Texas (formerly Cyberonics) [1][3] |
| Interface class | Implanted pulse generator with a helical lead on the left cervical vagus nerve [2][3] |
| Origin | Commercial FDA-approved device, PMA P970003 [1][2] |
| First demonstrated |  |
| First human implant |  |
| Species studied |  |
| Regulatory status | PMA P970003. LivaNova announced SenTiva approval on October 9, 2017 (release page read, text not extracted); S218 decision July 27, 2018 approved Model 1000 SenTiva, wand and programmer version 1.5 updates. The S207 record (decision June 23, 2017) and its SSED are the indication and contraindication source [1][2][4] |
| Function | Adjunctive therapy reducing seizure frequency in patients 4 years and older with partial onset seizures refractory to antiepileptic medications; SenTiva also provides responsive stimulation to heart rate increases and logs low heart rate and prone position events [1][2] |
| Target tissue | Left vagus nerve; contraindicated after bilateral or left cervical vagotomy [2][3] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | VNS Therapy lead attached to the left vagus nerve; the SSED and spec sheet name models 302, 303 and 304 [2][3] |
| Array layout |  |
| Electrode count |  |
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
| Stimulation capability | Output 0-2.0 mA in 0.125 mA steps and 2.0-3.5 mA in 0.25 mA steps; frequency 1, 2, 5, 10, 15, 20, 25, 30 Hz; pulse width 130, 250, 500, 750, 1000 us; signal ON 7-60 s, OFF 0.2 min to 180 min; magnet and AutoStim modes; day-night and scheduled programming [3] |
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
| Onboard electronics | Programmable pulse generator with heart rate sensing for AutoStim and seizure detection settings [3] |
| Data path | Wand (Model 2000) communicates wirelessly with the programmer (Model 3000) at distances up to 3 meters under most conditions [5] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Lithium carbon monofluoride primary cell, 3.3 V open circuit, 1 Ah rated capacity [3] |
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
| Adverse events | Not extracted here |
| Notable demonstrations |  |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects |  |
| Preclinical cohort |  |
| Follow-up duration |  |
| Indications | Patients 4 years and older with partial onset seizures refractory to antiepileptic medications [1] |
| Trials and registries | Not extracted here |
| Primary outcomes |  |
| Key limitations | The S207 SSED is a multi-model summary and the clinical efficacy sections were not read. Contraindications include diathermy and prior bilateral or left cervical vagotomy [2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths |  |
| Limitations | Diathermy contraindicated; heating hazard if any portion of the system remains implanted [2] |
| Scaling constraints |  |

## Version boundary

The S207 SSED lists several earlier generators (Models 102 to 106). SenTiva Model 1000 is the generator described here; the S218 update to software version 1.5 was approved July 27, 2018. Newer supplements were not reviewed.

## References

1. [FDA PMA P970003/S207 record](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P970003S207).
2. [FDA summary of safety and effectiveness data, P970003/S207](https://www.accessdata.fda.gov/cdrh_docs/pdf/P970003S207B.pdf).
3. [LivaNova SenTiva M1000 generator spec sheet](https://www.livanova.com/getcontentasset/0dbf2b2e-59cb-4547-a376-db811aa11225/dfc3d011-8f63-43f6-9ed8-4b444333a1d0/tis-sentiva-spec-sheet.pdf).
4. [FDA PMA P970003/S218 record](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=422948).
5. [LivaNova SenTiva technical guide](https://www.livanova.com/getcontentasset/2c75dc2a-113a-4dc1-b329-ace3ee78e7b2/dfc3d011-8f63-43f6-9ed8-4b444333a1d0/sentecgd19u1-rev-3-sentiva-technical-guide-final.pdf).
