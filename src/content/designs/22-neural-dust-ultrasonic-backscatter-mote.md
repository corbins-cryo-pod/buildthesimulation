---
title: "Neural dust (ultrasonic backscatter mote)"
order: 22
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0001"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Ultrasonic recording mote: primary 2016 assemblies about 0.8 × 3 × 1 mm, one differential channel, 1.85-MHz interrogation and 10-kHz reconstructed signals. Rat nerve/muscle evidence; separate 1-mm-cube institutional claim."
modality: "Peripheral nerve"
successRank: 22
website: "https://www.cell.com/neuron/fulltext/S0896-6273%2816%2930344-0"
tags: ["wireless", "ultrasound", "backscatter", "battery-free", "peripheral nerve", "EMG", "ENG", "Berkeley", "academic", "preclinical"]
draft: false
---

# Neural dust (ultrasonic backscatter mote)

All rows follow the shared implant-device template. Measurements belong to the named configuration or experiment. A blank cell means the reviewed sources do not establish a value; acute recordings, radio activation and later stimulation hardware are not treated as equivalent.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Seo 2016 ultrasonic neural dust recording mote |
| Manufacturer | University of California, Berkeley research fabrication |
| Interface class | Peripheral nerve/muscle surface recording interface |
| Origin | Seo, Neely, Shen and colleagues, UC Berkeley |
| First demonstrated | 2016 in vivo recording study; 2013 concept cited by paper is not the same hardware demonstration |
| First human implant | Rat study |
| Species studied | Adult Long-Evans rats under anesthesia |
| Regulatory status | Preclinical research; comparison to diagnostic ultrasound limits is not device clearance |
| Function | One differential channel, ultrasonic powering and analog backscatter recording |
| Target tissue | Sciatic nerve epineurium and gastrocnemius muscle |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Surface recording mote, no penetrating recording shank |
| Array layout | Two bottom PCB pads per mote; piezocrystal and transistor on top |
| Electrode count | Two physical pads form one differential recording channel |
| Pitch | 1.8 mm pad separation, not regular-array pitch |
| Electrode lengths | No penetrating shank; assembled mote approximately 3 mm long |
| Shank width and thickness | No shank. Assembly approximately 0.8 x 3 x 1 mm; PCB 50 µm polyimide, crystal 0.75 mm cube, transistor die 0.5 x 0.45 mm |
| Tip and exposed site geometry | Two exposed gold pads, each 0.2 x 0.2 mm |
| Contact coating | Exposed gold recording pads |
| Insulation | Polyimide PCB and medical-grade UV-curable epoxy protecting assembly/wirebonds |
| Insertion method | Surgical exposure, surface placement on muscle or nerve; muscle wound closed after placement |
| Anchoring and fixation | Nerve mote sutured to nerve with contacts on epineurium; exact long-term fixation not established |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 0.04 mm² nominal planar area per 0.2 x 0.2 mm pad, calculated from paper dimensions; not electrochemical effective area |
| Electrode material | Gold pads; aluminum wirebonds and gold interconnect traces are separate components |
| Impedance (with measurement frequency) | Electrode impedance not reported here; water acoustic impedance is not electrode impedance |
| Noise floor or SNR | 180 µV RMS in water tank. Minimum detected biological response approximately 0.25 mV; measurements not interchangeable |
| Recording modality | Evoked ENG from epineurium and EMG from muscle surface |
| Sampling rate | 10 kHz reconstructed wireless waveforms; wired comparison 100 kHz |
| Stimulation capability | None integrated in recording mote; separate hook/foot electrodes produce evoked signals. StimDust is different hardware |
| Charge injection limit | Not applicable to recording-only mote; electrode stimulation rating not reported |
| Reference and ground | Differential tissue sensing between two pads. Backscatter from nonresponsive interfaces separately normalizes acoustic artifacts; not electrical ground |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Peripheral nerve epineurium and muscle surface |
| Insertion trauma and BBB disruption | BBB not applicable; surgical exposure and fixation still required |
| Vascular disruption risk |  |
| Micromotion sensitivity | Water-tank test: 0.7 mm lateral misalignment doubled noise floor in five devices. Beam alignment is a measured link limitation, not chronic tissue-motion tolerance |
| Gliosis and encapsulation | Peripheral, not CNS gliosis; chronic tissue encapsulation not reported |
| Neuron loss near sites |  |
| Foreign-body response mitigation | Small wireless package avoids required data cable; epoxy insulation does not prove chronic biocompatibility |
| Typical failure modes | Acoustic misalignment degrades signal quality; chronic hardware/tissue failure rate not reported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Piezocrystal and custom transistor; tissue voltage modulates load/backscatter, no implanted ADC |
| Data path | External ultrasound transceiver receives backscatter, filters/rectifies and reconstructs waveform |
| Telemetry bandwidth | 1.85 MHz acoustic carrier; six 540 ns pulses each 100 µs. Carrier is not neural payload bit rate |
| Sampling rate | 10 kHz reconstructed waveform |
| Power | Battery-free acoustic harvesting; approximately 25% acoustic-to-electrical load conversion on axis in tank. External system supplies ultrasound |
| Thermal management | Measured MI 0.01, derated ISPPA 6.37 mW/cm² and ISPTA 0.21 mW/cm² at reported 5 V peak-to-peak drive. Temperature rise not reported; comparison to limits is not safety approval |
| Packaging and hermeticity | Epoxy-protected polyimide assembly; multi-year hermetic qualification not reported |
| MRI compatibility |  |
| Surgical complexity | Peripheral exposure/placement plus alignment/coupling of external transducer approximately 8.9 mm from implant |
| Output connectors | No required wired implant output; optional 0.35 mm wide, 25 mm long test lead used for ground-truth/voltage measurements |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Functional rat responses; numerical assembled-device pass rate not reported |
| Chronic yield | Not established by acute anesthetized experiments |
| Stability over time | No appreciable EMG quality degradation after 30 min; t=0 versus 30 min waveform correlation R=0.901 in Figure 4, not chronic lifetime |
| Longevity | Acute recording observation; maximum service life not reported |
| Revision and explant experience |  |
| Adverse events | No quantitative chronic/clinical adverse-event series |
| Notable demonstrations | At saturating evoked stimulation: EMG wireless/wired R=0.795 with differences within ±0.4 mV; ENG R=0.886, differences within ±0.2 mV. Protocol-specific |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None in reviewed study |
| Preclinical cohort | EMG and ENG recruitment plots each report uncertainty from two rats and ten samples per stimulation amplitude; unique total across experiments not established. Five devices in tank alignment test |
| Follow-up duration | Acute anesthetized study, with 30 min comparison; no chronic cohort |
| Indications | Experimental peripheral recording; future bioelectronic medicine/BCI applications are goals |
| Trials and registries | Human registry not applicable to reported rat study |
| Primary outcomes | Wireless reconstruction of evoked nerve/muscle waveforms, link efficiency and alignment sensitivity |
| Key limitations | Single-mote peripheral experiment does not establish deep-brain or many-node operation. Primary assembly and institutional 1 mm cube miniaturization claim kept separate |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Wireless battery-free power/data link and acute biological waveform reconstruction |
| Limitations | Approximately 180 µV tank noise, alignment-sensitive acoustic link and unknown chronic package/tissue behavior |
| Scaling constraints | Smaller packaging and beam-steering/network operation require separate demonstrations; bone/gas propagation cannot be assumed equivalent to peripheral path |

