---
title: "Neural dust (ultrasonic backscatter mote)"
order: 22
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0001"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Ultrasonic recording mote: primary2016 assemblies about0.8×3×1mm, one differential channel, 1.85-MHz interrogation and10-kHz reconstructed signals. Rat nerve/muscle evidence; separate1-mm-cube institutional claim."
modality: "Peripheral nerve"
successRank: 22
website: "https://www.cell.com/neuron/fulltext/S0896-6273%2816%2930344-0"
tags: ["wireless", "ultrasound", "backscatter", "battery-free", "peripheral nerve", "EMG", "ENG", "Berkeley", "academic", "preclinical"]
draft: false
---

# Neural dust (ultrasonic backscatter mote)

A battery-free recording mote powered and interrogated by ultrasound. The 2016 paper demonstrates peripheral nerve and muscle signals in anesthetized rats, not a chronic brain implant. The implanted mote contains a piezocrystal, a transistor and a pair of recording contacts; an external transceiver supplies the acoustic link.

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

## Primary sources

- Seo D et al. [Wireless Recording in the Peripheral Nervous System with Ultrasonic Neural Dust, full primary paper](https://www.cell.com/neuron/fulltext/S0896-6273%2816%2930344-0), 2016.
- Berkeley News. [Institutional report and separate miniaturization claim](https://news.berkeley.edu/2016/08/03/sprinkling-of-neural-dust-opens-door-to-electroceuticals/), 3 August 2016.
