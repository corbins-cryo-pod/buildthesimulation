---
title: "ME-BIT magnetoelectric nerve stimulator, 2022"
order: 113
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0071"
interface_class: "endovascular"
status: "preclinical"
last_updated: 2026-10-07
description: "2022 magnetoelectric-powered stimulation ASIC and packaged ME-BIT variants. Rodent direct contact, pig vascular leads and device delivery remain separate; chronic packaging, thrombosis and exposure-standard limits are explicit."
modality: "Endovascular"
website: "https://www.nature.com/articles/s41551-022-00873-7"
tags: ["ME-BIT", "magnetoelectric", "Rice", "endovascular", "stimulation", "PZT", "preclinical"]
draft: false
---

# ME-BIT magnetoelectric stimulation

The March 31, 2022 paper reports MagnetoElectric-powered Bio Implants (ME-BITs) that receive power and digital commands from an external magnetic transmitter. The primary affiliations include Rice, UT Medical Branch, UTHealth, Duke, Cambridge and Baylor. The [animal application](/applications/114-mebit-rat-pig-nerve-stimulation-2022/) separates direct contact from vascular stimulation and delivery.

This is not Stentrode recording hardware, an ultrasound-powered StimDust mote or the later 2025 distributed ME network. Sharing a wireless mechanism does not make their circuits and cohorts interchangeable.

