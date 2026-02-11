---
title: "LIFE (Longitudinal Intrafascicular Electrode)"
order: 15
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0004"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "A classic fine-wire intrafascicular peripheral nerve interface placed longitudinally within a fascicle for selective stimulation and compound action potential (CAP) recording."
modality: "Peripheral nerve"
website: "https://pubmed.ncbi.nlm.nih.gov/16425828/"
tags: ["PNI", "intrafascicular", "LIFE", "stimulation", "recording", "CAP", "neuroprosthetics", "peripheral nerve", "bidirectional", "cuff", "film"]
draft: false
---

# LIFE (Longitudinal Intrafascicular Electrode)

> *One-line verdict:* A fine-wire, penetrating peripheral nerve electrode placed within a single fascicle to achieve high selectivity for stimulation and CAP recording, at the cost of invasiveness and chronic stability challenges.

*Quick tags:* Recording · Stimulation · Channels: 1 per wire (multi-wire implants possible) · Species: Human · First implanted: 1990s (reported)

---

### Overview

*What it is:* The Longitudinal Intrafascicular Electrode (LIFE) is a thin, flexible wire electrode inserted longitudinally inside a peripheral nerve fascicle (endoneurial space). Compared with extraneural cuff electrodes, LIFE can access a more restricted population of axons, enabling higher selectivity for stimulation and, in some cases, compound action potential (CAP) recording.

*Why it matters:* LIFE is a foundational intrafascicular interface in peripheral nerve engineering. It helped establish the core tradeoff that still structures the field: *more selectivity* through penetration, paid for with *more surgical/biological risk* and harder chronic stability.

*Most comparable devices:* TIME (transverse intrafascicular), tfLIFE (thin-film variant), USEA (higher channel count intraneural), FINE/C‑FINE (selectivity without penetration).

---

### Spec Card Grid

### Identity
- *Device name:* LIFE (Longitudinal Intrafascicular Electrode)
- *Canonical ID:* BTSD-PNI-0004
- *Inventor / key authors:* literature spans multiple groups; commonly associated with intrafascicular neuroprosthetics work in the 1990s–2000s; Horch and colleagues appear in later LIFE systems work; Dhillon et al. demonstrate human use in an amputee neuroprosthesis context
- *Org / manufacturer:* academic research builds (no single commercial manufacturer)
- *First demonstrated (year):* 1990s–early 2000s (reported; study-dependent)
- *First implanted (year):* 1990s (reported)
- *Species:* human (research) + extensive animal work
- *Regulatory / trial status:* research implants (IRB/IDE context varies)
- *Primary use:* hybrid (stimulation + recording)
- *Primary target:* peripheral nerve fascicles (median/ulnar/tibial/peroneal/etc.; application-dependent)

---

### Geometry & Architecture
- *Interface type:* intrafascicular penetrating electrode
- *Penetrating?:* yes
- *Form factor:* fine insulated microwire with an exposed recording/stimulation segment
- *Array layout:* 1 wire per channel; multiple LIFE wires can be implanted in one nerve
- *Footprint (mm):* intrafascicular length is study-dependent (often cm-scale)
- *Insertion depth (mm):* within a fascicle, longitudinal trajectory
- *Shank / lead dimensions:* wire diameter and insulation thickness vary across studies and materials
- *Site spacing (µm):* typically an elongated exposed segment rather than discrete pads
- *Tip geometry:* insertion tip and exposed segment geometry vary by build
- *Insertion method:* microsurgical placement, typically using a needle/guide to pass the wire through the fascicle
- *Anchoring method:* tissue friction + lead strain relief; no rigid anchoring at the site
- *Packaging location:* percutaneous leads in some historical systems; implanted routing in others (study-dependent)

---

### Electrode & Channel Physics
- *Channel count:* 1 channel per LIFE wire
- *Active sites used (vs total):* 1/1 per wire
- *Electrode material:* study-dependent (metal microwires; exact alloy varies)
- *Site area (µm²):* elongated exposed region (not standardized)
- *Impedance @ 1 kHz:* variable (strongly build- and tissue-dependent)
- *Noise floor / SNR:* suitable for CAP-scale signals; long-term single-unit spike stability is not the usual operating regime
- *Recording modality:* CAPs; multi-unit activity in some cases
- *Stimulation capability:* yes
- *Charge injection limit / safe stim range:* constrained by small surface area; should be treated as build-specific and conservative

