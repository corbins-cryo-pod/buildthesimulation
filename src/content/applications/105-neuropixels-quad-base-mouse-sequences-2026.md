---
title: "Neuropixels Quad Base: mouse sensorimotor sequences, 2026"
order: 105
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0032"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "July 2026 preprint: dual Quad Base probes,3,072 channels,40 sessions in six head-fixed mice. Offline licking-variable decoding and functional links, with computational NP 2.0-like controls and unit-filter boundaries."
modality: "Intracortical"
website: "https://www.biorxiv.org/content/10.64898/2026.07.23.740388v1.full"
tags: ["Neuropixels", "Quad Base", "mouse", "decoding", "JHU", "preprint", "preclinical"]
devices: ["104-neuropixels-20-quad-base-probe"]
draft: false
---

# Dual Quad Base recordings in behaving mice

The July 27, 2026 preprint uses two [Neuropixels 2.0 Quad Base probes](/devices/104-neuropixels-20-quad-base-probe/) in awake, head-fixed mice. The manuscript is not certified by peer review. It is a sensorimotor research study, not a human assistive BCI demonstration.

## Cohort and acquisition

Six wild-type mice, three male and three female, were 2-3 months old at the start of training. The study reports 40 recording sessions with dual probes, giving 3,072 channels across eight shanks per preparation. Its methods describe multiple insertion trajectories and 6-9 craniotomies per animal across the experiment. This is not continuous chronic tracking of the same implanted contacts and neurons across every session.

The abstract describes recordings across more than 20 brain regions. Figure 1 d summarizes yields across 14 selected regions; these are different scopes, not conflicting counts for one uniform analysis.

## Unit yield is not physical-site count

The paper reports mean Kilosort-good yield of 1,139 ± 94 units per session, compared with 285 ±9 in an NP 2.0-like dataset. The latter is created by computationally subsampling Quad Base recordings. It is not an independently implanted, randomized standard 2.0 control cohort.

Supplementary Figure S1 distinguishes raw Kilosort units, Kilosort-good units and a stricter customized-quality group. Customized filters require more than 80% session presence, SNR greater than 1.5, mean amplitude greater than 50 µV, amplitude cutoff below 0.1 and an ISI-violation false-positive criterion. The headline Kilosort-good count should not be relabeled as the count passing every customized filter.

## Task and analysis

Mice licked a moving port through seven positions following an auditory cue. High-speed videos provided tongue, jaw and task variables for offline decoding. About 30% of trials introduced a backward port movement requiring a correction. Neural populations carried information about these behavioral variables and the timing of the correction.

Granger-predictive links and latent shared dynamics were estimated from recorded activity. They indicate statistical relationships under the authors' models, not experimentally verified synapses or direct proof that a particular neuron caused the movement. Different analyses use different inclusion thresholds and session subsets;40 sessions is not the denominator of every figure.

## Limits

Two Quad Base probes and dense sampling reduce undersampling in these preparations, but more simultaneous channels do not establish whole-brain coverage or an unbiased census of all cell types. The comparisons rely on subsampling the same data, and the task involves trained, head-fixed mice. No real-time human control, therapeutic benefit or months-long Quad Base reliability is shown by this experiment.

## Primary sources

- [Primary preprint full text](https://www.biorxiv.org/content/10.64898/2026.07.23.740388v1.full).
- [PDF, Figures 1-5, Supplementary Figure S1 and STAR Methods](https://www.biorxiv.org/content/10.64898/2026.07.23.740388v1.full.pdf).
