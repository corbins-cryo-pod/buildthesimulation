---
title: "StimDust ultrasonic nerve stimulator,2020"
order: 111
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0070"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Published 1.7-mm³ battery-free stimulation mote, ultrasound-powered with backscatter status. Acute rat sciatic-nerve stimulation and 55-mm ex-vivo tissue link, not chronic clinical safety or neural recording."
modality: "Peripheral nerve"
website: "https://www.nature.com/articles/s41551-020-0518-9"
tags: ["StimDust", "ultrasound", "stimulation", "Berkeley", "battery-free", "peripheral nerve", "preclinical"]
draft: false
---

# StimDust

The February 19, 2020 paper reports a wireless, leadless, battery-free 1.7-mm³ stimulation mote powered by ultrasound. It combines a piezoceramic transducer, energy-storage capacitor and integrated circuit with an external ultrasonic transceiver. Its primary affiliations include UC Berkeley/UCSF bioengineering, Berkeley EECS, Boise State and Chan Zuckerberg Biohub.

This is stimulation hardware, not the earlier [neural-dust recording mote](/devices/22-neural-dust-ultrasonic-backscatter-mote/). Backscatter reports stimulation status; it is not a demonstrated extracellular neural-recording stream. The [acute rat application](/applications/112-stimdust-acute-rat-sciatic-stimulation-2020/) separates physiological tests from link benchmarks.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | StimDust, ultrasound-powered leadless stimulation mote, 2020 configuration [1] |
| Manufacturer | Academic research device; UC Berkeley/UCSF bioengineering, Berkeley EECS, Boise State, Chan Zuckerberg Biohub [1] |
| Interface class | Wireless peripheral-nerve stimulation mote with sciatic cuff |
| Origin | Muller lab, Nature Biomedical Engineering [1, 4] |
| First demonstrated | February 19, 2020 (published); earlier 6.5 mm³ and 2.2 mm³ prototype reports are separate versions [1, 5] |
| First human implant | None |
| Species studied | Rat (acute sciatic stimulation); ex-vivo porcine tissue for the 55 mm link [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation; backscatter reports stimulation status, not neural recording [1] |
| Target tissue | Sciatic nerve (rat) [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Mote with sciatic-nerve cuff [1] |
| Array layout | Unreported in reviewed sources |
| Electrode count | Published sources reviewed do not extract a contact count |
| Pitch | Unreported in reviewed sources |
| Electrode lengths | Unreported in reviewed sources |
| Shank width and thickness | Mote volume 1.7 mm³; envelope and electrode map not derived from volume alone [1] |
| Tip and exposed site geometry | Unreported in reviewed sources |
| Contact coating | Unreported in reviewed sources |
| Insulation | Unreported in reviewed sources |
| Insertion method | Mote mounted with a nerve cuff in acute animals [1] |
| Anchoring and fixation | Unreported in reviewed sources |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in reviewed sources |
| Electrode material | Unreported in reviewed sources |
| Impedance (with measurement frequency) | Unreported in reviewed sources |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | Not a neural recording device [1] |
| Sampling rate | Unreported in reviewed sources |
| Stimulation capability | Current-controlled stimulation; parameters set on the fly by downlink timing [1] |
| Charge injection limit | Not stated as a limit; supplement Table S2 shows modeled peak discharge current can exceed commanded current [2] |
| Reference and ground | Unreported in reviewed sources |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Peripheral nerve [1] |
| Insertion trauma and BBB disruption | Unreported in reviewed sources |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Rare erroneous decoding of ultrasound state changes; 5 pulses with wrong duration excluded (1 animal C, 4 animal F); 26 timing-aberrant pulses of 1,076 omitted in material plots; preprint reports tissue discoloration after an erroneously long pulse [2, 3, 5] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Piezoceramic transducer, energy-storage capacitor and integrated circuit [1] |
| Data path | Ultrasound downlink timing encodes parameters; uplink backscatter reports whether stimulation occurs [1] |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Battery-free; ultrasound harvested by the transducer [1] |
| Thermal management | Figure 5 compares at 7.8% of diagnostic-ultrasound intensity; not blanket authorization for chronic exposure [1] |
| Packaging and hermeticity | Hermetic package qualification not established [1] |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Unreported in reviewed sources |
| Output connectors | Unreported in reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Unreported in reviewed sources |
| Stability over time | Unreported in reviewed sources |
| Longevity | No chronic implanted lifetime established [1] |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Unreported in reviewed sources |
| Notable demonstrations | 55 mm link through ex-vivo porcine tissue (Figure 4), not an in-vivo depth [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Acute rat; animals C and F named in exclusions [2, 3] |
| Follow-up duration | Unreported in reviewed sources |
| Indications | Unreported in reviewed sources |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Acute sciatic stimulation; link benchmarks kept separate from physiology [1] |
| Key limitations | Main full text not accessible in this pass; no chronic lifetime, hermetic qualification or clinical efficacy [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Leadless, battery-free, 1.7 mm³ [1] |
| Limitations | Depends on acoustic path, power, orientation and cuff behavior; passive charge balance is not zero transient current [1, 2] |
| Scaling constraints | Unreported in reviewed sources |

## Published system

Downlink timing encodes stimulation parameters on the fly rather than storing a full protocol in mote memory. The circuit harvests ultrasonic energy, decodes commands and produces current-controlled stimulation. Uplink backscatter indicates whether stimulation occurs.

The animal configuration mounts the mote with a sciatic-nerve cuff. The reported 1.7-mm³ volume is not the volume of the cuff, external transducer or a complete implanted system. This entry does not derive a rectangular envelope or electrode map from volume alone.

Figure 4's 55-mm link is through ex-vivo porcine tissue, not an in-vivo rat implant depth. Figure 5's 7.8% diagnostic-ultrasound intensity comparison is a measured test condition, not blanket authorization for chronic neural exposure.

## Version boundary

Earlier StimDust reports use 6.5-mm³ or 2.2-mm³ descriptions. Those prototype versions are not averaged into the 2020 paper's 1.7-mm³ result or treated as a source conflict over one identical device. The 2018 preprint record now links an updated manuscript; its initial date alone does not prove every displayed configuration existed in that first version.

## Reliability and stimulation limits

The published reporting summary records rare erroneous decoding in identifying changes of ultrasound state. In-vivo recruitment analyses excluded five pulses with wrong stimulation duration: one in animal C and four in animal F. Material-characterization plots omitted 26 timing-aberrant pulses among 1,076. These are separate experiments, not one universal failure rate.

The supplement's charge-balance analysis uses fitted circuit simulations as well as empirical electrode measurements. Table S2 shows that modeled peak discharge current can exceed the commanded stimulation current. Passive charge balance is not evidence of zero transient current or automatic safety as electrode area shrinks.

The updated preprint also reports tissue discoloration following an erroneously long pulse in an animal experiment. That safety signal is attributed to the preprint; the accessible published reporting summary confirms timing errors but does not describe that injury.

No chronic implanted lifetime, hermetic-package qualification or clinical efficacy is established here. The external acoustic path, available power, orientation, cuff/electrode behavior and waveform details matter.

## Model boundary

No full model is supplied. The fetched published abstract and supplements do not supply a complete assembled CAD/contact map. An earlier preprint's dimensions are not silently promoted to a fabrication-ready published model.

## References

1. [Published primary article](https://www.nature.com/articles/s41551-020-0518-9),February19,2020. Public abstract and figure titles were accessible; the main full text was not.
2. [Published supplement](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-020-0518-9/MediaObjects/41551_2020_518_MOESM1_ESM.pdf),including recruitment,charge balance and controls.
3. [Published reporting summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-020-0518-9/MediaObjects/41551_2020_518_MOESM2_ESM.pdf),including sample scope and exclusions.
4. [Muller lab publication list](https://www.rikkymuller.com/publications),which links the paper and separate earlier StimDust report.
5. [Earlier/updated preprint record](https://arxiv.org/abs/1807.07590).
