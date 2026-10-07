---
title: "MEND: mouse VTA reward and optical response, 2024"
order: 133
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0046"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
description: "VTA nanodisc injections support transgene-free conditioned place preference; separate AAV-GCaMP6s photometry follows responses to three months with declining efficacy."
modality: "Other"
website: "https://www.nature.com/articles/s41565-024-01798-9"
devices: ["132-mend-magnetoelectric-nanodiscs-2024"]
tags: ["MEND", "nanodiscs", "magnetoelectric", "MIT", "neuromodulation", "preclinical"]
draft: false
---

# VTA reward and optical-response studies

The [MEND nanodisc interface](/devices/132-mend-magnetoelectric-nanodiscs-2024/) is injected into the ventral tegmental area (VTA) of wild-type mice. The reward assay does not require genetic sensitization. The separate optical activity assay does use a genetically encoded calcium reporter; this distinction matters when reading the paper's transgene-free title.

## Conditioned place preference

Methods use 6-8-week-old mice and 1.5-µl injections at 1.5 mg/ml for material groups. Figure 4 reports 11 MEND mice, seven magnetite-nanodisc (MND) controls and seven PBS controls. Both sexes are represented: five females/six males for MENDs, four/three for MNDs and three/four for PBS.

Day 1 measures baseline preference over ten minutes. During learning days 2-4, magnetic stimulation is delivered when mice enter the less-preferred chamber: 220-mT offset field plus 10-mT, 150-Hz alternating field, with two-second epochs separated by 90 seconds. Day 5 tests preference without magnetic stimulation. MEND mice show conditioned preference, while control groups show or trend towards aversion. The authors suggest coil vibration and noise may contribute to control aversion.

The reporting summary says animals and injections were randomly assigned. Stimulation was manually controlled, so the experimenter was not blinded; an independent observer scored the videos blind to group and subject identity. Methods exclude baseline preference above 500 seconds out of 600 or zero stimulated-chamber time on day 2. The reporting summary additionally names a greater-than-70% baseline-preference exclusion. Both exclusion descriptions are retained; the number removed is not inferred.

## Separate activity and longitudinal experiments

c-Fos assays compare MENDs with field, MENDs without field, MNDs with field and PBS with field, using six mice per group. A lower 0.5-mg/ml MEND condition also gives c-Fos responses. c-Fos is an activity marker, not continuous electrophysiological recording.

Fibre photometry instead combines 1.3 µl of particles with 300 nl of AAV9 hSyn::GCaMP6s and an implanted optical fibre. After two weeks, five-second 100-Hz epochs produce fluorescence transients in 79.1 ± 12.3% of trials (14 mice, 267 trials); two-second 150-Hz epochs produce 65.9 ± 23.6% (four mice, 53 trials). Trials are repeated within mice, not independent animals. The article prose gives 220-mT offset, while the Figure 5a/b caption gives 200 mT; the conflict is not silently resolved. Both give 10-mT alternating amplitude.

At four weeks, two months and three months, reported transient probabilities are 68.3 ± 18.4%, 66.3 ± 21.2% and 59.8 ± 25.8%, respectively, with eight, seven and five mice. These optical cohorts are not simply added together as one enrollment total. The late tests use five-second 100-Hz epochs and a 220-mT offset field. Responses sometimes have a slow secondary transient, potentially involving glial effects, rather than the short kinetics of conventional electrical stimulation.

## Evidence boundary

The paper shows mouse reward behavior, activity markers and reporter-based responses. It does not establish a clinical depression/addiction treatment, communication BCI, on-particle sensing, wireless neural-data telemetry or cell-type-specific stimulation. Declining responses, diffusion and cellular uptake remain important limits. Three-month optical response is not three months of continuous behavior control or proof of lifetime material safety.

## Primary sources

- [Published paper](https://www.nature.com/articles/s41565-024-01798-9): Figures 4-5, stereotactic surgeries, photometry, behavioral and statistical methods.
- [Reporting Summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41565-024-01798-9/MediaObjects/41565_2024_1798_MOESM2_ESM.pdf): randomization, partial blinding and exclusions.
