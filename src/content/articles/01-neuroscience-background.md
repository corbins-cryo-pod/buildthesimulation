---
title: "01 — Neuroscience background (signals, cells, and constraints)"
order: 1
description: "Signals, excitability, and what peripheral nerve + cortex force you to respect."
tags: ["fundamentals", "peripheral-nerve", "cortex"]
draft: false
---

> **Reader promise:** After this, you should be able to (1) explain what neural interfaces are *actually measuring/doing*, (2) describe how **peripheral nerve** differs from **cortex** as an engineering target, and (3) predict the biological + biomechanical failure modes that dominate chronic performance.

## TL;DR

- **Most BCIs target cortex** because it’s information-rich and directly related to intent—but cortex is mechanically soft, biologically reactive, and surgically expensive.
- **Peripheral nerve is a different game:** signals are often more “wire-like” (bundled axons), geometry is constrained (fascicles + connective tissue), and biomechanics (motion, tethering, compression) dominate long-term outcomes.
- Interfaces aren’t just “electrical.” Chronic success is usually limited by **materials**, **mechanics**, **immune response**, and **packaging**.

## Definitions (minimum set)

- **Action potential (“spike”):** a transient electrical event along an axon driven by voltage-gated ion channels.
- **Extracellular recording:** measuring voltage changes outside cells (what most electrodes do).
- **Stimulation:** injecting current (or other energy) to bias neural membrane potential and evoke activity.
- **Selectivity:** ability to record/stimulate a targeted subset of neurons/axons vs everything nearby.
- **Chronic stability:** maintaining usable signals and safe function over weeks → years.

## 1) What a spike is (and isn’t)

A spike is not “the neuron’s voltage,” and an electrode isn’t “reading the neuron directly.”

- The *intracellular* spike is ~100 mV across the membrane.
- The *extracellular* potential you record is typically **tens to hundreds of µV** (sometimes mV in certain geometries), and it’s shaped by distance, tissue conductivity, electrode impedance, and filtering.

**Practical lens:**

- If you double the distance to the source, your signal often drops dramatically (roughly with distance; exact scaling depends on geometry and medium).
- If your electrode impedance is high or unstable, noise rises and your effective bandwidth shrinks.

## 2) What you can record vs what you can stimulate

Recording and stimulation are related, but not symmetric.

### Recording
You’re usually measuring a mixture:
- nearby axons/cell bodies (depending on location)
- far-field activity
- motion artifact + electrical interference

**Practical lens:** your recording quality is a *system* property:
- electrode geometry + impedance
- reference choice
- analog front-end noise
- motion + strain + microfractures in traces

### Stimulation
Stimulation is about **fields and thresholds**.

- You’re not “activating a neuron”; you’re creating an electric field that changes membrane potential.
- Safety is bounded by electrochemistry: charge injection limits, irreversible reactions, heating.

**Practical lens:** if you want chronic success, start with a “safety-first” stimulation philosophy:
- biphasic, charge-balanced waveforms
- conservative charge density
- explicit artifact handling (don’t pretend it’s a post-processing problem)

## 3) Peripheral nerve vs cortex: why the target matters

This is the core of your direction: **peripheral nerve is not just cortex-but-elsewhere.**

### 3.1 Geometry: bundles vs layers

**Peripheral nerve**
- “Cable harness” architecture: axons bundled into **fascicles**, wrapped by connective tissue (endoneurium/perineurium/epineurium).
- Fascicular anatomy varies by nerve, subject, and position along the nerve.

**Cortex**
- Layered sheet with local microcircuits.
- Signals can be local-field dominated (ECoG) or single/multi-unit dominated (penetrating arrays).

**Implication:**
- In nerve, geometry pushes you toward **selectivity through spatial strategies** (cuff shaping, intrafascicular placement, regenerative guidance).
- In cortex, geometry pushes you toward **sampling many neurons** and dealing with drift/nonstationarity.

### 3.2 What “information” looks like

**Cortex (common BCI framing):**
- intent-related activity (movement planning/execution, speech, etc.)
- decoders map neural features → control signals

