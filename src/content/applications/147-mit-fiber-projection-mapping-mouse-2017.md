---
title: "MIT multifunctional fibers: mouse opsin delivery and projection mapping, 2017"
order: 147
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0054"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "One-step implantation/transfection, prefrontal and amygdala-projection optoelectrophysiology, behavior and twelve-week recording examples. Source disagreements in geometry, cohorts and stimulation are kept visible."
modality: "Intracortical"
website: "https://www.nature.com/articles/nn.4510"
tags: ["MIT", "fiber", "optogenetics", "mouse", "preclinical"]
draft: false
orgs: ["22-mit-neural-engineering-neurotech-ecosystem-lab-brief"]
devices: ["146-mit-graphite-polymer-multifunctional-fiber-2017"]
---

# One-step mouse optogenetics and projection mapping

This is a paper-level overview using the [2017 graphite-polymer fiber](/devices/146-mit-graphite-polymer-multifunctional-fiber-2017/). Local prefrontal experiments, projection mapping, chronic recordings and tissue analysis are not silently pooled into one independent cohort or one success rate.

## Integrated viral delivery and local readout

The study implants a fiber into the medial prefrontal cortex of wild-type mice and delivers AAV5-CaMKIIα::ChR2-eYFP through its fluidic channel. The same fiber later delivers light and records activity. Figure 2 reports optically evoked potentials beginning at 11 ± 2 days after surgery, with n = 8 mice. This is onset of functional opsin response, not a human decoder or immediate post-surgical stimulation effect.

Controls include eYFP-only virus and transgenic Thy1-ChR2-YFP preparations. Increasing stimulation frequency to 100 Hz produces responses that no longer track each optical pulse, supporting a physiological rather than purely optical-artifact interpretation. This is not a claim that every waveform is artifact-free.

Open-field tests at six weeks show increased velocity during medial-prefrontal stimulation in ChR2-expressing mice compared with controls, without a corresponding center-time effect. Figure captions report 5 ms pulses and 16 mW/mm² for the behavioral examples; the methods also state approximately 30 mW/mm² for open-field stimulation. Those values remain separate rather than being resolved by guess.

## Two-fiber projection experiments

One probe delivers virus in the basolateral amygdala; another records and illuminates either medial prefrontal cortex or ventral hippocampus. Figure 3 reports:

| Response | Reported onset and count |
| --- | --- |
| Amygdala local response | 11 ± 2 days, n = 8 mice |
| Amygdala-to-prefrontal low-latency response | Figure caption 12 ± 1.4 days; prose 12 ± 1 days, n = 8 mice |
| Later prefrontal long-latency response | 15 ± 2 days, n = 6 mice |
| Amygdala-to-ventral-hippocampal response | 11 ± 2 days, n = 8 mice |

These counts describe the cited analyses and are not added into a unique total. The paper interprets short-latency responses as consistent with direct projections, while longer-latency responses may involve a multisynaptic network.

Optical stimulation of amygdala inputs in ventral hippocampus reduces open-field center time without changing total distance or average velocity. Delivery of CNQX through the hippocampal fiber removes the measured behavioral difference under the tested conditions. This is a bounded mouse assay, not a human anxiety treatment.

## Chronic readout and histology

Figure 4 follows representative isolated spike clusters between one and twelve weeks and shows optical-response examples at one, two and three months. The authors explicitly say longer time points were not collected. Waveform/PCA stability supports the reported tracking examples but does not prove every channel or every neuron remained stable.

The tissue-response methods report 32 mice, eight per time point, each receiving a fiber and a microwire. Figure 5 instead labels six samples per device/time point. Both statements are retained; they are not recast as one resolved animal count. The same caption contains a negative p value for an IgG comparison at two weeks, which is not a valid probability and is not used as evidence of significance. Significant differences vary by marker and time, and the three-month comparisons are not presented as universal statistically significant suppression of tissue response.

## Methods limits

Behavioral investigators knew the experimental-group identity. The methods state random allocation before each behavioral experiment and random sample allocation within histology groups. These statements do not establish blinded behavioral scoring. Trial counts, sample counts and unique animals remain separate.

## Primary sources

- [Full author manuscript, figures and methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC5374019/).
- [Publisher paper](https://www.nature.com/articles/nn.4510).
- [Figure 4: twelve-week recording examples](https://www.nature.com/articles/nn.4510/figures/4).
- [Figure 5: tissue comparisons](https://www.nature.com/articles/nn.4510/figures/5).
- [Publisher supplement](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fnn.4510/MediaObjects/41593_2017_BFnn4510_MOESM13_ESM.pdf).
