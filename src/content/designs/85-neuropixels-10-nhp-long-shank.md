---
title: "Neuropixels 1.0 NHP long-shank probe"
order: 85
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0057"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "45 mm silicon shank with 4,416 selectable sites and 384 simultaneous channels, engineered for acute recordings in nonhuman primates. Reticle stitching, stress compensation and insertion geometry are part of the hardware."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41593-025-01976-5"
tags: ["Neuropixels", "NHP", "intracortical", "recording", "silicon", "macaque", "imec", "academic", "preclinical"]
draft: false
---

# Neuropixels 1.0 NHP long-shank probe

Trautmann and colleagues' 2025 technical report describes an extended Neuropixels probe for acute deep and multi-area recording in nonhuman primates. Each value is scoped to the NHP probe or to a named experiment. A blank cell means not established by the reviewed primary paper.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Neuropixels 1.0 NHP, 45 mm long-shank probe |
| Manufacturer | Designed and fabricated with imec (130 nm silicon-on-insulator CMOS); academic team from Columbia, Stanford, Berkeley, Caltech, Janelia and others. Not a commercial release specification |
| Interface class | Penetrating silicon CMOS recording probe |
| Origin | Trautmann and colleagues; Nature Neuroscience 2025 |
| First demonstrated | 2025 technical report |
| First human implant | The rodent Neuropixels 1.0 was used in humans in other work; the NHP probe was not |
| Species studied | Rhesus macaques (Macaca mulatta); the reviewed text names two male rhesus monkeys, 11 and 16 kg, for part of the work. Full cohort size across all experiments is not itemized here |
| Regulatory status | Preclinical research tool. No human clearance established |
| Function | Acute extracellular recording, programmable selection of 384 channels from 4,416 sites |
| Target tissue | Deep and multi-area macaque brain, e.g. visual cortex, motor cortex, basal ganglia, IT face patches reaching about 42 mm from the craniotomy |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Rigid silicon shank with CMOS base, flexible PCB and headstage |
| Array layout | Linear shank, two sites per 20 µm; twelve switchable banks (eleven of 384 sites plus a half-sized bank at the shank-base junction) |
| Electrode count | 4,416 recording sites; 384 simultaneously recorded channels |
| Pitch | Two sites per 20 µm along the shank |
| Electrode lengths | Shank 45 mm long. Monolithic silicon piece 54 mm long including base |
| Shank width and thickness | Shank 125 µm wide, 90 µm thick (rodent probe is 24 µm thick). Base area 48 mm2 for the study version |
| Tip and exposed site geometry | 20 degree top-plane chisel taper, mechanically ground to a 25 degree side-plane bevel for reported data. Large tip reference electrode on the shank tip |
| Contact coating | Titanium nitride sites |
| Insulation | Insulation material and thickness unreported in the reviewed text |
| Insertion method | Inserted through dura, with a blunt guide tube under gentle compression for superficial recordings and a sharp penetrating guide tube for deeper ones. Mechanical sharpening with a modified pipette microgrinder |
| Anchoring and fixation | Acute recordings in a recording chamber; no chronic anchoring. Multi-probe sessions used one chamber with nonparallel trajectories |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 12 x 12 µm (144 µm2) per site, geometric |
| Electrode material | Titanium nitride on a silicon CMOS shank |
| Impedance (with measurement frequency) | Approximately 150 kΩ at 1 kHz (the extracted text prints a plus-minus sign before 150 kΩ; read as approximate) |
| Noise floor or SNR | Noise measured across banks 0 to 11 with a distribution of mean plus or minus SD per readout channel; one tested probe had three sites with noise more than 2 µV above the channel mean. Absolute RMS value is unreported in the reviewed text. Neuropixels 1.0 circuits are reused |
| Recording modality | Extracellular spikes and local field potentials (10-bit resolution); raw 384-channel traces shown from macaque motor cortex |
| Sampling rate | Same signal-conditioning circuits and acquisition system as Neuropixels 1.0 with SpikeGLX or OpenEphys |
| Stimulation capability | Recording only |
| Charge injection limit |  |
| Reference and ground | Referenced to the large tip electrode or an external reference wire placed in the recording chamber |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Macaque brain; targets from superficial to about 42 mm deep |
| Insertion trauma and BBB disruption | Dura penetration and acute shank insertion with guide tubes. Insertion injury is not quantified in the reviewed text; tip bevel is meant to reduce dimpling and tissue damage |
| Vascular disruption risk |  |
| Micromotion sensitivity | Repeated penetrations in the same location showed no clear decline in neurons recorded over up to 23 sessions per probe. Rapid drift was uncommon with careful preparation. Unstable sessions typically came from not placing gentle pressure on the dura with a guide tube |
| Gliosis and encapsulation | Not assessed. Acute recordings |
| Neuron loss near sites | Not assessed |
| Foreign-body response mitigation | Bevelled tip, guide tube placement and stress-compensated thick shank |
| Typical failure modes | Shank bending from internal stress required stress compensation. Resistance when transiting dura is harder with many probes. Yields may scale less than linearly with many probes inserted in a small region |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Same signal-conditioning circuits as Neuropixels 1.0: 384 low-noise channels with programmable gain and 10-bit resolution, 130 nm SOI CMOS, with wider shank wires and power wires and larger decoupling capacitors |
| Data path | Base on a 2 x 40 mm flexible PCB into a ZIF connector on a 15 x 16 mm2, 900 mg headstage, then PXIe controller; SpikeGLX |
| Telemetry bandwidth | Not applicable: wired |
| Sampling rate |  |
| Power | Not given beyond the base electronics, headstage, cable and PXIe system being identical to Neuropixels 1.0 |
| Thermal management |  |
| Packaging and hermeticity | Acute use only. No hermetic chronic packaging described |
| MRI compatibility |  |
| Surgical complexity | Craniotomy and dura penetration through guide tubes in monkeys, reaching 42 mm for deep targets. Human workflow not applicable |
| Output connectors | ZIF connector on the headstage; headstage to PXIe |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Single-probe sessions record thousands of neurons across multiple visual areas. Face-patch session: 1,127 units (622 single, 505 multi-unit). Six and seven probes together yielded 1,012 and 783 neurons |
| Chronic yield | Not applicable. Acute probe |
| Stability over time | No clear decline in neuron count over up to 23 successive sessions in the same location |
| Longevity | Each probe reused for up to 23 successive acute sessions |
| Revision and explant experience | Not applicable: acute use only |
| Adverse events | Reported failure modes are bending stress and dura resistance, with no tissue-damage rate stated in the reviewed text |
| Notable demonstrations | Multi-area macaque recording with programmable sites, motor-cortex sulcal and deep targets, IT face patches, and up to seven probes together |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Rhesus macaques; monkeys T and H (11 and 16 kg) named for part of the work. Other experiments are reported in the paper per study |
| Follow-up duration | Acute sessions of hours; probes reused over up to 23 sessions |
| Indications | Preclinical neuroscience recording, not a clinical indication |
| Trials and registries | Animal ethics approvals per laboratory; no human registry |
| Primary outcomes | Demonstrated acute multi-area, high-yield NHP recording |
| Key limitations | Acute only; shank length is a handling and insertion risk; yield per probe falls when many probes are packed |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | 4,416 sites on one shank with long reach; flexible site selection; multi-probe scaling |
| Limitations | Thick rigid shank; dura resistance; bending from stress; fabrication by stitched CMOS reticles |
| Scaling constraints | Many probes in one chamber may give less than linear yield; only 384 of 4,416 sites record at once |

## References

- Trautmann EM et al. [Neuropixels 1.0 NHP](https://www.nature.com/articles/s41593-025-01976-5). Nature Neuroscience 2025. Full text: [PMC12229894](https://pmc.ncbi.nlm.nih.gov/articles/PMC12229894/).

Related: [macaque recording experiments](/applications/86-neuropixels-nhp-macaque-recordings-2025/).

Stitching note: reticle boundaries overlap to preserve electrical continuity, with locally narrower metal wires in stitching regions. The mask design has a 5 mm tip segment, two 20 mm middle segments and a base segment, which describe fabrication rather than extra length. No full 3D model is supplied here.
