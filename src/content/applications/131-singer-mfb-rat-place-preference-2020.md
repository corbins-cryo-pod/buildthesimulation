---
title: "Fully implanted ME: rat place preference, 2020"
order: 131
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0045"
interface_class: "dbs"
status: "preclinical"
last_updated: 2026-10-07
description: "Three rats tested 1-3 days after surgery prefer the coil that activates a buried PZT two-film MFB stimulator. Six trials per rat are repeated observations, not 18 animals."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/"
devices: ["129-singer-pzt-fully-implanted-stimulator-2020"]
tags: ["magnetoelectric", "Rice", "two-film", "stimulation", "preclinical"]
draft: false
---

# MFB stimulation and place preference

The [fully implanted PZT two-film ME stimulator](/devices/129-singer-pzt-fully-implanted-stimulator-2020/) targets the medial forebrain bundle (MFB), a reward pathway, in three adult male Long-Evans rats. It is a separate configuration and cohort from the PVDF STN Parkinsonian-rotation experiment.

## Implant and timing

The packaged stimulator sits on the skull beneath sutured skin. A 9-mm platinum-iridium bipolar stereotrode enters the MFB; the assembly is fixed with skull screws and dental materials. No external headstage is exposed during behavior.

Tests occur 1-3 days after surgery following at least 24 hours of recovery. This is acute behavioral evidence, not a long-term implant-survival study. The paper's statement that sutures held for at least one month does not extend the functional evidence window.

## Resonant-coil experiment

A linear track has a custom double-resonant coil at each end. Both produce a 1.5-mT alternating magnetic field, but only one is resonant with both implanted films. Table 1 gives a 150-Hz stimulation rate for this configuration.

Each rat completes six ten-minute trials, with at least five minutes back in its home cage between trials. The track rotates between trials to reduce room-location associations. After the first three trials, the system switches which coil activates the implant. Video position is tracked manually using custom Python scripts, and preference is the time spent inside each coil.

All three animals show preference for the ON-resonant coil, and preference switches with the active coil. This supports ME-driven reward-circuit stimulation rather than preference for one physical side or the magnetic field alone. Six trials per rat are not 18 animals. Figure 5g's nine pooled observations per comparison are trial-level values, not an expanded cohort.

## Limits

This study does not test Parkinsonian symptoms, pain treatment, memory, a BCI communication task or a human patient. The implanted hardware provides stimulation without a demonstrated neural-recording uplink or closed-loop policy. No genetic modification is required for this rat behavioral test.

The coil switch and track rotation address important behavioral confounds, but the small cohort is proof of concept. The paper calls for chronic packaging and foreign-body-response work. Its coated-film soak, brief thermal experiment and intact skin sutures do not replace tissue histology or long-term implanted electrical measurements.

## Primary source

- [Published primary manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/): Figure 5, Table 1, place-preference implant design, surgery, behavioral protocol and statistical analysis.
