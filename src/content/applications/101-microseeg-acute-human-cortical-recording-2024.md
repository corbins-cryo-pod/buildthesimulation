---
title: "µSEEG: acute human cortical recording, 2024"
order: 101
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0030"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-07
description: "Two MGH participants, ten-minute intraoperative temporal-cortex recordings with short 64-channel PEDOT:PSS arrays; anesthesia and auditory responses, not chronic human depth or single-unit validation."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41467-023-43727-9"
tags: ["µSEEG", "MGH", "human", "acute", "cortical recording", "auditory", "PEDOT:PSS"]
devices: ["100-microseeg-flexible-stylet-depth-electrode"]
draft: false
---

# Brief human cortical recordings with µSEEG

The 2024 Nature Communications study includes two consenting participants undergoing neurosurgery at Massachusetts General Hospital. This application isolates the human work from the paper's rat, pig and primate experiments with [µSEEG hardware](/devices/100-microseeg-flexible-stylet-depth-electrode/).

## Cohort and configuration

The participants were aged 28 and 46, one female and one male. Each received one short 64-channel array in the left middle temporal gyrus, in tissue the clinical team had already determined would be resected. Recording lasted ten minutes. This was additional intraoperative research, not a permanent therapeutic implant.

Supplementary Table 2 identifies both human arrays as PEDOT:PSS: HS1 used parylene C and HS2 polyimide. Table 3 gives the short 64-channel variant 20 µm contacts, 60 µm center spacing and a 3.80 mm recording span. The long 128-contact PtNR electrode was tested separately in a primate, not these two people.

## What was recorded

HS1 was under general anesthesia. Spontaneous recordings showed burst suppression, with more detected bursts at superficial contacts. HS2 was awake under monitored anesthesia care and heard low and high auditory cues. The study reports differences in z-scored voltage and high-gamma-power responses at sound onset (corrected p < 0.02), with more significant differences at superficial contacts.

These are cortical field-potential and high-gamma findings. The paper's isolated single-unit clusters came from the long electrode in an awake primate. They are not presented here as human single-neuron recording, a speech decoder or a demonstrated assistive BCI.

## Clinical wording and limits

The overview describes recordings before tumor resection; the human methods describe surgery for epilepsy or tumor treatment and cortical mapping/tissue removal. The paper does not provide a basis to assign a particular diagnosis to either participant, so this entry does not do so.

Ten minutes in two participants cannot establish chronic human reliability, deep human single-unit recording, clinical benefit, safe stimulation or long-term tissue response. The 25-day rat recording study and the bench aging results belong to separate evidence categories. The authors also note unquantified cross-talk and connector standards that do not yet match typical clinical hardware.

## Primary sources

- [Published paper, human results and Human tests methods](https://www.nature.com/articles/s41467-023-43727-9).
- [Publisher supplement, human recording methods and Tables 2-3](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41467-023-43727-9/MediaObjects/41467_2023_43727_MOESM1_ESM.pdf).
