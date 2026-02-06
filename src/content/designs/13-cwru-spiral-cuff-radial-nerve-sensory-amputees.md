---
title: "CWRU self-sizing spiral nerve cuff (upper-limb sensory stimulation research deployments)"
order: 13
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0003"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "A research-grade self-sizing spiral cuff electrode implementation used in chronic human peripheral nerve stimulation studies, including sensory stimulation in upper-limb amputees."
modality: "Peripheral nerve"
website: "https://pubmed.ncbi.nlm.nih.gov/28693584/"
tags: ["PNI", "spiral cuff", "self-sizing", "CWRU", "sensory feedback", "amputation", "stimulation", "peripheral nerve", "cuff"]
draft: false
---

# CWRU self-sizing spiral nerve cuff (upper-limb sensory stimulation research deployments)

> **One-line verdict:** A research-grade, non-penetrating self-sizing spiral cuff implementation that achieves durable peripheral nerve stimulation (and measurable selectivity) with relatively low surgical risk, at the cost of limited channel density.

**Quick tags:** Stimulation · Channels: multi-contact (configuration varies) · Species: Human

---

## Overview

**What it is:** A self-curling polymer spiral cuff electrode (rooted in the Naples/Mortimer spiral cuff design family) that wraps around a peripheral nerve and provides extraneural stimulation through multiple contacts. This entry focuses on well-documented human research deployments associated with CWRU/Cleveland VA programs, including chronic multi-contact cuff stimulation for sensory feedback in upper-limb amputees.

**Why it matters:** It is one of the best-documented long-duration human extraneural cuff implementations, with multi-year stability data (contact functionality and threshold stability) and functional neuroprosthesis outcomes.

**Most comparable devices:** split-cylinder cuffs; FINE/C-FINE (more selectivity); intraneural LIFE/USEA (more selectivity, more invasiveness).

---

## Spec Card Grid

### Identity
- **Device name:** CWRU self-sizing spiral nerve cuff electrode (research implementation)
- **Canonical ID:** BTSD-PNI-0003
- **Org / manufacturer:** research implementations (CWRU / Cleveland VA programs; not a single commercial SKU)
- **First demonstrated (year):** 1988 (spiral cuff family)
- **First implanted (year):** chronic human implants reported in mid-2000s onward (study-dependent)
- **Species:** human
- **Regulatory / trial status:** research implants (IRB/IDE context varies)
- **Primary use:** stimulation (motor and sensory neuroprostheses)
- **Primary target:** peripheral nerves; includes upper-limb nerves (median/ulnar/radial) in amputee sensory studies

---

### Geometry & Architecture
- **Interface type:** peripheral nerve cuff (spiral, self-sizing)
- **Penetrating?:** no
- **Form factor:** spiral cuff wraps around nerve (self-curling sheath)
- **Array layout:** circumferentially spaced contacts; contact count varies by study/nerve
- **Insertion method:** surgical exposure; place cuff around nerve; route leads to implanted or percutaneous connectors depending on study system
- **Anchoring method:** mechanical conformity + lead strain relief

---

### Electrode & Channel Physics
- **Channel count:** multi-contact (varies)
- **Electrode material:** not pinned here (varies)
- **Recording modality:** typically stimulation-focused; cuffs can record CAP/LFP in some setups
- **Stimulation capability:** yes

---

### Tissue Interface & Bioresponse
- **Target tissue:** extraneural cuff on peripheral nerve epineurium
- **Encapsulation:** fibrotic encapsulation expected; long-term studies report stable function despite encapsulation changes
- **Typical failure mode:** lead strain/pull-off or connector issues; infection risk higher if percutaneous connectors used

---

### System Architecture
- **Onboard electronics:** none in cuff
- **Data path:** lead to implanted stimulator or external stim (study-dependent)

---

### Performance Envelope
- **Stability over time:** multi-year stability of contact functionality and thresholds reported in human cohorts
- **Longevity:** cohort-dependent; multi-year mean and up-to ~10-year-class follow-up reported for stimulating spiral cuffs

---

### Clinical / Preclinical Evidence
- **Evidence base:** chronic human studies of spiral cuff stimulation; upper-limb amputee sensory stimulation studies using multi-contact cuffs
- **Key limitations of evidence:** heterogeneous nerves, tasks, and system architectures

---

## Engineering Verdict

**Strengths:**
- long-term human evidence for durability and stable stimulation performance
- lower invasiveness than intraneural arrays

**Limitations / failure modes:**
- lower channel density/selectivity than higher-density cuff variants (e.g., FINE) or intraneural interfaces
- lead routing and connector choice drives a lot of real-world reliability

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** spiral cuff with circumferential contacts on a multi-fascicle nerve; recruitment overlap/selectivity metrics
- **Parameters to expose as sliders:** cuff diameter vs nerve diameter (fit), contact count/positions, encapsulation thickness
- **What outputs to visualize:** recruitment curves per contact; overlap/selectivity matrix; threshold drift proxy

---

## References
- Naples GG, Mortimer JT, Scheiner A, Sweeney JD. *A spiral nerve cuff electrode for peripheral nerve stimulation.* IEEE Trans Biomed Eng. 1988;35(11):905–916. doi: 10.1109/10.8670. PubMed: <https://pubmed.ncbi.nlm.nih.gov/3198136/>
- Christie BP, Freeberg M, Memberg WD, et al. *Long-term stability of stimulating spiral nerve cuff electrodes on human peripheral nerves.* J Neuroeng Rehabil. 2017;14:70. doi: 10.1186/s12984-017-0285-3. PubMed: <https://pubmed.ncbi.nlm.nih.gov/28693584/> (OA: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5504677/>)
- Tan DW, Schiefer MA, Keith MW, Anderson JR, Tyler DJ. *Stability and selectivity of a chronic, multi-contact cuff electrode for sensory stimulation in human amputees.* J Neural Eng. 2015;12(2):026002. doi: 10.1088/1741-2560/12/2/026002. PubMed: <https://pubmed.ncbi.nlm.nih.gov/25627310/>
