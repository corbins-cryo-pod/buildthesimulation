---
title: "Hydrogel-hybrid multifunctional fiber probe (MIT)"
order: 79
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0054"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Thermally drawn optical, electrical and fluidic fibers integrated in a soft hydrogel matrix. Dry insertion and hydrated compliance, with six-month mouse recordings and a connectorization limit that prevents independent readout of every microwire."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41467-021-23802-9"
tags: ["intracortical", "recording", "optogenetics", "microfluidic", "hydrogel", "fiber", "MIT", "academic", "preclinical"]
draft: false
---

# Hydrogel-hybrid multifunctional fiber probe

Park and colleagues' 2021 device integrates multiple thermally drawn polymer fibers within a polyacrylamide-alginate hydrogel matrix. The publisher PDF grounds MIT affiliations, with an Ohio State affiliation and KAIST present addresses also listed. This is a composite probe, not a bulk hydrogel coating around one solid electrode.

## Published assembly

| Element | Reported arrangement and dimensions |
| --- | --- |
| Optical waveguide | One central polycarbonate/cyclic olefin copolymer fiber, 105.9 ± 8.0 µm diameter |
| Microelectrode fibers | Three PEI-insulated fibers, each 80.0 ± 1.8 µm diameter and containing seven tin microwires |
| Tin microwires | 4.75 ± 2.22 µm diameter |
| Fluidic fibers | Three PEI channels, 54.0 ± 2.1 µm inner and 115.4 ± 3.0 µm outer diameter |
| Arrangement | Electrode and fluidic fibers alternate around the central waveguide |
| Matrix | PAAm-alginate hydrogel, bonded to functionalized polymer surfaces |
| Backend | Optical ferrule, electrical pin connections, fluidic tubing and epoxy-stabilized assembly |

The three seven-wire fibers contain 21 physical microwires by arithmetic. They do **not** establish 21 independent recording channels in the reported implementation. The paper says electrodes within each fiber were collectively connectorized, measured the same patterns and were not electrically distinguishable.

## Adaptive mechanics

The probe is inserted dehydrated, when it is stiff enough for direct placement. It then absorbs surrounding water and becomes more compliant. The authors report hydration within ten minutes and mechanical measurements using 10 mm samples. The reported 334 µm diameter in the finite-element comparison is a modeling dimension, not a universal measured implant diameter in every hydration state.

The hydrogel mechanically separates the functional fibers during bending. This preserves optical, electrical and fluidic functions while reducing the mechanical loading of surrounding tissue. It does not make the thermoplastic fibers themselves identical to brain tissue.

## Demonstrated use

The linked [mouse recording and optogenetic study](/applications/80-hydrogel-fiber-mouse-circuit-study-2021/) includes chronic electrophysiology, light delivery, drug infusion and behavioral assays. The paper reports recordings through 168 days, also called six months or 24 weeks. That endpoint is not a guarantee of indefinite life or human qualification.

## Limits

- Collective connectorization makes neighboring microwires within each electrode fiber share patterns; physical wire count exceeds independent readout capacity.
- The authors report approximately one or two isolated units per electrode fiber and a maximum of two to six recordable units per probe after accounting for overlapping patterns.
- Backend connectorization, probe size and recording throughput remain constraints. Proposed finer connections and biochemical additions are future directions, not demonstrated upgrades.
- Fluidic patency is demonstrated at least eight weeks after implantation. It is not established for every later electrical-recording time point.
- No complete 3D model is supplied: hydration changes the matrix, and exact fiber trajectories, coating envelope and backend geometry would need a separately grounded reconstruction.

## Primary sources

- [2021 primary paper](https://www.nature.com/articles/s41467-021-23802-9).
- [Publisher PDF, affiliations and complete methods](https://www.nature.com/articles/s41467-021-23802-9.pdf).
- [Figure 1: assembly and functional characterization](https://www.nature.com/articles/s41467-021-23802-9/figures/1).
- [Figure 2: mechanics and insertion](https://www.nature.com/articles/s41467-021-23802-9/figures/2).