## Core interface specifications

The 12 fields follow the Blackrock Utah table for comparison, not a manufacturer-issued datasheet. Missing values stay blank; inapplicable fields are marked. Configuration-specific details and limits follow below.

| Field | Specification and source scope |
| --- | --- |
| Electrode Pitch | Not a regular array pitch; two recording pads separated by 1.8 mm |
| Channel Count | One differential recording channel per mote; two contacts are not two channels |
| Output Connectors | No implanted wired output connector in the untethered configuration; ultrasonic backscatter to external transceiver |
| Output Conn. dimensions L x W x H | Not applicable to implanted output connector; external transceiver connector dimensions not catalogued |
| Standard Electrode Lengths | Not applicable: no penetrating recording shank in the 2016 peripheral mote |
| Impedance | Electrode impedance not assigned from reviewed source; 180 µV RMS is water-tank noise, not impedance |
| Array Dimensions | Not a planar electrode array; assembled mote approximately 0.8 × 3 × 1 mm, two 0.2 × 0.2 mm pads |
| Multi-Port Options | Not applicable as a manufacturer multi-port option; no network capacity assigned to this single-mote demonstration |
| Metalization | Exposed gold recording pads; gold traces and aluminum wirebonds are separate interconnect components |
| Wire Bundle Length | No implant-to-hub bundle. Optional test lead 0.35 mm wide, 25 mm long, not a required wireless connection |
| Reference and Ground | Differential sensing between two gold pads; no separate implanted ground/reference wire specified here |
| Insulation | 50 µm polyimide PCB with medical-grade UV-curable epoxy protection; not a demonstrated multi-year hermetic lifetime |

