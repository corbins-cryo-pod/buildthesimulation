---
title: "Macro-sieve regenerative electrode with transit zones (MacEwan et al., 2016)"
order: 17
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0009-02"
interface_class: "pni"
status: "research"
last_updated: 2026-02-06
description: "A chronically implanted macro-sieve electrode with large transit zones enabling robust axon regeneration and selective stimulation in a rat sciatic nerve transection model."
modality: "Peripheral nerve"
website: "https://pubmed.ncbi.nlm.nih.gov/28008303/"
tags: ["PNI", "regenerative", "macro-sieve", "transit zones", "preclinical", "stimulation", "nerve transection", "peripheral nerve"]
draft: false
---

# Macro-sieve regenerative electrode with transit zones (MacEwan et al., 2016)

> **One-line verdict:** A regenerative sieve redesign that uses large “transit zones” (instead of dense micro-pores) to support healthier axon regeneration while enabling multi-site stimulation.

**Quick tags:** Regenerative interface · Stimulation · Species: rat · Status: preclinical

---

## Overview

**What it is:** A polyimide-based macro-sieve electrode implanted between transected sciatic nerve stumps in a guidance conduit. Axons regenerate through several large transit zones; electrode sites surround the zones to stimulate the regenerated axons.

**Why it matters:** Dense micro-sieves can constrict/regulate axons in ways that harm caliber/myelination and limit functional recovery. Macro-scale transit zones are a design move to preserve axon health while still providing spatially separated electrode sites for selective stimulation.

**Most comparable devices:** micro-sieve electrodes, hyperflexible sieve meshes, microchannel scaffolds.

---

## Spec Card Grid

### Identity
- **Device name:** Macro-sieve electrode (MSE)
- **Canonical ID:** BTSD-PNI-0009-02
- **Key authors:** MacEwan et al.
- **Org / manufacturer:** academic research build
- **First demonstrated (year):** 2016
- **Species:** rat
- **Regulatory / trial status:** preclinical
- **Primary use:** regenerative stimulation interface
- **Primary target:** transected sciatic nerve

---

### Geometry & Architecture
- **Interface type:** regenerative macro-sieve
- **Penetrating?:** yes (regenerated axons pass through transit zones)
- **Transit zones:** nine large zones reported (including a central zone and surrounding zones)
- **Substrate:** polyimide (reported)
- **Anchoring / alignment:** silicone conduit guidance between nerve stumps
- **Insertion method:** nerve transection → MSE in conduit → proximal/distal alignment

---

### Electrode & Channel Physics
- **Stimulation sites:** eight metallized electrode sites reported (surrounding the transit zones)
- **Electrode material:** Pt-Ir metallization is reported; electrode site surface treatment (e.g., Pt black) is reported in the paper
- **Recording modality:** not primary; electrophysiology is assessed via evoked responses/distal measures
- **Stimulation capability:** yes; monopolar stimulation through individual sites used to demonstrate selective muscle activation
- **Charge injection / safe stim range:** build-specific; not standardized as a single number here

---

### Tissue Interface & Bioresponse
- **Target tissue:** regenerating axons
- **Design intent:** preserve axon caliber/myelination vs micro-sieve constriction
- **Encapsulation:** expected; chronic implantation context evaluated in the paper

---

### System Architecture
- **Onboard electronics:** none
- **Data path:** wired external stimulation/recording in animal study

---

### Performance Envelope
- **Regeneration:** at ~3 months post-implant, fiber counts through MSE transit zones comparable to open conduit in the study
- **Function:** stimulation of regenerated nerve through MSE evoked muscle forces comparable to open conduit; selective stimulation of individual muscles was demonstrated
- **Key limitation:** requires nerve transection

---

### Clinical / Preclinical Evidence
- **Model:** rat sciatic nerve transection
- **Endpoints:** histology + electrophysiology + muscle force outcomes
- **Key limitations:** no human data; surgical transection requirement

---

## Engineering Verdict

**Strengths:**
- addresses axon constriction/health bottleneck for micro-sieves
- demonstrates functional stimulation through regenerated nerve

**Limitations / failure modes:**
- invasive (transection)
- limited scaling without added routing/packaging complexity

---

## Simulation Hooks (for BuildTheSimulation)
- transit-zone size vs axon caliber preservation
- electrode spacing vs recruitment selectivity across zones
- regeneration delay vs “time to stimulation”

---

## References
- MacEwan MR, et al. *Regenerated Sciatic Nerve Axons Stimulated through a Chronically Implanted Macro-Sieve Electrode.* Front Neurosci. 2016;10:557. doi: 10.3389/fnins.2016.00557. PubMed: <https://pubmed.ncbi.nlm.nih.gov/28008303/>
