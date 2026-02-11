---
title: "18 — Optimization loops (parameter search for implants and stimulation)"
order: 18
description: "How to build design loops that search electrode geometry and stimulation parameters without fooling yourself."
tags: ["simulation", "optimization", "design"]
draft: false
---

Once a sandbox can evaluate a design (even with proxies), you can start searching.

Optimization in this context is not just “run an optimizer.” It is deciding what objective matters, what constraints are real, and what uncertainty you can tolerate.

### The loop

A practical design loop looks like:

- choose a parameterization (geometry, materials, waveforms),
- define objectives (selectivity proxy, coverage, safety),
- define constraints (charge density, heating proxies, mechanical constraints),
- run search (grid, Bayesian, evolutionary),
- inspect failure cases,
- iterate the model.

### Don’t optimize lies

If your metric is poorly aligned with reality, optimization will exploit it.

A healthy workflow is to keep a human-in-the-loop and to validate against known regimes before trusting results.

### References (starter)

- Bayesian optimization overview: https://en.wikipedia.org/wiki/Bayesian_optimization
- Genetic algorithm overview: https://en.wikipedia.org/wiki/Genetic_algorithm
