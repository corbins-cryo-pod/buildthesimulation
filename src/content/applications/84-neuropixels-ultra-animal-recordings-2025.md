---
title: "Neuropixels Ultra: animal waveform and cell-type studies, 2025"
order: 84
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0021"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Dense extracellular recordings improve tested mouse visual-cortex yield and cell-type classification, with small-footprint signals examined across regions and species. Resampled comparisons are not always separate probe experiments."
modality: "Intracortical"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/"
tags: ["Neuropixels Ultra", "mouse", "waveforms", "cell types", "DARTsort", "academic", "preclinical"]
devices: ["83-neuropixels-ultra-high-density-probe"]
orgs: []
draft: false
---

# Animal waveform and cell-type studies

Ye and colleagues test [Neuropixels Ultra](/devices/83-neuropixels-ultra-high-density-probe/) for extracellular neural recording. Hardware density, spike sorting and analysis jointly shape the reported results.

## Mouse visual-cortex recordings

The paper reports 147 ± 37 sorted neurons per recording and 44 ± 22 with reliable visual responses, mean ± SD across ten recordings. The abstract summarizes a more-than-twofold yield improvement in the tested mouse visual-cortex comparisons. That does not mean every species or brain region produces the same gain.

The study uses DARTsort to estimate spike locations, account for probe motion and cluster waveforms. Some comparisons spatially resample Neuropixels Ultra data into lower-density patterns, enabling a unit-for-unit comparison. Those Neuropixels 1.0-like datasets are not necessarily separate physical Neuropixels 1.0 recordings.

## Small-footprint signals

Dense recordings resolve small spatial footprints, including signals interpreted as axonal or dendritic, across tested brain regions and species. Anatomical attribution is supported by the study's experiments and analysis; waveform size alone should not be treated as a universal cell identity rule.

## Interneuron classification

Optotagging identifies PV, SST and VIP interneurons in selected mouse visual-cortex experiments. Classifiers use waveform and firing features, including spatial footprint. A classification restricted to these three tagged classes achieves 80.33% mean accuracy; this is not classification of every cortical cell type.

The paper separately compares broader six-class models and lower-density resampled features. Their accuracies and chance levels answer different classification tasks and are not interchangeable.

## Scope and limits

The densest configuration trades sampled vertical span for detailed fields. Per-site noise is somewhat higher, despite gains from spatial sampling. Sorting, motion correction, optotagging and class definitions matter to the result. The study does not establish human safety, chronic clinical performance or assistive BCI operation.

## Primary sources

- [2025 primary full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/).
- [Publisher paper](https://www.cell.com/neuron/fulltext/S0896-6273(25)00665-8).
- [Author-hosted publisher PDF](https://www.yezhiwen.com/assets/pdf/ye2025_neuropixels_ultra.pdf).
