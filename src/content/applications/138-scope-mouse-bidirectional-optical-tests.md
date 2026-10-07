---
title: "SCOPe: mouse optical interface tests"
order: 138
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0049"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
modality: "Other"
description: "Separate mouse assays test electrical stimulation with fluorescence imaging, blue optogenetics with electrode recording, and red stimulation with GCaMP imaging. Cohort size is not inferred."
website: "https://www.nature.com/articles/s41928-024-01209-w"
orgs: ["45-columbia-shepard-optical-and-electrical-interfaces"]
devices: ["137-scope-subdural-cmos-optical-probe"]
tags: ["SCOPe", "Columbia", "CMOS", "SPAD", "optical", "preclinical"]
draft: false
---

# SCOPe mouse bidirectional tests

The [SCOPe device](/devices/137-scope-subdural-cmos-optical-probe/) is tested in several mouse preparations. These are not interchangeable evidence that every channel records and stimulates every neuron simultaneously. The published abstract confirms mouse optical testing; detailed preparation and outcomes below are attributed to the 2023 preprint and 2024 supplement.

## Electrical stimulation with optical readout

The preprint places the imager over exposed cortex in GCaMP6f mice while separate flexible electrode shanks deliver biphasic microstimulation. A 2.1 × 3-mm portion of the imager with six blue LEDs is used because the full device is a poor fit to mouse brain. Images are acquired at 40 fps and reconstructed at 100-µm depth. Calcium responses rise with 25-100-µA stimulation; 10-µA responses fall below the noise floor. The array is too large for a fully buried subdural mouse demonstration.

The preprint reports a 6 × 6-mm cranial preparation in Results and a six-millimetre circular opening in its implantation methods. These descriptions are not reconciled into an invented exact aperture. Published Table S5's six LEDs at 4.5 µW optical per LED differ from the preprint's 27-µW-per-LED description.

## Optogenetics with electrical verification

A separate Thy1-ChR2-YFP mouse preparation uses blue light with implanted electrode shanks. The preprint reports modulation at depths through one millimetre and a control region farther away. A separate wild-type control checks photovoltaic recording artifacts. Those electrical signals are captured by external electrodes, not the optical sensor itself.

## Red stimulation with fluorescence imaging

GCaMP6f mice receive AAV-ChRmine in cortex and are tested 3-4 weeks later according to the preprint. One red LED supplies stimulation while four blue LEDs excite the reporter. The published supplement names the corresponding LED locations and optical powers. Imaging light itself can activate ChRmine, so excitation is limited to control crosstalk.

Fluorescence increases follow repeated optical stimulation cycles, but the spatial/temporal measurement is mesoscopic and calcium-based, not simultaneous single-neuron spike recording. The opsin and reporter require transgenic or viral preparations; this is not transgene-free optical control.

## Evidence boundary

The accessible sources describe individual preparations without a clear total enrolled-mouse denominator for all assays. No cohort count is inferred from plotted traces, LED count or the number of experiment labels. These are anesthetized acute proof-of-concept tests, not chronic behavioral therapy or a human trial. Bench thermal measurements and light thresholds are retained within their tested conditions.

The [paper-grounded collaboration brief](/companies/45-columbia-shepard-optical-and-electrical-interfaces/) links the participating organizations.

## Sources and version boundary

- [2024 published abstract](https://www.nature.com/articles/s41928-024-01209-w): bidirectional optical interface, thickness below 200 µm, mouse testing and NHP reach-speed decoding. The published main text was not accessible; its PDF fetch timed out.
- [2023 full primary preprint](https://www.biorxiv.org/content/10.1101/2023.02.07.527500v1.full): detailed hardware and animal methods. Preprint-specific values are not treated as verified final-publication values.
- [2024 published Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-024-01209-w/MediaObjects/41928_2024_1209_MOESM1_ESM.pdf): circuit, packaging, optical limits, decoder and Tables S1-S6. This supplement is accessible separately from the published main text.
