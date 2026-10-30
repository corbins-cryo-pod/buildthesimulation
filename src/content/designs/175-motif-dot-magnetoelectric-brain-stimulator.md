---
title: "Motif DOT magnetoelectric brain stimulator"
order: 175
pubDate: 2026-10-08
updatedDate: 2026-10-11
device_id: "BTSD-STUP-0002"
interface_class: "other"
status: "human"
last_updated: 2026-10-11
description: "Pea-sized, battery-free wireless cortical stimulator from Motif Neurotech, shown acutely in a human in 2023 and now in an early feasibility study for treatment-resistant depression."
modality: "Other"
website: "https://clinicaltrials.gov/study/NCT07594483"
function: ["stimulation"]
regulatory: "investigational"
tags: ["Motif", "DOT", "magnetoelectric"]
draft: false
---

# Motif DOT magnetoelectric brain stimulator

Motif's DOT is a roughly 9 mm, battery-free stimulator powered through the magnetoelectric effect, shown on a human motor cortex in 2023. The XCS System is now in an early feasibility study for treatment-resistant depression. Specs beyond size and voltage are left blank. The [XCS early feasibility study in treatment-resistant depression](/applications/178-motif-xcs-trd-early-feasibility-study/) page covers the registry record.

Company brief: [Motif Neurotech](/companies/69-motif-neurotech-company-brief/).

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Motif Digitally programmable Over-brain Therapeutic (DOT) microstimulator; the clinical system is named Motif eXternally powered Cortical Stimulation (XCS) System [1][2][3] |
| Manufacturer | Motif Neurotech, Inc. (spin-out of Rice University lab of Jacob Robinson) [1][2] |
| Interface class | Wireless, battery-free stimulator on the dura or skull-side cortex, without penetrating the dura [2][3] |
| Origin | Company device with Rice University, Baylor College of Medicine and UTHealth Houston collaborators; published in Science Advances [1][2] |
| First demonstrated | First-in-human intraoperative stimulation reported September 13, 2023 at Baylor St Luke's Medical Center [1] |
| First human implant |  |
| Species studied | Human (acute) and pig (30-day) [2] |
| Regulatory status | Investigational; ClinicalTrials.gov NCT07594483 early feasibility study of the XCS System for treatment-resistant depression [3] |
| Function | Stimulates the cortex wirelessly; in the first human demonstration it activated the motor cortex and produced a hand movement; the intended therapy is for treatment-resistant depression [1][2][3] |
| Target tissue | Left dorsolateral prefrontal cortex for the XCS study; motor cortex in the first acute demonstration [2][3] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Surface electrodes implanted in a skull burr hole, stimulating through the dura [3] |
| Array layout | Two disc electrodes, 1.5 mm in diameter, one on the bottom cap (against the dura) and one on the top cap; the first pig cohorts used two electrodes on the bottom (bipolar), later changed to this pseudo-monopolar layout [4] |
| Electrode count | Two stimulation electrodes in the paper prototype; the glass feedthrough wafer could allow more contacts later [4] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness |  |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation | Borosilicate glass enclosure with caps sealed by medical grade epoxy (Epo-Tek MED-301-2); silicone sleeve around the device and a PEEK cover with a hole over the top electrode [4] |
| Insertion method | Placed flush with the skull on the dura through a 14 mm burr hole, with a stainless steel mesh to link the top electrode to tissue. No contact with the brain; the pig implantation took about 30 minutes [4] |
| Anchoring and fixation | Burr hole in the skull; the XCS study requires skull thickness of 5.5 to 15.5 mm over the target [3] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Circular electrodes 1.5 mm in diameter (about 1.8 mm2 geometric area, computed from the stated diameter) [4] |
| Electrode material | Sputtered stack on the glass caps: 10 nm Ti, 100 nm Pt, 10 nm Ti, 300 nm IrOx. The authors note IrOx is not yet common in FDA-approved devices and would need biocompatibility testing [4] |
| Impedance (with measurement frequency) | Benchtop saline test, 1 kHz, 22 days and over 22 million pulses: impedance stayed between 250 and 400 ohm. In one pig, resistance rose between days 15 and 25 and stabilized near 2.25 kohm [4] |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | The prototype delivered 14.5 V of stimulation, per the Rice report [2] |
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
| Onboard electronics | Prototype includes regulation electronics, a small magnet and two magnetoelectric films for wireless data and power [1] |
| Data path | Wireless data and power through an external transmitter worn on the head, such as a hat or wearable [1][2] |
| Telemetry bandwidth | Downlink is encoded in field timing (bit 0: off 200 us, on 100 us; bit 1: off 100 us, on 200 us) and uplink is 8-bit on/off keying of the backscattered magnetic field [4] |
| Sampling rate |  |
| Power | Battery-free; powered by the magnetoelectric effect from an external transmitter [1][2] |
| Thermal management |  |
| Packaging and hermeticity | Prototype used borosilicate glass with hermetic tungsten-via caps (Schott HermeS) but, for the short-term proof of concept, epoxy sealing rather than a fully hermetic enclosure; the authors expect laser-welded glass could be made hermetic [4] |
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
| Notable demonstrations | Intraoperative human tests at Baylor St Luke's: the device on the motor cortex drove a hand contraction; a second patient showed thumb movement and EMG responses through the dura above 10 V. The authors call it the smallest implantable brain stimulator demonstrated acutely in a human [4] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Prototype: one patient intraoperatively. XCS study enrollment not extracted [1][2] |
| Preclinical cohort | Pigs: four cohorts of two animals, 8 animals and 10 implants; motor responses over the full chronic experiment in 3 animals implanted 20 to 35 days, with sham implants used for pathology comparison [4] |
| Follow-up duration | Pig chronic stimulation up to 30 days in the headline claim, 20 to 35 days implanted. Human tests were acute, during tumor resection surgery [4] |
| Indications |  |
| Trials and registries | NCT07594483: prospective, multi-center, single-arm, open-label early feasibility study of the XCS System [3] |
| Primary outcomes |  |
| Key limitations | The 2023 prototype is about 9 mm across (pea-sized); whether the XCS clinical system matches that prototype is not stated in the sources read. Company and press-release claims for the human demonstration [1][2][3] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths |  |
| Limitations |  |
| Scaling constraints |  |

## Version boundary

Hardware values come from the 2023 prototype. The XCS clinical configuration may differ.

## References

1. [Motif release, September 13, 2023](https://www.businesswire.com/news/home/20230913723932/en/Motif-Neurotech-Conducts-First-in-human-Brain-Stimulation-With-Millimeter-sized-Implantable-Device-for-Treatment-resistant-Depression).
2. [Rice University report on the Science Advances paper](https://www.technology.org/2024/04/15/rice-team-demonstrates-miniature-brain-stimulator-in-humans/).
3. [ClinicalTrials.gov NCT07594483](https://clinicaltrials.gov/study/NCT07594483).
4. [Millimeter-sized battery-free epidural cortical stimulators, Science Advances 2024 (PMC open access, CC BY)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11014439/). The device described is the research prototype in the paper, not necessarily the current Motif clinical system.
