---
title: "Nanoelectronic thread (NET) probes"
order: 27
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0006"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "NET-50 and NET-10 ultraflexible electrodes: 50 x 1 µm and 10 x 1.5 µm cross sections, eight or four contacts. Four-month mouse recordings, fabrication losses and shuttle-delivery limits from the 2017 paper."
modality: "Intracortical"
successRank: 27
website: "https://www.science.org/doi/10.1126/sciadv.1601966"
tags: ["ultraflexible", "nanoelectronic thread", "NET", "chronic", "glial scar", "UT Austin", "Xie", "academic", "preclinical"]
draft: false
---

# Nanoelectronic thread (NET) probes

All rows follow the shared implant-device template. Measurements belong to the named configuration or study. Unreported means the reviewed sources do not establish a value. Injection yield, acute electrical recording and chronic histology are distinct results.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Luan 2017 NET-50 and NET-10 ultraflexible recording probes |
| Manufacturer | UT Austin academic fabrication |
| Interface class | Intracortical ultraflexible thread electrodes |
| Origin | Luan, Wei, Zhao and colleagues, University of Texas at Austin |
| First demonstrated | 2017 Science Advances report reviewed here |
| First human implant | Unreported; mouse preclinical study |
| Species studied | Male C57BJ/6 and Thy1-YFP transgenic mice |
| Regulatory status | UT Austin IACUC research; clinical authorization unreported |
| Function | Chronic sampled neural recording and tissue integration studies |
| Target tissue | Somatosensory and visual cortex |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Substrate-less ultraflexible thread delivered by temporary shuttle |
| Array layout | NET-50 four-layer linear contacts; NET-10 seven-layer contacts on two opposite surfaces |
| Electrode count | NET-50 eight contacts; NET-10 four. 33-pin connector is not channel count |
| Pitch | Contact pitch not pinned from reviewed text; approximately 200 µm achieved interprobe spacing is a different measure |
| Electrode lengths | Implantable thread length not assigned here; 2-3 mm is shuttle length, 5 mm is routing extent in fabrication discussion |
| Shank width and thickness | NET-50 average 50 µm wide x 1 µm thick; NET-10 10 µm x 1.5 µm |
| Tip and exposed site geometry | NET-50 30 x 30 µm electrodes; NET-10 10 x 20 µm electrodes. Exact thread outline not reconstructed |
| Contact coating | 100 nm Pt or Au electrode metallization, Methods; not assumed identical electrode material across every probe |
| Insulation | SU-8 multilayer dielectric; approximately 500 nm tested dielectric thickness to limit capacitive attenuation |
| Insertion method | Carbon fiber/tungsten shuttle micropost engages probe microhole, retracts after insertion. Shuttle as small as 7 µm, overall footprint as small as approximately 10 µm |
| Anchoring and fixation | Flexible segment routes to silicon carrier fixed with Metabond at skull; coverslip/Kwik-Sil protects cranial opening |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | NET-50 nominal planar 900 µm², NET-10 200 µm², calculated from reported rectangular dimensions; electrochemical effective areas unreported |
| Electrode material | Pt/Au options and 100 nm interconnect metallization; material/size differences drive impedance variation |
| Impedance (with measurement frequency) | Measured at 1000 Hz with Intan equipment; average decreases over first 1.5 months then stabilizes. No single graph-estimated family impedance assigned |
| Noise floor or SNR | Mean noise decreases first 1.5 months then stable; 19 electrodes show stable sortable-waveform average SNR across four months. Highest-SNR example above 30 is not a universal rating |
| Recording modality | Multi-unit and sortable single-unit extracellular action potentials under anesthesia |
| Sampling rate | 20 kHz |
| Stimulation capability | Not demonstrated by reviewed recording study |
| Charge injection limit | Unreported |
| Reference and ground | Bare Ag wire in contralateral hemisphere serves as grounding reference, Methods |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortical neurons near thread contacts |
| Insertion trauma and BBB disruption | 3 x 3 mm craniotomy with dura removed; transient local BBB leakage after surgery lasted at most one month in imaged tissue, not zero insertion injury |
| Vascular disruption risk | Vascular remodeling/repaired BBB by two months. Blood speed near probe 420±180 µm/s versus away 450±210 µm/s in measured capillaries |
| Micromotion sensitivity | Ultraflexibility reduces mechanical stress; neuron/probe interface still evolves. Neuron migration a few µm/month and waveform changes observed |
| Gliosis and encapsulation | Paper reports no observable chronic scar response in studied mouse imaging/histology; not generalized to all species, depths or durations |
| Neuron loss near sites | Normal density/resting microglia in five-month histology; small studied regions, not a universal zero-neuron-loss rate |
| Foreign-body response mitigation | Cell-scale cross section, ultralow bending stiffness and SU-8 interfaces designed for compliant integration |
| Typical failure modes | Fabrication defects in narrow interconnects, delivery buckling/pullout risks; no cracking/blistering/delamination observed in tested chronic probes |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Passive recording electrodes/interconnects; external active acquisition |
| Data path | Thread to silicon carrier and Molex 33-pin FFC, external 32-channel Intan RHD2132 system |
| Telemetry bandwidth | Not applicable to wired probe; not a fully wireless or free-floating implant |
| Sampling rate | 20 kHz; 300 Hz high-pass and 60 Hz notch for single-unit acquisition |
| Power | External amplifier/recording apparatus; implant active power consumption not applicable |
| Thermal management | Unreported |
| Packaging and hermeticity | SU-8 thread insulation, carrier/bonding region at skull; no fully implanted hermetic electronic system qualification |
| MRI compatibility | Unreported |
| Surgical complexity | Craniotomy/duratomy, delicate sequential shuttle placement, skull carrier/coverslip fixation |
| Output connectors | Molex series 502598, 33-pin flexible-flat connector on silicon carrier |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | 80 usable electrodes of 96 connected, 83.3% fabrication yield in chronic cohort; not same-neuron yield |
| Chronic yield | Approximately 75% multi-unit and 25% sortable-unit yield under anesthesia; 19 electrodes with sortable waveforms followed across four months |
| Stability over time | Twice-monthly recordings improve first 1.5 months, stable for following 2.5 months. Trackable minor waveform changes in 18/19 electrodes; not all 80 tracking one neuron |
| Longevity | Four-month electrical study; five-month histology is separate. Years-scale service life not established |
| Revision and explant experience | Thread cannot conveniently be advanced to another region like movable rigid probe; clinical revision/explant experience unreported |
| Adverse events | Transient BBB leakage/imaging surgical injury documented; numerical clinical complication rates unreported |
| Notable demonstrations | Stable sampled unit recording in seven mice plus longitudinal tissue/vascular imaging and postmortem histology |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None in reviewed study |
| Preclinical cohort | 16 probes in seven mice, 80 electrodes from 96 connected; imaging/histology subsets not assumed identical to every electrical channel |
| Follow-up duration | Four months twice-monthly electrical recordings; imaging up to 3.5 months and histology at five months |
| Indications | Experimental chronic neural recording, not demonstrated assistive clinical device |
| Trials and registries | UT Austin IACUC research, human registry not applicable |
| Primary outcomes | Impedance/noise trends, unit yields/waveforms, BBB repair and tissue histology |
| Key limitations | Small mouse cohort, anesthetized sampled measurements; four months is not lifetime. Later modular NET hardware has its own scale/evidence |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Very small tissue displacement and stable sampled units with recovered local tissue structures |
| Limitations | Fragile fabrication/delicate shuttle delivery, skull-connected carrier, inability to reposition after implantation |
| Scaling constraints | Seven manual lithography steps/three metal depositions; 2-3 µm traces over 5 mm vulnerable to defects. Three minutes per placement observed; 12 in 40 min is an estimate |

