---
title: "Magnetoelectric network: acute pig spinal stimulation, 2025"
order: 116
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0037"
interface_class: "scs"
status: "preclinical"
last_updated: 2026-10-07
description: "Two acute minipig experiments with two then four individually addressed wireless IPGs and epidural leads. Selective muscle recruitment, placement-dependent thresholds and command-induced EMG noise are kept separate from rehabilitation."
modality: "Other"
website: "https://www.nature.com/articles/s41551-025-01489-3"
devices: ["115-magnetoelectric-network-spinal-stimulators-2025"]
tags: ["magnetoelectric", "pig", "epidural", "spinal cord", "acute", "preclinical"]
draft: false
---

# Wireless spinal network in pigs

The 2025 paper tests [magnetoelectric spinal IPGs](/devices/115-magnetoelectric-network-spinal-stimulators-2025/) in two acute experiments with female Yucatan minipigs, both 3 months old, weighing 20.6 and 21 kg. This is stimulation-induced muscle recruitment under anesthesia, not restored independent walking or a clinical pain-treatment result.

## Surgery and node count

After an L6 laminectomy, commercial Infinion 16-contact leads were placed in the dorsal epidural space between L4/L5 and sutured. Each wireless IPG connected to a pair of contacts and sat in a subcutaneous pocket. The first pig received two devices; the second received four. The incision accommodated only up to four of the six bench devices.

Six fabricated IPGs, 12 LED nodes and six-film power tests are separate experiments. They do not enlarge this animal network or cohort.

## Stimulation response

The first experiment used 5-V pulses and showed selective proximal/distal muscle activation with sequential commands and combined activation with synchronous commands. The second used 13.75 V on four nodes and produced distinguishable activity patterns across recorded hindlimb muscles. The authors used wavelet decomposition and principal-component analysis to distinguish four response clusters.

Thresholds were much higher in the second experiment. The paper attributes this to factors such as lead-to-spinal-cord distance, not proof that every placement will recruit the same motor pools at 5 V. IPG programmability and voltage compliance help accommodate this variation; they do not remove it.

## Measurements and artifacts

The system recorded external EMG. Figure 3's high-frequency signals before stimulation are noise induced when the transmitter turns on/off to encode commands. Three repeated trials and their mean are plotted for each response; these are not three pigs per condition. The lead/contact count is not a sorted-neuron count.

## Follow-up boundary

These acute experiments do not supply a chronic implanted survival curve, human benefit or long-term vascular/epidural safety. The cardiac pacing experiments are a distinct configuration and cohort, not extra spinal outcomes. Distributed sensing, neural uplink and real-time closed-loop algorithms remain future work.

## Primary sources

- [Published primary paper](https://www.nature.com/articles/s41551-025-01489-3).
- [Full primary manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC12557647/),Figure3,spinal Results and acute spinal Methods.
