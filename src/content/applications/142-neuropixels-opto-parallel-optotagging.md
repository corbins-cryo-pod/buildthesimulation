---
title: "Neuropixels Opto: parallel cell-type optotagging"
order: 142
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0052"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
modality: "Intracortical"
description: "261 tagged units across 40 sessions in 26 mice, using distinct blue/red opsin strategies. Count denominators, dual-color cross-sensitivity and unit-quality thresholds remain explicit."
website: "https://www.nature.com/articles/s41592-026-03076-z"
orgs: ["46-allen-ucl-neuropixels-opto-collaboration"]
devices: ["107-neuropixels-opto-photonic-prototype"]
tags: ["Neuropixels Opto", "photonics", "optogenetics", "Allen Institute", "UCL", "IMEC", "prototype"]
draft: false
---

# Parallel cell-type optotagging

The [Neuropixels Opto probe](/devices/107-neuropixels-opto-photonic-prototype/) records neural spikes electrically while laser-fed emitters test optogenetic responses. The 2026 paper tags 261 units over 40 sessions in 26 mice. The method identifies cells meeting a response rule; it does not classify every neuron from electrical waveform alone.

This is a component-study view of the [paper-level overview](/applications/108-neuropixels-opto-mouse-optotagging-2026/), not an additional cohort or independent replication.

## Genetic strategy and readout

Methods describe 26 adult mice, 11 males and 15 females, with different transgenic lines and viral strategies. Blue-sensitive CoChR labels one population; red-sensitive ChRmine, ChrimsonR or related opsins label another. Examples separate D1 and D2 medium spiny neurons, cholinergic interneurons and populations in the midbrain.

A blue-sensitive cell responds to blue rather than red. A red-sensitive opsin can respond to both colors because of spectral overlap. The analysis therefore treats cells tagged by both colors as red-tagged. Two colors are not inherently two independent, mutually exclusive cell identities without the expression strategy and response rules.

The mouse can run on a disc while head-fixed, with a recording headframe. This is not freely roaming wireless operation. Ex-vivo photocurrent measurements compare opsins separately and do not count as additional in-vivo tagging sessions.

## Tagging criteria

The protocol uses 10-ms pulses at 20 Hz. Tagged units must respond significantly to at least four of five pulses, have response reliability above 30%, and latency below 8 ms. The Results wording names at least one spike in 30% of trials, while Methods use a strict reliability threshold above 0.3; both phrasings are retained rather than deciding a boundary-case unit from prose alone.

One striatal recording tags 25 of 39 recorded units. That example is not the overall tagging fraction across 26 mice. The 261 total includes 83 red-tagged units from 25 sessions and 178 blue-tagged units from 26 sessions. Those session subsets overlap within the 40-session total and must not be added to create 51 independent sessions.

The full-session quality criteria include ISI violation ratio below 0.5, amplitude cutoff below 0.1 and presence ratio above 0.8. Some illustrated low-baseline-rate cells satisfy a separate baseline ISI criterion. Those plotted categories are retained rather than treating every dot as the same quality-controlled population.

## Coverage and limits

The relative-position analysis finds no gap in tagging coverage at the tested 100-µm emitter spacing. This means no gap within that measurement and set of tagged units, not a guarantee that every surrounding cell is illuminated or identifiable. Neurons tend to lie below their driving emitter, consistent with the directional optical profile.

Some blue-light responses occur from distant emitters. The authors describe leaked light and the need for recalibration as a possible cause. Optical selectivity therefore remains constrained by the prototype's blue material instability, scattering and opsin distribution.

The reporting summary says no data were excluded, but explicit spike-quality and response filters still determine the analyzed unit set. Tagging 261 units is not 261 command channels, closed-loop behavioral control or a human trial.

The [paper-grounded collaboration brief](/companies/46-allen-ucl-neuropixels-opto-collaboration/) links the participating organizations without assigning each circuit or experiment to an inferred owner.

## Primary sources

- [2026 peer-reviewed full paper](https://www.nature.com/articles/s41592-026-03076-z): methods, recording/illumination architecture and animal results. Published June 1, 2026. This is used instead of carrying forward the 2025 preprint as a separate device.
- [Published supplement](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM1_ESM.pdf): Tables 1-2 and additional control/field-potential data. Table 2 distinguishes 2019 design targets from 2023 prototype results.
- [Reporting summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM2_ESM.pdf): randomized stimulus conditions, no blinding and no planned sample-size calculation; it says no data were excluded, while the paper still applies unit-quality and optotagging criteria.
