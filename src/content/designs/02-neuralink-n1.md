---
title: "Neuralink N1 (device brief)"
order: 2
pubDate: 2026-02-03
updatedDate: 2026-02-03
device_id: "BTSD-0002"
interface_class: "intracortical"
status: "human"
last_updated: 2026-02-03
description: "Neuralink’s fully implanted, wireless, flexible-thread intracortical system: a high-channel bet on surgical robotics + packaging, with chronic stability still an open question."
modality: "Intracortical"
website: "https://neuralink.com/"
tags: ["BCI", "intracortical", "penetrating", "Neuralink", "wireless", "robotic surgery"]
draft: false
---

# Neuralink N1 Implant

> **One-line verdict:** Neuralink’s N1 is a fully implanted, high‑channel, flexible‑thread intracortical BCI that trades rigid shanks and percutaneous connectors for surgical robotics, integrated electronics, and wireless telemetry — with long‑term human stability still not publicly established.

**Quick tags:** Recording · Stimulation · Closed-loop · ~1,024 channels · Human · Wireless · 2024+

---

## Overview

**What it is:** N1 is Neuralink’s implantable intracortical interface built around many flexible polymer “threads” inserted into cortex by a dedicated surgical robot, coupled to a skull‑mounted implant package with on‑board electronics and wireless communications.

**Why it matters:** It’s one of the clearest “full-stack” attempts to treat a BCI like a manufacturable *product*: hardware + surgery workflow + packaging + telemetry. If it works chronically, it changes the scaling story.

**Most comparable devices:** Utah microelectrode arrays (UEA/NeuroPort class), microwire bundles, other flexible intracortical thread systems.

---

## Spec Card Grid

### 🧬 Identity
- **Device name:** Neuralink N1
- **Canonical ID:** BTSD-0002
- **Inventor / key authors:** Neuralink team (public descriptions are company-level; specific authors vary by publication)
- **Org / manufacturer:** Neuralink Corp
- **First demonstrated (year):** reported animal demos pre‑human (public narrative; specifics vary by demo)
- **First implanted (year):** Jan 2024 (public reporting)
- **Species:** Human, NHP, rodent (as discussed in public comms)
- **Regulatory / trial status:** Human research (FDA IDE)
- **Primary use:** Hybrid (recording + stimulation)
- **Primary target:** motor cortex (reported initial use)

---

### 📐 Geometry & Architecture
- **Interface type:** intracortical
- **Penetrating?:** yes
- **Form factor:** flexible polymer threads
- **Array layout:** multi‑thread bundle
- **Thread count:** ~64 (commonly reported)
- **Electrodes per thread:** ~16 (commonly reported)
- **Channel count:** ~1,024 (commonly reported)
- **Insertion depth (mm):** ~1–2 mm (estimate; depends on cortical target/layers)
- **Insertion method:** robotic needle insertion (vision-guided)
- **Anchoring method:** best described publicly as “threads placed into tissue” (detailed anchoring mechanics not fully disclosed)
- **Packaging location:** skull‑mounted implant package

> Notes: some geometric details often repeated online (e.g., exact thread width/thickness) are not consistently documented in primary sources; treat exact micron values as **unverified** unless tied to a specific technical document.

---

### ⚡ Electrode & Channel Physics
- **Channel count:** ~1,024
- **Electrode material:** not consistently disclosed in a single canonical public spec (varies by how sources describe it)
- **Site area (µm²):** unknown (avoid guessing)
- **Impedance @ 1 kHz:** unknown (avoid guessing)
- **Recording modality:** spikes + LFP (commonly claimed/depicted)
- **Stimulation capability:** yes (publicly discussed)
- **Charge injection limit / safe stim range:** not publicly disclosed

---

### 🧠 Tissue Interface & Bioresponse
- **Target tissue:** cortex
- **BBB disruption:** unknown (depends on insertion + vessel avoidance; needs data)
- **Vascular disruption risk:** reduced by vision-guided placement (claimed), but not “zero” (no implant is)
- **Micromotion sensitivity:** *designed* to be lower than rigid shanks due to compliance, but human chronic evidence remains limited publicly
- **Gliosis / encapsulation:** expected in some form for penetrating cortical implants; degree is a key open question
- **Typical failure mode:** chronic signal loss, encapsulation, drift, mechanical failures (thread breakage), infection (if any percutaneous components are involved)

---

### 🖥️ System Architecture
- **Onboard electronics:** yes (amplification/ADC + stim drivers implied by system capabilities)
- **Data path:** fully implanted wireless telemetry
- **Telemetry bandwidth:** not publicly disclosed as a single number
- **Sampling rate:** not publicly disclosed as a single number
- **Power:** rechargeable (inductive charging described publicly)
- **Hermeticity:** implant-grade packaging (often described as a sealed skull‑mounted device; exact stack materials vary by source)
- **MRI compatibility:** assume no/unknown unless explicitly stated
- **Surgical complexity:** requires specialized robotic system + craniotomy workflow

---

### 📈 Performance Envelope
- **Typical yield (acute):** not publicly quantified in a standardized way
- **Typical yield (chronic):** unknown
- **Stability over time:** unknown (human implants are recent; peer-reviewed chronic datasets not public)
- **Longevity (median / max):** unknown
- **Notable demos / tasks:** cursor control / typing (public demonstrations)

---

### 🏥 Clinical / Preclinical Evidence
- **N implanted subjects / animals:** human count has been reported in news; treat exact counts as time-sensitive
- **Follow-up duration:** limited (publicly)
- **Indications:** severe paralysis (initial narrative)
- **Trial registry links:** (to add)
- **Key limitations of evidence:** most information is company statements + journalism; peer‑reviewed technical details remain sparse

---

## Engineering Verdict

**Strengths:**
- High channel count framing (relative to many historical systems)
- No percutaneous data tether in the intended product form
- Flexible threads aim to reduce micromotion-driven damage
- Robotic insertion + manufacturability posture

**Limitations / failure modes:**
- Still penetrating cortex → chronic biology still matters
- Long-term stability in humans is not yet publicly established
- System complexity (robot + packaging + wireless) introduces new failure surfaces

**Scaling constraints:**
- surgical throughput/time
- packaging + hermetic feedthrough reliability
- bandwidth + power + heat
- chronic interface biology (encapsulation, micro-motion, vascular response)

**What newer designs try to fix:**
- rigid shank micromotion mismatch
- percutaneous infection risk + wiring explosion

---

## Simulation Hooks (for BuildTheSimulation)
- **Minimal model to reproduce:** flexible penetrators in viscoelastic tissue + per-site coupling + a time-varying encapsulation layer
- **Parameters to expose as sliders:** thread stiffness, insertion depth, encapsulation thickness, channel count
- **What outputs to visualize:** yield vs time, SNR vs time, spatial drift sensitivity, thermal budget proxy

---

## References

- Neuralink updates and public materials: <https://neuralink.com/>
- Reuters (Jan 1, 2026): production/automation goals mention (context for “scale” posture): <https://www.reuters.com/business/healthcare-pharmaceuticals/musk-says-neuralink-start-high-volume-production-interface-devices-by-2026-2026-01-01/>
- Reuters (Jan 28, 2026): participant counts statement (time-sensitive): <https://www.reuters.com/legal/litigation/elon-musks-neuralink-says-it-has-21-participants-enrolled-trials-2026-01-28/>
