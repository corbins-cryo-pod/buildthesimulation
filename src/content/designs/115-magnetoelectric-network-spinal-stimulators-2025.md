---
title: "Magnetoelectric network spinal stimulators, 2025"
order: 115
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0072"
interface_class: "scs"
status: "preclinical"
last_updated: 2026-10-07
description: "2025 network's spinal configuration: roughly 1-cm³ wireless battery-free IPGs, one electrode pair per node, six bench devices and up to four in acute pigs. LED/power/pacing demonstrations are not merged into that cohort."
modality: "Other"
website: "https://www.nature.com/articles/s41551-025-01489-3"
tags: ["magnetoelectric", "network", "spinal cord", "Rice", "Houston Methodist", "stimulation", "preclinical"]
draft: false
---

# Distributed magnetoelectric spinal stimulators

The August 28, 2025 published paper reports a platform with several distinct demonstrations: power-transfer measurements, an LED-addressing network, spinal stimulation and cardiac pacing. This device record covers its spinal implantable pulse generators (IPGs), not every configuration under one geometry. The [acute pig application](/applications/116-magnetoelectric-network-pig-spinal-stimulation-2025/) keeps the animal results separate.

This uses off-the-shelf circuitry and an ME laminate. It is not the 2022 ME-BIT ASIC/endovascular package.

The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) links this work to source-grounded faculty and laboratory context.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Distributed magnetoelectric spinal implantable pulse generators (IPGs), 2025 [1] |
| Manufacturer | Academic research device; Rice University Robinson lab context [1, 3] |
| Interface class | Wireless battery-free spinal stimulation nodes on percutaneous SCS leads |
| Origin | Published paper, August 28, 2025 [1] |
| First demonstrated | August 28, 2025 [1] |
| First human implant | None |
| Species studied | Pig (acute spinal stimulation, two then four devices) [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation; downlink only, no neural-recording uplink [1] |
| Target tissue | Spinal cord [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Commercial percutaneous SCS lead per node [1] |
| Array layout | Network of addressed nodes; one contact pair per node [1] |
| Electrode count | One pair on a commercial lead per node; six devices built for bench, two then four implanted [1] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness | Packaged IPG about 1 × 1 × 1 cm per node; ME film 7.5 × 3 mm [1] |
| Tip and exposed site geometry | Adjacent stainless-steel cylinders, 1.33 mm diameter, 3 mm length [1] |
| Contact coating | Stainless-steel cylinders [1] |
| Insulation | 3D-printed box and epoxy; temporary, not proven chronic hermetic [1] |
| Insertion method |  |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material | Stainless steel [1] |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | Voltage-controlled, 250 µs pulses, up to 14.5 V [1] |
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
| Onboard electronics | Rectification, storage capacitance, programmable boost converter, microcontroller, output switch [1] |
| Data path | On-off-keying downlink up to 4 kbps from a shared transmitter; 3-bit node ID, up to eight IDs [1] |
| Telemetry bandwidth | Up to 4 kbps downlink [1] |
| Sampling rate |  |
| Power | Battery-free implants; ME film 267 µm PZT between two 25 µm Metglas layers, 220 kHz; six-film summed efficiency 0.22% to 1.3%, 2.2 mW per node at 1 cm; bench transmitter demand 7 W [1] |
| Thermal management | Low efficiency burdens transmitter; thermal and exposure management needed [1] |
| Packaging and hermeticity | Temporary epoxy box; PZT needs a barrier; 30-day glass-encapsulated prior work is not this network's result [1] |
| MRI compatibility |  |
| Surgical complexity |  |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield | About 80% of laser-cut films passed the open-circuit-voltage criterion; not a fabrication yield guarantee [1] |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | 12-node LED demonstration and six-film power experiment are not implanted nodes; simulated 50-film network at 7.1% is simulation only [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Acute pig experiments with two then four devices [1] |
| Follow-up duration |  |
| Indications |  |
| Trials and registries |  |
| Primary outcomes | Spinal stimulation and cardiac pacing demonstrations; spinal arm only is this record [1] |
| Key limitations | Lead placement changed thresholds between animals; no recording uplink or closed loop [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Off-the-shelf circuitry, addressable multi-node network [1] |
| Limitations | Low power-transfer efficiency; external transmitter still needs power [1] |
| Scaling constraints | Close-film coupling depends on position and orientation [1] |

## Spinal configuration

| Feature | Published spinal configuration |
| --- | --- |
| Packaged IPG | Approximately 1 × 1 × 1 cm per node |
| Components | Rectification, storage capacitance, programmable boost converter, microcontroller and output switch |
| ME platform films | 7.5 × 3-mm laminates;267-µm PZT between two 25-µm Metglas layers;220-kHz resonance |
| Stimulation | Voltage-controlled, 250-µs pulses, up to 14.5 V |
| Addressing | 3-bit node ID, up to eight IDs; six devices built for bench demonstration |
| Lead contacts per node | One pair on a commercial percutaneous SCS lead |
| Contact geometry | Adjacent stainless-steel cylinders, 1.33-mm diameter, 3-mm length |
| Temporary enclosure | 3D-printed box and epoxy, not proven chronic hermetic packaging |

Only two then four devices were placed in the two animal experiments. The paper's six-device bench trace, 12-node LED demonstration and six-film power experiment are not six or 12 implanted spinal nodes.

## Power and communication boundaries

The shared transmitter broadcasts commands; only the addressed node changes settings. Communication uses on-off keying with downlink rates up to 4 kbps. This paper does not demonstrate a high-bandwidth neural-recording uplink or a distributed closed-loop decoder.

The platform's six-film measurement increases summed system efficiency from 0.22% to 1.3%, with 2.2 mW per node at 1 cm. That is summed receiver power divided by transmitter power, not improvement in each receiver's individual efficiency or the pig spinal implant power.

The 12-node LED example is visualization of programmed outputs. A simulated 50-film network and 7.1% efficiency are simulation, not a fabricated animal network. Close-film coupling also depends on position and orientation; approximately 80% of laser-cut films passed the stated open-circuit-voltage criterion, not a guaranteed fabrication yield.

## Limits

Low power-transfer efficiency still burdens the external transmitter and requires thermal/exposure management. The spinal bench setup's 7-W transmitter demand partly reflects off-the-shelf inrush current. A battery-free implant does not make the external transmitter battery-free.

Lead placement changed activation thresholds between animal experiments. Lead-containing PZT needs a barrier against tissue/biofluid exposure. Prior 30-day glass-encapsulated work cited by the paper is not a 30-day survival result for this temporary epoxy-packaged spinal network.

## Model boundary

No full model is supplied. The approximately 1-cm enclosure and contact dimensions do not recover PCB placement, film placement, wire routing, lead spacing or an exact assembly drawing.

## References

1. [Published2025 paper](https://www.nature.com/articles/s41551-025-01489-3).
2. [Full primary manuscript archive](https://pmc.ncbi.nlm.nih.gov/articles/PMC12557647/),Figure3 and spinal Methods.
3. [Rice institutional report](https://news.rice.edu/news/2025/wireless-implant-network-could-transform-cardiac-neurological-care),used only as program context,not additional animal data.
