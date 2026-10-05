# Build the Simulation

An interactive neuroengineering site centered on a neural interface designer, with the BCI Atlas, reference devices, and cortex / peripheral nerve simulations.

- Live site: https://buildthesimulation.com
- Preview (Cloudflare Pages): https://buildthesimulation.pages.dev

## Current sections

- **Neural interface designer:** micrometer-scale electrode patterns, individual editing, snap controls, independent lead routing across up to four metal planes, editable process rules and physical-scale geometry exports. The source-linked design guide distinguishes fabrication concepts from electrical and mechanical validation.
- **BCI Atlas:** company and lab directory and map.
- **Devices:** neural interface designs and technical briefs.
- **Simulations:** interactive cortex and peripheral nerve sandboxes.

## Archived writing

The previous News, Articles, and Ideas sections are offline. Their original Markdown is preserved in `workbench/archive/news/`, `workbench/archive/articles/`, and `workbench/archive/ideas/` for reference or a future rewrite. Writing plans and templates remain in `workbench/`. These archive files are not site routes or Astro content collections.

## Local development

```bash
npm install
npm run dev
```

Build check: `npm run build`. The site uses Astro, Preact, and Three.js.

Designer geometry / routing checks: `node --test tests/interface-designer.mjs`. Existing model checks: `node tests/device-geometry.mjs` and `node tests/simulation-models.mjs`.