**Peripheral nerve (common interface framing):**
- mixed populations: motor + sensory + autonomic (varies)
- signals can be more directly tied to peripheral physiology

**Implication:** peripheral interfaces can be powerful for:
- prosthetic control + sensory feedback loops
- closed-loop neuromodulation
- interfacing with regenerative constructs

…but may be less direct for “high-level” intention than cortex.

### 3.3 Biology: tissue response and failure modes differ

**Cortex (chronic challenges):**
- foreign body response, gliosis, encapsulation
- micromotion between brain and skull-fixed hardware
- vascular damage risk

**Peripheral nerve (chronic challenges):**
- fibrosis/encapsulation and mechanical compression risk
- axonal injury risk (especially with penetrating/intrafascicular designs)
- neuroma formation, chronic pain, altered conduction

**Implication:** peripheral nerve interfaces must treat mechanics as first-class:
- chronic compression tolerance
- shear during limb movement
- strain relief and tethering
- preserving vascular supply

### 3.4 Biomechanics: peripheral nerve moves (a lot)

Peripheral nerves glide, stretch, and translate with body motion. That means:
- cuffs can migrate or rotate
- intrafascicular leads can experience repeated shear
- the “electrical contact” you had on day 1 can become a very different geometry on day 60

**Design heuristic:** if your implant depends on a fragile geometric relationship, you need a way to either:
- mechanically stabilize it *without harming the nerve*, or
- design for graceful performance across motion (robustness > perfection).

### 3.5 Surgical and practical constraints

- Cortex: high barrier (OR time, craniotomy/SEEG routes, infection risk, long-term explant concerns).
- Peripheral nerve: still surgery, but often a different risk profile and sometimes more accessible for iterative device evolution.

**Implication:** peripheral nerve may allow faster design iteration cycles and broader patient applicability—but only if chronic safety is strong.

## 4) Advantages and disadvantages (peripheral nerve vs cortex)

### Advantages of peripheral nerve interfaces
- Potentially more accessible surgical target (depending on indication).
- “Wire-like” organization can enable targeted stimulation/recording strategies.
- Natural fit for **bidirectional** prosthetics: motor out + sensory in.
- Synergy with regenerative medicine and biohybrid scaffolds (your focus).

### Disadvantages / hard problems
- Mixed axon populations; selectivity is difficult without invasiveness.
- Biomechanics: motion, compression, strain → chronic variability.
- Regenerative/biohybrid approaches require robust metrics and long time horizons.

### Advantages of cortical BCIs
- High information density; direct access to intent-related signals.
- Mature ecosystem of decoding/control research.

### Disadvantages / hard problems
- Surgical burden and chronic stability challenges.
- Micromotion and tissue response are brutal constraints.

## 5) How to think about interfaces (the “engineer’s checklist”)

When you read a new interface paper/device claim, ask:

1. **What’s the target?** (cell bodies, axons, field potentials)
2. **What’s the geometry today vs 6 months from now?**
3. **What’s the failure mode?** (fibrosis, fracture, migration, immune response, compression)
4. **What’s the metric of success?** (SNR, selectivity, stability, patient usability)
5. **What are the safety bounds?** (charge density, heating, tissue damage)
6. **What’s the calibration burden?** (if decoding is involved)

## 6) Where we’re going next

- **Article 02:** history of BCIs and recurring bottlenecks
- **Article 03:** recording/stimulation physics (fields, SNR, artifacts, charge limits)
- **Article 04:** peripheral nerve interface survey + design trade-offs

## References (starter)

I’ll add a proper reference list as we iterate. For now, here are placeholders for the *types* of sources we’ll cite:

- Foundational electrophysiology textbooks / reviews (spikes, extracellular potentials)
- Reviews on peripheral nerve anatomy + biomechanics
- Reviews on chronic foreign body response in neural implants
- Classic and modern surveys of peripheral nerve interfaces vs cortical modalities

*(If you want, tell me whether you prefer citations as: inline links, numbered references, or author–year.)*
