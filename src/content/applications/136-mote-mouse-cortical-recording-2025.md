---
title: "MOTE: mouse cortical recording, 2025"
order: 136
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0048"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Six mice carry eight MOTEs across surface and intracortical tests. Four of six embedded devices provide decoded LFPs; a weakened day-365 signal in one mouse requires averaging."
website: "https://www.nature.com/articles/s41928-025-01484-1"
devices: ["135-mote-optoelectronic-tetherless-recorder-2025"]
modality: "Other"
tags: ["MOTE", "Cornell", "optical", "wireless", "recording", "preclinical"]
draft: false
---

# Mouse cortical recording with MOTE

The [2025 MOTE](/devices/135-mote-optoelectronic-tetherless-recorder-2025/) records electrical activity in awake, head-fixed mice while a motorized rod touches a whisker. Optical power and telemetry remove the implant wire, not the cranial-window surgery or external measurement apparatus.

## Cohorts and placement

The primary text reports six implanted mice: two with surface devices for ECoG and four with devices inserted into barrel cortex. The reporting summary gives eight MOTEs total across the six mice. Within the intracortical subgroup, six MOTEs are embedded in four mice; this is not eight intracortical implants or eight animals. A separate dummy-device group supplies preliminary histology and is not added to the active recording cohort without a grounded denominator.

Methods use male and female C57BL/6J and B6.Cg-Tg(CAG-DsRed*MST)1Nagy/J mice aged 2-10 months. Transgenic fluorescence supports some imaging, but MOTE records voltage directly and does not require a neural activity indicator. No optogenetic stimulation is used for the whisker experiment.

Devices are inserted through a five-millimetre cranial opening using a pipette-coupled nanoinjector. A quartz window and head bar are fixed with dental cement. Recorded cortical devices lie around layers 1-3, roughly 100-400 µm deep. This is not intact-skull optical communication or a six-millimetre implantation study.

## Results and failures

Four of the six intracortical MOTEs in mice 1-3 provide LFP recordings. One in mouse 3 is too deep for reliable PPM decoding; one in mouse 4 appears damaged during preparation. These failed devices remain part of the evidence rather than disappearing from the denominator.

Mouse 2 supplies stimulus-correlated spikes on days 13 and 102. Mouse 1 supplies LFPs on days 4, 161 and 304, with a weaker response still measured on day 365. The last result requires averaging across traces. It is not a year of unchanged single-unit tracking across all mice or continuous uninterrupted recording.

A rod-moving-but-not-touching control lacks the LFP response, supporting a biological whisker-evoked signal rather than a simple electrical artifact. LFP and spike traces are filtered separately, at 10-250 Hz and 300-4,000 Hz. The reporting summary lists three additional MOTEs for the separate cardiomyocyte validation; those are not brain implants.

## Long-term constraints

MOTEs drift approximately 50-300 µm, both vertically and laterally. The supplement reports greater motion between days 296 and 365 and suggests foreign-body effects at the electrodes and possible head-bar/window changes as reasons for weaker signals. Main text notes head-bar sites degrading near day 300. Mouse 1 is euthanized on day 369 after its last day-365 measurement.

Optical PPM pulses persist after extraction, supporting circuit operation without proving an unchanged electrode-tissue interface. Preliminary six-month MOTE histology compares with three-month optical-fibre implants and same-window control areas. The authors call it preliminary, and the window itself causes a foreign-body response. No blanket lifetime safety or absence of inflammation is inferred.

The reporting summary says measurements were periodic up to nine months, while the paper and supplement document the later day-365 test. Both time descriptions are retained. It lists no data exclusions, describes random implant positions rather than randomized treatment groups, and reports separate measurement and processing researchers without complete blinding.

## Evidence boundary

No freely moving neural recordings, human implantation, behavioral decoding BCI, autonomous feedback, neuron identity preserved for a year or high-yield multi-implant network is established. The optical implant and its external link are demonstrated research hardware, with depth, orientation and preparation failures visible.

## Primary sources

- [Published paper](https://www.nature.com/articles/s41928-025-01484-1): Figures 5-6, cortical validation, surgery, recording and microscopy methods.
- [Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-025-01484-1/MediaObjects/41928_2025_1484_MOESM1_ESM.pdf): Section 5 and depth limits.
- [Reporting Summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-025-01484-1/MediaObjects/41928_2025_1484_MOESM2_ESM.pdf): cohort, periodic measurements and blinding.
