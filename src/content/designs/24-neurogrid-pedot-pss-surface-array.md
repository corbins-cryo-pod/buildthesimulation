---
title: "NeuroGrid (PEDOT:PSS surface array)"
order: 24
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0003"
interface_class: "ecog"
status: "research"
last_updated: 2026-10-06
description: "A 4 µm thick organic electrode array with 10 × 10 µm sites on 30 µm pitch that records single-neuron action potentials from the brain surface. NYU and collaborators, 2015."
modality: "Cortical surface"
successRank: 24
website: "https://www.nature.com/articles/nn.3905"
tags: ["ECoG", "PEDOT:PSS", "organic electronics", "conformable", "spikes from surface", "NYU", "Buzsaki", "academic", "research"]
draft: false
---

# NeuroGrid (PEDOT:PSS surface array)

All rows follow the shared implant-device template. Measurements belong to the named configuration, cohort or bench test. A blank cell means the reviewed sources do not establish a value. Nonpenetrating contacts do not mean noninvasive surgery, and fatigue extrapolations are not observed clinical lifetimes.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | 2015 NeuroGrid PEDOT:PSS surface array |
| Manufacturer | Khodagholy and collaborators, academic fabrication; no commercial SKU asserted |
| Interface class | Conformable surface recording array for LFP and putative single units |
| Origin | Khodagholy, Gelinas, Thesen, Doyle, Devinsky, Malliaras and Buzsaki research team |
| First demonstrated | 2015 journal issue, published online December 2014; not a first-family claim |
| First human implant | Two intraoperative human recordings in reviewed report; exact dates/first-use priority not reported |
| Species studied | 13 male Long-Evans rats and two adult epilepsy patients |
| Regulatory status | Research under animal and NYU human ethics approvals; no commercial clearance established |
| Function | Record field potentials and surface-visible action potentials |
| Target tissue | Cortical pial surface; rat hippocampal alvear surface exposed by cortex removal |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Thin conformable nonpenetrating recording film |
| Array layout | Dense planar sites; 256-electrode micrograph and 64-channel configurations in supplementary captions |
| Electrode count | 256-site and 64-channel designs appear in source; not assumed all recordings use 256 |
| Pitch | 30 µm interelectrode spacing |
| Electrode lengths | Not applicable to recording shanks; film placed on surface |
| Shank width and thickness | No shanks; 4 µm total array film thickness |
| Tip and exposed site geometry | 10 x 10 µm recording sites |
| Contact coating | PEDOT:PSS conducting polymer tissue interface |
| Insulation | Parylene C; buried Pt/Au pads/interconnects at 2 µm neutral plane, no direct metal exposure to tissue |
| Insertion method | Dura removed for cortical placement; hippocampal surface access removes a small piece of neocortex. Human placement through clinical craniotomy |
| Anchoring and fixation | Rat array covered with Gelfoam, craniotomy sealed with paraffin/mineral oil; headstage attached directly |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 100 µm² nominal planar site area from 10 x 10 µm; polymer effective electrochemical area not equated to planar area |
| Electrode material | PEDOT:PSS at tissue; Ti/Pt/Au film stack and Pt/Au interconnects underneath |
| Impedance (with measurement frequency) | Frequency-dependent comparison in supplementary Figure 1d; no single numerical 1 kHz rating extracted here |
| Noise floor or SNR | Postmortem rat RMS noise 3 µV in spike band, 8 µV in full 0.1-7500 Hz recording band. Spike selection threshold five times background RMS |
| Recording modality | LFP and putative single-neuron spikes, based on neighboring-site waveforms/clustering |
| Sampling rate | 20 kHz, 16-bit acquisition format |
| Stimulation capability | Not demonstrated in this recording study |
| Charge injection limit |  |
| Reference and ground | Rat: two tungsten wires, 100 µm diameter/2 mm long, in cerebellum as ground/reference. Human: scalp subcutaneous stainless-steel needles |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Superficial cortex and surgically exposed rat hippocampal surface |
| Insertion trauma and BBB disruption | No recording-shank penetration, but craniotomy/dural removal and hippocampal cortex removal are invasive; BBB injury not quantified |
| Vascular disruption risk | Sites over major blood vessels fail to show spikes in reported examples; surgical vascular injury rate not reported |
| Micromotion sensitivity | Conformability and anchoring intended to stabilize tissue contact; quantitative motion transfer not reported |
| Gliosis and encapsulation | Quantitative chronic scar/encapsulation burden not established by reviewed recording report |
| Neuron loss near sites |  |
| Foreign-body response mitigation | 4 µm soft film, conducting-polymer interface and complete metal covering; not proof of no tissue reaction |
| Typical failure modes | Poor tissue contact/large vessels limit observable spikes; standardized hardware failure rates not reported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Passive film plus externally mounted active Intan headstage; not implanted wireless chip array |
| Data path | Directly attached RHD2000 headstage amplifies/multiplexes/digitizes, stored for offline analysis |
| Telemetry bandwidth | Not applicable to reported wired/headstage system; wireless integration proposed |
| Sampling rate | 20 kHz, 16-bit storage; spike clustering uses 0.25-2.5 kHz bandpass |
| Power | External headstage/acquisition, no implanted power supply specified |
| Thermal management |  |
| Packaging and hermeticity | Parylene film and headstage/cable; no fully implanted hermetic chronic package qualification |
| MRI compatibility |  |
| Surgical complexity | Clinical cranial access for human intraoperative recordings; rat cortical/hippocampal surgery and reference wire implantation |
| Output connectors | Direct headstage attachment/bonding pads; exact cable/connector part not reported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Surface LFP/spikes in rat and human recordings; contact-level manufacturing yield not reported |
| Chronic yield | Rat waveform/phase stability demonstrated; no long-term percentage of surviving contacts established |
| Stability over time | Average rat waveform amplitude maintained over ten days, no significant rise in detection threshold; not same-unit proof for every contact |
| Longevity | Ten-day recording observations; maximum service life not reported |
| Revision and explant experience | Postmortem tissue localization; chronic human revision experience not reported |
| Adverse events | No numerical adverse-event series; nonpenetrating sites do not imply noninvasive surgery |
| Notable demonstrations | Rat cortex/hippocampus putative unit isolation in behaving animals; human surface LFP-modulated spikes under intraoperative anesthesia |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Two adult women undergoing epilepsy surgery, age 24 and 35; acute intraoperative research |
| Preclinical cohort | 13 rats: ten cortical, three hippocampal implantations |
| Follow-up duration | Human maximum 30 min intraoperative; rat waveform data over ten days |
| Indications | Research surface electrophysiology, not cleared chronic BCI indication |
| Trials and registries | NYU Langone IRB approval stated; registry identifier not reported |
| Primary outcomes | Surface spike waveform/clustering, LFP phase relationships, signal stability and recording feasibility |
| Key limitations | Human data are acute; units are putative and depend on multi-site waveform visibility/contact. Hippocampal surface demonstration includes overlying cortex removal |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Neuron-scale density and conformability permit surface spike recordings without recording-shank penetration |
| Limitations | Surface-contact/vessel dependence, cranial surgery and unestablished long-term human reliability |
| Scaling constraints | Array can expand, but headstage/acquisition bandwidth, wiring and tissue contact limit practical density; future wireless design not demonstrated here |

## References

- Khodagholy et al. 2015. [NeuroGrid: recording action potentials from the surface of the brain](https://www.nature.com/articles/nn.3905). [Full primary Methods and Results](https://pmc.ncbi.nlm.nih.gov/articles/PMC4308485/). Rat/human protocols and supplementary figure captions.