## Identity and configuration

| Property | Published configuration |
| --- | --- |
| Primary authors | Dongjin Seo, Ryan Neely, Konlin Shen and colleagues |
| Institution | University of California, Berkeley |
| Primary paper | Neuron, 2016 |
| Function | One differential recording channel per mote |
| Biological targets | Sciatic nerve ENG and gastrocnemius muscle EMG in rats |
| Power/data mechanism | Ultrasonic energy and analog backscatter modulation |
| Stimulation | Not an integrated stimulator in this recording mote; [StimDust](/devices/111-stimdust-ultrasonic-nerve-stimulator/) is separate hardware |

## Geometry and contacts

| Property | Primary paper specification |
| --- | --- |
| Assembled mote | Approximately 0.8 × 3 × 1 mm |
| Flexible PCB | 50-µm polyimide |
| Piezocrystal | 0.75 × 0.75 × 0.75 mm |
| Custom transistor die | 0.5 × 0.45 mm |
| Tissue contacts | Two exposed gold pads, each 0.2 × 0.2 mm |
| Contact separation | 1.8 mm |
| Interconnect | Aluminum wirebonds, gold traces and microvias |
| Encapsulation | Medical-grade UV-curable epoxy |
| Optional test lead | 0.35 mm wide and 25 mm long; not a required wireless link |

Berkeley's institutional article says the team had already reduced sensors to a 1-mm cube. The primary paper's presented assemblies are about 0.8 × 3 × 1 mm and discuss approximately 1-mm³ future assemblies enabled by different packaging. Those scopes are not collapsed into a single demonstrated implant geometry. Epoxy protection does not establish a multi-year hermetic package.

## Electrical and system specifications

| Property | Published specification and condition |
| --- | --- |
| Carrier | 1.85 MHz in the reported pulse sequence |
| Interrogation | Six 540-ns pulses every 100 µs |
| Reconstructed waveform sampling | 10 kHz |
| Table noise floor | 180 µV RMS, measured in a water tank |
| Minimum detected ENG/EMG signal | Approximately 0.25 mV in the described rat experiments |
| Energy store/battery | No implanted battery |
| External system | Ultrasound transducer, transmit/receive electronics, digitization and reconstruction |
| Signal path | Tissue voltage changes transistor load and reflected acoustic amplitude |

The input signal is recovered from backscatter, not a neural-data radio transmitter inside the mote. The paper's water-tank noise and biological detection threshold are different measurements. ADC figures on the external reconstruction equipment are not an implanted digital-recording chip specification.

## Tissue interface and reliability

The mote is placed on the nerve or muscle in the described experiments. Acoustic coupling, alignment and propagation path matter. Bone and gas can obstruct the link, so peripheral demonstrations cannot be silently generalized to every deep-brain location.

Chronic implanted lifetime, long-term package stability and human tissue response are not established by the cited work. Institutional discussion of thin-film encapsulation intended to last years is development intent, not an observed decade of operation.

## Evidence and regulatory boundary

The study demonstrates rat peripheral ENG and EMG recordings, with wired measurements used for comparison. Wireless EMG reconstruction was sampled at 10 kHz while the wired comparison was at 100 kHz. Correlation and errors are reported for particular stimulation/recording protocols, not universal mote accuracy.

The mote senses evoked biological signals; that does not mean it generates the stimulation used in the experiment. No chronic brain recording, implanted human use or regulatory clearance is established here. The related [Neurograins network](/devices/25-neurograins-wireless-microimplant-network/) uses RF instead of ultrasound and is not a later version of this circuit.

## Model and missing specifications

No full model is supplied. Component boxes do not fix the contact exposure, piezocrystal orientation, film outline, wirebond loops or acoustic pose. Missing chronic and clinical specifications remain unknown.

## References

### Primary sources

- Seo D et al. [Wireless Recording in the Peripheral Nervous System with Ultrasonic Neural Dust, full primary paper](https://www.cell.com/neuron/fulltext/S0896-6273%2816%2930344-0), 2016.
- Berkeley News. [Institutional report and separate miniaturization claim](https://news.berkeley.edu/2016/08/03/sprinkling-of-neural-dust-opens-door-to-electroceuticals/), 3 August 2016.
