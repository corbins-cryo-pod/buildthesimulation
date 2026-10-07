---
title: "StimDust: acute rat sciatic-nerve stimulation,2020"
order: 112
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0035"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Six acute male-rat subjects with observed wireless muscle twitch, three with quantitative recruitment. Pulse-event replicates, closed/open surgical conditions and excluded wrong-duration pulses remain explicit."
modality: "Peripheral nerve"
website: "https://www.nature.com/articles/s41551-020-0518-9"
devices: ["111-stimdust-ultrasonic-nerve-stimulator"]
orgs: ["32-uc-berkeley-neural-dust-lab-brief"]
tags: ["StimDust", "rat", "sciatic nerve", "ultrasound", "acute", "preclinical"]
draft: false
---

# Acute wireless sciatic stimulation

The 2020 published study tests [StimDust](/devices/111-stimdust-ultrasonic-nerve-stimulator/) cuff-mounted on the sciatic nerve of anesthetized male Long-Evans rats, 9-17 weeks old and 248-523 g. Ultrasound supplies power and commands; the mote supplies electrical stimulation. External EMG measures compound muscle action potentials (CMAPs).

## Cohort and replicates

The reporting summary identifies six animal subjects with visually confirmed wireless muscle twitch. Three animals supplied detailed quantitative results. There was no a-priori power analysis. Pulse counts in recruitment figures are stimulation events within an animal, not independent animals.

The figures/reporting summary distinguish quantitative animals C, D and F. Supplement S5 repeats a parameter sweep in the same animal and mote two hours after the first sweep, with an open surgical site. That is repeatability within an acute preparation, not a two-hour implanted lifetime or new cohort.

## Parameter-dependent recruitment

Supplement S5 varies 50-400 µA at 392-µs pulse width, and 4-392 µs at 400 µA. Its muscle responses start only above certain settings and follow sigmoidal recruitment, not a linear muscle-output guarantee across all parameters. These are tested ranges in that experiment, not a verified universal hardware limit.

Supplement S6 demonstrates closed-site operation through skin/muscle in animal C and additional recruitment/muscle co-activation in animal F. A large stimulation artifact in animal F required excluding EMG data from 0 to 1.125 ms and resetting baseline over 1.125-1.25 ms. Artifact removal is part of the analysis, not evidence that raw EMG was artifact-free.

## Electrical versus direct ultrasonic stimulation

The supplement reports no EMG response with continuous ultrasound at the same intensity but no coded downlink. It also describes an electrically powered pilot mote without ultrasound producing similar CMAPs. These controls support current-mediated stimulation in this preparation, not every ultrasound neuromodulation claim.

## Exclusions and boundary

Rare downlink-decoding errors produced wrong-duration pulses. Recruitment analysis excluded one pulse in animal C and four in animal F; these exclusions were not pre-established. Setup/exploratory trials were also omitted from reported analyses and accounted for separately in the reporting summary.

The 55-mm porcine-tissue link is an ex-vivo benchmark, not the rat implant depth. This acute study does not establish chronic tissue safety, functional rehabilitation, human benefit or a neural sensing-feedback loop.

## Primary sources

- [Published article](https://www.nature.com/articles/s41551-020-0518-9),public abstract and figure titles.
- [Published supplement,S5-S7 and VideoS1](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-020-0518-9/MediaObjects/41551_2020_518_MOESM1_ESM.pdf).
- [Published reporting summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-020-0518-9/MediaObjects/41551_2020_518_MOESM2_ESM.pdf).
