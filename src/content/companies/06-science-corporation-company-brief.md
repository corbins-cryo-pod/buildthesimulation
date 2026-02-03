---
title: "Science Corporation (company brief)"
order: 6
pubDate: 2026-02-02
updatedDate: 2026-02-02
description: "Science Corporation’s BCI work with an emphasis on its biohybrid neural interface concept (neurons-as-the-interface), plus its PRIMA retinal prosthesis program."
region: "American"
kind: "Company"
website: "https://science.xyz/"
tags: ["BCI", "biohybrid", "neural interface", "Science Corporation", "PRIMA", "retinal prosthesis"]
draft: false
---

Science Corporation is building neurotechnology with an unusually explicit thesis: **if electrodes don’t scale because they damage tissue, try scaling with biology**.

They are best known publicly for two efforts:
1) **PRIMA**, a subretinal photovoltaic visual prosthesis program in clinical studies.
2) A **biohybrid brain interface** concept where **living neurons** are embedded in a device and then *engrafted* so that **their axons/dendrites grow into the brain**, potentially creating enormous connection density without “putting wires into a brain.”

Corbin asked for extra emphasis on the biohybrid work, so that’s the center of this brief.

## At a glance

- **Website:** <https://science.xyz/>
- **Company overview:** <https://science.xyz/company/>
- **HQ (company statement):** Alameda, California.
  - Science says it has secondary offices in Research Triangle Park (NC) and Paris (France).
  - <https://science.xyz/company/>
- **Clinical posture:** Science describes itself as a clinical-stage medical technology company with “dozens of patients in six countries” enrolled in ongoing clinical studies.
  - <https://science.xyz/company/>

## The big idea: biohybrid neural interfaces (neurons as the interface)

### The scaling bottleneck they’re attacking
Science’s biohybrid writeup frames a core constraint in invasive BCI as a scaling law: **to get physically close to neurons, you destroy some brain tissue**, and that becomes an ugly trade when you try to scale to very large numbers of “channels.”

- “Biohybrid neural interfaces” essay: <https://science.xyz/news/biohybrid-neural-interfaces/>

### What they mean by “biohybrid”
In Science’s version, the cell/device interface is created *in vitro*:
- **Stem cell–derived neurons** are engineered and embedded in an electronic device in the lab.
- The device is implanted so that **only the processes (axons/dendrites)** grow out into the brain.
- The **cell bodies stay with the device**, which they argue helps with SNR, power, and enables new types of stimulation concepts (e.g., neuron types / synaptic chemistry).

- Science’s essay (high-level concept): <https://science.xyz/news/biohybrid-neural-interfaces/>

### “Channels” vs synapses (why they think this could be different)
Science pushes a reframing: don’t count electrodes; count potential synapses.

On their biohybrid tech page, they argue (conceptually) that:
- neurons are denser than electrodes
- each neuron can form many connections
- “a million embedded neurons could form a billion synapses” with brain tissue

- Science biohybrid technology page: <https://science.xyz/technologies/biohybrid/>

They cite a scaling dataset as context:
- Stevenson Lab scaling reference linked by Science: <https://stevenson.lab.uconn.edu/scaling/>

### Proof-of-concept: optogenetic stimulation via an engrafted cortical “waffle” (mouse study)
Science released an early feasibility result showing that a **cortical biohybrid implant can transmit information into the brain** strongly enough to shape behavior.

Core design (as described in both Science’s post and IEEE Spectrum’s coverage):
- a **waffle-like** scaffold of **microwells** placed on the cortical surface
- neurons are loaded into microwells (aiming for ~one neuron per well)
- neurons survive and extend into superficial cortex
- optical stimulation (“turning on” graft neurons) can be used as a cue that mice learn to report

Primary source:
- Zappitelli et al. (bioRxiv, 2024): “Optogenetic stimulation of a cortical biohybrid implant guides goal directed behavior.”
  - DOI: <https://doi.org/10.1101/2024.11.22.624907>
  - Full text: <https://www.biorxiv.org/content/10.1101/2024.11.22.624907v1.full>

Independent coverage with helpful engineering details:
- IEEE Spectrum (Jun 4, 2025): “Science Corp's Biohybrid BCI Adds Neurons to the Brain.”
  - <https://spectrum.ieee.org/brain-computer-interface-2671151260>

### The hard problems (they openly acknowledge)
Science’s own essay is refreshingly explicit that biohybrid BCIs are low “technology readiness” and require solving tough bioengineering:
- immune compatibility (autologous vs allogeneic, “hypoimmunogenic” lines)
- keeping graft cells alive through hypoxia, glycemic shock, and host responses
- device design that supports neuron survival (including glial support)

- Science essay (technical challenges): <https://science.xyz/news/biohybrid-neural-interfaces/>

## What else they’re building: PRIMA visual prosthesis (clinical program)

Science’s most advanced clinical program appears to be PRIMA, a subretinal implant intended to stimulate remaining retinal circuitry when photoreceptors are lost in advanced retinal degeneration.

Science describes PRIMA as:
- a **light-powered subretinal implant** with **378 pixels**
- paired with **glasses** containing an infrared projector + camera that provide both **power and data** via patterned IR light
- being evaluated in clinical studies (Europe and US trials listed)

- PRIMA overview page: <https://science.xyz/technologies/prima/>

The PRIMA page also links peer-reviewed and trial references (e.g., PubMed-linked items and NCT IDs).

## My read (why it’s exciting)

Science’s biohybrid pitch is one of the few that feels like it’s attacking the *geometry* and *biology* of the interface, not just the electronics:
- If you can get stable, high-density connectivity via living processes, you potentially change the scaling laws.
- It also makes the interface problem less like “a bundle of wires” and more like “a grafted microcircuit,” which could open novel stimulation/learning paradigms.

But the credibility hinge is the same as always: can they make it **reliable, safe, manufacturable**, and ultimately **clinically supportable**?

---

### Notes on sourcing
- Biohybrid concept details are anchored primarily in Science’s own technical writeups and their bioRxiv preprint, with IEEE Spectrum as independent synthesis.
- Company location/footprint is taken from Science’s company page.
