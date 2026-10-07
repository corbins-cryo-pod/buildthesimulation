---
title: "SCOPe: macaque reach-speed decoding"
order: 139
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0050"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
modality: "Other"
description: "One macaque in the 2023 preprint supplies head-fixed motor-cortex calcium imaging and off-line speed decoding. Published supplement defines the decoder; no closed-loop prosthesis is shown."
website: "https://www.nature.com/articles/s41928-024-01209-w"
orgs: ["45-columbia-shepard-optical-and-electrical-interfaces"]
devices: ["137-scope-subdural-cmos-optical-probe"]
tags: ["SCOPe", "Columbia", "CMOS", "SPAD", "optical", "preclinical"]
draft: false
---

# Macaque reach-speed decoding with SCOPe

The 2024 published abstract reports that [SCOPe](/devices/137-scope-subdural-cmos-optical-probe/) decodes reach movement speed in a non-human primate. The full 2023 preprint supplies the animal and task details; the published supplement supplies the reconstruction, artifact filtering and ridge-regression decoder. The inaccessible final main text is not used to assert that every preprint number is unchanged.

## Preparation and behavior

The preprint reports one adult male rhesus macaque, 11.4 kg. A cranial/dural opening and artificial window expose motor cortex. After recovery, GCaMP8m is delivered by AAV into dorsal premotor cortex. Approximately two months after injection, the probe is placed over PMd and M1 in the subdural space during testing. That expression interval is not a two-month chronic implant duration.

The animal sits head-fixed in a primate chair and reaches to touchscreen targets, holding contact for 400 ms to receive a fluid reward. Video cameras track the finger and wrist. The fluorescence sensor measures calcium-related activity, not a radio transmission of electrical motor-cortex spikes.

The published supplement uses 22 functioning blue LEDs, 9 µW optical per LED, with two dead blue sites identified separately. Imaging is at 40 fps. Quiet and arm-restrained recordings provide behavioral controls, not additional animals.

## Decoder and processing

The preprint's example trains on 400 samples from Recording 36 and tests on 200 samples from Recording 39, reporting a correlation of 0.66. A swept train/test matrix remains above 0.4 in that analysis. These are correlations for selected recordings in one animal, not percentages of correct commands or cross-animal clinical accuracy.

The published supplement defines ridge regression from image-frame features to movement speed and notes that the mesoscopic signal does not resolve single-unit spikes. It also documents masking hot/high-variance pixels, spatial binning, 0.5-Hz high-pass filtering and ten-sample smoothing to reduce hemodynamic and heartbeat artifacts. Motion is constrained by head fixation and direct cortical contact. These processing steps remain part of the result, not evidence that the raw sensor is artifact-free.

Table S6 lists recordings 0-43 across dark, reaching, baseline and arm-restrained conditions. Recording indices are not 44 animals or 44 independent clinical sessions. PMd-to-M1 timing relationships are a network observation, not proof that a decoder reads arbitrary intentions.

## Limits

This is off-line feature decoding of performed movements. No closed-loop cursor, prosthesis control, human participant, long-term buried wireless operation or generalized speed decoder across subjects is demonstrated. The imager's implantable thickness, virally delivered reporter and wired controller have distinct translation barriers.

The [paper-grounded collaboration brief](/companies/45-columbia-shepard-optical-and-electrical-interfaces/) links the participating organizations.

## Sources and version boundary

- [2024 published abstract](https://www.nature.com/articles/s41928-024-01209-w): bidirectional optical interface, thickness below 200 µm, mouse testing and NHP reach-speed decoding. The published main text was not accessible; its PDF fetch timed out.
- [2023 full primary preprint](https://www.biorxiv.org/content/10.1101/2023.02.07.527500v1.full): detailed hardware and animal methods. Preprint-specific values are not treated as verified final-publication values.
- [2024 published Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-024-01209-w/MediaObjects/41928_2024_1209_MOESM1_ESM.pdf): circuit, packaging, optical limits, decoder and Tables S1-S6. This supplement is accessible separately from the published main text.
