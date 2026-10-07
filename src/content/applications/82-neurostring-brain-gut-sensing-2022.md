---
title: "NeuroString: mouse brain and gut chemical sensing, 2022"
order: 82
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0020"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
description: "Monoamine sensing during mouse reward learning, optogenetic/pharmacological tests and gut motility/inflammation experiments. Chemical estimates and assay-specific cohorts, not human treatment or spike-based BCI control."
modality: "Other"
website: "https://www.nature.com/articles/s41586-022-04615-2"
tags: ["NeuroString", "mouse", "neurochemical", "gut", "reward learning", "academic", "preclinical"]
devices: ["81-neurostring-neurochemical-sensor"]
orgs: ["21-stanford-neural-engineering-bci-ecosystem-lab-brief"]
draft: false
---

# Mouse brain and gut chemical sensing

The 2022 study uses [NeuroString elastomeric chemical sensors](/devices/81-neurostring-neurochemical-sensor/) for monoamine measurements. These assays do not decode spikes or demonstrate voluntary BCI control.

## Brain assays

Figure 3 shows a three-channel sensor measuring estimated dopamine responses in nucleus accumbens during optogenetic stimulation of ventral tegmental dopamine neurons. It also reports Pavlovian reward learning across nine conditioning sessions, with dopamine responses to water and an auditory cue analyzed in six mice.

Separate experiments estimate serotonin responses in basolateral amygdala and examine changes after fluoxetine. Other striatal experiments use pharmacological combinations and label signals as catecholamines and serotonin. Catecholamine measurements should not automatically be renamed dopamine measurements.

The displayed n = 6 applies to specified Figure 3 comparisons, not every experiment in the paper. Concentrations are calibrated estimates from electrochemical signals, not direct counts of released molecules.

## Gut assays

Figure 4 distinguishes ex vivo colon motility tests from in vivo inflammatory and food-response experiments. The ex vivo comparisons test how sensor placement interacts with contraction and relaxation. DSS-induced colitis measurements use four mice; simultaneous brain catecholamine and colon serotonin responses to chocolate use five mice. These cohort counts are not interchangeable.

The findings support chemical sensing in the tested moving tissues. They do not establish zero perturbation in every organ, diagnose a human intestinal disease or prove a therapy.

## Boundaries

The sensor is wired to external readout in the reported system. Chronic sensing in the primary abstract is not assigned a specific duration here because full duration evidence was not recovered. The experimental chemical selectivity, solution calibration and biological context matter when interpreting estimated concentrations.

## Primary sources

- [2022 paper](https://www.nature.com/articles/s41586-022-04615-2).
- [Figure 3: brain assays and sample-specific counts](https://www.nature.com/articles/s41586-022-04615-2/figures/3).
- [Figure 4: gut assays, motility and cohort distinctions](https://www.nature.com/articles/s41586-022-04615-2/figures/4).
