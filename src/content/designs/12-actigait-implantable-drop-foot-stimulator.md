---
title: "ActiGait implanted drop-foot stimulator (common peroneal nerve multi-contact cuff)"
order: 12
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0002"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "A hybrid implanted-plus-external functional electrical stimulation (FES) system using a multi-contact cuff on the common peroneal nerve to restore ankle dorsiflexion during gait."
modality: "Peripheral nerve"
website: "https://pubmed.ncbi.nlm.nih.gov/26207599/"
tags: ["PNI", "FES", "drop foot", "peroneal nerve", "cuff", "gait", "peripheral nerve", "stimulation"]
draft: false
---

# ActiGait implanted drop-foot stimulator (common peroneal nerve multi-contact cuff)

> **One-line verdict:** A hybrid implanted-plus-external FES system that uses a multi-contact cuff on the common peroneal nerve to selectively restore ankle dorsiflexion during gait.

**Quick tags:** Stimulation · Channels: multi-contact cuff (often described as 4-channel control) · Species: Human

---

## Overview

**What it is:** ActiGait is a partly implantable peroneal nerve stimulation system: an implanted stimulator body connected to a nerve cuff electrode wrapped around the common peroneal nerve, plus external components used to trigger stimulation patterns across gait phases.

**Why it matters:** It is a concrete, real-world example where cuff contact geometry + multi-channel programming yields functional selectivity (recruitment shaping) in a packaged clinical neuroprosthesis.

**Most comparable devices:** surface FES drop-foot systems (non-implant); other implantable peroneal nerve stimulators.

---

## Spec Card Grid

### Identity
- **Device name:** ActiGait implanted drop-foot stimulator
- **Canonical ID:** BTSD-PNI-0002
- **Org / manufacturer:** ActiGait is a commercial system (manufacturer/branding varies by era and region in publications and clinical materials)
- **First demonstrated (year):** clinical studies published in the 2000s–2010s
- **First implanted (year):** mid-2000s era (reported)
- **Species:** human
- **Regulatory / trial status:** used clinically in Europe in multiple cohorts; evidence includes prospective studies
- **Primary use:** stimulation (FES)
- **Primary target:** common peroneal (fibular) nerve, proximal to bifurcation

---

### Geometry & Architecture
- **Interface type:** peripheral nerve cuff (multi-contact, multi-channel stimulation)
- **Penetrating?:** no
- **Form factor:** implanted stimulator body + cable + cuff electrode; plus external trigger/controller
- **Array layout:** multi-contact cuff enabling multiple stimulation “channels” around the nerve (exact grouping is implementation-specific)
- **Footprint (mm):** not consistently reported in open clinical outcomes papers
- **Insertion method:** surgical placement of cuff around common peroneal nerve proximal to bifurcation; implant body placement in thigh
- **Anchoring method:** cuff placement + cable routing/strain relief
- **Packaging location:** hybrid (implanted stimulator + cuff; external controller/trigger)

---

### Electrode & Channel Physics
- **Channel count:** reported as multi-channel; often described as 4-channel functional control (implementation-dependent)
- **Active sites used (vs total):** multi-contact cuff (some reports describe ~12 contacts; confirm per specific publication)
- **Electrode material:** not pinned here
- **Recording modality:** N/A
- **Stimulation capability:** yes

---

### Tissue Interface & Bioresponse
- **Target tissue:** extraneural cuff on peroneal nerve trunk
- **Vascular disruption risk:** low–moderate (surgical dissection; compression risk if misfit)
- **Micromotion sensitivity:** low–moderate (strain relief important)
- **Encapsulation:** expected; long-term cohorts exist
- **Typical failure mode:** hardware issues, infection, threshold drift/selectivity changes, revision

---

### System Architecture
- **Onboard electronics:** stimulation in implanted body; none in cuff
- **Control path:** external trigger/controller coordinates stimulation timing (gait-phase)
- **Power:** hybrid architecture (model-dependent)
- **MRI compatibility:** model-specific

---

### Performance Envelope
- **Typical yield (acute):** selective dorsiflexion recruitment via programming
- **Typical yield (chronic):** long-term gait improvements reported across cohorts
- **Revision / explant:** occurs in real-world cohorts (rates vary)

---

### Clinical / Preclinical Evidence
- **Evidence base:** prospective cohort data in central drop foot (e.g., post-stroke)
- **Primary outcomes:** gait speed/endurance, functional dorsiflexion, usability
- **Key limitations of evidence:** mixed etiologies and heterogeneous rehab protocols

---

## Engineering Verdict

**Strengths:**
- multi-contact cuff enables functional selectivity for gait
- reduces daily placement burden vs surface FES

**Limitations / failure modes:**
- requires surgery and implanted hardware maintenance
- selectivity depends on nerve anatomy + cuff placement

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** peroneal nerve cross-section + circumferential cuff recruitment + gait-phase timing
- **Parameters to expose as sliders:** channel angular positions, encapsulation thickness, amplitude/pulse width per channel, trigger jitter
- **What outputs to visualize:** dorsiflexion torque proxy vs channel pattern; fascicle recruitment map per channel

---

## References
- Martin KD, et al. *Restoration of ankle movements with the ActiGait implantable drop foot stimulator: a safe and reliable treatment option for permanent central leg palsy.* J Neurosurg. 2016;124(1):70–76. doi: 10.3171/2014.12.JNS142110. PubMed: <https://pubmed.ncbi.nlm.nih.gov/26207599/>
