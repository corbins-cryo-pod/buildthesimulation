# Build the Simulation

A public platform for building, simulating, and understanding brain–computer interfaces (BCIs) — with a special focus on **biohybrid peripheral nerve interfaces**, regenerative strategies, and practical neuroengineering.

- Live site: https://buildthesimulation.com
- Preview (Cloudflare Pages): https://buildthesimulation.pages.dev

## What this is

This project has three pillars:

1) **News (weekly):** curated BCI + neurotech links with commentary.
2) **Articles (sequenced):** deeper posts that build from fundamentals → existing tech → future biohybrid peripheral nerve interfaces.
3) **Simulation (long-term):** an interactive sandbox for exploring electrode designs, implantation strategies, and stimulation modalities.

The tone is intentionally **50/50**:
- rigorous definitions + citations (inline links), and
- practical engineering heuristics (“here’s how to think about it”).

## Tech

- **Astro** (static site)
- **Three.js** (interactive visuals / simulation front-end)
- **Astro Content Collections** (Markdown-driven News + Articles)

## Writing & publishing

Content lives here:
- News posts: `src/content/news/*.md`
- Articles: `src/content/articles/*.md`

Draft control:
- `draft: true` → not shown on the site
- `draft: false` → published

Templates:
- `workbench/notes-templates/templates/news-template.md`
- `workbench/notes-templates/templates/article-template.md`

More detail:
- `docs/HOW_TO_POST.md`
- `docs/CONTENT_PLAN.md`

RSS:
- `/rss.xml`

## Local development

```bash
npm install
npm run dev
```

Build check:
```bash
npm run build
```

## Contributing / workflow

Issues and PRs welcome.

If you’re proposing simulation changes, please describe:
- which biological target (peripheral nerve vs cortex)
- which modality (recording/stimulation, electrical/optical/etc.)
- what you’re assuming (geometry, tissue model, constraints)
- what the success metrics are (selectivity proxy, stability proxy, safety bounds)
