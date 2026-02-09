---
title: "Neuropixels Probe"
order: 4
pubDate: 2026-02-03
updatedDate: 2026-02-03
device_id: "BTSD-0004"
interface_class: "intracortical"
status: "research"
last_updated: 2026-02-03
description: "A CMOS silicon intracortical probe family (Neuropixels v1/v2): extremely high-density, low-noise spike recording for animal research; not a chronic human implant."
modality: "Intracortical"
website: "https://www.neuropixels.org/"
tags: ["BCI", "intracortical", "Neuropixels", "recording", "CMOS", "IMEC", "UCL", "Allen Institute", "cortex", "stimulation", "bidirectional", "microelectrode"]
draft: false
---

# Neuropixels Probe (IMEC / UCL / Allen Institute)

> *One-line verdict:* Neuropixels is the highest-density, lowest-noise intracortical recording platform widely used in neuroscience, defining an upper bound on spike-recording throughput — but it is a research tool, not a chronic human implant.

*Quick tags:* Recording · Stimulation: no · Channels: 384–960 (generation-dependent) · Species: rodent + NHP · First demonstrated: 2017

---

### Overview

*What it is:* A silicon CMOS-based neural probe with hundreds of recording sites densely packed along a thin shank, multiplexed into on-chip amplifiers/ADCs and streamed out through a wired headstage.

*Why it matters:* It sets a practical ceiling for channel density and signal quality in vivo, and it has become a benchmark substrate for spike-sorting and large-scale systems neuroscience.

*Most comparable devices:* Utah microelectrode arrays (human intracortical baseline), flexible-thread intracortical systems (e.g., Neuralink-style architecture, different goals), other CMOS shank probes.

---

### Spec Card Grid

### Identity
- *Device name:* Neuropixels (v1, v2.x family)
- *Canonical ID:* BTSD-0004
- *Inventor / key authors:* IMEC / UCL / Allen Institute teams (collaborative platform)
- *Org / manufacturer:* IMEC (platform)
- *First demonstrated (year):* 2017
- *First implanted (year):* N/A (research tool; not a chronic human implant)
- *Species:* rodent, NHP
- *Regulatory / trial status:* research only
- *Primary use:* recording
- *Primary target:* cortex, hippocampus, thalamus (and other deep targets depending on placement)

---

### Geometry & Architecture
- *Interface type:* intracortical
- *Penetrating?:* yes
- *Form factor:* single thin silicon shank
- *Shank width (µm):* ~70 (generation-dependent)
- *Shank thickness (µm):* ~20 (generation-dependent)
- *Shank length (mm):* ~10 (common)
- *Site spacing (µm):* ~20 (common)
- *Array layout:* linear column(s) along the shank
- *Insertion method:* micromanipulator
- *Anchoring method:* rigid shank + skull fixation (typical acute/semichronic prep)
- *Packaging location:* external headstage

---

### Electrode & Channel Physics
- *Total sites:* ~960–1280 (generation-dependent)
- *Simultaneous channels:* ~384–768 (generation-dependent)
- *Electrode material:* titanium nitride (common)
- *Site area (µm²):* small (often reported on the order of ~10 µm²; varies by generation)
- *Impedance @ 1 kHz:* often reported around ~100–200 kΩ (varies)
- *Noise floor / SNR:* low-noise, often reported around a few µV RMS (varies by setup)
- *Recording modality:* single-unit spikes + LFP
- *Stimulation capability:* no
- *Charge injection limit / safe stim range:* N/A

---

### Tissue Interface & Bioresponse
- *Target tissue:* gray + white matter (depending on trajectory)
- *BBB disruption:* high (penetrating)
- *Vascular disruption risk:* moderate–high (placement dependent)
- *Micromotion sensitivity:* high (rigid silicon in moving brain)
- *Gliosis / encapsulation:* major constraint for chronic use
- *Neuron loss (if reported):* can be significant near shank in chronic contexts
- *Foreign-body response mitigation:* not the core design goal; platform optimized for research recording
- *Typical failure mode:* tissue response + micromotion → drift/instability; not designed for long-term human implantation

---

### System Architecture
- *Onboard electronics:* on-shank amplification + multiplexing/ADC (platform feature)
- *Data path:* high-speed wired headstage
- *Telemetry bandwidth:* wired (lab system; varies)
- *Sampling rate:* often ~30 kHz per channel (common in practice)
- *Power:* external
- *Thermal management:* low but nonzero dissipation; setup-dependent
- *Hermeticity:* none (lab device)
- *MRI compatibility:* no/unknown (assume no)
- *Surgical complexity:* high-precision placement (research surgery)

---

### Performance Envelope
- *Spike yield:* extremely high (relative to most other single-probe technologies)
- *Neuron count per probe:* often thousands (analysis-dependent)
- *Stability over time:* hours to days/weeks (prep-dependent); not a chronic implant platform
- *Longevity (median / max):* not intended for chronic implant lifetimes
- *Revision / explant:* remove and replace
- *Notable demos / tasks:* large-scale circuit mapping; decoding benchmarks; whole-brain-scale recordings in animals

---

### Clinical / Preclinical Evidence
- *N implanted subjects / animals:* very large adoption across labs (animal research)
- *Follow-up duration:* acute / short-term / semichronic
- *Indications:* none (research)
- *Trial registry links:* N/A
- *Primary outcomes:* research recordings
- *Key limitations of evidence:* not a clinical device; chronic human translation would require different packaging/biocompatibility strategy

---

### Engineering Verdict

*Strengths:*
- unmatched channel density (in a single shank)
- excellent noise performance
- on-chip multiplexing enables scale
- strong benchmarking ecosystem (software + datasets)

*Limitations / failure modes:*
- rigid silicon + penetrating geometry
- external tether / headstage
- chronic tissue response and micromotion sensitivity

*Scaling constraints:*
- mechanical mismatch with brain
- wiring/bandwidth and connector complexity
- thermal + packaging constraints if translated

*What next-gen tries to fix:*
- softer mechanics (compliance matching)
- implantable packaging and hermeticity
- long-term stability

---

### Simulation Hooks (for BuildTheSimulation)
- *Minimal model to reproduce:* dense electrode column in cortical tissue with spike propagation + distance-dependent attenuation
- *Parameters to expose as sliders:* site spacing, shank thickness, noise floor, tissue damage zone / encapsulation thickness
- *What outputs to visualize:* spike yield proxy, neuron count proxy, SNR proxy, stability vs time proxy

---

### References
- Jun JJ, et al. “Fully integrated silicon probes for high-density recording of neural activity.” *Nature* (2017). <https://www.nature.com/articles/nature24636>
- Steinmetz NA, et al. “Neuropixels 2.0: A miniaturized high-density probe for stable, long-term brain recordings.” *Science* (2021). PMC: <https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/>
- Neuropixels program site: <https://www.neuropixels.org/>