## Published hardware

| Field | NET-50 | NET-10 |
| --- | --- | --- |
| Width | 50 µm average | 10 µm |
| Total thickness | 1 µm | 1.5 µm |
| Layer layout | Four layers | Seven layers |
| Contacts per probe | Eight, in a linear array | Four, on two opposite surfaces |
| Electrode size | 30 x 30 µm | 10 x 20 µm |

The methods describe SU-8 insulating layers, platinum or gold electrodes and interconnects with 100 nm metal thickness, and about 500 nm dielectric thickness for the tested geometry. A 33-pin flexible-flat connector was mounted to contact pads on the silicon carrier. These are fabrication details, not a claim that all 33 connector pins are recording channels.

The paper's PDF visibly uses micrometres for the probe and electrode sizes. Text extraction can lose the Greek mu and display "mm"; the dimensions above were checked against the rendered paper, including Figures 1 and the methods.

## Delivery

The probes are too flexible to penetrate brain tissue by themselves. A temporary carbon-fiber or tungsten-wire shuttle carries a micromilled post that engages a hole in the probe. After delivery, the shuttle retracts and leaves the thread in tissue. Shuttle diameters were as small as 7 µm, and the authors report an overall insertion footprint as small as about 10 µm.

The experiments used a craniotomy with dura removal. The flexible segment connected the probe to bonding pads on a silicon carrier fixed to the skull. This is not a free-floating or fully wireless implant.

