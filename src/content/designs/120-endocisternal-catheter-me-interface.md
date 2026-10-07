---
title: "Endocisternal catheter and ME interface, 2023-2024"
order: 120
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0074"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
description: "Catheter electrodes navigated through cerebrospinal-fluid spaces, coupled to magnetoelectric bioelectronics. Full 2023 preprint specifications are separated from the 2024 published abstract and supplement."
modality: "Other"
website: "https://www.nature.com/articles/s41551-024-01281-9"
tags: ["endocisternal", "Rice", "UTMB", "CSF", "catheter", "magnetoelectric", "stimulation", "recording", "preclinical"]
draft: false
---

# Endocisternal neural interface

Chen and colleagues report catheter electrodes delivered through cerebrospinal-fluid spaces rather than blood vessels. The work appeared as a 2023 preprint and was published online in Nature Biomedical Engineering on November 11, 2024, with a June 2025 issue date. The published abstract confirms sheep recording, stimulation, repositioning and explantation after chronic implantation. This is not a demonstrated human therapeutic interface.

## Source boundary

The complete 2023 preprint and the published supplementary information were accessible for this entry. The published main Results and Methods were not accessible. Detailed hardware and cohort figures below are therefore explicitly attributed to the preprint, not silently promoted to verified version-of-record specifications. A 2025 correction adds the public dataset link; it does not itself verify every earlier specification.

## Preprint hardware configuration

The preprint describes two-channel catheter electrodes, with 0.6-mm catheter diameter, coupled to an external-wireless-power implantable pulse generator in a small pocket in the animal's back. Leads connect the glass-packaged electronics to the catheter. The CSF pathway is not an endovascular electrode and the pulse generator is not implanted in brain tissue.

Its pulse-generator Methods gives two 7.5 × 3-mm ME films resonant at 218 kHz, custom PCB electronics, bias magnet and a glass enclosure sealed with medical-grade epoxy. Conductive epoxy joins the leads to sputtered contacts. It refers to the cortical DOT platform for electronics, but that does not establish identical final enclosure dimensions. No enclosure dimensions or catheter contact material/spacing are invented here.

The preprint reports programmable output up to 14.5 V. Results calls one spinal protocol monophasic, while Methods describes programmable biphasic pulse trains. Both descriptions remain; the entry does not resolve that waveform conflict by picking one.

## Recording is configuration-specific

The preprint's wireless experiment uses two catheter electrodes and separate ME stimulation and recording implants. Wireless backscatter records larger signals associated with muscle activity, alongside cardiac activity and stimulation artifact. Limited sampling rate and recording gain led the investigators to use a separate benchtop system for smaller spinal potentials and cortical EEG.

That benchtop D-wave or EEG evidence is not a demonstration that the wireless implant transmitted equivalent signals. The published supplement also separates stimulation traces, backscatter and catheter recordings, and includes post-euthanasia traces showing stimulation artifacts alone.

## Navigation and limits

The preprint demonstrates human cadaver navigation from cervical access; living human MRI measurements characterize anatomy, not implantation or treatment. Sheep lumbar navigation follows a separate procedure. Access to ventricles can involve traversing the floor of the third ventricle, so "no skull opening" does not mean no tissue traversal or no risk.

The [sheep application](/applications/121-endocisternal-sheep-stimulation-recording-study/) separates acute, survival and explantation evidence. The [Rice lab brief](/companies/43-rice-magnetoelectric-bioelectronics-labs/) provides institutional context without claiming sole ownership of the collaboration.

No full model is supplied: flexible in-body catheter trajectories, contact construction, lead routing, circuit geometry and final package are not fully specified in the accessible sources. Rehabilitative therapy, epilepsy monitoring, multichannel arrays and closed-loop systems remain proposed uses rather than demonstrated patient outcomes.

## Primary sources

- [Full 2023 preprint](https://www.biorxiv.org/content/10.1101/2023.10.12.562145v1.full).
- [Published 2024 article and abstract](https://www.nature.com/articles/s41551-024-01281-9).
- [Published supplementary information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-024-01281-9/MediaObjects/41551_2024_1281_MOESM1_ESM.pdf).
- [2025 data-availability correction](https://www.nature.com/articles/s41551-025-01356-1).
