---
title: "Neuropixels Opto: mouse circuit control and optotagging, 2026"
order: 108
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0033"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Published mouse experiments: acute cortical activation, circuit-mediated suppression and 261 optotagged units across 40 sessions in 26 mice. Cohorts and quality criteria are separated; no chronic assistive BCI claim."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41592-026-03076-z"
orgs: ["46-allen-ucl-neuropixels-opto-collaboration", "50-ucl-carandini-lab", "51-imec"]
devices: ["107-neuropixels-opto-photonic-prototype"]
tags: ["Neuropixels", "Opto", "mouse", "optotagging", "optogenetics", "Allen", "Washington", "UCL", "preclinical"]
draft: false
---

# Mouse optogenetics with Neuropixels Opto

The June 2026 published paper uses [Neuropixels Opto](/devices/107-neuropixels-opto-photonic-prototype/) to record neural activity while delivering spatially addressed red and blue light. It tests laboratory circuit manipulation and identification of genetically defined cell classes. It is not a human assistive-control trial.

This is the paper-level overview, not an additional animal cohort. The [cortical activation and circuit-inhibition entry](/applications/141-neuropixels-opto-cortical-activation-inhibition/) and [parallel-optotagging entry](/applications/142-neuropixels-opto-parallel-optotagging/) provide narrower experimental views of these same results. The [Allen Institute](/companies/46-allen-ucl-neuropixels-opto-collaboration/) links the paper-grounded team.

## Distinct experiments

| Experiment | Evidence scope |
| --- | --- |
| UCL cortical activation | Acute primary visual cortex recordings in awake, head-fixed mice; 13 recordings in three ChRmine-expressing mice for the reported unit-yield comparison |
| Activation preparation | Four experimental adult mice plus a separate no-opsin control described in Methods; these are not all the yield-analysis cohort |
| Washington cortical circuit manipulation | Three adult mice; nine sessions. Red-sensitive ChrimsonR targeted putative inhibitory neurons with the DLX 2.0 enhancer |
| Allen subcortical optotagging | 261 tagged units across 40 sessions in 26 adult mice (11 male, 15 female), using multiple lines/opsins |

These are separate scopes, not one interchangeable cohort. The paper includes additional expression/validation experiments; it does not justify adding every described preparation into one participant total.

## Activation and suppression

Cortical activation used red-sensitive ChRmine and addressed emitters at different depths. The reported yield was 0.23 ± 0.09 units per site (median ± median absolute deviation; 13 recordings in three mice). The comparison 0.22 ± 0.10 is an external Neuropixels 1.0 dataset, 20 recordings in 20 mice in ten labs, selected with the same quality criteria. It is not a matched randomized control cohort.

The circuit experiment activated ChrimsonR-expressing putative inhibitory neurons and recorded suppression of putative excitatory neurons. These labels are not simply proved by waveform shape; the paper discusses expression strategies and circuit responses. Opsin expression is required, and outcomes should not be translated into a clinical electrical-stimulation protocol.

## Optotagging

The aggregate 261 tagged units are cell-type identifications over 40 sessions, not the probe's physical channel count or a chronic tracked-neuron total. A striatal example tags 25 of 39 recorded units; that fraction is one example, not the success rate across all mice. Dual-color experiments target combinations such as D 1/D 2 medium spiny neurons.

Methods require significant response to at least four pulses from one emitter, latency below 8 ms and mean response reliability above 0.3. Units responding to both colors are classified as red-tagged because red-shifted opsins can respond to blue light. Blue-tagged and red-tagged populations are therefore not assigned by wavelength alone.

## Recording quality and boundaries

The general cluster-quality criteria are ISI violation ratio below 0.5, amplitude cutoff below 0.1 and presence ratio above 0.8. Different experiments use different Kilosort versions and pipelines; a single sorter is not imposed on the entire paper.

Blue-light leakage, sharp-onset red artifacts and light scattering remain hardware/interpretation limits. No months-long implant-survival curve, human safety demonstration or therapeutic efficacy is established by these acute experiments. Longitudinal reliability should not be borrowed from other Neuropixels variants.

## Primary sources

- [June 2026 published primary paper](https://www.nature.com/articles/s41592-026-03076-z).
- [Published PDF, including Methods and Extended Data](https://discovery.ucl.ac.uk/id/eprint/10226427/1/2026%20-%20Nature%20Methods%20-%20Neuropixels%20Opto.pdf).
