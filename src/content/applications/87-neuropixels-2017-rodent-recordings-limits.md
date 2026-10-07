---
title: "Neuropixels: 2017 rodent recordings and reported failures"
order: 87
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0023"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "The original Neuropixels study records more than 700 isolated neurons with two probes and reports chronic event-rate stability alongside electronic damage, local activity loss and late implant detachment."
modality: "Intracortical"
website: "https://www.nature.com/articles/nature24636"
tags: ["Neuropixels", "rodent", "chronic", "failures", "historical", "preclinical"]
devices: ["04-neuropixels-probe"]
orgs: []
draft: false
---

# Original Neuropixels rodent recordings

Jun and colleagues' 2017 paper describes a multi-phase probe development and recording program, with affiliations including Janelia, UCL, imec and the Allen Institute. The linked [1.0 hardware entry](/devices/04-neuropixels-probe/) keeps the original 20 µm shank thickness distinct from the manufacturer's later 24 µm specification.

## Large-population recording

Two probes recorded more than 700 well-isolated neurons simultaneously across five structures in an awake mouse. This is a two-probe result, not a yield from one 384-channel probe. The paper also demonstrates recordings in freely moving rodents.

## Chronic metrics and limits

Extended Data Figure 5 reports chronic rat medial-prefrontal-cortex recordings across development phases. Across 14 probes in phases 2 and 3, spiking activity generally did not decline over the eight-week observation, with an explicit exception: the upper half of one distal recording array lost nearly all activity during the first 30 days while the lower approximately 1.9 mm remained stable.

The activity metric counts time-coincident spikes on contiguous sites exceeding a threshold. Stability of this metric is not proof that every neuron remains identifiable across every session, or that all hardware survives indefinitely.

## Failures the paper reports

- Amplified, switchable probes were electronically damaged before enough recording data could be collected in the phase-3 chronic comparison.
- One probe's upper recording region lost nearly all activity over 30 days, despite stability in its lower region.
- Three of 16 implants detached from the skull after 223-482 days.
- Surgical-wound irritation required euthanasia in some animals, always after more than 20 weeks; the caption does not supply a separate count for this outcome.

These counts refer to different cohorts and events. They are not pooled into a single failure rate. The study does not report a universal chronic lifetime, clinical qualification or a completed human BCI trial.

## Primary sources

- [2017 full text, including Extended Data Figures 4 and 5](https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/).
- [Publisher article and captions](https://www.nature.com/articles/nature24636).
