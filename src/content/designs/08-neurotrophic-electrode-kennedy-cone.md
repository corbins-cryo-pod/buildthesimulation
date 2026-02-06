---
title: "Neurotrophic Electrode (Kennedy cone electrode)"
order: 8
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-IMBCI-0009"
interface_class: "intracortical"
status: "human"
last_updated: 2026-02-06
description: "A biologically integrated intracortical electrode (hollow cone with microwires) designed to encourage neurite ingrowth for long-term single-unit recording in humans."
modality: "Intracortical"
website: "https://pubmed.ncbi.nlm.nih.gov/9665587/"
tags: ["BCI", "intracortical", "single-unit", "neurotrophic", "cone electrode", "Kennedy", "cortex", "recording", "regenerative", "array"]
draft: false
---

# Neurotrophic Electrode (Kennedy cone electrode)

> **One-line verdict:** A biologically integrated intracortical electrode that encourages neurite ingrowth for long-term single-unit recording, trading channel count and scalability for potential stability.

**Quick tags:** Recording · Intracortical · Neurotrophic · Species: Human · First implanted: 1990s (reported)

---

## Overview

**What it is:** The Neurotrophic Electrode (NTE), also known as the cone electrode, is an intracortical neural interface designed to promote neurite growth into a hollow cone containing recording microwires. Rather than relying purely on mechanical compliance or coatings to reduce tissue response, it aims for biological integration (ingrowth) to stabilize the recording interface.

**Why it matters:** The NTE represents a distinct philosophy from many modern intracortical arrays: invite neurons in rather than repeatedly penetrating tissue with many shanks. It contributed early demonstrations of long-term human single-unit recording and BCI control using very low channel counts.

**Most comparable devices:** early microwire approaches (signal class), Utah array (contrast in scaling/channel count), regenerative PNI interfaces (conceptual similarity: ingrowth/integration).

---

## Spec Card Grid

### Identity
- **Device name:** Neurotrophic Electrode (NTE)
- **Canonical ID:** BTSD-IMBCI-0009
- **Inventor / key authors:** Philip R. Kennedy; Roy A. E. Bakay
- **Org / manufacturer:** academic / historical research program
- **First demonstrated (year):** ~1990 (reported)
- **First implanted (year):** 1990s (reported)
- **Species:** human
- **Regulatory / trial status:** human research (historical)
- **Primary use:** recording
- **Primary target:** motor cortex (reported; motor and speech motor areas appear in literature)

---

### Geometry & Architecture
- **Interface type:** intracortical neurotrophic (ingrowth)
- **Penetrating?:** yes
- **Form factor:** hollow cone with internal microwires
- **Array layout:** single cone per implant site (very low channel count)
- **Footprint (mm):** sub-mm cone tip (typical)
- **Insertion depth (mm):** intracortical (depth varies by implant)
- **Shank / lead dimensions:** cone-shaped; wire leads exit posteriorly
- **Site spacing (µm):** N/A (single site)
- **Tip geometry:** hollow cone opening
- **Insertion method:** surgical cortical insertion
- **Anchoring method:** biological integration via neurite ingrowth
- **Packaging location:** historically percutaneous connector/tether (program-dependent)

---

### Electrode & Channel Physics
- **Channel count:** ~1–2 channels per electrode (typical)
- **Active sites used (vs total):** all
- **Electrode material:** glass cone + metal microwires (reported)
- **Site area (µm²):** very small (single-unit regime)
- **Impedance @ 1 kHz:** high (single-unit recording regime; exact varies)
- **Noise floor / SNR:** potentially high SNR when stable units are present
- **Recording modality:** spikes (primary), LFP (secondary)
- **Stimulation capability:** no (recording-focused)
- **Charge injection limit / safe stim range:** N/A

---

### Tissue Interface & Bioresponse
- **Target tissue:** cortical neurons
- **BBB disruption:** moderate–high (penetrating)
- **Vascular disruption risk:** moderate (implant-dependent)
- **Micromotion sensitivity:** reduced after successful ingrowth (hypothesis/goal)
- **Gliosis / encapsulation:** reported as different from typical rigid arrays; varies with biological response
- **Neuron loss (if reported):** not clearly quantified in a single canonical source
- **Foreign-body response mitigation:** neurotrophic/ingrowth concept
- **Typical failure mode:** unsuccessful/limited ingrowth, loss of viable units, infection risk from percutaneous components

---

### System Architecture
- **Onboard electronics:** none (historical configurations)
- **Data path:** percutaneous wired tether (historical)
- **Telemetry bandwidth:** low (few channels)
- **Sampling rate:** spike-capable (kHz range; system-dependent)
- **Power:** external
- **Thermal management:** N/A
- **Hermeticity:** none (percutaneous systems)
- **MRI compatibility:** generally no (system-dependent)
- **Surgical complexity:** moderate; biologically delicate placement

---

### Performance Envelope
- **Typical yield (acute):** low–moderate (very few channels)
- **Typical yield (chronic):** variable; can be stable for long durations when integration succeeds
- **Stability over time:** high when stable units persist (reported in case-series)
- **Longevity (median / max):** multi-year recordings reported
- **Revision / explant:** difficult
- **Adverse events (high-level):** infection risk from percutaneous leads/connectors
- **Notable demos / tasks:** early BCI control and communication demonstrations using low channel count

---

### Clinical / Preclinical Evidence
- **N implanted subjects:** very small (case reports / small series)
- **Follow-up duration:** months to years
- **Indications:** paralysis / locked-in syndrome (experimental)
- **Trial registry:** not applicable (pre-modern registry era)
- **Primary outcomes:** feasibility of long-term single-unit human recording and control
- **Key limitations of evidence:** extremely low channel count; surgical/biological variability; heterogeneous reporting

---

## Engineering Verdict

**Strengths:**
- conceptually “regenerative” intracortical interface (biological integration)
- potential for long-term single-unit stability when successful

**Limitations / failure modes:**
- very low information bandwidth (few channels)
- percutaneous infection risk in historical implementations
- integration/ingrowth success may be variable

**Scaling constraints:**
- scaling channel count is non-trivial
- surgical complexity and device routing scale poorly

**What newer designs try to fix:**
- combine regeneration concepts with higher channel counts
- fully implantable packaging
- improve reliability of tissue–electrode coupling without sacrificing density

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** neurite ingrowth into a hollow cone with spike generation at an internal microwire
- **Parameters to expose as sliders:** ingrowth success probability, neurite density, micromotion amplitude, spike SNR
- **What outputs to visualize:** unit stability over time, failure probability vs integration parameters

---

## References
- Kennedy PR, Bakay RAE. *Restoration of neural output from a paralyzed patient by a direct brain connection.* NeuroReport. 1998;9(8):1707–1711. doi: 10.1097/00001756-199806010-00007. PubMed: <https://pubmed.ncbi.nlm.nih.gov/9665587/>
- Bartels J, Andreasen D, Ehirim P, et al. *Neurotrophic electrode: method of assembly and implantation into human motor speech cortex.* J Neurosci Methods. 2008. PubMed: <https://pubmed.ncbi.nlm.nih.gov/18672003/>
- Kennedy PR, et al. *Histological confirmation of myelinated neural filaments within the tip of the neurotrophic electrode after a decade of neural recordings.* Front Hum Neurosci. 2020;14:111. doi: 10.3389/fnhum.2020.00111. (Open access copies vary.)
