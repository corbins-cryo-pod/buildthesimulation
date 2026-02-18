# BTS — Device entry template

Use this template when adding a new entry under `src/content/designs/` (exposed at `/devices/`).

---
title: "[DEVICE NAME]"
device_id: "[BTSD-XXXX]"
interface_class: "[intracortical | ecog | seeg | endovascular | pni | dbs | scs | other]"
status: "[human | preclinical | theoretical]"
last_updated: "YYYY-MM-DD"
---

# [DEVICE NAME]

> **One-line verdict:** [1 sentence: what it is + the core tradeoff]

**Quick tags:** [Recording | Stimulation | Closed-loop] · [Channels: ___] · [Species: ___] · [First implanted: ____]

---

## Overview
**What it is:** [2–3 sentences, plain language]  
**Why it matters:** [1–2 sentences: historical impact / unique engineering move]  
**Most comparable devices:** [Device A], [Device B], [Device C]

---

## Spec Card Grid

### 🧬 Identity
- **Device name:**  
- **Canonical ID:**  
- **Inventor / key authors:**  
- **Org / manufacturer:**  
- **First demonstrated (year):**  
- **First implanted (year):**  
- **Species:**  
- **Regulatory / trial status:**  
- **Primary use:** [Recording / Stimulation / Hybrid]  
- **Primary target:** [motor cortex / hippocampus / vagus / DRG / etc.]

---

### 📐 Geometry & Architecture
- **Interface type:**  
- **Penetrating?:** [yes/no]  
- **Form factor:** [shank / microwire bundle / mesh / cuff / stent / lead / other]  
- **Array layout:** [e.g., 10×10, linear, braided, etc.]  
- **Footprint (mm):**  
- **Insertion depth (mm):**  
- **Shank / lead dimensions:** [L × W × T]  
- **Site spacing (µm):**  
- **Tip geometry:**  
- **Insertion method:** [impactor / shuttle / catheter / robot / etc.]  
- **Anchoring method:**  
- **Packaging location:** [skull-mounted / subcutaneous / fully implanted / percutaneous]

---

### ⚡ Electrode & Channel Physics
- **Channel count:**  
- **Active sites used (vs total):**  
- **Electrode material:**  
- **Site area (µm²):**  
- **Impedance @ 1 kHz:**  
- **Noise floor / SNR:**  
- **Recording modality:** [spikes / LFP / CAP / ECoG]  
- **Stimulation capability:** [yes/no]  
- **Charge injection limit / safe stim range:**

---

### 🧠 Tissue Interface & Bioresponse
- **Target tissue:**  
- **BBB disruption:** [low/med/high/unknown]  
- **Vascular disruption risk:** [low/med/high/unknown]  
- **Micromotion sensitivity:** [low/med/high/unknown]  
- **Gliosis / encapsulation:** [expected/observed + notes]  
- **Neuron loss (if reported):**  
- **Foreign-body response mitigation:** [coatings, softening, drugs, geometry]  
- **Typical failure mode:** [signal loss, delamination, fracture, infection, etc.]

---

### 🖥️ System Architecture
- **Onboard electronics:** [amp/ADC/stim/none]  
- **Data path:** [tethered / percutaneous / fully implanted wireless]  
- **Telemetry bandwidth:**  
- **Sampling rate:**  
- **Power:** [battery / inductive / tethered]  
- **Thermal management:** [temp rise if known]  
- **Hermeticity:** [materials + feedthroughs]  
- **MRI compatibility:** [yes/no/conditional]  
- **Surgical complexity:** [short note]

---

### 📈 Performance Envelope
- **Typical yield (acute):**  
- **Typical yield (chronic):**  
- **Stability over time:**  
- **Longevity (median / max):**  
- **Revision / explant:** [ease + outcomes]  
- **Adverse events (high-level):**  
- **Notable demos / tasks:**

---

### 🏥 Clinical / Preclinical Evidence
- **N implanted subjects / animals:**  
- **Follow-up duration:**  
- **Indications:**  
- **Trial registry links:** [if any]  
- **Primary outcomes:**  
- **Key limitations of evidence:**

---

## Engineering Verdict
**Strengths:**  
-  
-  

**Limitations / failure modes:**  
-  
-  

**Scaling constraints:**  
- [wiring, heat, surgery time, encapsulation, bandwidth, etc.]

**What newer designs try to fix:**  
-

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** [e.g., shank in tissue with neuron density + impedance + gliosis layer]  
- **Parameters to expose as sliders:**  
  -  
- **What outputs to visualize:**  
  -

---

## References
- [1]  
- [2]  
- [3]
