---
title: "Neuropixels 2.0: chronic rodent tracking, 2021"
order: 89
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0024"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Alpha probes and motion correction track visual-cortex units across days and weeks, with cohort-specific tracking estimates and an explicit one-mouse discontinuity. Sequential sites are not simultaneous channels."
modality: "Intracortical"
website: "https://www.science.org/doi/10.1126/science.abf4588"
tags: ["Neuropixels", "2.0", "chronic", "rodent", "motion correction", "preclinical"]
devices: ["88-neuropixels-20-alpha-probe"]
orgs: []
draft: false
---

# Chronic rodent recordings with Neuropixels 2.0

The 2021 study uses [alpha Neuropixels 2.0 hardware](/devices/88-neuropixels-20-alpha-probe/) and motion-correction software. It evaluates long-term recordings in mice and rats and gives a visual-response assay for testing whether units tracked across days represent the same neurons.

## What the tracking test measures

In visual cortex, responses to 112 natural images form a visual fingerprint. Similarity of these responses across sessions helps test the identity of algorithmically tracked units against nearby alternatives. It is not a direct anatomical label for every recorded neuron.

| Session separation | Reported tracking estimate and cohort |
| --- | --- |
| Up to 16 days | 93% ± 9% of well-isolated units; mean ± SD across 36 shanks, 1,110 units, 15 sessions, three mice |
| Three to nine weeks | 85% ± 19%; 638 units, 30 shanks, 11 recordings, three subjects |

These are selected well-isolated units in the reported assay, not percentages of all electrode sites or a guarantee for every brain region.

## Explicit loss and interpretation

One of the three mice showed a discontinuity with loss of almost all tracked units. The authors speculate that a non-coaxial probe-brain shift caused it; the cause was not confirmed. Units could still be tracked across session pairs on the same side of that discontinuity. Fingerprint similarity also decreased with longer session separation.

Motion correction addresses measurable axial drift. This example shows why it must not be presented as preventing every mechanical shift or preserving every neuron indefinitely.

## Sequential banks versus channels

Figure 1E shows data from 6,144 sites across two four-shank probes. Those sites were accessed in eight sequential recording epochs, each using 768 sites across the two probes. The figure is not a 6,144-channel simultaneous recording. Each probe supplies 384 readout channels from its larger set of physical sites.

## Study boundary

These results support chronic small-animal electrophysiology, probe-recovery hardware and analysis. The paper uses alpha devices and does not demonstrate a chronic human clinical implant or assistive-device-control outcome. Proposed beta improvements are future hardware in this source, not tested results.

## Primary sources

- [2021 full report, tracking cohorts and methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/).
- [Publisher article](https://www.science.org/doi/10.1126/science.abf4588).
