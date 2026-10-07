---
title: "Neuropixels Opto: cortical activation and inhibition"
order: 141
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0051"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
modality: "Intracortical"
description: "Separate mouse preparations test local excitatory activation and circuit-mediated inhibition. The opsin drives inhibitory neurons; it does not directly hyperpolarize every silenced cell."
website: "https://www.nature.com/articles/s41592-026-03076-z"
orgs: ["46-allen-ucl-neuropixels-opto-collaboration"]
devices: ["107-neuropixels-opto-photonic-prototype"]
tags: ["Neuropixels Opto", "photonics", "optogenetics", "Allen Institute", "UCL", "IMEC", "prototype"]
draft: false
---

# Local cortical activation and synaptic inhibition

The [Neuropixels Opto prototype](/devices/107-neuropixels-opto-photonic-prototype/) combines selectable electrical recording with spatially addressed red-light stimulation. The 2026 paper reports two separate cortical experiments. They are not pooled as one mouse cohort or interpreted as the same opsin directly activating and silencing all cells.

This is a component-study view of the [paper-level overview](/applications/108-neuropixels-opto-mouse-optotagging-2026/), not an additional cohort or independent replication.

## Activating excitatory populations

Methods describe four adult experimental mice, two wild-type males and two double-transgenic females. Three receive red-sensitive ChRmine in CaMK2-positive excitatory neurons. A fifth wild-type male without an opsin is an additional control.

The reported local red-light activation and recording comparison uses 13 probe insertions in the three ChRmine mice. Median single-unit yield is 0.23 per site, compared with 0.22 per site in a separate Neuropixels 1.0 dataset with its own cohort and quality criteria. These are not 23% and 22% electrode production yields.

The activated population spans 151 ± 71 µm vertically at full width half maximum across the 13 insertions. The paper calls this a lower bound because only some activated neurons are recorded. It is not exact single-cell targeting or a tissue-volume guarantee. The visual-stimulus and surface-laser baselines establish recordable populations across cortex; they are not additional Opto emitters.

A region without the opsin and the opsin-free mouse provide controls against non-optogenetic light effects. Mice are habituated to head-fixed recording; the device remains connected to optical fibers and electrical cables. The interval for viral expression is not chronic implantation of this prototype.

## Driving an inhibitory circuit

A separate cohort has two adult females and one adult male, transgenic for GCaMP8s in CaMK2-positive cells. A DLX2.0 enhancer virus drives the red-sensitive depolarizing opsin ChrimsonR in putative inhibitory forebrain neurons.

Red pulses activate some recorded neurons and reduce activity in others over nine sessions in three mice. Narrow-waveform, putative fast-spiking units are primarily activated, while putative pyramidal units are primarily suppressed. Cross-correlograms are consistent with some putative monosynaptic inhibitory relationships. Waveform-based cell identities remain putative.

ChrimsonR depolarizes cells that express it. The reduction in other cells' activity is interpreted as synaptic inhibition, not a direct inhibitory optical output in every silenced cell. Responses depend on emitter depth and light intensity. No stimulation-guided behavior, seizure treatment or human benefit is tested.

## Limits

Both assays rely on genetic targeting, head fixation, preprocessing and insertion-based electrical recording. Light scatters and opsins extend into neural processes, so the emitter's outline does not isolate a single cell. Sharp light artifacts are corrected rather than denied. These local circuit results do not establish a full closed-loop nervous-system simulation or a durable clinical implant.

The [paper-grounded collaboration brief](/companies/46-allen-ucl-neuropixels-opto-collaboration/) links the participating organizations without assigning each circuit or experiment to an inferred owner.

## Primary sources

- [2026 peer-reviewed full paper](https://www.nature.com/articles/s41592-026-03076-z): methods, recording/illumination architecture and animal results. Published June 1, 2026. This is used instead of carrying forward the 2025 preprint as a separate device.
- [Published supplement](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM1_ESM.pdf): Tables 1-2 and additional control/field-potential data. Table 2 distinguishes 2019 design targets from 2023 prototype results.
- [Reporting summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM2_ESM.pdf): randomized stimulus conditions, no blinding and no planned sample-size calculation; it says no data were excluded, while the paper still applies unit-quality and optotagging criteria.
