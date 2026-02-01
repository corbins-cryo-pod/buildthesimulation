---
title: "16 — The 2D nerve cross-section sandbox (electrodes, fields, constraints)"
order: 16
description: "How to think about a nerve cross-section as a design space: geometry, selectivity proxies, and safe stimulation." 
tags: ["simulation", "peripheral-nerve", "electrodes"]
draft: false
---

A 2D cross-section model is the highest-leverage starting point for the simulation roadmap. It is simple enough to run in the browser and intuitive enough to teach. It also captures the first-order truth: in many regimes, selectivity and recruitment are geometry problems.

## What the sandbox should let you do

At minimum:

- choose a nerve cross-section with fascicle layout,
- place electrode geometries (cuff, FINE-like, intrafascicular, “regenerative zone”),
- set stimulation parameters,
- see field/recruitment proxies,
- export/import settings.

## What we can measure (early proxies)

We won’t claim perfect biophysics at v1. But we can compute useful proxies:

- distance-weighted field magnitude within fascicles,
- overlap metrics (how selectively are we targeting one fascicle vs others?),
- threshold-like contours (relative, not absolute),
- safety bounds (charge per phase and charge density estimates).

## Why 2D is not “fake”

2D cross-sections are a legitimate way to build intuition and to test design strategies quickly. As we add complexity later, the 2D sandbox becomes the conceptual map.

## References (starter)

- Basic nerve anatomy overview: https://en.wikipedia.org/wiki/Peripheral_nervous_system
