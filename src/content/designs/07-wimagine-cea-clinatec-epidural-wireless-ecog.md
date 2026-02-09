---
title: "WIMAGINE (CEA‑Clinatec) epidural wireless ECoG implant"
order: 7
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-IMBCI-0004"
interface_class: "ecog"
status: "human"
last_updated: 2026-02-06
description: "A fully implanted, wireless epidural ECoG system developed by CEA‑Clinatec for human motor BCI research, emphasizing clinical robustness and long-term stability over single-unit precision."
modality: "Cortical surface"
website: "https://clinatec.fr/"
tags: ["BCI", "ECoG", "epidural", "wireless", "CEA", "Clinatec", "WIMAGINE", "motor decoding", "cortex", "recording"]
draft: false
---

# WIMAGINE (CEA‑Clinatec) epidural wireless ECoG implant

> *One-line verdict:* A fully implanted, wireless epidural ECoG system that trades spatial precision and single-unit access for a safer surgical interface class and clinically robust long‑term recordings for human motor BCIs.

*Quick tags:* Recording · Closed-loop capable (system-dependent) · Species: Human · First implanted: ~2016

---

### Overview

*What it is:* WIMAGINE is a fully implanted, wireless epidural ECoG brain–computer interface developed by CEA‑Clinatec for human motor restoration research. It records population-level cortical signals over motor cortex without penetrating brain tissue and transmits data wirelessly to external decoding systems.

*Why it matters:* WIMAGINE is a concrete demonstration that stable, long-term motor decoding is possible in humans using a non‑penetrating, fully implanted neural interface class — enabling high-profile demonstrations (e.g., exoskeleton control) while reducing biological risk relative to penetrating arrays.

*Most comparable devices:* subdural/epidural ECoG systems (signal class), other fully implanted wireless cortical surface interfaces.

---

### Spec Card Grid

### Identity
- *Device name:* WIMAGINE
- *Canonical ID:* BTSD-IMBCI-0004
- *Inventor / key authors:* Alim‑Louis Benabid et al.
- *Org / manufacturer:* CEA‑Clinatec (France)
- *First demonstrated (year):* ~2016 (reported)
- *First implanted (year):* ~2016 (reported)
- *Species:* human
- *Regulatory / trial status:* human research trial
- *Primary use:* recording
- *Primary target:* motor cortex (epidural over M1)

---

### Geometry & Architecture
- *Interface type:* epidural ECoG
- *Penetrating?:* no
- *Form factor:* flexible electrode array
- *Array layout:* multi-contact ECoG grid
- *Footprint (mm):* cm-scale cortical coverage (reported)
- *Insertion depth (mm):* epidural (no cortical penetration)
- *Shank / lead dimensions:* N/A
- *Site spacing (µm):* mm-scale
- *Tip geometry:* flat contacts
- *Insertion method:* craniotomy with epidural placement
- *Anchoring method:* skull fixation
- *Packaging location:* fully implanted cranial module with wireless telemetry

---

### Electrode & Channel Physics
- *Channel count:* ~64 (reported; configurations vary)
- *Active sites used (vs total):* majority active (reported)
- *Electrode material:* platinum-based contacts (reported)
- *Site area (µm²):* large surface contacts (ECoG-scale)
- *Impedance @ 1 kHz:* low (typical for ECoG; exact values vary)
- *Noise floor / SNR:* moderate; population-level signals
- *Recording modality:* ECoG (LFP-dominant)
- *Stimulation capability:* no (recording-focused)
- *Charge injection limit / safe stim range:* N/A

---

### Tissue Interface & Bioresponse
- *Target tissue:* dura-adjacent cortical surface
- *BBB disruption:* low
- *Vascular disruption risk:* low
- *Micromotion sensitivity:* low
- *Gliosis / encapsulation:* generally lower than penetrating arrays; long-term encapsulation can still affect coupling
- *Neuron loss (if reported):* none reported (in summary sources)
- *Foreign-body response mitigation:* non-penetrating geometry
- *Typical failure mode:* coupling changes (encapsulation), hardware aging, telemetry/power issues

---

### System Architecture
- *Onboard electronics:* amplification + digitization
- *Data path:* fully implanted wireless telemetry
- *Telemetry bandwidth:* sufficient for ECoG decoding (exact figures vary)
- *Sampling rate:* ECoG-appropriate (often hundreds of Hz to kHz in practice; exact varies)
- *Power:* implanted power module (inductive recharge reported)
- *Thermal management:* within safe cranial limits (reported)
- *Hermeticity:* medical-grade sealed implant
- *MRI compatibility:* unknown/conditional (device- and protocol-dependent)
- *Surgical complexity:* moderate craniotomy, low cortical risk (relative to penetrating arrays)

---

### Performance Envelope
- *Typical yield (acute):* high
- *Typical yield (chronic):* stable multi-month recordings (reported)
- *Stability over time:* good
- *Longevity (median / max):* multi-year implants reported in this program
- *Revision / explant:* feasible
- *Adverse events (high-level):* none major reported in summary sources
- *Notable demos / tasks:* robotic exoskeleton control; motor intention decoding in tetraplegia

---

### Clinical / Preclinical Evidence
- *N implanted subjects:* small human cohort
- *Follow-up duration:* months to years
- *Indications:* motor paralysis / tetraplegia
- *Trial registry links:* NCT02550522
- *Primary outcomes:* feasibility of wireless epidural motor BCI
- *Key limitations of evidence:* limited spatial resolution; small sample sizes; device specs not uniformly reported

---

### Engineering Verdict

*Strengths:*
- strong safety profile relative to penetrating arrays
- fully implanted, wireless human system
- clinically realistic surgical burden

*Limitations / failure modes:*
- limited spatial and single-unit resolution
- decoding ceiling for surface/population signals

*Scaling constraints:*
- information density per unit area
- telemetry/power budget
- long-term coupling changes (encapsulation)

*What newer designs try to fix:*
- higher channel counts
- improved spatial specificity without penetrating tissue

---

### Simulation Hooks (for BuildTheSimulation)
- *Minimal model to reproduce:* epidural ECoG grid over layered cortex with volume conduction
- *Parameters to expose as sliders:* electrode size, dura thickness, cortical synchrony, noise floor
- *What outputs to visualize:* spatial smoothing, decoding proxy vs electrode density

---

### References
- ClinicalTrials.gov: NCT02550522 (record access varies by site; link by ID): <https://clinicaltrials.gov/study/NCT02550522>
- (Add) Benabid AL et al., *Lancet Neurology* (2019) — to link precisely once we pick the exact article/DOI.
- CEA‑Clinatec: <https://clinatec.fr/>

