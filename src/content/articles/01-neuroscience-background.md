---
title: "01 — Neuroscience background (signals, cells, and constraints)"
order: 1
description: "Signals, excitability, and what peripheral nerve + cortex force you to respect."
tags: ["fundamentals", "peripheral-nerve", "cortex"]
draft: false
---

> *Reader promise:* After this, you should be able to explain what a neural interface is actually measuring/doing, and why peripheral nerve is a fundamentally different engineering target than cortex.

Most public attention on BCIs is cortex-first, and for good reasons: cortex is information-rich, strongly related to intent, and has a mature decoding ecosystem. But cortex is also mechanically soft, biologically reactive, and surgically expensive. Peripheral nerve lives in a different regime. Signals are often more “wire-like” (bundled axons), anatomy is constrained (fascicles and connective tissue layers), and biomechanics (glide, stretch, compression) can dominate long-term reliability.

A second theme runs through everything: chronic success is rarely limited by “electrical cleverness.” It is usually limited by materials, mechanics, immune response, and packaging.

### What a spike is (and what an electrode really sees)

An action potential is a membrane event, not an electrode event. The intracellular voltage swing is on the order of ~100 mV across the membrane; extracellular electrodes measure much smaller voltages outside cells, shaped by distance and conductive pathways. What you record depends on where you are relative to the sources (axons vs somas), your electrode impedance, your reference choice, and your filtering.

If you take only one practical lesson: a small change in distance or geometry can matter more than a sophisticated algorithm. The world looks different at 50 µm than it does at 500 µm.

### Recording versus stimulation

Recording and stimulation are linked but not symmetric. Recording is often a fragile measurement problem: microvolt signals riding on top of interference, motion artifact, and drift. Stimulation is a dosing problem with hard safety constraints. The same interface that records beautifully might be a poor stimulator (and vice versa), because the relevant constraints are different.

For stimulation, the field you generate recruits whatever fibers cross threshold under that field. You don’t get to pick a single neuron; you get a recruitment pattern. Safety is bounded by electrochemistry and heating, which is why waveform choice, electrode material, and charge balance are first-class engineering decisions.

### Peripheral nerve versus cortex (why the target matters)

Peripheral nerve is not “cortex somewhere else.” The geometry, biology, and mechanical environment are different enough that design instincts often fail when transferred naïvely.

In peripheral nerve, axons are bundled into fascicles and wrapped in connective tissue layers. Fascicular anatomy varies across people and along a nerve. That makes selectivity partly a geometry problem: where you place the interface relative to fascicles, and how stable that placement remains over time.

Cortex, by contrast, is a layered sheet with local circuits. Depending on modality, you may be dominated by local field potentials (ECoG) or by unit activity (penetrating arrays). In many cortical systems, stability and nonstationarity become the central constraints: the thing you were decoding last week is not exactly the same thing you’re decoding today.

### Biology and biomechanics (what tends to break first)

Cortex chronic failure modes often center on foreign body response, micromotion between tissue and skull-fixed hardware, and vascular risk. Peripheral nerve failure modes often center on fibrosis/encapsulation plus mechanical compression and irritation—especially when devices interact with a structure that naturally glides and stretches during movement.

Peripheral nerves move. They translate, deform, and experience repeated mechanical loading with ordinary life. That means cuffs can migrate or rotate, intrafascicular leads can experience repeated shear, and a geometry that is “perfect” on day one can be meaningfully different by day sixty.

A practical design heuristic is to treat motion as a design input, not a nuisance. If performance requires an extremely precise geometric relationship, you need either mechanical strategies that preserve the nerve (hard) or a design that remains useful across motion (often wiser).

### Advantages and disadvantages (peripheral nerve vs cortex)

Peripheral nerve interfaces can be attractive because they may be more accessible targets in some clinical contexts, and because they naturally support bidirectional prosthetics: motor intent out and sensory feedback in. They also align with regenerative strategies and biohybrid scaffolds, where you can imagine using biology as part of the interface.

The hard problems are different rather than smaller. Selectivity is difficult without invasiveness; mixed axon populations complicate interpretation; biomechanics introduces chronic variability; and pain/neuroma risk creates a strict safety bar.

Cortical BCIs offer access to richer intent-related signals and a mature decoding literature, but they carry higher surgical burden and their own chronic stability constraints.

### How to read interface claims (a lightweight checklist)

When you read a new paper or startup claim, it’s worth asking—in plain language—what exactly is being measured or controlled, how stable the geometry is likely to be over time, what the failure modes are, and how much user or clinician effort is required to keep the system working.

### References (starter)

- Introductory action potential chapter (open textbook): https://nba.uth.tmc.edu/neuroscience/s1/chapter01.html
- Propagation of action potentials (open textbook): https://nba.uth.tmc.edu/neuroscience/s1/chapter03.html
- Overview + pointers (BCI): https://en.wikipedia.org/wiki/Brain%E2%80%93computer_interface
