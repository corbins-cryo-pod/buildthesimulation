---
title: "Flexible probe: acute rat neurochemical modulation, 2024"
order: 78
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0018"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Acute anesthetized-rat barrel-cortex recording around electrically triggered glutamate and GABA release. Brief post-stimulus effects, not chronic treatment or BCI task performance."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41378-024-00685-6"
tags: ["rat", "barrel cortex", "chemical modulation", "GABA", "glutamate", "academic", "preclinical"]
devices: ["77-flexible-neurochemical-recording-probe"]
orgs: []
draft: false
---

# Acute rat neurochemical modulation

The 2024 study uses a [flexible 16-recording-contact probe with two chemical sites](/devices/77-flexible-neurochemical-recording-probe/) to record neural responses around localized chemical release. It is a proof-of-concept acute physiology experiment, not a chronic therapeutic or assistive BCI trial.

## Setup

Sprague-Dawley rats were anesthetized with isoflurane and head-fixed. The flexible shank was temporarily bonded to a tungsten-wire shuttle with PEG and implanted in right barrel cortex at a 15° angle. The methods describe a 1.5 mm insertion depth, with the recording sites spanning approximately 300 µm and covering tissue depths of 500-800 µm. These are different geometric quantities, not interchangeable depths.

The paper reports 16-channel recording at 25 kHz. A 2 Hz, 0.5 V-amplitude sine waveform lasting five seconds triggered release. Separate counter electrodes and segregated circuits reduced artifacts but did not allow activity to be quantified during the release stimulus.

## What changed after release

- GABA-loaded coatings reduced spike rates after stimulation.
- Glutamate-loaded coatings increased spike rates.
- Non-drug-loaded PEDOT/nanoparticle coatings were the negative control and showed no significant change compared with no stimulation.

Figure 5 reports inhibition lasting two seconds after release and excitation lasting one second. Its n = 92 is not presented here as 92 animals. The paper's animal total is not clearly established by the passages used for this entry. Sorted units with signal-to-noise ratio above four were included in spike-rate analysis.

## What remains unproven

Activity during the five-second stimulus was obscured by artifacts. The experiment does not establish a chronic response, reliable replenishment of stored chemicals, sustained dosing over months, human qualification or voluntary device control. The estimate that the coating might provide similar modulation up to 100 times is an inference from in vitro release, not 100 demonstrated effective in vivo sessions.

## Primary sources

- [2024 full paper: acute results and discussion](https://www.nature.com/articles/s41378-024-00685-6).
- [Publisher PDF: implantation, recording and analysis methods](https://www.nature.com/articles/s41378-024-00685-6.pdf).
