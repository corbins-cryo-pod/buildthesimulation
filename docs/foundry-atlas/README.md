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
bundles its data, styling, navigator and fallback schematic player. The online
walkthrough additionally loads same-origin Equipment Register assets.
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

## Workflow playback

Open any process profile or device route, choose a configuration if applicable,
and press **Play workflow**. On a baseline with branch-qualified handoffs the
button names the suggested configuration and selects it explicitly; playback
never concatenates mutually exclusive branches. The original handoff number
stays visible even when the playback skips other configurations. Pause, resume,
previous/next, replay, and four presentation speeds are independent of the
original traveler. The current animation pauses when opening its detailed
handoff or going to another browser tab. Reduced-motion preferences show static
poses with the same phase labels and controls. The station chips select a paused
incoming/outgoing preview within the current handoff.

The online cleanroom opens with a full-width 3D view of transfer, load, operator
setup, run and unload. **Follow specimen** tracks it through the room; **Room
view** shows the handoff context; **Inspect 3D stack** compares the incoming and
outgoing workpiece. Its camera and workpiece views stay in 3D. The player reuses
original Equipment Register models where the stated specimen and holder have a
compatible loading path. Other steps use labeled 3D teaching fixtures. When an
original model exists but lacks a compatible loading path, **Register model**
opens its inspection-only view, not an invented insertion.

The operator panel distinguishes source-defined setup intentions from
undisclosed machine parameters. It does not qualify a tool or create a machine
program. The player preloads only the current plan. Resuming preserves custody;
switching branches, seeking and replaying reset it. In source-backed multi-station
examples, distinct coupons and later supplied components restart custody rather
than changing size or inheriting a missing operation. Elsewhere a cited candidate
is illustrated by role; a list is not silently promoted to a process sequence.

External/unverified steps show an evidence boundary without executing an
operation; incompatible and out-of-scope configurations have no manufacturing
sequence. Opening the HTML directly or without the equipment module retains the
original schematic player. A browser that cannot open WebGL gets the shared
player's labeled 2D accessibility fallback. Standalone foundry labs remain the place to find
device-specific controls and bench models.

```sh
node --test tests/foundry-atlas-playback.mjs tests/foundry-atlas-cleanroom.mjs
CHROME_BIN=/path/to/chromium python scripts/foundry-atlas/tests/playback.py public/simulations/foundry/atlas/index.html
CHROME_BIN=/path/to/chromium python scripts/foundry-atlas/tests/cleanroom.py public/simulations/foundry/atlas/index.html --public-root public --expect-native
CHROME_BIN=/path/to/chromium python scripts/foundry-atlas/tests/cleanroom_lifecycle.py public/simulations/foundry/atlas/index.html
```

When standalone labs change, refresh the exact hub release ledger before
assembling the Atlas. Verify the static build via the entry point users open:

```sh
python scripts/foundry-atlas/update_lab_ledger.py
node --test tests/foundry-playback-release.mjs
CHROME_BIN=/path/to/chromium python scripts/foundry-atlas/tests/playback_hub.py dist
python scripts/foundry-atlas/tests/verify_live.py --attempts 8
```

### Continuous 3D playback
The hosted Atlas and linked Foundry labs use the same local Three.js player.
Each playback instance owns one scene, one persistent workpiece root, and a
grounded transfer trolley. Bay origins are spaced 4.5 m apart in the teaching
room. Forward adjacent stations transfer the active specimen; manual jumps and
independent witnesses start locally and never imply missing process steps.
Normal output, headings and numeric settings are usable without WebGL. Hosted
GPU fallback is explicitly labeled and the same native stage can retry 3D.

- **Follow specimen** plays the dry load/run/unload motion. Room view orbits the
  contiguous equipment. Operator panel reads the native or documented fields;
  its freestanding 3D screen is a teaching display, not a manufacturer HMI.
- **Inspect 3D stack** magnifies the geometry before and after. Layer separation
  is reversible, only present modeled layers are separated, and bonded parts
  are not pulled apart. Depth and spacing in that view are exaggerated.
- **Register model** isolates an existing original model without inserting a
  specimen. In the workflow, native dry motion requires a compatible named
  holder and a declared specimen size. Otherwise it uses a separately labeled
  3D teaching fixture or an inert fit gate. In-run cutaways on supported
  register geometry fade only the illustrated cover; they are not operating
  procedures.
- The Masmanidis route reads the native selected field and candidate results
  without modifying the solver. A selected reticle mark follows the same wafer
  through front and rear processes; the mounted support remains through oxide
  clear, and the 3D die separates only on a qualified native release. The
  64D source reticle follows the exact checked-in conductor polygons and
  top/bottom map. Cyan is a diagnostic net tint, not a metal or yield claim.

Public assets and architecture live under `public/simulations/foundry/`.
`cleanroom-player.js` owns labels and native clock bridges; the
`cleanroom-world-3d.js` scene owns the camera, staged props and render lifecycle.
The instrument adapter retains the Equipment Register evidence/fit rules.
Generated source blobs are intentionally local files, not third-party imports.

Before regenerating the Atlas, update `src/data/foundry-atlas/lab-releases.json`
with `scripts/foundry-atlas/update_lab_ledger.py`. Run the Foundry Node suite,
and the production-entry browser checks in
`scripts/foundry-atlas/tests/continuous-3d.py` and `cleanroom.py`. The authored
artifact ledger and `tests/device-foundry-release.mjs` preserve the native
engine bytes, excluding only the canonical read-only 64D witness bridge.

Article-specific meshes are lazy-loaded. The Utah teaching clamp uses its
native 100-post coordinate grid. The TIME, cuff, rolled-channel and research
Stentrode scenes use their native article/branch dimensions where specified.
The retinal inspector is the seven-pixel Wang research excerpt, not PRIMA or
a full wafer. These profiles are selected by native branch data, not inferred
from the name of a machine. The main 3D room preserves the wafer-scale
teaching proxy until release of the retinal crop.
