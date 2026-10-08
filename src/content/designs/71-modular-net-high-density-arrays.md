---
title: "Modular NET high-density arrays"
order: 71
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0049"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "128-channel, eight-shank NET modules assembled into distributed rodent cortical arrays. The 2022 paper shows 1,024- and 1,280-channel placements, thousands of sorted units and module follow-up to 290 days."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41551-022-00941-y"
tags: ["NET", "ultraflexible", "modular", "Rice", "UCSF", "high density", "cortex", "rodent", "academic", "preclinical"]
draft: false
---

# Modular NET high-density arrays

A larger modular recording platform built from ultraflexible nanoelectronic threads. Zhao and colleagues' paper was published online on 3 October 2022 in Nature Biomedical Engineering. The listed affiliations include Rice University's electrical and computer engineering, bioengineering and NeuroEngineering Initiative, and UCSF neuroscience and neurological surgery.

This is a hardware development beyond the [2017 NET-50 and NET-10 probes](/devices/27-nanoelectronic-thread-net-probes/), not a claim that the original four- or eight-contact threads had thousands of channels.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Modular NET high-density arrays, 128-channel modules [1] |
| Manufacturer | Academic research device; Rice ECE, bioengineering and NeuroEngineering Initiative, UCSF neuroscience and neurological surgery [1] |
| Interface class | Intracortical ultraflexible nanoelectronic-thread shanks in stackable modules |
| Origin | Zhao, Zhu, Li and colleagues, Nature Biomedical Engineering [1] |
| First demonstrated | Published online 3 October 2022 [1] |
| First human implant | None |
| Species studied | Head-fixed mice and freely moving rats [1] |
| Regulatory status | Research device; no clearance |
| Function | Recording, with optogenetic stimulation in some experiments [1] |
| Target tissue | Rodent cortex [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Eight shanks per module, 16 sites per shank; three NET array designs [2] |
| Array layout | Mouse visual cortex 8 × 8 × 16 layout, targeted module spacing 150 µm; one mouse with ten type-I modules at 150 µm inter-shank and 250 µm inter-module spacing (kept separate) [1, 2] |
| Electrode count | 128 channels per module; 1,024 channels from eight modules (rat, Figure 1); 80 shanks and 1,280 channels (Figure 3); 144 shanks (Figure 6) [2, 4, 5] |
| Pitch | Unreported |
| Electrode lengths | Unreported |
| Shank width and thickness | Unreported |
| Tip and exposed site geometry | Unreported |
| Contact coating | Unreported |
| Insulation | Unreported |
| Insertion method | Sequential implantation one module at a time with stereotaxic micromanipulators [2] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | Unreported |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Unreported |
| Recording modality | Unreported |
| Sampling rate | Unreported |
| Stimulation capability | Unreported |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | No observable scarring in one mouse with ten type-I modules (Extended Data Figure 1) [1] |
| Neuron loss near sites | No significant difference in sampled local neuron densities in that mouse [1] |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Flexible printed circuit to a stackable 128-channel headstage; 3D-printed case on the rat [1] |
| Data path | Wired headstage; not a fully implanted wireless BCI [1] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | Unreported |
| Thermal management | Unreported |
| Packaging and hermeticity | Unreported |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Figure 3: 1,355 recorded units from 1,280 channels; Figure 6: raster of 2,548 units; abstract reports about 1,000 units per cubic millimetre [1, 4, 5] |
| Stability over time | Module-averaged impedance, spike amplitude, SNR and unit yield stable after initial changes within 60 days; not proof every channel stayed unchanged [6] |
| Longevity | 21 modules: 16 for 145 days and five for 290 days (Figure 7) [6] |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Unreported |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mice and rats; five implanted animals in Figure 3 and 21 modules in Figure 7 [3, 6] |
| Follow-up duration | 145 and 290 days [6] |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Visual decoding, behavioural-state prediction and optogenetic stimulation alongside recording [1] |
| Key limitations | Channel count is not unit count; correlations do not prove anatomical connections; full shank outlines and electrode coordinates not reconstructed [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Thousands of neurons recorded with ultraflexible modules [1] |
| Limitations | Head-mounted wired headstages, rodent only [1] |
| Scaling constraints | Unreported |

## Module and recording system

Figure 1 shows 128-channel modules, each with eight shanks carrying 16 intracortical recording sites. The study used three NET array designs. Modules were assembled for sequential implantation, one module at a time, using stereotaxic micromanipulators.

The article's Extended Data Figure 3 shows a NET module linked through a flexible printed circuit to a stackable 128-channel headstage. Eight modules form the pictured 1,024-channel recording system. A freely moving rat carries those headstages in a 3D-printed case. The system is not a fully implanted wireless human BCI.

## Keep channels and units separate

| Example | What the paper reports |
| --- | --- |
| Figure 1, rat | Eight 128-channel modules, 1,024 channels total |
| Figure 1, mouse visual cortex | 8 x 8 x 16 layout, 1,024 channels; targeted module spacing 150 µm |
| Figure 3, mouse visual cortex | 80 shanks, 1,280 channels; 1,355 recorded units |
| Figure 6, distributed mouse recording | 144 shanks; representative raster of 2,548 units across visual, sensory and motor cortex |

A recording site can contribute to more than one sorted unit. Unit count is not electrode count, and a targeted placement or reconstructed location is not a measured fabrication mask. The abstract reports several thousand neurons at densities around 1,000 units per cubic millimetre across the demonstrated rodent recordings.

## Duration and tissue evidence

Figure 7 follows 21 modules: 16 for 145 days and five for 290 days. Module-averaged impedance, spike amplitude, signal-to-noise ratio and single- and multi-unit yield remained stable over the reported durations after initial changes within 60 days. These are module-averaged results, not proof that every channel or every neuron stayed unchanged.

Extended Data Figure 1 describes one mouse implanted with ten type-I modules at 150 µm inter-shank and 250 µm inter-module spacing. The authors report no observable scarring and no significant difference in the sampled local neuron densities. That tissue analysis uses a different placement from Figure 1's targeted 150 µm module spacing; the numbers are not merged into one universal spacing.

## Applications and limits

The experiments include visual decoding, behavioural-state prediction and optogenetic stimulation alongside recording. The paper uses electrical correlations and timing to infer neural coupling and directional information flow. It does not directly prove anatomical connections between every correlated pair.

The source describes head-fixed mice and freely moving rats. No human implant, clinical outcome or assistive-device control is established here. Longitudinal unit yield and network stability are different from tracking the same single neurons for every recording day.

No model is added from figure photographs alone. Exact full shank outlines, electrode coordinates and trace routing for the three designs are not reconstructed in this entry.

## References

1. Zhao Z, Zhu H, Li X, et al. [Ultraflexible electrode arrays for months-long high-density electrophysiological mapping of thousands of neurons in rodents](https://www.nature.com/articles/s41551-022-00941-y). Primary abstract, affiliations and Extended Data Figures 1 to 3.
2. [Figure 1: modular hardware and placement](https://www.nature.com/articles/s41551-022-00941-y/figures/1).
3. [Figure 2: recording performance and five implanted animals](https://www.nature.com/articles/s41551-022-00941-y/figures/2).
4. [Figure 3: 1,280-channel visual-cortex example](https://www.nature.com/articles/s41551-022-00941-y/figures/3).
5. [Figure 6: distributed recordings and behaviour decoding](https://www.nature.com/articles/s41551-022-00941-y/figures/6).
6. [Figure 7: module-level follow-up](https://www.nature.com/articles/s41551-022-00941-y/figures/7).

## Source notes

This entry uses the accessible primary abstract, figure captions and extended-data captions. It does not claim to reproduce every fabrication method from the full article.
