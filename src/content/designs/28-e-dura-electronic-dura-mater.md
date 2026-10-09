---
title: "e-dura (electronic dura mater)"
order: 28
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0007"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-06
description: "A soft implant with the shape and elasticity of the dura that carries electrodes and drug channels. EPFL, 2015: cortical recording in free-moving rats and supported stepping after paralysis with spinal electrical stimulation, drug delivery and rehabilitation."
modality: "Cortical surface"
successRank: 28
website: "https://www.science.org/doi/10.1126/science.1260318"
tags: ["soft implant", "silicone", "stretchable", "spinal cord", "chemotrode", "EPFL", "Europe", "preclinical"]
draft: false
---

# e-dura (electronic dura mater)

All rows follow the shared implant-device template. Measurements belong to the named configuration, cohort or bench test. A blank cell means the reviewed sources do not establish a value. Nonpenetrating contacts do not mean noninvasive surgery, and fatigue extrapolations are not observed clinical lifetimes.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Minev 2015 e-dura; seven-site spinal and 3 x 3 cortical configurations |
| Manufacturer | EPFL-led academic fabrication, not commercial clinical system |
| Interface class | Soft subdural cortical/spinal multimodal interface |
| Origin | Minev, Musienko and collaborators; EPFL with international collaborators |
| First demonstrated | 2015 Science report reviewed here |
| First human implant | Rodent study |
| Species studied | Lewis rats and Thy1-ChR2-YFP mice |
| Regulatory status | Preclinical animal research; no human authorization established |
| Function | Electrical recording/stimulation plus local drug delivery; external optical stimulation through transparent cortical device |
| Target tissue | Lumbosacral spinal subdural space or motor cortex, configuration-specific |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Stretchable silicone strip/surface array below dura, no penetrating electrode shanks |
| Array layout | Spinal: seven electrodes in 3-1-3 arrangement plus one fluidic channel; cortical: 3 x 3 electrode matrix |
| Electrode count | Seven spinal sites or nine cortical sites, not a universal combined count |
| Pitch | Full contact pitch/map not reported here; 3-1-3 arrangement is not a numerical pitch |
| Electrode lengths | No shanks; spinal strip spans approximately 25 mm x 3 mm lumbosacral region |
| Shank width and thickness | Main paper reports 120 µm substrate/encapsulated film; supplement fabrication starts with 100 µm PDMS plus retained 20 µm passivation, and adds 80 µm fluidic layer locally. Not uniform 120 µm total over all regions |
| Tip and exposed site geometry | 300 µm diameter composite electrode sites; fluid channel 100 x 50 µm cross section |
| Contact coating | Soft platinum-particle/PDMS composite |
| Insulation | PDMS encapsulation; microcracked 5/35 nm Cr/Au interconnect film |
| Insertion method | Spinal: two partial laminectomies and dural incisions, implant passed subdurally. Cortical: two cranial windows and subdural placement; separate acute mouse exposed cortex placement |
| Anchoring and fixation | Spinal protruding end stabilized by connective tissue; connector in vertebral orthosis, wires/tube routed to skull. Cortical edge sutured to dura |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Approximately 0.0707 mm² nominal disk area calculated from 300 µm diameter; porous composite effective area is higher and not identical |
| Electrode material | Platinum-silicone composite contact; Cr/Au interconnects |
| Impedance (with measurement frequency) | In vitro 5.2±0.8 kΩ at 1 kHz, n=28 electrodes. In vivo weekly values are a separate condition, not substituted with saline rating |
| Noise floor or SNR | Numerical recording noise/SNR not reported here |
| Recording modality | Electrocorticograms and evoked electrospinograms; muscle EMG recorded with separate electrodes |
| Sampling rate | 25 kHz external TDT acquisition in cortical and spinal recording Methods |
| Stimulation capability | Spinal electrical stimulation: main paper 40 Hz, 0.2 ms, 50-150 µA; supplement rehabilitation Methods 50-200 µA, and individual-contact mapping 20-150 µA. Different reported ranges retained, not reconciled into one rating. Serotonergic drug delivery through chemotrode; acute mouse optical stimulation is external 473 nm laser, not integrated LED |
| Charge injection limit | 57±9 µC/cm² per phase in PBS, cathodic-first 200 µs biphasic test vs SCE water window, n=4. Distinct cathodal charge storage 46.9±3.3 mC/cm² |
| Reference and ground | Cortical rat: lateral active site reference, skull screw wire ground. Spinal: vertebral reference; in vivo impedance counter wire in L1 vertebral body |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortex or spinal surface beneath dura |
| Insertion trauma and BBB disruption | Dural openings and spinal/cortical surgery required despite no electrode penetration; BBB injury unquantified |
| Vascular disruption risk |  |
| Micromotion sensitivity | Soft device conforms/elongates with spinal-cord model; stiff control wrinkles/compresses/slides. Bench fatigue to 20% strain one million cycles and five million 100 µA charge-balanced pulses (200 µs/phase), not a patient-motion or implant-lifetime measurement |
| Gliosis and encapsulation | At six weeks, soft implant astrocyte/microglia density not significantly different from sham, unlike stiff controls; minimal connective tissue. Not absence across all durations |
| Neuron loss near sites | Native-neuron loss rate not quantified in reviewed main-text outcomes |
| Foreign-body response mitigation | Mechanically matched silicone, stretchable interconnects and composite electrodes; study compares soft/stiff/sham implants |
| Typical failure modes | Mechanical mismatch caused stiff-control gait deficits/cord deformation. Gold microcracks deliberately provide stretchability, not an observed failed conductor |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Passive electrodes, stretchable conductors and chemotrode; external acquisition/stimulation |
| Data path | Wires to head-mounted socket and external TDT RZ2/PZ2; microfluidic capillary to external drug access port |
| Telemetry bandwidth | Not applicable to wired research system |
| Sampling rate | 25 kHz; cortical filter 0.1-5000 Hz, spinal filter 1-5000 Hz |
| Power | External recording/stimulation and drug-delivery hardware; no implanted battery reported |
| Thermal management |  |
| Packaging and hermeticity | Covalently bonded PDMS layers, silicone-protected soft-to-wire connection; not a multi-year hermetic electronics qualification |
| MRI compatibility |  |
| Surgical complexity | Spinal laminectomies/dural entry and exit, subdural passage, orthosis and subcutaneous wire/tube routing; cortical configuration uses cranial windows |
| Output connectors | Cooner multistranded insulated steel wires, 300 µm outer diameter, to 12-pin male Omnetics microcircular head socket; polyethylene fluid capillary 0.008 inch ID/0.014 inch OD |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Manufacturing pass fraction not reported; separate acute optogenetic mouse mapping demonstration |
| Chronic yield | Four-rat functional cohort: 28 electrodes/four chemotrodes evaluated five weeks; no generic contact-survival percentage |
| Stability over time | Weekly in vivo impedance stable over five weeks, daily drug injections functional; rat cortical state recordings weekly for three weeks; spinal responses at six weeks |
| Longevity | Five-to-six-week functional/tissue observations. Nearly decade claim is extrapolation from one-million-cycle bench fatigue, not implanted patient lifetime |
| Revision and explant experience | Terminal spinal explant and fluidic evaluations; clinical revision series not applicable |
| Adverse events | Soft cohort gait comparable to sham; stiff control deficits emerge at one-to-two weeks and worsen. Human adverse-event rate not reported |
| Notable demonstrations | Electrical plus serotonergic spinal stimulation enables supported stepping after severe contusion during six-week rehabilitation; not spontaneous cure or independent walking without therapy |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None in reviewed study |
| Preclinical cohort | Distinct groups: biocompatibility soft/stiff/sham four rats each; electrode/fluid tests four rats; spinal stimulation three rats; cortical recordings three rats; spinal recordings three rats; acute mouse count not reported. Do not sum as unique animals |
| Follow-up duration | Six-week tissue comparison/rehabilitation, five-week electrode-fluid monitoring; cortical rat recordings three weeks; acute mouse optical mapping |
| Indications | Preclinical brain-state recording and electrochemical spinal neuromodulation after paralysis |
| Trials and registries | Animal research; no human trial registry established here |
| Primary outcomes | Mechanics/fatigue, impedance/charge tests, inflammation/gait and cortical/spinal electrophysiology |
| Key limitations | Cortical/spinal layouts, bench cycles and animal cohorts are distinct. Small rodent cohorts; mechanical decade extrapolation not clinical lifetime; stepping combines stimulation, drugs and rehabilitation |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Compliance with moving tissue, electrical/chemical modalities and stable tested rodent response |
| Limitations | Multi-material fabrication, implanted wire/tube routing and small short-duration animal evidence |
| Scaling constraints | Electrode/fluidic layouts, stretchable traces, connector/orthosis and delivery constrain density; separate cortical/spinal configurations not merged |

## References

- Minev et al. 2015. [Electronic dura mater for long-term multimodal neural interfaces](https://www.science.org/doi/10.1126/science.1260318). [Full primary PDF hosted in MIT teaching materials](https://conformabledecoders.media.mit.edu/courses/2018/decoders%201.0/Stephanie%20Lacour/Electronic%20dura%20mater%20for%20long-term%20multimodal%20neural%20interfaces_2015.pdf). Dimensions, current and charge units checked in rendered pages.
- [Full supplementary Methods from EPFL](https://infoscience.epfl.ch/bitstreams/dcdbff5d-c42a-493c-87de-725acb6892bc/download). Distinct layouts, layered thickness, surgery, connector, cohort and acquisition.
