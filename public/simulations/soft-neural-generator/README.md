# Soft Neural Generator — independent experimental model

Route: `/simulations/soft-neural-generator/`

This is the original 0.1.0 mechanics prototype, published as a separate test. It does not replace, import, or modify the existing Cell Growth Laboratory, Cortex Laboratory, or other simulation engines.

## Scope

A reduced 2.5-D soft soma, flexible neurite scaffold, locally propagated excitable activity, finite transported growth material, membrane-covered exploratory fingers, reversible attachments, branching, and 1/2/25/100-cell presets. Geometry responds to computed state, but ignition, growth, guidance and stabilization laws are phenomenological assumptions.

This is not a biologically validated neural-development model. Whole-cell crawling remains weak. The continuous membrane is a rendered envelope, not a conserved three-dimensional lipid surface. Individual microtubules, molecular adhesion, full 3-D contacts, mature axon/dendrite identity, synapses and electrophysiology are not resolved. Contact does not imply a synapse, and optional cell seeking is synthetic guidance.

## What was preserved

The engine, renderer and application controls are byte-identical to the reviewed prototype. Git blob checksums:

- `engine.js`: `14ecafa11aea0f4fb971b3869fc8b86ab37fd0ff`
- `renderer.js`: `bef541c0e5da51be5fa43da84ebcf4a180bdf26a`
- `app.js`: `39e5f2cb44d886f36c268fa8fdaacae6a8a96f3e`

The web packaging separates those scripts for caching, adds site navigation and an experimental-model notice, and loads reference movies only when requested. The original self-contained download remains a separate artifact; this web edition is not an offline single-file download.

## Use

Begin with One soft cell / one arm. Use +20 min to inspect spreading and outgrowth; Local activation excites the first process. For a branching example, select Exploratory branching, set seed 17, restart and advance. All six presets start from round cells. Save state / Load state retain the complete state and random generator. CSV and PNG export measurements and the current observation.

## Reference movies

Winans, Collins and Meyer (2016), eLife 5:e12387, CC BY 4.0: https://doi.org/10.7554/eLife.12387

Videos 2, 4, 5 and 7 use the MPEG-4 URLs linked by the publisher's figures page: https://elifesciences.org/articles/12387/figures#videos

The films are fetched from the publisher's video host on demand. They are not required by the numerical model. A failed video request displays a link to the original source. Neither quantitative video fitting nor biological predictive validation is claimed.

## Verification

The original 34-check numerical suite was rerun successfully before this integration. The website regression suite is `tests/soft-neural-generator.test.mjs`; run it with `node --test tests/soft-neural-generator.test.mjs`. It checks source preservation, route packaging, optional media, initialization, one-arm growth, adhesion-dependent spreading, deterministic restore and separate population budgets. Passing software tests is not biological validation.

Only this new static route and its regression tests are added; the shared simulation directory receives a new entry. No package dependency or build-script change is required.
