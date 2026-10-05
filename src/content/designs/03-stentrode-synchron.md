---
title: "Stentrode (Synchron)"
order: 3
pubDate: 2026-02-03
updatedDate: 2026-10-05
device_id: "BTSD-0003"
interface_class: "endovascular"
status: "human"
last_updated: 2026-10-05
description: "A fully implanted endovascular BCI: a stent-electrode array in the superior sagittal sinus recording ECoG-like signals, trading spikes for catheter-based deployment."
modality: "Endovascular"
successRank: 3
website: "https://synchron.com/"
tags: ["BCI", "endovascular", "Stentrode", "Synchron", "ECoG-like", "minimally invasive", "cortex", "recording", "array"]
draft: false
---

# Stentrode (Synchron)

> *One-line verdict:* A fully implanted endovascular BCI that records ECoG‑like signals from inside the superior sagittal sinus using a stent‑electrode array—trading intracortical spike fidelity for a catheter-based, no‑craniotomy implantation path.

*Quick tags:* Recording · Stimulation: unknown/limited · Channels: 16 · Species: Human + sheep · First implanted: 2019–2020 era

---

### Overview

*What it is:* A self‑expanding nitinol stent with integrated electrodes deployed transvenously into the superior sagittal sinus adjacent to motor cortex, connected by a lead to a subcutaneous implant that relays data to an external unit.

*Why it matters:* It’s the flagship example that you can get chronic, useful motor intent signals without penetrating cortex and without a craniotomy.

*Most comparable devices:* Subdural ECoG grids (signal class), intracortical arrays (intent use‑case), other endovascular BCIs (design family).

---

### Spec Card Grid

### Identity
- *Device name:* Stentrode (stent‑electrode array)
- *Canonical ID:* BTSD-0003
- *Inventor / key authors:* Thomas Oxley et al. (clinical translation)
- *Org / manufacturer:* Synchron
- *First demonstrated (year):* preclinical large‑animal work preceded first‑in‑human (dates vary by paper)
- *First implanted (year):* first‑in‑human experience published online Oct 28, 2020 (implantation occurred prior)
- *Species:* Human; large‑animal (ovine) model used heavily
- *Regulatory / trial status:* Human clinical studies (e.g., first‑in‑human; SWITCH)
- *Primary use:* Recording (motor intent → digital control)
- *Primary target:* Motor cortex adjacency via superior sagittal sinus

---

### Geometry & Architecture
- *Interface type:* Endovascular cortical interface (venous)
- *Penetrating?:* no (does not penetrate cortex; sits in a blood vessel)
- *Form factor:* self‑expanding nitinol stent with mounted electrodes
- *Array layout:* electrodes distributed on a cylindrical stent; exact manufacturer contact coordinates are not provided here. The 3D contact map is illustrative.
- *Scaffold size:* nominal 8 mm diameter × 40 mm length in Kacker et al. (2025); implanted shape depends on vessel constraint.
- *Electrode count:* 16
- *Site spacing (µm):* approximately 3000 reported by Kacker et al. (2025); not an exact axial pitch or complete 3D contact map.
- *Insertion method:* transvenous catheter delivery via internal jugular vein → superior sagittal sinus deployment
- *Anchoring method:* stent apposition + endothelialization over time
- *Packaging location:* lead tunneled subcutaneously to a chest (subclavicular) telemetry implant pocket

---

### 3D reference, revision 2

