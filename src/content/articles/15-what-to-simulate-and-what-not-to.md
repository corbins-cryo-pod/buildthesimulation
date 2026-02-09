---
title: "15 — What to simulate (and what not to)"
order: 15
description: "Model fidelity vs utility: how to build simulations that teach and guide design instead of becoming research sinkholes."
tags: ["simulation", "modeling", "design"]
draft: false
---

A good simulation is not “the most realistic model you can build.” It is the simplest model that answers a useful question.

This matters because neural interface simulation can become an infinite project: anisotropic conductivity, complex 3D geometry, nonlinear tissue properties, electrode electrochemistry, biomechanics, plasticity. Most of that is real. But not all of it is necessary on day one.

### The central trade: fidelity vs usefulness

Every model makes assumptions. The engineering question is whether those assumptions are aligned with the decision you want to make.

If the simulation is meant to be an educational sandbox, the model should be:

- intuitive,
- fast,
- and honest about its limits.

If the simulation is meant to guide device design, the model should be:

- parameterized in meaningful ways (geometry, materials, waveforms),
- validated against known regimes,
- and capable of sensitivity analysis.

### A practical ladder of models

A useful approach is to build in layers:

- *v0:* geometry + visualization + export/import settings.
- *v1:* simple field model with plausible scaling.
- *v2:* add tissue/implant constraints and simple metrics.
- *v3:* add biomechanics and multi-modal stimulation approximations.

This ladder keeps the product moving while leaving room for deeper physics.

### What not to do early

Avoid early commitments that slow iteration:

- extremely high-fidelity 3D models without validation targets,
- huge parameter sets without sensitivity analysis,
- “one model to rule them all.”

### References (starter)

- Finite element method overview: https://en.wikipedia.org/wiki/Finite_element_method
- Volume conductor model overview: https://en.wikipedia.org/wiki/Bioelectromagnetism

