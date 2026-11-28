# BuildTheSimulation Manufacturing Workflow Atlas

The atlas indexes every public device sheet and equipment register record. A public
entry can exist without a researched workflow: such entries are marked **Queued**.
A profile is a sourced or deliberately reconstructed device/module process with
inputs, handoffs, verification and missing capability. A profile or equipment link
is not a fabrication qualification, reservation, assertion of physical equipment
ownership or a clinical instruction.

## Evidence and coverage

* **Documented:** a named configuration or module has a primary public process
  description. A profile can still have outside steps and enumerated unknowns.
* **Partial:** sources support the design or some modules, but the production
  route or configuration details are missing.
* **Reference:** a proposed virtual/bench reconstruction. No equivalence with the
  named deployed device is assumed.
* **Proprietary:** public product or study architecture without a public finished
  manufacturing route; registered instruments may support only independent analogs.
* **Out of scope:** the device is identified, but this manufacturing atlas does not
  model its active production route.
* **Queued:** catalog entry listed, no atlas profile yet. A catalog entry is not a
  verified workflow simply because it appears in a search result.

Count mapped device slugs separately from process profiles, configurations,
vendor alternatives, equipment and standalone interactive labs. Profiles can be
shared and some profiles have no corresponding distinct catalog record. A
configuration is a named, architecturally meaningful branch, not a Cartesian
product of arbitrary dimensions, process settings or tool assignments.
Incompatible and external branches are shown intentionally, not counted as
fabricable options. Resolve unknown manufacturing steps as gaps, not guesses
silently substituted for real methods.

The full equipment capability dictionary (lane input) distinguishes teaching
model, inspection/replay, exhibit and support/custody status. Virtual instrument
capability cannot establish a material-approved real tool configuration.

## Rebuild and verify

Run with Python 3 and PyYAML from the repo root. The generated production document
bundles data, styling and code; it needs no network requests during normal use.
Use the current source catalog and exact base commit on the branch being updated.

```sh
python scripts/foundry-atlas/assemble.py --repo . --lanes src/data/foundry-atlas/lanes \
  --revision YYYY.MM.DD-NN --source-revision "$(git rev-parse HEAD)" --updated "$(date -u +%F)" --output /tmp/foundry-atlas-data.json
python scripts/foundry-atlas/build.py /tmp/foundry-atlas-data.json public/simulations/foundry/atlas/index.html
node --test tests/foundry-atlas.mjs
CHROME_BIN=/path/to/chromium python scripts/foundry-atlas/tests/browser.py public/simulations/foundry/atlas/index.html
```

The equipment lane can also be verified independently against its curated
operation tables:

```sh
python scripts/foundry-atlas/equipment/check.py src/data/equipment src/data/foundry-atlas/lanes/equipment.json
```

When moving between configurations, a handoff with an explicit applicability
list is not in a branch unless listed. The UI flags these exclusions without
erasing the original route and downloads the applicable handoff positions and
their corresponding register entries. An incompatible comparison has no applicable
handoffs and exports no candidate equipment. A handoff marked as variation only
remains available and is not implicitly removed.

The quantitative UI sweep and representative process-compatibility regressions
are separate checks:

```sh
python scripts/foundry-atlas/tests/audit_routes.py src/data/foundry-atlas/lanes
CHROME_BIN=/path/to/chromium python scripts/foundry-atlas/tests/sweep.py public/simulations/foundry/atlas/index.html
```
