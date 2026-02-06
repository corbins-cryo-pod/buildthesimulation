---
title: "Utah Microelectrode Array (UEA)"
order: 1
pubDate: 2026-02-03
updatedDate: 2026-02-03
device_id: "BTSD-0001"
interface_class: "intracortical"
status: "human"
last_updated: 2026-02-03
description: "A 10×10 silicon intracortical microelectrode array (typically 96 wired channels): excellent spikes early, but challenging chronic stability."
modality: "Intracortical"
website: "https://blackrockneurotech.com/"
tags: ["BCI", "intracortical", "penetrating", "microelectrode array", "Utah Array", "UEA", "cortex", "recording", "stimulation", "bidirectional", "array", "microelectrode"]
draft: false
---

# Utah Microelectrode Array (UEA)

> **One-line verdict:** A rigid silicon intracortical microelectrode array that delivers high-quality spikes early, but pays a chronic penalty from penetration trauma, micromotion mismatch, and gliosis-driven signal loss.

**Quick tags:** Recording · Stimulation · Closed-loop (system-dependent) · Channels: 96–128 · Species: Human/NHP/rodent · First implanted: ~1998

---

## Overview

**What it is:** The Utah array is a 10×10 bed of silicon shanks inserted into cortex (often motor cortex). It is typically wired out to external amplifiers/recorders via a percutaneous connector in many classic research deployments.

**Why it matters:** It is the workhorse design behind a large fraction of landmark intracortical human BCI results (cursor control, typing, robotic arm control), and it defines the “spike-first” performance baseline.

**Most comparable devices:** microwire bundles, other penetrating intracortical arrays, flexible thread-based intracortical systems.

---

## Spec Card Grid

### Identity
- **Device name:** Utah Microelectrode Array (UEA)
- **Canonical ID:** BTSD-0001
- **Inventor / key authors:** Richard Normann (University of Utah)
- **Org / manufacturer:** Blackrock Neurotech (modern manufacturing)
- **First demonstrated (year):** ~1992 (prototype)
- **First implanted (year):** ~1998 (human)
- **Species:** Human, NHP, rodent
- **Regulatory / trial status:** Human research (IDE)
- **Primary use:** Recording + stimulation
- **Primary target:** Motor cortex (common), other cortical targets

---

### Geometry & Architecture
- **Interface type:** Intracortical
- **Penetrating?:** yes
- **Form factor:** shank array (silicon)
- **Array layout:** 10×10 needle bed
- **Footprint (mm):** ~4 × 4
- **Insertion depth (mm):** ~1.0–1.5 (typical human motor cortex)
- **Shank / lead dimensions:** shank width ~80 µm (length above)
- **Site spacing (µm):** 400
- **Tip geometry:** sharpened silicon
- **Insertion method:** pneumatic impactor
- **Anchoring method:** percutaneous pedestal / skull-mounted connector (system-dependent)
- **Packaging location:** often percutaneous in classic research stacks

---

### Electrode & Channel Physics
- **Channel count:** 96–128 (typical wired)
- **Active sites used (vs total):** typically 96 recording channels in many deployed arrays
- **Electrode material:** platinum / iridium
- **Site area (µm²):** ~200–400
- **Impedance @ 1 kHz:** ~100–500 kΩ
- **Noise floor / SNR:** varies by system; spikes are often strong acutely
- **Recording modality:** spikes + LFP
- **Stimulation capability:** yes
- **Charge injection limit / safe stim range:** system- and electrode-dependent (often not reported uniformly)

---

### Tissue Interface & Bioresponse
- **Target tissue:** cortex
- **BBB disruption:** high (penetrating)
- **Vascular disruption risk:** moderate–high (depends on placement)
- **Micromotion sensitivity:** high (rigid silicon vs soft brain)
- **Gliosis / encapsulation:** commonly observed in chronic implants
- **Neuron loss (if reported):** often reported as substantial within ~100 µm over time
- **Foreign-body response mitigation:** coatings/material variants exist, but core rigidity remains
- **Typical failure mode:** gradual channel loss / encapsulation, infections related to percutaneous components, connector issues

---

### System Architecture
- **Onboard electronics:** none on the array (classic)
- **Data path:** tethered / percutaneous in many research systems
- **Telemetry bandwidth:** N/A (tethered)
- **Sampling rate:** system-dependent
- **Power:** external
- **Thermal management:** external (classic)
- **Hermeticity:** percutaneous connector systems vary
- **MRI compatibility:** generally no/unknown unless explicitly specified for a given configuration
- **Surgical complexity:** craniotomy + insertion tooling

---

### Performance Envelope
- **Typical yield (acute):** high (spike yield commonly strong early)
- **Typical yield (chronic):** variable; declines over months
- **Stability over time:** often 6–36 months of “good signals” reported in many programs (context-dependent)
- **Longevity (median / max):** variable (context-dependent)
- **Revision / explant:** explantable; revision surgeries not uncommon in long studies
- **Adverse events (high-level):** depends on protocol; percutaneous infection risk exists
- **Notable demos / tasks:** cursor control, typing, robotic arm control

---

### Clinical / Preclinical Evidence
- **N implanted subjects / animals:** >30 humans reported across programs (order-of-magnitude)
- **Follow-up duration:** months to years in research cohorts
- **Indications:** paralysis, ALS, stroke (research)
- **Trial registry links:** varies by program (to add)
- **Primary outcomes:** communication/control task performance
- **Key limitations of evidence:** heterogeneous hardware stacks and reporting; chronic performance varies widely

---

## Engineering Verdict

**Strengths:**
- strong spike recordings early
- mature ecosystem across decades of research

**Limitations / failure modes:**
- rigid penetrating shanks + micromotion drive chronic signal loss
- percutaneous connectors introduce infection/maintenance burden

**Scaling constraints:**
- wiring/connector complexity
- chronic biology (gliosis/encapsulation)
- surgery time and placement constraints

**What newer designs try to fix:**
- mechanical mismatch + micromotion
- percutaneous connector infection route
- high-channel wiring burden

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** rigid shank array in tissue with a time-varying gliosis/encapsulation layer
- **Parameters to expose as sliders:** insertion depth, neuron density, encapsulation thickness, impedance drift
- **What outputs to visualize:** spike yield, SNR proxy, channel survival vs time

---

## References
- (Add primary Normann + chronic response + BrainGate methods papers here)
