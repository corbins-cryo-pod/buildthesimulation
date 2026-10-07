---
title: "Neurograins (wireless microimplant network)"
order: 25
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0004"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
description: "Distributed RF-powered neurograins: 650 × 650 × 250 µm chiplets, 1-kHz/8-bit recording, 48-node acute rat ensemble. Clear low-noise recordings came from a fraction of those channels; 770 is a projected network capacity."
modality: "Cortical surface"
successRank: 25
website: "https://doi.org/10.1038/s41928-021-00631-8"
tags: ["wireless", "distributed", "microimplant", "network", "Brown", "Nurmikko", "academic", "preclinical", "bidirectional"]
draft: false
---

# Neurograins (wireless microimplant network)

Distributed, individually addressed silicon microchips powered by an external RF system. The 2021 work demonstrates an acute rat cortical recording ensemble and a separate stimulation-chip configuration. Recording, stimulation and networking test chips share RF circuitry, but are not a single universally dual-function implant.

## Identity and configuration

| Property | Published configuration |
| --- | --- |
| Primary authors | Jihun Lee, Vincent Leung, Ah-Hyoung Lee and colleagues; senior author Arto Nurmikko |
| Institutions | Brown University, Baylor University, UC San Diego and Qualcomm |
| Primary paper | Nature Electronics 4:604-614, 2021 |
| Recording interface | Differential signal between two on-chip gold electrodes on the cortical surface |
| Stimulation interface | Separate current-source chips, with post-process tungsten microwires for intracortical access |
| Power | Battery-free RF harvesting from an external hub through a relay coil |
| Data | Backscatter uplink; individual chip addresses and TDMA networking |
| Animal evidence | Acute anesthetized rat cortical experiments |

## Geometry and contacts

| Property | Published specification and scope |
| --- | --- |
| Chiplet envelope | 650 × 650 × 250 µm in Figure 1 |
| Diced die footprint | Nominal 650 × 650 µm, including 75 µm between chip edge and coil for the seal ring, Supplementary Figure 1 |
| Stimulating ASIC image | 500 × 500 µm outer dimensions in Figure 2; not interchangeable with the Figure 1 package envelope |
| On-chip RF coil | Three turns; occupies 30% of a 500 × 500 µm footprint, Supplementary Figure 1 |
| Recording contacts | Two gold electrodes; no contact-area or pitch value assigned here |
| Intracortical access | Optional post-process microwire; its placement is not represented by the package box |
| Experimental assembly | Recording chips encapsulated in PDMS with a relay coil on a polyimide board, Figure 4 |
| External hub | Software-defined radio, power amplifier and duplexer on the benchtop; head-mounted coil components in vivo |

The institutional report describes a thumbprint-size scalp patch. The primary figures show the larger supporting RF electronics separately. Patch dimensions are not the size or weight of the complete experimental acquisition system. The supplement discusses approximately 0.1 mm³ chips and an earlier approximately 0.01 mm³ thinning/ALD-packaging result; the smaller number is not substituted for the demonstrated Figure 1 envelope.

## Electrical and system specifications

| Property | Published specification and condition |
| --- | --- |
| Carrier | Approximately 1 GHz; 915 MHz selected in the supplement's RF design discussion |
| Recording sample rate | 1 kHz per recording chip, Supplementary TDMA design |
| ADC resolution | 8 bits |
| Neural payload | 8 kbit/s per recording chip; 100 samples buffered as 800 bits per 100 ms |
| Uplink | BPSK backscatter; 10 Mbit/s communication rate in the packet-budget analysis, not a per-chip neural sample rate |
| Recording packet | Supplementary Figure 1 lists 32 LFSR test bits, 20 PUF-address bits and 800 ADC bits; TDMA analysis separately budgets address plus neural payload |
| Chip power budget | Less than 30 µW per chip in the supplement; not the external transmitter power |
| Stimulation waveform | Biphasic; Figure 2 shows 100, 200 and 400 µs per phase into a 20 kΩ load |
| Tissue stimulation | Up to 25 µA from each device in the Figure 4 protocol |
| Recording noise/impedance | No universal RMS noise or electrode impedance assigned from the reviewed source text |

The packet-content example includes test overhead while the TDMA capacity calculation treats an optimized payload. These are distinct accounting scopes, not evidence that every reported packet contains exactly the same bits. Do not equate the high-speed uplink with broadband single-neuron recording: the demonstrated recording chip samples at 1 kHz.

