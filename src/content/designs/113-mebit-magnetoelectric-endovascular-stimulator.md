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

## Primary sources

- [Published2022 primary paper](https://www.nature.com/articles/s41551-022-00873-7).
- [Published PDF,including Methods and reporting summary](https://www.nature.com/articles/s41551-022-00873-7.pdf).
