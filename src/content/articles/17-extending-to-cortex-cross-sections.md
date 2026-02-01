---
title: "17 — Extending the sandbox to cortex (layers, constraints, and targets)"
order: 17
description: "How cortical geometry and constraints differ from peripheral nerve, and how a cortex cross-section model should behave."
tags: ["simulation", "cortex", "modeling"]
draft: false
---

A cortex sandbox should not just be “the nerve simulator but in brain.” Cortex has different geometry, different constraints, and different biological failure modes.

If the nerve sandbox is about fascicles and motion, the cortex sandbox is often about layers, vasculature constraints, and chronic stability under micromotion.

## What changes when you move to cortex

- target signals: fields vs units depending on modality
- tissue structure: layered organization and local circuits
- constraints: surgical access, vasculature, micromotion

## What the model should enable

Early versions should support:

- surface grids (ECoG-like)
- depth electrodes (SEEG-like)
- penetrating array placeholders

…and visualization of sampling/recruitment proxies.

## References (starter)

- Cortex overview: https://en.wikipedia.org/wiki/Cerebral_cortex
- Electrocorticography overview: https://en.wikipedia.org/wiki/Electrocorticography
