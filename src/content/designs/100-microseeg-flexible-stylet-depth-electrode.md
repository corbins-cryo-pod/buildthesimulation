---
title: "µSEEG flexible stylet-guided depth electrode"
order: 100
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0064"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-07
description: "UC San Diego-led 2024 thin-film depth-electrode family: 32/64/128-contact variants, removable stylet, separate PEDOT human and PtNR primate configurations, and polymer/contact failure evidence."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41467-023-43727-9"
tags: ["µSEEG", "UC San Diego", "MGH", "depth electrode", "polyimide", "PEDOT:PSS", "PtNR", "research"]
draft: false
---

# µSEEG thin-film depth-electrode family

Published in January 2024, this UC San Diego-led design forms a flexible depth electrode around a removable stainless-steel stylet. It is distinct from the surface [PtNRGrid](/devices/74-ptnrgrid-platinum-nanorod-surface-arrays/) platform. Sharing a contact material does not make two electrode architectures interchangeable.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | µSEEG thin-film depth-electrode family, three published variants [1] |
| Manufacturer | Academic research device; UC San Diego-led with MGH collaborators [1] |
| Interface class | Flexible intracortical depth electrode delivered on a removable stylet |
| Origin | UC San Diego-led, Nature Communications, January 2024 [1, 2] |
| First demonstrated | Published January 17, 2024 [1] |
| First human implant | Two participants, acute recording, short 64-channel PEDOT:PSS arrays [1] |
| Species studied | Human (two participants, acute) and rat (14-day histology; recordings to 25 days) [1] |
| Regulatory status | Research device; no clearance stated |
| Function | Recording; saline stimulation characterization of separate 1 mm PtNR contacts only [1] |
| Target tissue | Brain depth recording, stereo-EEG-like [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Thin-film polyimide depth electrode around a removable stainless-steel stylet [1] |
| Array layout | Contacts in one direction along the electrode, not a circumferential ring; U-shaped neck unfolds the ribbon [1] |
| Electrode count | 32 (short), 64 (short) and 128 (long) contacts [1, 3] |
| Pitch | 60 µm center spacing in all three variants [3] |
| Electrode lengths | Recording span 1.89 mm (short 32; main text says 1.92 mm), 3.80 mm (short 64), 7.65 mm (long 128); long variant 28 cm overall [1, 3] |
| Shank width and thickness | Long configuration about 1.2 mm wide and approximately 15 µm thick [1]; short-variant values not extracted |
| Tip and exposed site geometry | Contact diameter 30 µm (short 32, long) or 20 µm (short 64); text generally assigns 20 µm to PEDOT:PSS contacts [1, 3] |
| Contact coating | PEDOT:PSS or PtNR (short 32); PEDOT:PSS (short 64); PtNR (long) [3] |
| Insulation | Two polyimide layers with sacrificial titanium form the stylet sheath; a third polyimide layer insulates traces; short 64 also reported with parylene C [1, 3] |
| Insertion method | Stylet-guided insertion, stylet withdrawn afterward [1] |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Not stated beyond the 20 and 30 µm contact diameters [3] |
| Electrode material | Chromium/gold traces, 520 nm total, 3 µm width and spacing on the narrow section; PEDOT:PSS or PtNR contacts [1] |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality | Depth field and unit recording [1] |
| Sampling rate | Custom board feeding an Intan 1,024-channel system; per-channel rate not extracted [1] |
| Stimulation capability | Saline characterization of separate 1 mm PtNR contacts only; not shown safe through the 20 µm human recording contacts [1] |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Brain; human cortex in the acute study, rat in the histology [1] |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation | 14-day rat histology: less GFAP-positive scarring than a clinical lead [1] |
| Neuron loss near sites | No significant difference in nearby NeuN-positive cell counts versus a clinical lead [1] |
| Foreign-body response mitigation |  |
| Typical failure modes | Parylene C cracked during stylet insertion, cracks propagating into PEDOT:PSS; PEDOT:PSS delaminated in a substantial subset, reducing yield; PtNR did not show this [1] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Custom acquisition board to an Intan 1,024-channel system; no implanted electronics [1] |
| Data path | Wired through a non-clinical connector [1] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power |  |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility |  |
| Surgical complexity | Stylet-guided insertion; electrode deflation after stylet withdrawal is a remaining limitation [1] |
| Output connectors | Non-clinical connector standards listed as a limitation [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield | Rat responses in three of nine implanted rats [1] |
| Stability over time |  |
| Longevity | Accelerated aging equals 150 days and 84,000 lead-bending cycles (bench only); rat recordings reached 25 days [1] |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | Acute human cortical recording in two participants [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Two participants, short 64-channel PEDOT:PSS arrays; Supplementary Table 2 assigns parylene C to HS1 and polyimide to HS2 [1] |
| Preclinical cohort | Rats: 14-day histology comparison; recordings to 25 days, responses in 3 of 9 [1] |
| Follow-up duration | Acute in humans; up to 25 days in rats [1] |
| Indications |  |
| Trials and registries |  |
| Primary outcomes | Acute human recording; less GFAP scarring in rats [1] |
| Key limitations | Cross-talk not definitively quantified; common-mode subtraction, reference placement, connector standards and deflation after stylet withdrawal remain open; not chronic human validation [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Scalable contact counts on a flexible shank with stylet delivery [1] |
| Limitations | Material failures in parylene C and PEDOT:PSS; U-shaped ribbon and delivery mechanics [1] |
| Scaling constraints |  |

## Published variants, not one universal device

| Variant | Contacts | Contact diameter | Center spacing | Recording span | Materials in Supplementary Table 3 |
| --- | --- | --- | --- | --- | --- |
| Short 32 | 32 | 30 µm | 60 µm | 1.89 mm | Polyimide; PEDOT:PSS or PtNR |
| Short 64 | 64 | 20 µm | 60 µm | 3.80 mm | Polyimide or parylene C; PEDOT:PSS |
| Long | 128 | 30 µm | 60 µm | 7.65 mm | Polyimide; PtNR |

The main text calls the short 32-contact span 1.92 mm, while Supplementary Table 3 and the histology paragraph give 1.89 mm. Both are retained rather than silently selecting one. The text generally assigns 20 µm diameter to PEDOT:PSS contacts, while Table 3 lists 30 µm for the short 32-contact variant with either contact material. The table is not a universal specification for every fabrication run.

The long configuration is reported as 28 cm overall, 1.2 mm wide and approximately 15 µm thick. Its 7.65 mm recording span is at the tip, not distributed over the full 28 cm. A U-shaped neck unfolds to extend the interconnect ribbon. These overall dimensions are not the implanted depth or the short human array's recording span.

## Structure and acquisition

Two polyimide layers with an intervening sacrificial titanium layer form the stylet sheath; a third layer insulates the traces. Chromium/gold traces total 520 nm thickness, with 3 µm width and spacing on the narrow section. Contacts occupy one direction along the electrode, not a circumferential ring array. The custom acquisition board connects to an Intan 1,024-channel system; that system capacity does not turn one electrode into 1,024 contacts.

The [two-participant human application](/applications/101-microseeg-acute-human-cortical-recording-2024/) used short 64-channel PEDOT:PSS arrays. Supplementary Table 2 assigns parylene C to HS1 and polyimide to HS2. It does not assign the long PtNR version to either person.

## Failure evidence and maturity

The authors moved to polyimide after parylene C cracked during stylet insertion, with cracks propagating into PEDOT:PSS. PEDOT:PSS also delaminated in a substantial subset of electrodes, reducing fabrication yield; PtNR did not show that delamination in the reported comparison.

The paper reports accelerated aging corresponding to 150 days and 84,000 lead-bending cycles. This is bench evidence, not a 150-day human implant. A separate 14-day rat histology comparison found less GFAP-positive scarring than a clinical lead, but no significant difference in nearby NeuN-positive cell counts. Rat recordings reached 25 days, with responses in three of nine implanted rats. Those endpoints are not chronic human validation.

The authors had not definitively quantified cross-talk. Common-mode subtraction, reference placement, non-clinical connector standards and electrode deflation after stylet withdrawal remain limitations. Saline stimulation characterization of separate 1 mm PtNR contacts is not proof of safe stimulation through the 20 µm human recording contacts.

## Model boundary

No full model is supplied. The primary figures and tables establish the family and its scale, but not a complete variant-specific mask, sheath cross-section, short-array outline, stylet geometry or interconnect routing. A straight strip with guessed contact positions would misrepresent the U-shaped ribbon and delivery mechanics.

## References

1. [Published Nature Communications paper, January 17, 2024](https://www.nature.com/articles/s41467-023-43727-9).
2. [UC San Diego-hosted full paper and supplement](https://iebl.ucsd.edu/sites/default/files/iebl/2024-01/Flexible%2CScalable%2CHigh%20Channel%20Count%20Stereo-Electrode%20for%20Recording%20in%20the%20Human%20Brain-Reduced.pdf).
3. [Publisher supplementary information, Tables 2 and 3](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41467-023-43727-9/MediaObjects/41467_2023_43727_MOESM1_ESM.pdf).
