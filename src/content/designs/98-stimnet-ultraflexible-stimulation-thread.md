---
title: "StimNET ultraflexible stimulation thread"
order: 98
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0063"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Rice's 2023 32-contact polyimide stimulation/recording thread: 1 µm shank, reinforced sputtered-iridium-oxide contacts and separate bench and chronic mouse stimulation evidence."
modality: "Intracortical"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10592461/"
tags: ["StimNET", "NET", "Rice", "polyimide", "iridium oxide", "stimulation", "recording", "preclinical"]
draft: false
---

# StimNET stimulation and recording thread

The 2023 Cell Reports paper from Rice University reports a stimulation-specific successor to [recording NET probes](/devices/27-nanoelectronic-thread-net-probes/). Its material and contact changes justify a separate hardware entry; chronic stimulation results are not assigned backward to the 2017 recording design.

## Published structure

| Feature | Reported configuration |
| --- | --- |
| Addressed contacts | 32, for recording and stimulation |
| Shank thickness | 1 µm, plus 0.3 µm at the cap ring |
| Width | Tapers from 100 to 36 µm |
| Functional implant length | 1,800 µm |
| Contact diameter / center spacing | 24 µm / 60 µm |
| Delivery shuttle | Temporary sharpened 50 µm tungsten wire, attached with PEG |

Polyimide replaces the original NET's SU-8 substrate. Offset vias and contacts address potential cracks, while a polyimide cap ring reinforces each contact against delamination. Methods describe a Ti/Pt/Ti/300 nm sputtered iridium-oxide contact stack on the patterned device, with separate gold interconnects. This is not bare gold used as an interchangeable stimulation surface.

## Charge injection and bench durability

Saline characterization reported charge-injection capacity of 1.1 mC/cm² and tested currents up to 50 µA within the reported electrochemical water window. These measurements depend on waveform, reference and test conditions; they are not universal safe currents in neural tissue.

The bench pulsing test used 30 µA, charge-balanced biphasic pulses at 500 Hz for 50 million pulses. The methods give 100 µs pulse width and 33 µs interphase interval for accelerated in vitro testing. Chronic behavioral stimulation instead used 167 µs phases, 67 µs interphase interval and 100 Hz. Bench pulse count is not the delivered dose in every mouse.

## Chronic function and failure boundary

The [mouse microstimulation application](/applications/99-stimnet-chronic-mouse-microstimulation-2023/) reports contact pulse counts from 12,000 to 1.9 million and measured behavioral detection over months. Average fully functional contact yield was 90%; contacts above 3 MΩ were treated as broken backend connections and excluded from subsequent impedance measurements.

The longest-performing animal continued detecting stimulation through day 308 after implantation, when its backend connector failed. That endpoint matters even when the tissue-facing thread was still functioning. An accidental large DC exposure also raised behavioral thresholds; normal charge-balanced results do not make incorrect stimulation harmless.

## Model boundary

No full model is supplied. Contact diameter, pitch, taper endpoints and total functional length do not by themselves specify exact first-contact position, full outline, cap-ring aperture, interconnect routing or carrier/connector construction. The published micrograph is evidence, not a complete fabrication mask.

## Primary sources

- [2023 published primary manuscript, Figure 1 and STAR Methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC10592461/).
- [Publisher PDF](https://www.cell.com/cell-reports/pdf/S2211-1247(23)00565-X.pdf).
- [Rice repository publication record](https://repository.rice.edu/items/2850b728-9fc6-4a6f-881c-3b6602d4a7a1/full).