## Tissue interface and reliability

The recording chips measure epicortical ECoG; stimulation can penetrate using added tungsten wires. In Supplementary Figure 10, the authors say clear low-noise activity typically came from a fraction of the 48 channels, with 12 illustrated. Other channels had higher noise associated with tissue contact, cortical activity and practical ensemble placement. A 48-chip ensemble is not a claim of 48 equally usable simultaneous neural channels.

PDMS placement in the acute experiment and discussion of conformal hermetic ALD packaging do not establish multi-year implanted reliability. Chronic human tissue response and a clinical service life remain unknown for this 2021 configuration.

## Evidence and regulatory boundary

| Demonstration or estimate | Scope |
| --- | --- |
| 48 chips | Individually addressed acute rat cortical recording ensemble; channel-quality limitation retained above |
| 64 autonomous TDMA chips | Benchtop networking test within a 20.4 × 20.4 mm relay coil and 8 mm Tx-to-relay separation in air |
| 32 call-and-response chips | Separate benchtop networking test in Figure 3 |
| 69 chips | Two adjacent relay coils, Figure 5 power/network-area demonstration; not 69 recorded brain sites |
| 425 / 588 / 770 nodes | Supplementary call-and-response timing estimates: current exploratory timing, reduced gap without circuit changes, and more efficient packet/timeslot design respectively |
| Primate coil model | Proposed 8 mm link with 4 mm skin and 4 mm skull; not an implanted primate recording study |
| Rodent coil model | Targets 5 mm separation with 2.5 mm skin and 2.5 mm skull in the modeled link |

The abstract's potential 770-node scale is a calculation supported by link measurements, not a 770-device animal implant. SAR simulation and comparison with RF-exposure standards do not grant regulatory clearance. No implanted human use or cleared clinical neurograin system is established by these sources.

## Later stimulation branch

The same group's [2024 patterned-stimulation paper](https://www.nature.com/articles/s41467-024-54542-1) describes a later, remotely programmable microstimulator class with a new collision-free register-mapping downlink. It reports 30 stimulators implanted in a freely moving rat for three months. It uses 300, 400 and 500 µm die designs, mainly 500 µm chips in animal work, and up to 120 µA peak-to-peak stimulation.

That is later stimulation-only hardware, not an upgrade proving chronic operation of the 2021 recording ASIC. Its implanted population, current convention and packaging must not overwrite the 2021 sheet or its model. It is discussed here as a later branch, not silently counted as the same device or presented as a complete combined recording/stimulation generation.

## Model and missing specifications

The linked model is one 650 × 650 × 250 µm package envelope from Figure 1. It does not reconstruct contact pads, internal coil, optional microwires, relay coil or network layout. Zero exported model sites means contact coordinates were not reconstructed, not that the physical chip has no electrodes.

Contact area and spacing, full packaged electrode geometry, standardized chronic noise/impedance, complete external-system mass and clinical lifetime are not supplied here. The 2024 branch is not modeled by this 2021 cuboid.

## Primary sources

- Lee J et al. [Neural recording and stimulation using wireless networks of microimplants](https://www.nature.com/articles/s41928-021-00631-8), Nature Electronics, 2021. Abstract and Figures [1](https://www.nature.com/articles/s41928-021-00631-8/figures/1), [2](https://www.nature.com/articles/s41928-021-00631-8/figures/2), [3](https://www.nature.com/articles/s41928-021-00631-8/figures/3), [4](https://www.nature.com/articles/s41928-021-00631-8/figures/4), [5](https://www.nature.com/articles/s41928-021-00631-8/figures/5).
- Lee J et al. [2021 Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-021-00631-8/MediaObjects/41928_2021_631_MOESM1_ESM.pdf), circuit variants, TDMA budget, chip power, recording-channel limitations and link models. The main article body is access-restricted; the figures and full supplement were reviewed directly.
- Brown University. [Institutional report](https://www.brown.edu/news/2021-08-12/neurograins), 12 August 2021.
- Lee AH et al. [Patterned electrical brain stimulation by a wireless network of implantable microdevices](https://www.nature.com/articles/s41467-024-54542-1), Nature Communications, 2024. Separate later stimulation branch.
