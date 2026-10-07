---
title: "Syringe-injectable mesh electronics"
order: 23
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0002"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-06
description: "Sub-micrometre-thick, centimetre-scale mesh electronics that unfold after injection through a needle as small as 100 µm. Harvard, 2015, in mouse brain."
modality: "Intracortical"
successRank: 23
website: "https://www.nature.com/articles/nnano.2015.115"
tags: ["mesh electronics", "injectable", "flexible", "Lieber", "Harvard", "chronic", "academic", "preclinical"]
draft: false
---

# Syringe-injectable mesh electronics

All rows follow the shared implant-device template. Measurements belong to the named configuration or study. Unreported means the reviewed sources do not establish a value. Injection yield, acute electrical recording and chronic histology are distinct results.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Liu 2015 syringe-injectable mesh; passive Pt recording configuration distinguished from nanowire FET/strain variants |
| Manufacturer | Harvard/NCNST academic fabrication |
| Interface class | Syringe-delivered intracortical mesh recording interface |
| Origin | Liu, Fu, Cheng and collaborators; Harvard and National Center for Nanoscience and Technology, Beijing |
| First demonstrated | 2015 Nature Nanotechnology report; earlier scaffold work is not the same injection demonstration |
| First human implant | Unreported; reviewed study uses mice |
| Species studied | Adult male C57BL/6J and GFAPGFP transgenic mice |
| Regulatory status | Preclinical Harvard animal research approval; clinical authorization unreported |
| Function | Injected mesh metal electrodes record LFP and spikes; distinct FET versions also tested for injection/strain sensing |
| Target tissue | Hippocampus and lateral ventricle, reached through cortex |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Macroporous flexible mesh injected and unfolded within tissue/cavity |
| Array layout | Polymer/metal/polymer ribbons. Brain sample #4: 2 mm mesh width, 20 µm ribbons, 333/250 µm longitudinal/transverse cell lengths; ventricular sample #5: 2 mm width, 5 µm ribbons, 62.5/62.5 µm cells. Both 45° tilt, Supplementary Table 1 |
| Electrode count | Acute mouse example: 16 Pt electrode recording channels; 32-channel external amplifier is not implanted count |
| Pitch | No universal contact pitch; 333/250 µm and 62.5/62.5 µm mesh-cell lengths belong to sample #4/#5, not contact pitch |
| Electrode lengths | No rigid shank; centimetre-scale overall mesh samples in injection tests, not universal implanted length |
| Shank width and thickness | No shank. SU-8 bottom/top each 300-400 nm, metal interconnect 50-100 nm plus adhesion layers; ribbon widths 5-40 µm depending on design |
| Tip and exposed site geometry | 20 µm diameter passive Cr/Pt pads, supplement section 2.3; bend-out versions are distinct |
| Contact coating | Cr/Pt 5/50 nm passive pad metallization; poly-D-lysine treated mesh after release |
| Insulation | Patterned SU-8 supporting/passivating layers; active sites exposed |
| Insertion method | Glass needle 100-200 µm inner diameter in acute recording; 95 µm ID saline injection example is separate. Injection synchronized with needle withdrawal |
| Anchoring and fixation | I/O region delivered outside brain onto ceramic scaffold, ACF bonded to flexible cable; not fully free-floating wireless hardware |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Approximately 314 µm² nominal circular planar area from 20 µm diameter, calculated; electrochemical effective area unreported |
| Electrode material | Pt recording face on Cr adhesion layer; Cr/Au/Cr address lines separate from Pt contacts |
| Impedance (with measurement frequency) | Approximately 950 kΩ at 1 kHz for acute Pt-electrode configuration, Figure 4. Post-injection impedance change below 7% is a different bench measurement |
| Noise floor or SNR | Absolute RMS noise/SNR unreported here; acute example spikes approximately 70 µV peak-to-peak, not a noise-floor rating |
| Recording modality | LFP across 16 channels and single-unit waveform example from hippocampus under anesthesia |
| Sampling rate | 20 kHz brain recording; 1 kHz nanowire strain acquisition is a separate system |
| Stimulation capability | Neural stimulation not demonstrated in reviewed brain-recording study; future multifunctional use proposed |
| Charge injection limit | Unreported in reviewed sources |
| Reference and ground | Ag/AgCl electrode as reference in acute brain recordings, Methods |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Hippocampal tissue or ventricular cavity, configuration-specific |
| Insertion trauma and BBB disruption | 0.5 mm skull hole, incised/resected dura and penetrating injection needle; not noninvasive. BBB leakage not quantified |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Very low bending stiffness proposed to reduce motion stress; quantitative in vivo motion-transfer result unreported |
| Gliosis and encapsulation | Five-week slices show limited/background-like GFAP near mesh across three independent hippocampal injections; not lifetime absence of immune response |
| Neuron loss near sites | Healthy NeuN-positive cells near ribbons, but paper explicitly notes reduced cell density at central injection region; do not label injury-free |
| Foreign-body response mitigation | Open ultrasoft mesh and cell-scale ribbons; poly-D-lysine treatment. Tissue results are five-week study-specific |
| Typical failure modes | Some FET devices lost after smallest-needle injection; thin-film and zero-angle controls compress/crumple. Broken ribbons in histology are described as slicing damage, not proven implant failure |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Passive Pt recording version; nanowire FET variants separate. No implanted wireless processor in demonstrated brain recording |
| Data path | Mesh I/O outside tissue to ACF-bonded Molex PREMO-FLEX cable and external Intan RHD2132 evaluation system |
| Telemetry bandwidth | Not applicable to wired acute recording; wireless integration is future work |
| Sampling rate | 20 kHz, 60 Hz notch; single-unit analysis 300-6000 Hz bandpass |
| Power | External amplifier/recording system; passive recording contacts, implanted power consumption unreported |
| Thermal management | Unreported in reviewed sources |
| Packaging and hermeticity | SU-8 passivation and external bond/cable; no full hermetic implanted system or multi-year qualification |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Stereotaxic skull opening, dural incision, needle placement, synchronized injection/retraction and external I/O bonding |
| Output connectors | ACF AC-4351Y bond to Molex PREMO-FLEX FFC/FPC cable, external Intan acquisition |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Metal device yield above 94% with below 7% average impedance change after bench injection. FET yield above 90% at 260-600 µm ID, 83% at 100 µm ID. Not chronic neural-channel yield |
| Chronic yield | No longitudinal neural-channel survival percentage established in this 2015 paper |
| Stability over time | Five-week tissue integration/histology; neural electrical example is acute, not five weeks of continuous recording |
| Longevity | Five-week implant tissue observation; maximum functional recording lifetime unreported |
| Revision and explant experience | Postmortem tissue slicing includes ribbon breakage; clinical revision/explant experience unreported |
| Adverse events | Central injection-region cell-density reduction noted; general surgical complication rates unreported |
| Notable demonstrations | Acute 16-channel hippocampal LFP 200-400 µV, 1-4 Hz; approximately 70 µV single-unit waveform. Bench injection of wide mesh through narrow needles is separate |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None in reviewed study |
| Preclinical cohort | Mouse tissue and acute recordings; three independent hippocampal injections in quantitative histology analysis, total unique mice/recording cohort not established here |
| Follow-up duration | Five-week tissue slices and separate acute electrical recordings |
| Indications | Preclinical intracranial sensing; strain sensing in synthetic structures is not a clinical neural indication |
| Trials and registries | Harvard animal committee approval; human registry not applicable |
| Primary outcomes | Injection yield, unfolding/integration, GFAP/NeuN profiles and acute recording feasibility |
| Key limitations | Needle ID is not outer diameter or injury footprint; five-week histology does not establish chronic electrical reliability; each mesh/FET configuration has its own yield |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Delivers wide ultrasoft mesh through a small needle and permits cell interpenetration |
| Limitations | Needle/dural trauma, central injection injury, external bonding and uncertain chronic electrical reliability |
| Scaling constraints | Final geometry depends on tissue/cavity relaxation and injection synchronization; higher density/chronic wireless systems require separate hardware evidence |

## References

- Liu et al. 2015. [Syringe-injectable electronics](https://www.nature.com/articles/nnano.2015.115). [Full primary text via PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4591029/). Acute recording and five-week tissue observations kept separate.
- [Full supplementary methods and figures](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fnnano.2015.115/MediaObjects/41565_2015_BFnnano2015115_MOESM5_ESM.pdf). Fabrication, variant geometry, 20 µm metal pads, surgery and acquisition.
