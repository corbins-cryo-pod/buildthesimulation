---
title: "MIT graphite-polymer multifunctional fiber, 2017"
order: 146
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0086"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Graphite-doped polymer electrodes, one optical waveguide and two fluidic channels within a drawn fiber. The selected experimental section was 200 micrometers despite a less-than-200 claim elsewhere in the paper."
modality: "Intracortical"
website: "https://www.nature.com/articles/nn.4510"
tags: ["cortex", "intracortical", "recording", "stimulation", "bidirectional", "microfluidic", "optogenetics", "fiber", "MIT", "academic"]
draft: false
---

# Graphite-polymer multifunctional fiber

Park and colleagues' 2017 paper changes the conductive composite and cross-section of the [2015 multimodal fiber](/devices/143-mit-drawn-multimodal-polymer-fiber-2015/). Six graphite-doped conductive-polyethylene electrodes, a polycarbonate/cyclic-olefin-copolymer optical waveguide and two fluidic channels are thermally drawn together. This is not the later [hydrogel-hybrid assembly](/devices/79-hydrogel-hybrid-multifunctional-fiber-probe/).

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Graphite-polymer multifunctional fiber [1] |
| Manufacturer | Academic research device; MIT with Tohoku University and Virginia Tech affiliations [2] |
| Interface class | Intracortical polymer fiber with electrodes, waveguide and two fluidic channels |
| Origin | Park and colleagues, Nature Neuroscience 2017 [1] |
| First demonstrated | 2017 [1] |
| First human implant | None |
| Species studied | Mouse [2] |
| Regulatory status | Research device; no clearance |
| Function | Recording, optical delivery and fluid injection [1] |
| Target tissue | Mouse brain [2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Six graphite-doped conductive-polyethylene electrodes, PC/COC waveguide, two fluidic channels [2] |
| Array layout |  |
| Electrode count | Six electrode regions [2] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness | 180-220 µm range with 200 µm used in experiments; abstract and discussion say less than 200 µm (both kept); six electrode regions 20.9 ± 1.3, 20.7 ± 0.9, 25.8 ± 1.5, 24.0 ± 1.8, 24.5 ± 1.4, 22.6 ± 2.3 µm; channels 16.4 ± 2.1 and 15.3 ± 1.9 µm; waveguide 68.2 ± 2.9 µm diameter [2] |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation |  |
| Insertion method |  |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material | Polyethylene with 5 wt% graphite [2] |
| Impedance (with measurement frequency) | At 1 kHz: 1.31 ± 0.27 MΩ falling to 0.62 ± 0.23 MΩ after overnight saline soak; 0.67 ± 0.12 MΩ at three days and 0.71 ± 0.13 MΩ at three months in vivo [2] |
| Noise floor or SNR |  |
| Recording modality | Extracellular recording; unit counts are example-specific [2] |
| Sampling rate |  |
| Stimulation capability |  |
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
| Onboard electronics |  |
| Data path | Optical ferrules, electrical pins and fluid tubing; requires external recorder, light source and pump [2] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power |  |
| Thermal management |  |
| Packaging and hermeticity | Assembled probe 0.3-0.5 g [2] |
| MRI compatibility |  |
| Surgical complexity |  |
| Output connectors | Optical ferrules, electrical pins, fluid tubing; connectorization is a named barrier [2] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity | Optical transmission loss below 1.5 dB/cm including explanted devices through three months; no longer time points [2] |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | Fluid return 70-95% at 1-100 nl/s including bent fibers; 7.85 µl channel capacity for a 1 cm probe stated but not reconciled with cross-section data [2] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mouse projection-mapping study [2] |
| Follow-up duration | Up to three months [2] |
| Indications |  |
| Trials and registries |  |
| Primary outcomes | Integrated recording, optical stimulation and drug delivery for projection mapping [2] |
| Key limitations | Tissue response measured, not eliminated; no indefinite-life or clinical claim [2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Smaller electrode regions from lower-resistance composite [2] |
| Limitations | External backend; not wireless [2] |
| Scaling constraints |  |

## Selected experimental geometry

The author manuscript reports conductive polyethylene with 5 wt% graphite. Lower sheet resistance supports smaller electrode regions than the earlier commercial composite. It reports a 180-220 µm overall diameter range and selects a 200 µm section for experiments. The abstract and discussion instead use a less-than-200 µm claim. These statements are preserved, not combined into one universal shaft dimension.

A ten-meter section was characterized with the following cross-section measurements:

| Feature | Reported measurement |
| --- | --- |
| Six electrode regions | 20.9 ± 1.3, 20.7 ± 0.9, 25.8 ± 1.5, 24.0 ± 1.8, 24.5 ± 1.4 and 22.6 ± 2.3 µm |
| Two fluidic channels | 16.4 ± 2.1 and 15.3 ± 1.9 µm |
| Optical waveguide | 68.2 ± 2.9 µm diameter |

The electrode and channel values are reported as dimensions, not all declared circular diameters. No contact-center coordinates or complete 3D model are inferred from them.

## Bench and implanted performance

- Six electrodes are not a six-neuron guarantee. Recorded and isolated unit counts belong to particular examples in the [mouse study](/applications/147-mit-fiber-projection-mapping-mouse-2017/).
- Reported 1 kHz electrode impedance falls from 1.31 ± 0.27 MΩ to 0.62 ± 0.23 MΩ after overnight saline soaking. The manuscript reports 0.67 ± 0.12 MΩ three days after implantation and 0.71 ± 0.13 MΩ at three months.
- Optical transmission loss is reported below 1.5 dB/cm, including bending tests and explanted devices through three months. Longer time points were not collected.
- Measured fluid return is 70-95% at input rates of 1-100 nl/s, including bent-fiber tests. Bench flow does not establish unlimited safe injection into brain tissue.
- The manuscript states a 7.85 µl capacity for one channel in a 1 cm probe. That volume is not reconciled with the micrometer cross-section measurements here and is not used as a safe dose or geometry parameter.

## External assembly and limits

The assembled probe weighs 0.3-0.5 g and connects through optical ferrules, electrical pins and fluid tubing. It requires external recording hardware, a light source and a pump; it is not a wireless implant. The authors identify backend connectorization as a barrier.

The primary manuscript lists MIT affiliations, with Tohoku University and Virginia Tech affiliations also present. No clinical use, current availability or PI appointment is inferred. Tissue response was measured rather than eliminated, and three-month observations are not an indefinite-life claim.

## References

1. [2017 publisher paper](https://www.nature.com/articles/nn.4510).
2. [Full peer-reviewed author manuscript in PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC5374019/).
3. [Figure 1: cross-section and bench measurements](https://www.nature.com/articles/nn.4510/figures/1).
4. [Publisher supplement: geometry, optical stability and connectorization](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fnn.4510/MediaObjects/41593_2017_BFnn4510_MOESM13_ESM.pdf).
