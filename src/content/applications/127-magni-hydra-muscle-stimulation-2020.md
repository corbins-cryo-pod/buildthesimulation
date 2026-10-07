---
title: "MagNI: Hydra muscle activation, 2020"
order: 127
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0043"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "MagNI drives stereotrodes for Hydra GCaMP6s muscle-imaging tests. Greater-than-200% fluorescence increases follow five-second pulse trains; no rat spinal treatment or clinical pain outcome is reported."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8712272/"
devices: ["126-magni-current-controlled-magnetoelectric-implant"]
tags: ["MagNI", "Hydra", "GCaMP6s", "stimulation", "muscle", "preclinical"]
draft: false
---

# Hydra activation with MagNI

The 2020 paper tests [MagNI](/devices/126-magni-current-controlled-magnetoelectric-implant/) using Hydra vulgaris as excitable tissue. A transgenic strain expresses calcium-sensitive GCaMP6s in the ectoderm. The implant supplies electrical stimulation; the reporter protein and microscope provide the measured activity readout.

## Experimental configuration

A micromanipulator positions stereotrodes connected to the ME-powered device, 10 mm from the transmitter. These are external stimulation contacts sized for the animal, not a chronic test using only the implant's on-board electrodes.

Five-second biphasic trains with 500-µs pulses at 100 Hz produced greater-than-200% GCaMP6s fluorescence increases and associated muscle contractions. The imaging setup used a 20× objective, Andor Zyla camera and 25 frames per second. This optical sampling rate is not wireless neural-data throughput.

The accessible biological section does not state an animal enrollment or repeated-trial denominator. No cohort count is inferred from one plotted fluorescence trace.

## What this does not show

The paper lists spinal cord stimulation and neuropathic pain relief as application targets. It does not demonstrate those therapies in a rat, pig or human. Hydra activation, saline power recovery and seven-day soak performance are different tests.

This is not the later two-Hydra shared-transmitter experiment with the PUF-addressed platform, which uses GCaMP7b and a different stimulation protocol. No chronic tissue implantation, autonomous sensing, human therapy or pain outcome is established by this application.

## Primary source

- [Published primary manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC8712272/), Section IV-C, Figures 27-28 and the separate bench/saline sections.