---

### Tissue Interface & Bioresponse
- *Target tissue:* endoneurial space within a peripheral nerve fascicle
- *Vascular disruption risk:* moderate (penetration risk)
- *Micromotion sensitivity:* high (relative motion between wire and axons)
- *Encapsulation / fibrosis:* endoneurial fibrosis and interface remodeling are expected contributors to threshold drift and signal loss
- *Foreign-body response mitigation:* flexibility of the wire relative to rigid shanks
- *Typical failure mode:* signal degradation, wire migration/breakage; infection risk is dominated by packaging choice (percutaneous vs fully implanted)

---

### System Architecture
- *Onboard electronics:* none at the electrode
- *Data path:* tethered leads to external stim/record hardware (common in research)
- *Sampling rate:* system-dependent; CAP recording typically uses kHz-range sampling
- *Power:* external stimulator / recording system
- *Hermeticity:* none at electrode; depends on connector/implant packaging
- *MRI compatibility:* generally not compatible in percutaneous wired research configurations
- *Surgical complexity:* high microsurgical skill; fascicle-level manipulation

---

### Performance Envelope
- *Typical yield (acute):* high selectivity for stimulation within the targeted fascicle; CAP recordings feasible
- *Typical yield (chronic):* performance often degrades over time (degree and timeline are study-dependent)
- *Stability over time:* limited compared to extraneural cuffs; micromotion and fibrosis dominate
- *Longevity (median / max):* highly variable across studies; do not treat as a single canonical number for LIFE
- *Revision / explant:* possible but delicate
- *Adverse events (high-level):* fascicular injury risk; neuropathic pain risk; infection risk depends on packaging

---

### Clinical / Preclinical Evidence
- *Human evidence:* small cohorts and case-series in neuroprosthetics/sensory feedback contexts
- *Follow-up duration:* study-dependent; often shorter than cuff-based chronic therapy devices
- *Primary outcomes:* selectivity, thresholds, percept stability (sensory), CAP fidelity
- *Key limitations of evidence:* heterogeneous builds and surgical techniques; packaging varies; small N

---

### Engineering Verdict

*Strengths:*
- exceptional selectivity compared to extraneural cuffs
- direct access to intrafascicular signals (CAPs)

*Limitations / failure modes:*
- chronic instability driven by micromotion and fibrosis
- higher surgical risk at the fascicle level

*Scaling constraints:*
- wiring/packaging burden grows linearly with channel count
- long-term implants are difficult to stabilize biologically

*What newer designs try to fix:*
- tfLIFE (thin-film) for mechanical compliance and multi-site layouts
- TIME for transverse multi-contact access
- flat/reshaping cuffs (FINE/C‑FINE) to regain selectivity without penetration

---

### Simulation Hooks (for BuildTheSimulation)
- *Minimal model to reproduce:* intrafascicular wire inside a fascicle with an encapsulation layer and longitudinal current spread
- *Parameters to expose as sliders:* wire diameter, distance to axons, encapsulation thickness, micromotion amplitude
- *What outputs to visualize:* CAP amplitude vs time proxy; selectivity vs fibrosis; threshold drift curves

---

### References
- Dhillon GS, Horch KW. *Direct neural sensory feedback and control of a prosthetic arm.* IEEE Trans Neural Syst Rehabil Eng. 2005;13(4):468–472. doi: 10.1109/TNSRE.2005.856072. PubMed: <https://pubmed.ncbi.nlm.nih.gov/16425828/>
- Thota AK, Kuntaegowdanahalli S, Starosciak AK, Abbas JJ, Orbay J, Horch KW, Jung R. *A system and method to interface with multiple groups of axons in several fascicles of peripheral nerves.* J Neurosci Methods. 2015. PubMed: <https://pubmed.ncbi.nlm.nih.gov/25092497/>
- Pena AE, Kuntaegowdanahalli SS, Abbas JJ, Patrick J, Horch KW, Jung R. *Mechanical fatigue resistance of an implantable branched lead system for a distributed set of longitudinal intrafascicular electrodes.* J Neural Eng. 2017. PubMed: <https://pubmed.ncbi.nlm.nih.gov/29131813/>
