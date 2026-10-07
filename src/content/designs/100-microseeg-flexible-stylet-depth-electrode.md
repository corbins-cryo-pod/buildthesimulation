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

## Primary sources

- [Published Nature Communications paper, January 17, 2024](https://www.nature.com/articles/s41467-023-43727-9).
- [UC San Diego-hosted full paper and supplement](https://iebl.ucsd.edu/sites/default/files/iebl/2024-01/Flexible%2CScalable%2CHigh%20Channel%20Count%20Stereo-Electrode%20for%20Recording%20in%20the%20Human%20Brain-Reduced.pdf).
- [Publisher supplementary information, Tables 2 and 3](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41467-023-43727-9/MediaObjects/41467_2023_43727_MOESM1_ESM.pdf).