The revised model uses curved flat struts and annular electrode mounts guided by [Synchron’s close-up photograph](https://synchron.com/research), with a schematic proximal lead segment. **Contact detail** shows the mounted disk at physical scale. The selected published configuration remains 16 contacts, 500 µm diameter and a nominal 8 × 40 mm scaffold.

Strut cross section (80 × 40 µm), mount diameter (680 µm), contact thickness (50 µm), lattice topology and the 12 mm × 0.5 mm lead stub are illustrative. The lead is a short visual envelope, not the actual implanted cable length or conductor routing. The staggered contact strip is reconstructed; it does not replace a manufacturer channel map. The model represents a nominal expanded scaffold, not vessel deformation or a delivery state.

JSON preserves revision metadata, approximation notes and outward-facing site normals. GLB exports the complete assembly in meters. The exact clinical revision and its validated electrical parameters must be established before using this geometry in a physiological simulation.

---

### Electrode & Channel Physics
- *Physical electrodes:* 16; Kacker et al. designate one as the common reference for the other 15. The model leaves the assignment unknown.
- *Analysis channels:* 12 for participant 1 and 8 for participant 2 in Kacker et al. (2025); physical count, reference assignment and channels retained for analysis are distinct.
- *Electrode material:* platinum electrodes on nitinol scaffold (reported)
- *Site area (µm²):* a 500 µm circular face gives approximately 196,350 geometrically. SWITCH (2023) separately reports 300,000; these values are not treated as equivalent.
- *Electrode size:* 500 µm diameter in the selected Kacker et al. (2025) configuration. A separate Schone et al. (2025) preprint reports 300 µm; do not mix specifications.
- *Impedance @ 1 kHz / noise floor:* not consistently reported in open clinical summaries (mark unknown)
- *Recording modality:* vascular ECoG‑like signals; spectral motor intent features reported
- *Stimulation capability:* unknown for this catalog unless tied to a primary device‑specific stimulation report
- *Charge injection limit / safe stim range:* not publicly disclosed

---

### Tissue Interface & Bioresponse
- *Target tissue:* cortex adjacency via venous wall
- *BBB disruption:* likely lower than penetrating arrays (non‑penetrating placement), but treat as low–moderate unless quantified
- *Vascular disruption risk:* thrombosis/stenosis/migration are the dominant device-class risks and are monitored in studies
- *Micromotion sensitivity:* different from shanks; vessel pulsatility introduces motion but tissue penetration is avoided
- *Gliosis / encapsulation:* not the same failure mode as penetrating shanks; coupling can change with vessel wall remodeling
- *Typical failure mode:* venous remodeling affecting coupling, system-level lead/telemetry issues, decoder drift

---

### System Architecture
- *Onboard electronics:* implanted telemetry unit connected to the stent via a lead
- *Data path:* implanted internal hardware + external telemetry + computer interface chain (no percutaneous skull pedestal)
- *Telemetry method:* reported as infrared optical transmission between external/internal telemetry units in early descriptions
- *Power:* external unit inductively powers the implanted telemetry unit (reported)
- *Hermeticity:* implantable package (details vary by generation)
- *MRI compatibility:* unknown/conditional pending manufacturer documentation
- *Surgical complexity:* neurointerventional catheter procedure (angiography suite), no craniotomy

---

### Performance Envelope
- *What it enables:* click/switch-like command control + OS interaction using motor intent; assistive stacks often include eye tracking
- *Signal class:* best for robust spectral features (including gamma/high‑gamma), not single‑unit spikes
- *Longevity:* follow‑up reported to 12 months in early cohorts; broader longevity still emerging

---

### Clinical / Preclinical Evidence
- *Early feasibility (human):* first‑in‑human home use described in severe paralysis cohorts
- *N implanted subjects / animals:* small cohorts in early human reports; ovine model used preclinically
- *Trial registry links:* to add (SWITCH / related studies)
- *Primary outcomes:* feasibility of computer control for activities of daily living tasks
- *Key limitations of evidence:* small N, heterogeneous assistive stacks, limited open hardware-spec reporting

---

### Engineering Verdict

*Strengths:*
- catheter-based deployment (no craniotomy)
- non‑penetrating cortical tissue interface class
- avoids percutaneous skull connectors

*Limitations / failure modes:*
- lower spatial resolution than intracortical spikes (16 macroelectrodes)
- signal coupling depends on vascular wall + remodeling
- channel count scaling constrained by venous anatomy + safe stent geometry

*Scaling constraints:*
- venous patency/thrombosis risk envelope
- electrode density limited by stent mechanics + hemodynamics
- telemetry/power pipeline must stay within implant heat and regulatory limits

*What it’s trying to fix vs Utah / N1:*
- surgical invasiveness
- percutaneous infection risk
- micromotion damage from rigid penetrating shanks

---

### References
- Yoo PE, et al. “Motor neuroprosthesis implanted with neurointerventional surgery improves capacity for activities of daily living tasks in severe paralysis: first in-human experience.” *J NeuroInterv Surg* (Epub 2020 Oct 28; 2021 Feb). DOI: 10.1136/neurintsurg-2020-016862. PubMed: <https://pubmed.ncbi.nlm.nih.gov/33115813/>
- Mitchell P, et al. “Assessment of Safety of a Fully Implanted Endovascular Brain-Computer Interface for Severe Paralysis in 4 Patients: The Stentrode With Thought-Controlled Digital Switch (SWITCH) Study.” *JAMA Neurology* (2023). PMC full text: <https://pmc.ncbi.nlm.nih.gov/articles/PMC9857731/>
- Synchron overview: <https://synchron.com/>

- Kacker K, et al. “Motor activity in gamma and high gamma bands recorded with a Stentrode from the human motor cortex in two people with ALS.” *J Neural Eng* (2025), section 2.2 and Figure 1. <https://pmc.ncbi.nlm.nih.gov/articles/PMC11956166/>
- Schone HR, et al. “Motor Cortex Coverage Predicts Signal Strength of a Stentrode Endovascular Brain-Computer Interface.” *medRxiv* (2025 preprint). <https://www.medrxiv.org/content/10.1101/2025.09.19.25335875v1.full>
