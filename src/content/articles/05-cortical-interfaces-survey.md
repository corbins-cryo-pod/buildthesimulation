---
title: "05 — Cortical interfaces (survey + chronic reality)"
order: 5
description: "ECoG, depth electrodes, and penetrating arrays — what each buys you, and what chronic use demands."
tags: ["cortex", "interfaces", "recording"]
draft: false
---

Cortical interfaces dominate the public story of BCIs because cortex is information-rich and tightly coupled to intent. But “cortex-first” is not a free lunch. The biology and biomechanics of the intracranial environment impose costs that don’t show up in a demo video: surgery burden, infection risk, chronic tissue response, and the fact that an implant has to behave for years.

This article is a practical survey of major cortical interface categories, with emphasis on the chronic constraints that shape real systems.

### A note on what we mean by “cortical interface”

In this context, a cortical interface is any system that records from (or stimulates) the brain at or within the cortex using implanted hardware. That includes surface electrodes (ECoG), depth electrodes (often used clinically for epilepsy monitoring and increasingly relevant to BCI), and penetrating microelectrode arrays.

The important distinction is not just “invasive vs noninvasive.” It’s where the signal lives on the continuum from population-level fields to single-unit activity, and what you have to pay to access it.

### ECoG and surface recordings: stable fields with surgical cost

Electrocorticography (ECoG) records from electrodes placed on the cortical surface. Compared to scalp EEG, ECoG often offers higher signal-to-noise and better spatial specificity because the skull and scalp are no longer between the sources and the sensors.

ECoG’s appeal is that it can offer useful information without penetrating cortex with many tiny needles. The chronic constraints are still substantial: you are still implanting hardware inside the body, you still need packaging that survives years, and you still need to handle long-term biological response at the tissue–device boundary.

A useful mental model is that ECoG tends to trade the possibility of isolating single units for a more robust view of population activity. Whether that is “better” depends on the task. For many applications (e.g., speech decoding paradigms), stable population-level signals can be more valuable than fragile unit recordings.

### Depth electrodes (SEEG / iEEG): access to deep structures and networks

Depth electrodes are placed through small burr holes and can sample activity from deeper structures and distributed networks. In clinical practice, depth electrodes are used for seizure localization. From a BCI perspective, they matter because they provide a different surgical access route and a different sampling strategy: fewer channels than a high-density surface grid, but access to deep and distributed targets.

The practical BCI question isn’t whether depth electrodes can record meaningful signals (they can). It’s whether chronic versions of these systems can deliver stable signals with acceptable burden and whether the sampled features remain useful over time.

### Penetrating arrays: high bandwidth, high fragility

Penetrating microelectrode arrays aim to record spikes and local signals by placing electrodes within cortex. This can yield very high-bandwidth signals and can support impressive decoders.

But penetrating arrays live in a difficult biomechanical environment. Cortex is soft; the skull-fixed hardware is not. Micromotion, vascular disruption, and the foreign body response can change the electrode environment over time. The result is a common theme in the literature and in practice: unit yield and signal quality can drift, and chronic stability becomes a first-order system constraint.

A useful way to view penetrating approaches is as an attempt to buy information bandwidth at the price of harder chronic engineering. That can be worth it for certain high-impact indications, but it is not a generic solution.

### Chronic reality: what actually limits cortical systems

Across modalities, several constraints recur:

- *Mechanical mismatch and micromotion:* tissue moves relative to hardware.
- *Foreign body response:* encapsulation and reactive changes alter coupling.
- *Packaging and connectors:* hermetic sealing, lead reliability, infection risk.
- *Calibration burden and nonstationarity:* decoders and features drift.

Many of these constraints are not “BCI problems” per se; they are implantable medical device problems. This is one reason the field progresses slowly and in steps.

### What cortical work teaches peripheral nerve work (and vice versa)

Even if your focus is peripheral nerve and biohybrid strategies, cortical BCI history teaches a hard lesson: elegant signal processing cannot rescue a mechanically fragile interface. Conversely, peripheral nerve work highlights how strongly anatomy and motion shape selectivity and chronic function.

If there is a unifying principle across cortex and nerve, it is this: the interface is a system spanning biology, mechanics, materials, electronics, and behavior. Any one layer can become the bottleneck.

### References (starter)

- L. R. Hochberg et al. (2006). *Neuronal ensemble control of prosthetic devices by a human with tetraplegia.* Nature. https://www.nature.com/articles/nature04970
- D. Hermes, K. J. Miller (2020). *iEEG: Dura-lining electrodes.* Handbook of Clinical Neurology. https://pubmed.ncbi.nlm.nih.gov/32164858/
- Q. Rabbani, G. Milsap, N. E. Crone (2019). *The Potential for a Speech Brain-Computer Interface Using Chronic Electrocorticography.* Neurotherapeutics. https://pubmed.ncbi.nlm.nih.gov/30617653/
- Overview + pointers (ECoG): https://en.wikipedia.org/wiki/Electrocorticography
- Overview + pointers (SEEG): https://en.wikipedia.org/wiki/Stereoelectroencephalography