## Four-month evidence

Sixteen probes were implanted in the somatosensory and visual cortices of seven mice. The study included 80 electrodes from 96 connected electrodes, reported as 83.3% fabrication yield. Electrical recordings were taken under anesthesia twice a month for four months, not continuously throughout that period.

Recording performance improved over the first 1.5 months, then stayed stable for at least another 2.5 months until the experiment ended. Nineteen electrodes supplied sortable action potentials whose average amplitude and signal-to-noise ratio stayed stable across the four-month period. That is not a claim that all 80 electrodes tracked the same neuron.

In vivo two-photon imaging and postmortem histology supported the authors' report of glial-scar-free integration and recovered local vasculature in the studied mouse tissue. These observations do not establish that tissue response is absent in every species, depth or implantation duration.

## Failure and scale limits

The authors attribute fabrication losses mainly to defects. Seven manual photolithography steps and three metal depositions made particles and scratches hard to avoid; 2 to 3 µm interconnects routed over 5 mm were vulnerable to microdefects. Automated photolithography was proposed as an improvement, not demonstrated here.

An implanted thread cannot conveniently be advanced later to another brain region like a movable rigid probe. The authors report about three minutes per delivery, closest achieved interprobe spacing around 200 µm and initial positioning uncertainty up to 30 µm. Their estimate of 12 probes within 40 minutes is a scaling estimate, not an observed 12-probe timed procedure.

Four-month stability warrants longer studies; it does not establish years of service. This entry does not call the project a dead end. Full thread outline, contact pitch and routing geometry are not reconstructed into a 3D model from photographs.

## Later hardware

The [2022 modular NET platform](/devices/71-modular-net-high-density-arrays/) uses 128-channel modules and shows larger rodent cortical recordings. Its scale and follow-up belong to that later hardware, not to the 2017 probes.

## References

- Luan L, Wei X, Zhao Z, et al. [Ultraflexible nanoelectronic probes form reliable, glial scar-free neural integration](https://www.science.org/doi/10.1126/sciadv.1601966). Science Advances 3:e1601966, 15 February 2017.
- [Full paper hosted by UT Austin's Functional Optical Imaging Laboratory](https://foil.bme.utexas.edu/publication/luan-2017/luan-2017.pdf). Hardware: Results, Figure 1 and methods; cohort: Results; fabrication and delivery limits: Discussion. PDF pages 1, 2, 6 and 7 inspected visually.
- [Primary abstract and affiliations](https://pubmed.ncbi.nlm.nih.gov/28246640/).
