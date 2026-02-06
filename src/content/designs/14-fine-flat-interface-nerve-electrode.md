---
title: "FINE (Flat Interface Nerve Electrode)"
order: 14
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0005"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "An extraneural cuff electrode that intentionally flattens/reshapes a peripheral nerve to bring fascicles closer to contacts, improving functional selectivity without penetrating the nerve."
modality: "Peripheral nerve"
website: "https://pubmed.ncbi.nlm.nih.gov/12611367/"
tags: ["PNI", "cuff", "FINE", "flat interface", "selective stimulation", "extraneural", "peripheral nerve", "recording", "stimulation", "bidirectional"]
draft: false
---

# FINE (Flat Interface Nerve Electrode)

> **One-line verdict:** A non-penetrating cuff that deliberately reshapes a nerve into a flatter cross-section to improve fascicle access and functional selectivity, trading simplicity (and some compression risk margin) for better selectivity than round cuffs.

**Quick tags:** Stimulation (primary) · Recording (possible, limited) · Species: Human (research deployments) · First demonstrated: early 2000s

---

## Overview

**What it is:** The Flat Interface Nerve Electrode (FINE) is an extraneural cuff electrode designed to reshape a nerve from a roughly round cross-section into a flatter/oblong geometry so that more fascicles lie closer to the cuff contacts. The goal is improved selective stimulation (and, in some configurations, improved access for recording) without penetrating the nerve.

**Why it matters:** FINE is one of the most important “selectivity boosts without penetration” ideas in peripheral nerve interfaces. It sits between conventional round/spiral cuffs (safest, least selective) and intraneural arrays (most selective, higher biological risk).

**Most comparable devices:** spiral/helical cuffs (lower selectivity), split-cylinder cuffs, C‑FINE (composite/structured variants of the flat-interface concept).

---

## Spec Card Grid

### Identity
- **Device name:** FINE (Flat Interface Nerve Electrode)
- **Canonical ID:** BTSD-PNI-0005
- **Inventor / key authors:** D. J. Tyler; D. M. Durand (foundational work)
- **Org / manufacturer:** academic/research builds (not a single commercial SKU)
- **First demonstrated (year):** 2002 (selective stimulation demonstration)
- **First implanted (year):** chronic research implants reported in later neuroprosthesis literature (study-specific)
- **Species:** human (research) and animal models (foundational/chronic response)
- **Regulatory / trial status:** research implants / feasibility studies (varies by program)
- **Primary use:** stimulation (primary); recording possible but not the dominant deployment
- **Primary target:** mixed peripheral nerves (application-dependent)

---

### Geometry & Architecture
- **Interface type:** flat-interface cuff (extraneural)
- **Penetrating?:** no
- **Form factor:** cuff that reshapes the nerve to a flatter cross-section
- **Array layout:** multi-contact cuff (contact count varies by build and nerve)
- **Footprint (mm):** application-dependent; not a single universal dimension across studies
- **Insertion method:** surgical exposure; cuff placed around nerve; closure/fit depends on design variant
- **Anchoring method:** mechanical conformity + lead strain relief; fibrosis over time provides additional stabilization
- **Packaging location:** lead routed to IPG or to percutaneous/external connectors in research systems

---

### Electrode & Channel Physics
- **Channel count:** variable (multi-contact)
- **Active sites used (vs total):** study-dependent
- **Electrode material:** varies by fabrication (metal contacts in polymer/silicone cuffs; variants exist)
- **Recording modality:** CAP/LFP possible; generally low SNR compared with stimulation utility
- **Stimulation capability:** yes (core function)
- **Charge injection / safe stim range:** not a single canonical number (depends on contact material/area and waveform)

---

### Tissue Interface & Bioresponse
- **Target tissue:** peripheral nerve trunk (extraneural)
- **Vascular disruption risk:** low–moderate (surgical handling + compression risk if over-flattened or poorly fit)
- **Micromotion sensitivity:** low relative to intraneural interfaces; lead management still matters
- **Encapsulation:** fibrotic encapsulation expected (typical cuff behavior); can alter thresholds/selectivity over time
- **Typical failure mode:** threshold drift/reduced selectivity from encapsulation + mechanical/lead failures; for percutaneous systems, infection dominates risk

---

### System Architecture
- **Onboard electronics:** none in cuff; stimulation/recording electronics in IPG or external controller
- **Data path:** lead to IPG or external stim/record platform
- **Power:** IPG battery or external supply (study-dependent)
- **Surgical complexity:** moderate peripheral nerve exposure; careful fit is crucial because the device purposefully reshapes tissue

---

### Performance Envelope
- **Core performance claim:** improved functional selectivity vs round cuffs due to nerve reshaping and closer fascicle–contact proximity
- **Stability over time:** demonstrated in chronic research contexts (program-dependent)
- **Notable demos / tasks:** selective stimulation demonstrations; nerve-cuff selectivity work relevant to standing/gait and upper-limb neuroprostheses

---

### Clinical / Preclinical Evidence
- **Evidence base:** foundational selectivity paper + chronic tissue response work + later fabrication/high-density cuff methods papers
- **Key limitation:** “FINE” is a design concept, not a single manufactured device — contact counts, materials, and packaging differ across implementations; performance should be tied to a specific build/study

---

## Engineering Verdict

**Strengths:**
- non-penetrating interface with a real selectivity advantage over round cuffs
- compatible with both therapy-style packaging (IPG) and research externalization

**Limitations / failure modes:**
- requires controlled reshaping: too much flattening can increase chronic compression risk; too little reduces selectivity benefit
- heterogeneous implementations make a single spec sheet misleading

**Scaling constraints:**
- more contacts can improve selectivity but increases lead/packaging burden

**What newer designs try to fix:**
- composite/segmented-stiffness approaches (e.g., C‑FINE) aiming for reshaping with better compliance and packaging practicality

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** multi-fascicle nerve cross-section + cuff-induced deformation (round → oblong) + extracellular stimulation field
- **Parameters to expose as sliders:** flattening ratio, contact count/placement, encapsulation thickness/conductivity, bipolar vs multipolar drive patterns
- **What outputs to visualize:** fascicle recruitment/selectivity maps vs flattening; “selectivity gain” vs round cuff baseline; threshold drift proxy vs encapsulation

---

## References
- Tyler DJ, Durand DM. *Functionally selective peripheral nerve stimulation with a flat interface nerve electrode.* IEEE Trans Neural Syst Rehabil Eng. 2002;10(4):294–303. doi: 10.1109/TNSRE.2002.806840. PubMed: <https://pubmed.ncbi.nlm.nih.gov/12611367/>
- Tyler DJ, Durand DM. *Chronic response of the rat sciatic nerve to the flat interface nerve electrode.* Ann Biomed Eng. 2003;31(6):633–642. doi: 10.1114/1.1569263. PubMed: <https://pubmed.ncbi.nlm.nih.gov/12797612/>
- Dweiri YM, Stone MA, Tyler DJ, McCallum GA, Durand DM. *Fabrication of High Contact-Density, Flat-Interface Nerve Electrodes for Recording and Stimulation Applications.* J Vis Exp. 2016;(116):54388. doi: 10.3791/54388. PubMed: <https://pubmed.ncbi.nlm.nih.gov/27768048/>
