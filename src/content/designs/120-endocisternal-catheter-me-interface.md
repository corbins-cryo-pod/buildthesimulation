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

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Endocisternal catheter electrodes with a magnetoelectric implantable pulse generator, preprint configuration [1] |
| Manufacturer | Academic research device; Rice University Robinson lab context, collaborators per the paper [1, 2] |
| Interface class | Catheter electrodes delivered through cerebrospinal-fluid spaces, wireless pulse generator |
| Origin | Chen and colleagues; 2023 preprint, Nature Biomedical Engineering online November 11, 2024, issue June 2025 [1, 2] |
| First demonstrated | Preprint 2023; published November 11, 2024 [1, 2] |
| First human implant | None; human cadaver navigation only (preprint) [1] |
| Species studied | Sheep (recording, stimulation, repositioning, explantation); human cadaver navigation [1, 2] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation and recording; wireless backscatter records only larger muscle and cardiac signals [1] |
| Target tissue | Spinal cord and cortex through CSF spaces [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Catheter electrode in CSF; lead to glass-packaged generator in a back pocket [1] |
| Array layout |  |
| Electrode count | Two channels per catheter (preprint) [1] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness | 0.6 mm catheter diameter (preprint); enclosure dimensions not stated [1] |
| Tip and exposed site geometry |  |
| Contact coating | Sputtered contacts; material and spacing not stated [1] |
| Insulation | Glass enclosure sealed with medical-grade epoxy; conductive epoxy joins leads [1] |
| Insertion method | Navigation from cervical access (cadaver) or lumbar (sheep); ventricle access can traverse the third ventricle floor, so no skull opening is not no tissue traversal [1] |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality | Wireless backscatter of larger muscle, cardiac and stimulation-artifact signals; smaller spinal potentials and EEG used a separate benchtop system [1] |
| Sampling rate |  |
| Stimulation capability | Programmable up to 14.5 V; Results calls one spinal protocol monophasic while Methods describes programmable biphasic trains (both kept) [1] |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue |  |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Custom PCB, two 7.5 × 3 mm ME films at 218 kHz, bias magnet; refers to the cortical DOT platform for electronics [1] |
| Data path | ME wireless power and backscatter; benchtop system for small potentials [1] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Battery-free ME power [1] |
| Thermal management |  |
| Packaging and hermeticity | Glass enclosure with medical-grade epoxy; final enclosure dimensions not established [1] |
| MRI compatibility |  |
| Surgical complexity | Catheter navigation through CSF spaces; no craniotomy but not risk-free [1] |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | Sheep recording, stimulation, repositioning and explantation after chronic implantation per the abstract [2] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None; cadaver navigation and living-human MRI anatomy only [1] |
| Preclinical cohort | Sheep; separate acute, survival and explantation evidence [1, 2] |
| Follow-up duration |  |
| Indications |  |
| Trials and registries |  |
| Primary outcomes | Chronic sheep recording and stimulation per the abstract [2] |
| Key limitations | Published main text not accessible, so figures are attributed to the preprint; benchtop D-wave and EEG are not wireless implant recordings; therapy and closed loop remain proposed [1, 2, 3] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Avoids both blood vessels and the skull [1] |
| Limitations | Limited sampling rate and gain on the wireless recording path [1] |
| Scaling constraints |  |

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

The [sheep application](/applications/121-endocisternal-sheep-stimulation-recording-study/) separates acute, survival and explantation evidence. The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) provides institutional context without claiming sole ownership of the collaboration.

No full model is supplied: flexible in-body catheter trajectories, contact construction, lead routing, circuit geometry and final package are not fully specified in the accessible sources. Rehabilitative therapy, epilepsy monitoring, multichannel arrays and closed-loop systems remain proposed uses rather than demonstrated patient outcomes.

## References

1. [Full 2023 preprint](https://www.biorxiv.org/content/10.1101/2023.10.12.562145v1.full).
2. [Published 2024 article and abstract](https://www.nature.com/articles/s41551-024-01281-9).
3. [Published supplementary information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-024-01281-9/MediaObjects/41551_2024_1281_MOESM1_ESM.pdf).
4. [2025 data-availability correction](https://www.nature.com/articles/s41551-025-01356-1).
