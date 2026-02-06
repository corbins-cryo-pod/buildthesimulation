---
title: "TIME (Transverse Intrafascicular Multichannel Electrode)"
order: 6
pubDate: 2026-02-03
updatedDate: 2026-02-03
device_id: "BTSD-0006"
interface_class: "pni"
status: "human"
last_updated: 2026-02-03
description: "A flexible thin‑film intrafascicular peripheral nerve interface inserted transversely through a nerve to access multiple fascicles, trading surgical complexity for selectivity."
modality: "Peripheral nerve"
tags: ["BCI", "PNI", "intrafascicular", "stimulation", "recording", "prosthetics", "sensory feedback", "TIME", "peripheral nerve", "bidirectional", "regenerative", "film"]
draft: false
---

# TIME – Transverse Intrafascicular Multichannel Electrode

> **One-line verdict:** A soft, thin‑film intrafascicular electrode that passes through a peripheral nerve, achieving better fascicle selectivity than cuffs while avoiding some of the tissue disruption associated with rigid needle arrays.

**Quick tags:** Recording · Stimulation · Closed-loop · Channels: 8–24 · Species: Human + rodent · First implanted: ~2014–2016

---

## Overview

**What it is:** TIME is a flexible polyimide-based thin‑film electrode inserted transversely through a peripheral nerve so multiple contacts sit within (or adjacent to) different fascicles.

**Why it matters:** TIME is one of the best-known clinically demonstrated intrafascicular PNI families for restoring sensation and enabling more selective stimulation/recording than extra-neural cuffs.

**Most comparable devices:** LIFE/tfLIFE, USEA, regenerative sieve electrodes, multi-contact cuffs.

---

## Spec Card Grid

### Identity
- **Device name:** TIME (Transverse Intrafascicular Multichannel Electrode)
- **Canonical ID:** BTSD-0006
- **Inventor / key authors:** Silvestro Micera and collaborators (EPFL / Scuola Superiore Sant’Anna ecosystem)
- **Org / manufacturer:** academic thin‑film fabrication (polyimide)
- **First demonstrated (year):** ~2008 (device family era; varies by paper)
- **First implanted (year):** ~2014–2016 (human prosthetics era; varies by study)
- **Species:** human, rodent
- **Regulatory / trial status:** human research
- **Primary use:** recording + stimulation
- **Primary target:** peripheral nerve fascicles (e.g., median, ulnar)

---

### Geometry & Architecture
- **Interface type:** intrafascicular peripheral nerve interface
- **Penetrating?:** yes (soft transverse penetration)
- **Form factor:** flexible thin‑film ribbon
- **Thickness (µm):** ~10–20
- **Width (µm):** ~200–300
- **Length (mm):** ~20–30
- **Contacts:** 8–24
- **Contact spacing (µm):** ~500–1000
- **Insertion method:** needle-guided threading
- **Anchoring method:** nerve tissue (mechanical stabilization is largely intrinsic)
- **Packaging location:** percutaneous or implanted lead (study-dependent)

---

### Electrode & Channel Physics
- **Channel count:** 8–24
- **Active sites used (vs total):** typically most/all available sites; depends on impedance and placement
- **Electrode material:** platinum and/or iridium oxide on polyimide (study-dependent)
- **Site area (µm²):** ~400–1000
- **Impedance @ 1 kHz:** ~20–100 kΩ (varies by site geometry + encapsulation)
- **Noise floor / SNR:** system-dependent
- **Recording modality:** compound action potentials (and other peripheral neural signatures, study-dependent)
- **Stimulation capability:** yes
- **Charge injection limit / safe stim range:** not standardized in a single public spec (depends on site material + waveform)

---

### Tissue Interface & Bioresponse
- **Target tissue:** fascicles
- **BBB disruption:** N/A (peripheral)
- **Vascular disruption risk:** low–moderate (microsurgery dependent)
- **Micromotion sensitivity:** lower than rigid needle arrays (compliant substrate), but still subject to nerve motion
- **Gliosis / encapsulation:** moderate fibrosis/encapsulation can occur and is a major chronic determinant
- **Axon loss (if reported):** generally lower than rigid intrafascicular needle arrays (context-dependent)
- **Foreign-body response mitigation:** thin‑film compliance, careful microsurgical placement; sometimes coatings
- **Typical failure mode:** fibrosis/encapsulation, delamination/fracture of thin film, lead issues

---

### System Architecture
- **Onboard electronics:** none (electrode only)
- **Data path:** wired
- **Telemetry bandwidth:** N/A
- **Sampling rate:** system-dependent
- **Power:** external
- **Thermal management:** external
- **Hermeticity:** system-dependent (packaging is not inherent to the TIME electrode)
- **MRI compatibility:** unknown/conditional (depends on lead/connector system)
- **Surgical complexity:** microsurgery + nerve threading

---

### Performance Envelope
- **Selectivity:** high (fascicle-level / contact-level)
- **Sensory restoration:** reported multi-site percepts (e.g., finger-related sensations)
- **Motor decoding:** moderate (depends on target nerve + task)
- **Stability over time:** generally better than rigid needle arrays; still variable
- **Longevity (median / max):** months to years in reported human studies (study-dependent)
- **Revision / explant:** possible; outcomes depend on fibrosis and lead routing
- **Notable demos / tasks:** sensory feedback during prosthesis use; selective stimulation mapping

---

### Clinical / Preclinical Evidence
- **N implanted subjects / animals:** human amputee cohorts reported across multiple studies (exact counts vary by program)
- **Follow-up duration:** months to years (study-dependent)
- **Indications:** sensory feedback, prosthetic control
- **Trial registry links:** (to add)
- **Primary outcomes:** elicited percept quality, selectivity, functional task impact
- **Key limitations of evidence:** heterogeneous systems, reporting variance in chronic stability and failure modes

---

## Engineering Verdict

**Strengths:**
- nerve-matched mechanical compliance vs rigid needle arrays
- higher selectivity than cuffs for many targets
- clinical demonstrations of sensory feedback

**Limitations / failure modes:**
- lower channel count than high-density needle arrays (e.g., USEA)
- surgical threading complexity + lead management
- thin‑film durability and encapsulation remain chronic constraints

**Scaling constraints:**
- lead routing and connector burden
- fascicle coverage limits per implant site
- surgical time and repeatability

**What it fixes vs rigid intrafascicular needles (e.g., USEA):**
- reduces stiffness mismatch
- tends to improve chronic tolerability
- reduces destructive “bed-of-needles” geometry

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** fascicle bundle + thin‑film ribbon contact array + field overlap/crosstalk
- **Parameters to expose as sliders:** contact spacing, fascicle diameter/count, fibrosis thickness, electrode-fascicle offset
- **What outputs to visualize:** selectivity matrix, crosstalk heatmap, sensory map resolution proxy

---

## References
- Raspopovic S, et al. “Restoring Natural Sensory Feedback in Real-Time Bidirectional Hand Prostheses.” *Science Translational Medicine* (2014). PubMed search: <https://pubmed.ncbi.nlm.nih.gov/?term=Restoring%20Natural%20Sensory%20Feedback%20in%20Real-Time%20Bidirectional%20Hand%20Prostheses>
- (Add: Oddo et al., PNAS; Micera review in Nature Reviews Materials; and TIME-specific chronic stability papers)
