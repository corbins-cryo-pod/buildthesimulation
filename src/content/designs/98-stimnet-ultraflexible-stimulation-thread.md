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

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | StimNET ultraflexible stimulation thread [1] |
| Manufacturer | Academic research device; Rice University [1] |
| Interface class | Ultraflexible polyimide intracortical thread for stimulation and recording [1] |
| Origin | Cell Reports, 2023; stimulation-specific successor to recording NET probes [1] |
| First demonstrated | 2023 paper [1] |
| First human implant | None |
| Species studied | Mouse (chronic behavioral stimulation) [1] |
| Regulatory status | Research device; no clearance |
| Function | Microstimulation and recording [1] |
| Target tissue | Mouse cortex [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Thread with 32 addressed contacts, polyimide cap ring over each contact and offset vias [1] |
| Array layout | 32 contacts on a 1,800 µm functional length [1] |
| Electrode count | 32 addressed contacts [1] |
| Pitch | 60 µm center spacing [1] |
| Electrode lengths | 1,800 µm functional implant length [1] |
| Shank width and thickness | 1 µm thick (plus 0.3 µm at the cap ring); width tapers from 100 to 36 µm [1] |
| Tip and exposed site geometry | Contacts 24 µm diameter [1] |
| Contact coating | Ti/Pt/Ti/300 nm sputtered iridium oxide contact stack, with separate gold interconnects [1] |
| Insulation | Polyimide substrate (replacing SU-8 of the original NET) with polyimide cap rings [1] |
| Insertion method | Temporary sharpened 50 µm tungsten wire shuttle attached with PEG [1] |
| Anchoring and fixation | Unreported in reviewed sources |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 24 µm diameter contacts [1] |
| Electrode material | Sputtered iridium oxide on Ti/Pt/Ti, gold interconnects [1] |
| Impedance (with measurement frequency) | Contacts above 3 MΩ were treated as broken backend connections; measurement frequency not extracted here [1] |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | Recording through the same contacts [1] |
| Sampling rate | Unreported in reviewed sources |
| Stimulation capability | Charge-balanced biphasic microstimulation; chronic behavioral stimulation used 167 µs phases, 67 µs interphase interval and 100 Hz [1] |
| Charge injection limit | 1.1 mC/cm² in saline; currents up to 50 µA tested within the water window; depends on waveform, reference and conditions [1] |
| Reference and ground | Unreported in reviewed sources |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Mouse cortex [1] |
| Insertion trauma and BBB disruption | Unreported in reviewed sources |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Backend connector failure (longest animal, day 308); accidental large DC exposure raised behavioral thresholds [1] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Unreported in reviewed sources |
| Data path | Wired backend connector [1] |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Unreported in reviewed sources |
| Thermal management | Unreported in reviewed sources |
| Packaging and hermeticity | Unreported in reviewed sources |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Unreported in reviewed sources |
| Output connectors | Unreported in reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Average fully functional contact yield 90% [1] |
| Stability over time | Bench test: 30 µA charge-balanced biphasic pulses at 500 Hz for 50 million pulses (100 µs pulse width, 33 µs interphase interval) [1] |
| Longevity | Longest-performing animal detected stimulation through day 308, when its backend connector failed [1] |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Accidental large DC exposure raised behavioral thresholds in one case [1] |
| Notable demonstrations | Chronic mouse behavioral detection of microstimulation over months; contact pulse counts from 12,000 to 1.9 million [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mice; animal count not extracted here [1] |
| Follow-up duration | Up to 308 days [1] |
| Indications | Unreported in reviewed sources |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Behavioral detection of chronic microstimulation [1] |
| Key limitations | Chronic stimulation results are not assigned to the 2017 recording design; bench pulse count is not delivered dose in every mouse; no full mask or model [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Stimulation-specific contacts on a 1 µm ultraflexible shank [1] |
| Limitations | Connector failures ended the longest run; stimulation safety depends on waveform and conditions [1] |
| Scaling constraints | 32 contacts over 1,800 µm functional length [1] |

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

## References

1. [2023 published primary manuscript, Figure 1 and STAR Methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC10592461/).
2. [Publisher PDF](https://www.cell.com/cell-reports/pdf/S2211-1247(23)00565-X.pdf).
3. [Rice repository publication record](https://repository.rice.edu/items/2850b728-9fc6-4a6f-881c-3b6602d4a7a1/full).