The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) and [Rice University, Yang lab](/companies/48-rice-yang-lab/) links this work to source-grounded faculty and laboratory context.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | ME-BIT (MagnetoElectric-powered Bio Implant) [1] |
| Manufacturer | Academic research device; Rice, UT Medical Branch, UTHealth, Duke, Cambridge, Baylor [1] |
| Interface class | Wireless magnetoelectric stimulator; direct-contact and endovascular configurations |
| Origin | Nature Biomedical Engineering, March 31, 2022 [1, 2] |
| First demonstrated | March 31, 2022 [1] |
| First human implant | None |
| Species studied | Rat (direct contact) and pig (vascular); ex-vivo power delivery to 4 cm [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation [1] |
| Target tissue | Peripheral nerve and vascular delivery [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Gold pads (rat) or electrode/lead in a PLA capsule (endovascular) [1] |
| Array layout | Unreported |
| Electrode count | Two 1 × 1 mm gold pads in the direct rat configuration [1] |
| Pitch | 2 mm between the two gold pads (rat) [1] |
| Electrode lengths | Unreported |
| Shank width and thickness | ME film 1.75 × 5 × 0.3 mm; ASIC 1 × 0.8 mm; rat device 6.2 mm³, 30 mg; encapsulated form 3 × 2.15 × 14.8 mm [1] |
| Tip and exposed site geometry | Two 1 × 1 mm gold pads (rat) [1] |
| Contact coating | Unreported |
| Insulation | PLA capsule with nonconductive epoxy [1] |
| Insertion method | Packageable within 11 Fr in design text; 9 Fr sheath delivery demonstrated [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | Gold pads (rat) [1] |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Unreported |
| Recording modality | Unreported |
| Sampling rate | Unreported |
| Stimulation capability | Voltage-controlled 0.3-3.3 V, 4-bit; monophasic or biphasic; pulse width 0.05-1.2 ms (ASIC text, 3-bit) while protocols report 1.5 ms (discrepancy retained); maximum 1 kHz [1] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | 180-nm CMOS ASIC, energy-storage capacitor, ME laminated Metglas/PZT film [1] |
| Data path | Magnetic downlink: 345 kHz resonance, 350 kHz low-amplitude data state, 400 kHz phase notches; 4.6 kbps, 18-bit stimulation payload [1] |
| Telemetry bandwidth | 4.6 kbps downlink [1] |
| Sampling rate | Unreported |
| Power | Battery-free; ASIC below 9 µW; above 90% stimulation efficiency at 1.5-3.3 V (circuit metric); Figure 3 about 6 W transmitter and 1.17 mW implant at 30 mm, caption efficiency 0.01% (as reported) [1] |
| Thermal management | Field meets cited IEEE E-field/SAR limits but lies outside the more restrictive ICNIRP range [1] |
| Packaging and hermeticity | PLA capsule; chronic hermetic packaging needed; lead-containing PZT needs a biocompatible barrier [1] |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Unreported |
| Stability over time | Unreported |
| Longevity | Unreported |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Rat and pig nerve stimulation; ex-vivo power delivery to 4 cm under tested conditions [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Rat and pig acute studies [1] |
| Follow-up duration | Unreported |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Wireless nerve stimulation, direct and vascular [1] |
| Key limitations | Acute histology without observed damage does not establish months of intravascular safety; vascular-health and antithrombotic needs open [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Catheter-deliverable, battery-free, tiny ASIC [1] |
| Limitations | Lead-containing PZT; standard-dependent exposure compliance [1] |
| Scaling constraints | Unreported |

## Hardware and variants

| Component | Published specification |
| --- | --- |
| ME transducer | 1.75 × 5 × 0.3 mm laminated Metglas/PZT film |
| ASIC | 1 × 0.8 mm, 180-nm CMOS |
| System | External field transmitter, ME film, ASIC, energy-storage capacitor, electrodes/lead |
| Encapsulated form | Introduction:3 × 2.15 × 14.8 mm; PLA capsule with nonconductive epoxy |
| Direct rat configuration | 6.2 mm³, 30 mg; two 1 × 1-mm gold pads spaced 2 mm apart |
| Catheter descriptions | Packageable within 11 Fr in design text; demonstrated 9 Fr sheath delivery later in paper |

The rodent volume is not substituted for the longer encapsulated endovascular package. The 9/11 Fr passages describe different packaging/delivery scopes and do not supply one universal catheter requirement.

## Commands and stimulation

The transmitter uses 345 kHz resonance, 350 kHz for the lower-amplitude data state and 400 kHz for phase-change notches. The paper reports 4.6 kbps digital data and an 18-bit stimulation payload, with a stated maximum 1-kHz stimulation rate under its timing scheme.

Voltage-controlled stimulation is programmable from 0.3-3.3 V at 4-bit resolution, with monophasic/biphasic options. The ASIC paragraph lists 0.05-1.2-ms pulse widths at 3-bit resolution, while animal protocols repeatedly report 1.5-ms pulses. That pulse-width discrepancy is preserved rather than corrected by assumption.

## Efficiency is not one number

The paper reports greater-than 90% stimulation efficiency for 1.5-3.3 V and ASIC consumption below 9 µW. These are circuit metrics, not transmitter-to-implant power-transfer efficiency. Ex-vivo power delivery reaches 4 cm under the tested transmitter conditions; it is not a 4-cm implanted pig stimulation result.

Figure 3 reports approximately 6 W transmitter power and 1.17 mW implant power at 30 mm, while its caption states 0.01% efficiency. The caption's numbers and label are retained as reported rather than silently recalculated into a replacement measurement.

## Safety and chronic limits

The paper's modeled field satisfies its cited IEEE electric-field/SAR limits but lies outside the more restrictive ICNIRP exposure range. "Within safety limits" is therefore standard-dependent, not blanket compliance.

Chronic use still requires hermetic packaging, vascular-health studies and assessment of thrombosis/antithrombotic needs. Lead-containing PZT requires a suitable biocompatible barrier or an alternative material. Acute histology without observed damage does not establish months of safe intravascular implantation.

## Model boundary

No full model is supplied. Specified transducer/ASIC dimensions and one package envelope do not establish every variant's internal placement, lead tip, contact map or tissue-fixed orientation.

## References

1. [Published2022 primary paper](https://www.nature.com/articles/s41551-022-00873-7).
2. [Published PDF,including Methods and reporting summary](https://www.nature.com/articles/s41551-022-00873-7.pdf).
