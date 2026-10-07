---
title: "CHIME: acute mouse olfactory-bulb recordings,2020"
order: 110
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0034"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Anesthetized mouse olfactory-bulb CHIME recordings:200-wire MEA1k bundles,156 ±36 good-SNR connected pixels across seven experiments,23-minute to2-hour sessions. No invented mouse count or chronic yield."
modality: "Intracortical"
website: "https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2020.00834/full"
devices: ["109-chime-glass-gold-microwire-cmos"]
tags: ["CHIME", "mouse", "olfactory bulb", "acute", "European-secondary", "preclinical"]
draft: false
---

# Acute CHIME mouse recordings

The 2020 paper uses [CHIME glass-gold microwires](/devices/109-chime-glass-gold-microwire-cmos/) for olfactory-bulb recordings in anesthetized C57BL/6 mice of both sexes, 4-6 weeks old. It tests MEA1k and a modified Cheetah camera CMOS readout. This is not an awake assistive-control or chronic-implant study.

## Reported recording scope

With 200-wire bundles on MEA1k, the paper reports 156 ± 36 connected pixels with good signal-to-noise across seven experiments. It does not equate seven experiments with seven unique mice. Connected pixels are not a sorted-neuron count or a one-to-one electrode yield.

Sessions began immediately after implantation and lasted 23 minutes to 2 hours, averaging 63 minutes. Measurements at different locations lasted 10-40 minutes. The reported stable amplitudes/waveforms over 40 minutes do not establish weeks of stable implantation.

Figure 6E shows spike events on 86 channels during an example odor presentation lasting 1 second. This example is separate from the mean connected-pixel statistic and from the camera's 327,680-pixel capacity.

## Readout tradeoffs

MEA1k selects connected pixels and offers offset cancellation/filtering. The camera streams a rectangular region that includes both connected and unconnected pixels; voltage traces are extracted afterward. Its pixel-amplifier behavior reduces the LFP amplitude, and drifts can cause saturation. Both readouts show single-unit spikes in the paper, without a pooled sorted-unit yield being invented here.

## What remains untested

The paper calls for chronic tissue-damage and functional studies for recordings lasting days to months. Prospective untethered use, wireless transmission and much larger bundle counts are discussed as possibilities, not outcomes. Related vascular studies do not turn these acute data into blanket safety evidence.

## Primary sources

- [Published CHIME primary paper](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2020.00834/full), Methods, neuronal recordings, Discussion and Figure 6.
- [Primary archive](https://pmc.ncbi.nlm.nih.gov/articles/PMC7432274/).
