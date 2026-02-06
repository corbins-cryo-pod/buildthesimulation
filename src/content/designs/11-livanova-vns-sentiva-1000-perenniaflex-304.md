---
title: "LivaNova VNS Therapy System (SenTiva Model 1000 + PerenniaFLEX Model 304 lead)"
order: 11
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0004"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "An FDA PMA-approved, fully implanted cervical vagus nerve stimulation system using a two-contact helical cuff lead for long-term neuromodulation therapy."
modality: "Peripheral nerve"
website: "https://www.livanova.com/epilepsy-vnstherapy/en-us"
tags: ["PNI", "VNS", "vagus nerve", "helical cuff", "stimulation", "neuromodulation", "epilepsy"]
draft: false
---

# LivaNova VNS Therapy System (SenTiva Model 1000 + PerenniaFLEX Model 304 lead)

> **One-line verdict:** An FDA PMA-approved, fully implanted cervical vagus nerve stimulation system that trades selectivity for proven long-term safety and scalable therapy delivery.

**Quick tags:** Stimulation · Channels: bipolar (2 helical electrodes) · Species: Human · Therapy lineage: 1990s → present

---

## Overview

**What it is:** An implanted pulse generator (IPG) connected to a silicone-insulated lead with two helical cuff electrodes (and an anchor tether) wrapped around the left cervical vagus nerve to deliver programmed stimulation.

**Why it matters:** This is arguably the reference implementation for implantable autonomic neuromodulation: enormous real-world deployment, standardized surgical workflow, and a well-characterized risk envelope.

**Most comparable devices:** other implantable VNS platforms (legacy generator/lead variants), emerging miniaturized implantable VNS systems (research), and non-implant auricular tVNS (contrast).

---

## Spec Card Grid

### Identity
- **Device name:** LivaNova VNS Therapy System — SenTiva Model 1000 generator + PerenniaFLEX Model 304 lead
- **Canonical ID:** BTSD-PNI-0004
- **Org / manufacturer:** LivaNova (and predecessor lineage)
- **First demonstrated (year):** therapy lineage established in the 1990s; SenTiva generation described in modern regulatory/clinical materials
- **First implanted (year):** 1990s era (therapy lineage)
- **Species:** human
- **Regulatory / trial status:** FDA PMA family for VNS Therapy® System (P970003; multiple supplements and model variations)
- **Primary use:** stimulation
- **Primary target:** left cervical vagus nerve

---

### Geometry & Architecture
- **Interface type:** autonomic nerve cuff lead (helical electrode lead)
- **Penetrating?:** no (extraneural cuff)
- **Form factor:** lead with two helical electrodes + anchor tether (coiled around vagus)
- **Array layout:** bipolar stimulation (two helical electrodes)
- **Footprint (mm):** lead inner diameter options reported in the literature (e.g., 2 mm and 3 mm families; confirm per exact lead model when a datasheet/SSED is pinned)
- **Insertion depth (mm):** N/A (extraneural wrap)
- **Tip geometry:** helical coils
- **Insertion method:** surgical neck exposure; coil electrodes around left vagus; tunnel lead to IPG pocket
- **Anchoring method:** tether + lead routing/strain relief
- **Packaging location:** fully implanted (neck cuff + subcutaneous chest IPG)

---

### Electrode & Channel Physics
- **Channel count:** 1 stimulation pair (2 electrodes)
- **Active sites used (vs total):** 2/2
- **Electrode material:** not pinned here (varies by lead generation; confirm via SSED/datasheet)
- **Recording modality:** N/A (therapy stimulation)
- **Stimulation capability:** yes
- **Charge injection limit / safe stim range:** therapy-programmer constrained; parameter ranges are model/labeling dependent

---

### Tissue Interface & Bioresponse
- **Target tissue:** extraneural cuff on vagus nerve epineurium
- **Micromotion sensitivity:** low–moderate (strain relief matters)
- **Encapsulation:** fibrotic encapsulation around cuff expected over time
- **Typical failure mode:** lead fracture/connector issues, infection, revision/explant (device-class); model-specific advisories/recalls exist historically

---

### System Architecture
- **Onboard electronics:** stimulation in IPG; none at cuff
- **Data path:** fully implanted; programming via clinical programmer/wand
- **Power:** implant battery (model dependent)
- **Hermeticity:** IPG hermetic package (medical implant standard)
- **MRI compatibility:** conditional by model (refer to labeling)

---

### Performance Envelope
- **Typical yield (acute):** reliable stimulation delivery after implant; titration required
- **Typical yield (chronic):** long-term therapy delivery; efficacy varies by indication/patient
- **Longevity (median / max):** battery-limited; revisions occur (model dependent)
- **Adverse events (high-level):** hoarseness/voice alteration, cough, dyspnea, dysphagia, infection, lead issues (device-class)

---

### Clinical / Preclinical Evidence
- **Evidence base:** extensive clinical deployment and literature spanning decades
- **Indications:** drug-resistant epilepsy (core PMA); other indications vary by region/labeling
- **Key limitations of evidence:** heterogeneous cohorts and evolving hardware/parameter protocols across decades

---

## Engineering Verdict

**Strengths:**
- massive real-world validation + standardized implant workflow
- simple, robust extraneural helical cuff interface

**Limitations / failure modes:**
- limited selectivity (mixed fiber populations)
- lead/connector failure modes and revision burden exist

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** cervical vagus as multi-fascicle cable + extraneural bipolar cuff recruitment model
- **Parameters to expose as sliders:** cuff inner diameter, electrode spacing, encapsulation thickness, pulse width/amplitude/frequency
- **What outputs to visualize:** fiber recruitment curves by diameter and distance; off-target recruitment proxy

---

## References
- Afra P, Adamolekun B, Aydemir S, Watson GDR. *Evolution of the Vagus Nerve Stimulation (VNS) Therapy System Technology for Drug-Resistant Epilepsy.* Front Med Technol. 2021. doi: 10.3389/fmedt.2021.696543. PubMed: <https://pubmed.ncbi.nlm.nih.gov/35047938/>
- LivaNova (product/therapy overview): <https://www.livanova.com/epilepsy-vnstherapy/en-us>
- FDA PMA family (VNS Therapy System): P970003 (add specific SSED/Supplement links when pinned)
