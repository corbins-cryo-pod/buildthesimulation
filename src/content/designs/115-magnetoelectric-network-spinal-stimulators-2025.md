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

## Primary sources

- [Published2025 paper](https://www.nature.com/articles/s41551-025-01489-3).
- [Full primary manuscript archive](https://pmc.ncbi.nlm.nih.gov/articles/PMC12557647/),Figure3 and spinal Methods.
- [Rice institutional report](https://news.rice.edu/news/2025/wireless-implant-network-could-transform-cardiac-neurological-care),used only as program context,not additional animal data.
