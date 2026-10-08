---
title: "DOT magnetoelectric epidural stimulator, 2024"
order: 117
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0073"
interface_class: "other"
status: "research"
last_updated: 2026-10-07
description: "Published 9 × 9 × 11-mm glass-packaged, battery-free DOT cortical stimulator. Voltage-controlled proof of concept with diagnostic backscatter, two acute human studies and separate chronic pig evidence."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11014439/"
tags: ["DOT", "Rice", "Motif", "magnetoelectric", "epidural", "stimulation", "glass", "human", "research"]
draft: false
---

# DOT epidural cortical stimulator

The April 2024 Science Advances paper reports a Digitally programmable Over-brain Therapeutic (DOT) for externally powered cortical stimulation. The primary affiliations include Rice, Motif Neurotech, UTHealth and Baylor. It links to the [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/).

This entry describes the published research device, not a specification for a later commercial product. It is separate from endovascular ME-BIT and the 2025 distributed spinal IPGs. Its [acute human tests](/applications/118-dot-acute-human-motor-stimulation-2024/) and [chronic pig study](/applications/119-dot-chronic-pig-cortical-stimulation-2024/) are separate applications.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | DOT (Digitally programmable Over-brain Therapeutic) epidural cortical stimulator [1] |
| Manufacturer | Academic research device; Rice, Motif Neurotech, UTHealth, Baylor [1] |
| Interface class | Epidural cortical stimulator, externally powered |
| Origin | Science Advances, April 2024 [1] |
| First demonstrated | April 2024 [1] |
| First human implant | Acute human tests (separate application record) [1] |
| Species studied | Human (acute) and pig (chronic) [1] |
| Regulatory status | Research device; not a specification for a later commercial product |
| Function | Stimulation; uplink reports status and approximate impedance only [1] |
| Target tissue | Cortex via epidural placement [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Epidural device above intact dura in a 14 mm skull burr hole [1] |
| Array layout | Unreported in reviewed sources |
| Electrode count | Two contacts, one on each cap [1] |
| Pitch | Unreported in reviewed sources |
| Electrode lengths | Unreported in reviewed sources |
| Shank width and thickness | Packaged 9 × 9 × 11 mm; rounded-square borosilicate glass tube and two caps; ME antennas 7.5 × 3 mm; magnet 1 × 2 × 3.5 mm [1] |
| Tip and exposed site geometry | 1.5 mm diameter contacts [1] |
| Contact coating | Sputtered Ti/Pt/Ti/IrOx stack, 10/100/10/300 nm [1] |
| Insulation | Borosilicate glass with tungsten through-glass vias; medical-grade epoxy seals [1] |
| Insertion method | Burr-hole placement with silicone sleeve, PEEK cover and conductive return mesh in the chronic configuration [1] |
| Anchoring and fixation | Silicone sleeve and PEEK cover in the chronic configuration; full fixation details not specified [1] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in reviewed sources |
| Electrode material | Ti/Pt/Ti/IrOx sputtered stack [1] |
| Impedance (with measurement frequency) | Unreported in reviewed sources |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Stimulation capability | Voltage controlled, ±6.75 to ±14.5 V in 250 mV steps; 250/500 µs pulse widths in these studies; contacts form a pseudo-monopolar path, earlier cohorts used bottom-only bipolar [1] |
| Charge injection limit | Unreported in reviewed sources |
| Reference and ground | Unreported in reviewed sources |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported in reviewed sources |
| Insertion trauma and BBB disruption | Unreported in reviewed sources |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Unreported in reviewed sources |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | KL15 microcontroller, LTC3129 boost converter, INA186 current monitor, DG636 output switch [1] |
| Data path | ME films carry digital downlink and 8-bit ringdown-backscatter diagnostic uplink; message 3.4 ms stated against 1.8-3.0 ms downlink plus 1.6 ms uplink (both kept) [1] |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Battery-free; 218 kHz field tested at 7 mT at the coil surface; transmitter 18 W peak, about 500 ms for a maximum pulse train; operating diameter 1.8 cm at 9 V and 1 cm at 14.5 V at 7.5 mm [1] |
| Thermal management | Field assessed against IEEE limits, not blanket under every standard [1] |
| Packaging and hermeticity | Not fully hermetic by the authors' statement [1] |
| MRI compatibility | Bias magnet expected to cause artifacts; MRI safety expected but not qualified here [1] |
| Surgical complexity | 14 mm burr hole above intact dura [1] |
| Output connectors | Unreported in reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Unreported in reviewed sources |
| Stability over time | Unreported in reviewed sources |
| Longevity | Unreported in reviewed sources |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Unreported in reviewed sources |
| Notable demonstrations | Unreported in reviewed sources |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Acute human motor-stimulation tests (separate application record) [1] |
| Preclinical cohort | Chronic pig study (separate application record) [1] |
| Follow-up duration | Unreported in reviewed sources |
| Indications | Unreported in reviewed sources |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Battery-free epidural stimulation in acute human and chronic pig [1] |
| Key limitations | Voltage-controlled, not charge-balanced therapeutic; multi-year packaging, biocompatibility, durability and IrOx testing are future work [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Battery-free, small epidural form with two contacts [1] |
| Limitations | External transmitter needs 18 W peak; not fully hermetic [1] |
| Scaling constraints | Unreported in reviewed sources |

## Published hardware

| Component | Specification in this paper |
| --- | --- |
| Packaged device | 9 × 9 × 11 mm; rounded-square borosilicate glass tube and two caps |
| ME antennas | Two 7.5 × 3-mm Metglas/PZT/Metglas laminates, connected in parallel; 218 kHz |
| Bias magnet | 1 × 2 × 3.5-mm neodymium magnet |
| Stimulation contacts | One on each cap, 1.5-mm diameter; Ti/Pt/Ti/IrOx sputtered stack |
| Electrode stack | 10/100/10/300 nm for Ti/Pt/Ti/IrOx |
| Feedthroughs and seals | Tungsten through-glass vias; medical-grade epoxy seals, not a fully hermetic enclosure |
| Electronics | Off-the-shelf PCB components, including KL15 microcontroller, LTC3129 boost converter, INA186 current monitor and DG636 output switch |
| Programmed output | Voltage controlled; ±6.75 to ±14.5 V in 250-mV steps; 250/500-µs pulse widths in these studies |
| External transmitter | 6-cm, three-layer pancake coil with H-bridge driver; separate paired receiver coils |

The implant sits above intact dura in a 14-mm skull burr hole, with a silicone sleeve, PEEK cover and conductive return mesh in the chronic configuration. The top and bottom contacts form a pseudo-monopolar path. Earlier feasibility cohorts used a different, bottom-only bipolar arrangement.

## Power and diagnostic communication

The transmitter supplies a 218-kHz alternating field, tested at 7 mT at its surface. The bench alignment test used 10 biphasic pulses at 500 Hz across a 1-kΩ resistor. At 7.5 mm from the coil, the operating diameter was 1.8 cm for 9-V output and 1 cm for 14.5-V output. These are configuration-specific bench results, not a universal implant depth or all-orientation guarantee.

The transmitter consumes 18 W peak to generate that field; roughly 500 ms at this state was needed for a maximum-amplitude pulse train. A battery-free implant still needs an external energy source. The paper's field-limit assessment uses IEEE limits, not a blanket approval under every exposure standard.

The ME films carry digital downlink commands and 8-bit diagnostic uplink packets through ringdown backscatter. Uplink reports status and approximate electrode impedance, not recorded neural signals. The paper calls a message 3.4 ms while giving a 1.8-3.0-ms downlink plus a 1.6-ms uplink; those timing descriptions are retained rather than converted into one unqualified throughput claim.

## Limits and unresolved qualification

Methods describes sequential stimulation of the two contacts as maintaining charge-balanced output. Discussion still calls for future current-controlled, charge-balanced therapeutic stimulation. The proof of concept is voltage controlled; neither statement is treated as chronic human safety qualification.

The authors explicitly did not use fully hermetic encapsulation. Multi-year packaging, biocompatibility, durability, electrode optimization and higher-bandwidth authenticated/error-checked communication remain future work. The paper expects MRI artifacts from the bias magnet and expects MRI safety, but does not supply completed MRI qualification here. IrOx would need further testing for a commercial human device.

No full model is supplied. Figure 1 establishes the assembly and scale, but exact cap outline, wall thickness, PCB geometry, internal routing and fixation details are not fully specified. A model built from the outer box alone would not be the manufactured implant.

## References

1. [Woods, Singer and colleagues, Miniature battery-free epidural cortical stimulators, Science Advances, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11014439/), DOI 10.1126/sciadv.adn0858. Results, assembly, characterization and Discussion support this entry.
