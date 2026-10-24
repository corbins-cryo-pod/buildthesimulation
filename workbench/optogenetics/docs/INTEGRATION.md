# Local staging for BuildTheSimulation

## Status

No repository write, branch, pull request, merge, or deployment was made. This review is independent of the site's current HEAD and preserves its existing Cortex Laboratory. The ZIP is a review snapshot, not a patch against an assumed current revision.

`site/public/simulations/optogenetics/index.html` is a byte-identical copy of the review HTML, arranged as a static-public route candidate. The proposed URL is `/simulations/optogenetics/`. Copying that file later must be reconciled with the actual repository's routes and existing assets. It has not been built as part of the current website or tested under the deployed Cloudflare Content Security Policy.

## Integration procedure after review

1. Read the current repository HEAD and any existing optogenetics work. Do not reset or overwrite newer changes. Create a dedicated feature branch.
2. Run the package tests and inspect `docs/PROVENANCE.json` and `docs/LICENSE-Allen.txt`.
3. For the first integration, add the self-contained HTML at the proposed static path only if there is no competing page. Add a simulations-directory entry using the site's current conventions. Verify the actual route resolution before merging.
4. Preserve `src/`, `vendor/cortex/`, `data/`, `tools/`, `tests/`, and validation documentation in an appropriate repository namespace. A source-only HTML upload is insufficient for auditable maintenance.
5. Test the deployed security policy: this standalone build uses inline scripts and a `blob:` Web Worker. If the website disallows either, refactor to external versioned assets and an external worker, rather than weakening the site's policy without review.
6. Re-run the full site build and existing tests as well as desktop, Safari/iPhone, and Firefox interaction tests. Compare the published model-data hashes and default result with the package reports. Report an actual deployment separately from a commit.

No layout/framework dependency, package.json replacement, global stylesheet replacement, remote font dependency, or API secret is required by the standalone app.

## Module boundaries

- `opsin.js`: ChR2 rates and state/current updates; independent of rendering.
- `optics.js` / `fiber-kernel.js`: physical source and one normalized tissue field.
- `simulation.js`: validation, pulse timing, expression, native cable coupling, recording, event analysis.
- `sweep.js`: bounded independent response maps.
- `worker.js`: worker message API and transferable recording buffers.
- `scene.js`: real morphology projection, selection, fiber positioning guide, field slice.
- `plots.js`: SVG records and shared time cursor.
- `app.js`: controls, state invalidation, notebook import/export, presentation.

`OptoLab` exposes a validated inspection API for browser tests and a later embedding wrapper. It is not a network service. `setConfig` invalidates active recordings. `run`, `cancel`, `getResult`, `getSweep`, `getConfig`, and `setTime` are defined in `src/app.js`.

A future optoelectrode import needs a separate, versioned geometry/material/emitter schema. Arbitrary emitter sizes or wavelengths cannot reuse this fixed fiber kernel without an appropriate transport solution. Do not expose microLED/thermal/population selections until corresponding models and verification exist.
