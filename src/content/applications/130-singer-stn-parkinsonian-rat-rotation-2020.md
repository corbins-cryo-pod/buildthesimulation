---
title: "Two-film ME: Parkinsonian rat rotations, 2020"
order: 130
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0044"
interface_class: "dbs"
status: "preclinical"
last_updated: 2026-10-07
description: "Three hemi-Parkinsonian rats receive head-mounted PVDF ME stimulation through implanted STN arrays. Reduced methamphetamine-induced rotations are not human Parkinson treatment."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/"
devices: ["128-singer-pvdf-two-film-headstage-2020"]
tags: ["magnetoelectric", "Rice", "two-film", "stimulation", "preclinical"]
draft: false
---

# STN stimulation in hemi-Parkinsonian rats

Singer and colleagues use the [head-mounted PVDF two-film ME stimulator](/devices/128-singer-pvdf-two-film-headstage-2020/) to drive implanted subthalamic-nucleus (STN) electrodes in freely moving rats. This experiment is distinct from the fully implanted PZT place-preference test.

## Animals and electrodes

Three adult male Long-Evans rats are used for rotation tests. The paper uses six rats total, three in each behavioral experiment, not six Parkinsonian animals. They are 4-7 months old and 500-800 g.

A unilateral 6-OHDA medial-forebrain-bundle lesion produces the hemi-Parkinsonian model. A commercial 2 × 2 platinum-iridium microelectrode array targets the STN, with 600 × 600 µm spacing, 75-µm electrodes and nominal 10-kΩ impedance. The array is implanted; the connected ME stimulator remains outside on the head.

## Protocol and result

Methamphetamine induces ipsilateral rotations. After brief anesthesia wears off, each rat enters a 30-cm circular coil-wrapped chamber. One-minute ON- and OFF-resonant stimulation periods occur across a 40-minute trial. Carrier pairs are 130/160 kHz ON and 120/170 kHz OFF; the effective biphasic pulse rate is 200 Hz.

Bench calibration against an electrode-brain equivalent circuit provides approximately ±1.5 V and ±100 µA peaks. These are not continuous wireless voltage/current recordings from the rat. Head trajectories are measured by video and DeepLabCut, not a sensing channel on the stimulator.

The paper reports rotation rate falling to 1.4 rotations/min during the first half of ON stimulation, compared with 9.4 before stimulation and 10.6 during OFF-resonant stimulation. The reduction repeats across three animals. The 29 ON and 28 OFF observations pooled in Figure 4g are stimulation-period data points, not 57 independent rats. Figure 4f uses nine periods for each comparison in its representative rat.

## Boundaries

OFF-resonant stimulation controls for magnetic exposure without activating the films. The paper compares performance with prior wired-stimulator studies; this is not a randomized human trial or a new head-to-head clinical comparison. Its power analysis suggests about six animals for future hypothesis-testing experiments, larger than this proof-of-concept cohort.

Animals were randomly chosen for implantation according to methods. No claim of blinded scoring is inferred. The assay measures drug-induced rotations in a lesion model, not disease reversal, long-term motor improvement or cognitive benefit. No chronic treatment duration is established by a 40-minute behavioral session.

## Primary source

- [Published primary manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/): Figure 4, Animals, in-vivo surgery, hemi-Parkinsonian experiments, tracking and statistical methods.
